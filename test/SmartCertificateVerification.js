const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

const Status = { NonExistent: 0n, Valid: 1n, Revoked: 2n, Expired: 3n };
const NO_EXPIRY = 0;
const ZERO_HASH = ethers.ZeroHash;

// Stand-in for a real document's SHA-256; any distinct 32-byte value works here.
let hashCounter = 0;
function fileHash(label) {
  return ethers.keccak256(ethers.toUtf8Bytes(label ?? `document-${hashCounter++}`));
}

describe("SmartCertificateVerification", function () {
  async function deployFixture() {
    const [owner, issuer2, alice, bob, stranger] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SmartCertificateVerification");
    const contract = await Factory.deploy();
    await contract.waitForDeployment();
    return { contract, owner, issuer2, alice, bob, stranger };
  }

  // Issues a certificate and pulls the generated id back out of the event.
  async function issue(contract, signer, overrides = {}) {
    const args = {
      fileHash: fileHash(),
      recipient: ethers.ZeroAddress,
      recipientName: "Alice",
      courseName: "Blockchain 101",
      metadataURI: "",
      expiresAt: NO_EXPIRY,
      ...overrides,
    };
    const tx = await contract
      .connect(signer)
      .issueCertificate(
        args.fileHash,
        args.recipient,
        args.recipientName,
        args.courseName,
        args.metadataURI,
        args.expiresAt
      );
    const receipt = await tx.wait();
    const event = receipt.logs
      .map((log) => {
        try {
          return contract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((e) => e && e.name === "CertificateIssued");
    return { id: event.args.certificateId, fileHash: args.fileHash };
  }

  describe("deployment", function () {
    it("sets the deployer as owner and authorized issuer", async function () {
      const { contract, owner } = await loadFixture(deployFixture);
      expect(await contract.owner()).to.equal(owner.address);
      expect(await contract.issuers(owner.address)).to.equal(true);
      expect(await contract.totalCertificates()).to.equal(0n);
    });
  });

  describe("issuance", function () {
    it("issues a certificate that verifies as valid", async function () {
      const { contract, owner, alice } = await loadFixture(deployFixture);
      const { id, fileHash: fh } = await issue(contract, owner, {
        recipient: alice.address,
        metadataURI: "ipfs://QmExample",
      });

      const [valid, status, cert] = await contract.verifyCertificate(id);
      expect(valid).to.equal(true);
      expect(status).to.equal(Status.Valid);
      expect(cert.recipientName).to.equal("Alice");
      expect(cert.courseName).to.equal("Blockchain 101");
      expect(cert.metadataURI).to.equal("ipfs://QmExample");
      expect(cert.fileHash).to.equal(fh);
      expect(cert.issuer).to.equal(owner.address);
      expect(cert.recipient).to.equal(alice.address);
      expect(await contract.totalCertificates()).to.equal(1n);
    });

    it("gives distinct ids to identical certificates issued in the same block", async function () {
      const { contract, owner } = await loadFixture(deployFixture);
      const first = await issue(contract, owner);
      const second = await issue(contract, owner);
      expect(first.id).to.not.equal(second.id);
      expect(await contract.isValid(first.id)).to.equal(true);
      expect(await contract.isValid(second.id)).to.equal(true);
    });

    it("rejects a zero file hash", async function () {
      const { contract, owner } = await loadFixture(deployFixture);
      await expect(issue(contract, owner, { fileHash: ZERO_HASH })).to.be.revertedWithCustomError(
        contract,
        "InvalidFileHash"
      );
    });

    it("rejects a document that was already certified", async function () {
      const { contract, owner } = await loadFixture(deployFixture);
      const fh = fileHash("duplicate-doc");
      await issue(contract, owner, { fileHash: fh });

      await expect(issue(contract, owner, { fileHash: fh })).to.be.revertedWithCustomError(
        contract,
        "FileHashAlreadyRegistered"
      );
    });

    it("rejects empty recipient or course names", async function () {
      const { contract, owner } = await loadFixture(deployFixture);
      await expect(issue(contract, owner, { recipientName: "" })).to.be.revertedWithCustomError(
        contract,
        "EmptyField"
      );
      await expect(issue(contract, owner, { courseName: "" })).to.be.revertedWithCustomError(
        contract,
        "EmptyField"
      );
    });

    it("rejects an expiry that is already in the past", async function () {
      const { contract, owner } = await loadFixture(deployFixture);
      const past = (await time.latest()) - 1;
      await expect(issue(contract, owner, { expiresAt: past })).to.be.revertedWithCustomError(
        contract,
        "InvalidExpiry"
      );
    });

    it("prevents unauthorized addresses from issuing", async function () {
      const { contract, stranger } = await loadFixture(deployFixture);
      await expect(issue(contract, stranger)).to.be.revertedWithCustomError(contract, "NotIssuer");
    });

    it("issues to many recipients in one batch", async function () {
      const { contract, alice, bob } = await loadFixture(deployFixture);
      const hashes = [fileHash("batch-a"), fileHash("batch-b")];
      await contract.issueBatch(
        hashes,
        [alice.address, bob.address],
        ["Alice", "Bob"],
        "Solidity 201",
        "",
        NO_EXPIRY
      );

      expect(await contract.totalCertificates()).to.equal(2n);
      expect(await contract.certificateCountOf(alice.address)).to.equal(1n);

      const [, , , cert] = await contract.verifyByFileHash(hashes[1]);
      expect(cert.recipientName).to.equal("Bob");
      expect(cert.courseName).to.equal("Solidity 201");
    });

    it("rejects a batch with mismatched array lengths", async function () {
      const { contract, alice, bob } = await loadFixture(deployFixture);
      await expect(
        contract.issueBatch(
          [fileHash()],
          [alice.address, bob.address],
          ["Alice", "Bob"],
          "Solidity 201",
          "",
          NO_EXPIRY
        )
      ).to.be.revertedWithCustomError(contract, "LengthMismatch");
    });
  });

  describe("verification by file hash", function () {
    it("finds a certificate from its document hash alone", async function () {
      const { contract, owner } = await loadFixture(deployFixture);
      const { id, fileHash: fh } = await issue(contract, owner, { recipientName: "Dana" });

      const [valid, status, certificateId, cert] = await contract.verifyByFileHash(fh);
      expect(valid).to.equal(true);
      expect(status).to.equal(Status.Valid);
      expect(certificateId).to.equal(id);
      expect(cert.recipientName).to.equal("Dana");
      expect(await contract.certificateIdByFileHash(fh)).to.equal(id);
    });

    it("reports NonExistent for an uncertified document", async function () {
      const { contract } = await loadFixture(deployFixture);
      const [valid, status, certificateId] = await contract.verifyByFileHash(
        fileHash("never-issued")
      );
      expect(valid).to.equal(false);
      expect(status).to.equal(Status.NonExistent);
      expect(certificateId).to.equal(ZERO_HASH);
    });

    it("reflects revocation when looked up by hash", async function () {
      const { contract, owner } = await loadFixture(deployFixture);
      const { fileHash: fh } = await issue(contract, owner);

      await contract.revokeByFileHash(fh);

      const [valid, status] = await contract.verifyByFileHash(fh);
      expect(valid).to.equal(false);
      expect(status).to.equal(Status.Revoked);
    });

    it("blocks unrelated accounts from revoking by hash", async function () {
      const { contract, owner, stranger } = await loadFixture(deployFixture);
      const { fileHash: fh } = await issue(contract, owner);
      await expect(
        contract.connect(stranger).revokeByFileHash(fh)
      ).to.be.revertedWithCustomError(contract, "NotAuthorized");
    });

    it("rejects revoking an unknown document hash", async function () {
      const { contract } = await loadFixture(deployFixture);
      await expect(
        contract.revokeByFileHash(fileHash("unknown"))
      ).to.be.revertedWithCustomError(contract, "CertificateNotFound");
    });
  });

  describe("issuer management", function () {
    it("lets the owner authorize and revoke issuers", async function () {
      const { contract, issuer2 } = await loadFixture(deployFixture);

      await expect(contract.authorizeIssuer(issuer2.address))
        .to.emit(contract, "IssuerAuthorized")
        .withArgs(issuer2.address);

      const { id } = await issue(contract, issuer2);
      expect(await contract.isValid(id)).to.equal(true);

      await contract.revokeIssuer(issuer2.address);
      await expect(issue(contract, issuer2)).to.be.revertedWithCustomError(contract, "NotIssuer");
    });

    it("keeps certificates valid after their issuer is de-authorized", async function () {
      const { contract, issuer2 } = await loadFixture(deployFixture);
      await contract.authorizeIssuer(issuer2.address);
      const { id } = await issue(contract, issuer2);

      await contract.revokeIssuer(issuer2.address);
      expect(await contract.isValid(id)).to.equal(true);
    });

    it("blocks non-owners from managing issuers", async function () {
      const { contract, stranger, issuer2 } = await loadFixture(deployFixture);
      await expect(
        contract.connect(stranger).authorizeIssuer(issuer2.address)
      ).to.be.revertedWithCustomError(contract, "NotOwner");
    });

    it("rejects the zero address as an issuer", async function () {
      const { contract } = await loadFixture(deployFixture);
      await expect(contract.authorizeIssuer(ethers.ZeroAddress)).to.be.revertedWithCustomError(
        contract,
        "ZeroAddress"
      );
    });
  });

  describe("revocation", function () {
    it("marks a revoked certificate as invalid", async function () {
      const { contract, owner } = await loadFixture(deployFixture);
      const { id } = await issue(contract, owner);

      await expect(contract.revokeCertificate(id))
        .to.emit(contract, "CertificateRevoked")
        .withArgs(id, owner.address);

      const [valid, status] = await contract.verifyCertificate(id);
      expect(valid).to.equal(false);
      expect(status).to.equal(Status.Revoked);
    });

    it("lets the contract owner revoke another issuer's certificate", async function () {
      const { contract, owner, issuer2 } = await loadFixture(deployFixture);
      await contract.authorizeIssuer(issuer2.address);
      const { id } = await issue(contract, issuer2);

      await contract.connect(owner).revokeCertificate(id);
      expect(await contract.isValid(id)).to.equal(false);
    });

    it("blocks unrelated accounts from revoking", async function () {
      const { contract, owner, stranger } = await loadFixture(deployFixture);
      const { id } = await issue(contract, owner);
      await expect(
        contract.connect(stranger).revokeCertificate(id)
      ).to.be.revertedWithCustomError(contract, "NotAuthorized");
    });

    it("rejects double revocation", async function () {
      const { contract, owner } = await loadFixture(deployFixture);
      const { id } = await issue(contract, owner);
      await contract.revokeCertificate(id);
      await expect(contract.revokeCertificate(id)).to.be.revertedWithCustomError(
        contract,
        "AlreadyRevoked"
      );
    });

    it("rejects revoking a certificate that does not exist", async function () {
      const { contract } = await loadFixture(deployFixture);
      await expect(
        contract.revokeCertificate(fileHash("nope"))
      ).to.be.revertedWithCustomError(contract, "CertificateNotFound");
    });
  });

  describe("expiry", function () {
    it("reports a certificate as expired once its expiry passes", async function () {
      const { contract, owner } = await loadFixture(deployFixture);
      const expiresAt = (await time.latest()) + 3600;
      const { id } = await issue(contract, owner, { expiresAt });

      expect(await contract.isValid(id)).to.equal(true);

      await time.increaseTo(expiresAt + 1);

      const [valid, status] = await contract.verifyCertificate(id);
      expect(valid).to.equal(false);
      expect(status).to.equal(Status.Expired);
    });
  });

  describe("verification of unknown certificates", function () {
    it("reports NonExistent for an id that was never issued", async function () {
      const { contract } = await loadFixture(deployFixture);
      const fakeId = fileHash("does-not-exist");

      const [valid, status] = await contract.verifyCertificate(fakeId);
      expect(valid).to.equal(false);
      expect(status).to.equal(Status.NonExistent);

      await expect(contract.getCertificate(fakeId)).to.be.revertedWithCustomError(
        contract,
        "CertificateNotFound"
      );
    });
  });

  describe("ownership", function () {
    it("transfers ownership in two steps", async function () {
      const { contract, owner, issuer2 } = await loadFixture(deployFixture);

      await contract.transferOwnership(issuer2.address);
      expect(await contract.owner()).to.equal(owner.address); // not yet
      expect(await contract.pendingOwner()).to.equal(issuer2.address);

      await expect(contract.connect(issuer2).acceptOwnership())
        .to.emit(contract, "OwnershipTransferred")
        .withArgs(owner.address, issuer2.address);

      expect(await contract.owner()).to.equal(issuer2.address);
      expect(await contract.pendingOwner()).to.equal(ethers.ZeroAddress);
    });

    it("blocks anyone but the pending owner from accepting", async function () {
      const { contract, issuer2, stranger } = await loadFixture(deployFixture);
      await contract.transferOwnership(issuer2.address);
      await expect(contract.connect(stranger).acceptOwnership()).to.be.revertedWithCustomError(
        contract,
        "NotPendingOwner"
      );
    });
  });
});
