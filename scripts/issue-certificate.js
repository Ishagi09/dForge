// Issues a certificate for a document, then verifies it back by file hash.
// Mirrors exactly what the frontend does, so it doubles as an end-to-end check.
//
//   FILE=path/to/certificate.pdf npx hardhat run scripts/issue-certificate.js --network sepolia
//
// Address resolution: CONTRACT_ADDRESS env var, else deployments/<network>.json.

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const FILE = process.env.FILE;
const RECIPIENT_NAME = process.env.RECIPIENT_NAME || "Alice Example";
const COURSE_NAME = process.env.COURSE_NAME || "Blockchain Fundamentals";
const RECIPIENT_ADDRESS = process.env.RECIPIENT_ADDRESS || hre.ethers.ZeroAddress;
const METADATA_URI = process.env.METADATA_URI || "";
const STATUS_LABELS = ["Not Found", "Valid", "Revoked", "Expired"];

/** SHA-256 of a file as 0x-prefixed hex - identical to the browser's crypto.subtle. */
function sha256File(filePath) {
  const buffer = fs.readFileSync(filePath);
  return "0x" + crypto.createHash("sha256").update(buffer).digest("hex");
}

function resolveAddress(networkName) {
  if (process.env.CONTRACT_ADDRESS) return process.env.CONTRACT_ADDRESS;

  const file = path.join(__dirname, "..", "deployments", `${networkName}.json`);
  if (!fs.existsSync(file)) {
    throw new Error(
      `No deployment record at deployments/${networkName}.json. ` +
        `Run the deploy script first, or set CONTRACT_ADDRESS.`
    );
  }
  return JSON.parse(fs.readFileSync(file, "utf8")).address;
}

async function main() {
  if (!FILE) {
    throw new Error("Set FILE to the document you want to certify, e.g. FILE=./diploma.pdf");
  }
  if (!fs.existsSync(FILE)) {
    throw new Error(`No such file: ${FILE}`);
  }

  const address = resolveAddress(hre.network.name);
  const contract = await hre.ethers.getContractAt("SmartCertificateVerification", address);
  const fileHash = sha256File(FILE);

  console.log(`Contract:  ${address}`);
  console.log(`Document:  ${FILE}`);
  console.log(`SHA-256:   ${fileHash}`);
  console.log(`Issuing "${COURSE_NAME}" to ${RECIPIENT_NAME}...`);

  const tx = await contract.issueCertificate(
    fileHash,
    RECIPIENT_ADDRESS,
    RECIPIENT_NAME,
    COURSE_NAME,
    METADATA_URI,
    0 // never expires
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
    .find((parsed) => parsed && parsed.name === "CertificateIssued");

  console.log(`\nCertificate ID: ${event.args.certificateId}`);

  // Read it back the way a verifier would: by document hash alone.
  const [valid, status, certificateId, cert] = await contract.verifyByFileHash(fileHash);
  console.log("\nVerification by file hash:");
  console.log(`  valid:     ${valid}`);
  console.log(`  status:    ${STATUS_LABELS[Number(status)]}`);
  console.log(`  id match:  ${certificateId === event.args.certificateId}`);
  console.log(`  recipient: ${cert.recipientName}`);
  console.log(`  course:    ${cert.courseName}`);
  console.log(`  issuer:    ${cert.issuer}`);
}

main().catch((error) => {
  console.error(`\n${error.message}`);
  process.exitCode = 1;
});
