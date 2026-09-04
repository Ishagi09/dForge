// Issues one certificate against an already-deployed contract, then reads it back.
//
//   npx hardhat run scripts/issue-certificate.js --network sepolia
//
// Address resolution: CONTRACT_ADDRESS env var, else deployments/<network>.json.

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

const RECIPIENT_NAME = process.env.RECIPIENT_NAME || "Alice Example";
const COURSE_NAME = process.env.COURSE_NAME || "Blockchain Fundamentals";
const RECIPIENT_ADDRESS = process.env.RECIPIENT_ADDRESS || hre.ethers.ZeroAddress;
const METADATA_URI = process.env.METADATA_URI || "";
const STATUS_LABELS = ["NonExistent", "Valid", "Revoked", "Expired"];

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
  const address = resolveAddress(hre.network.name);
  const contract = await hre.ethers.getContractAt("SmartCertificateVerification", address);

  console.log(`Contract: ${address}`);
  console.log(`Issuing "${COURSE_NAME}" to ${RECIPIENT_NAME}...`);

  const tx = await contract.issueCertificate(
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
    .find((e) => e && e.name === "CertificateIssued");

  const certificateId = event.args.certificateId;
  console.log(`\nCertificate ID: ${certificateId}`);
  console.log("Keep this id - it is what a verifier needs.\n");

  const [valid, status, cert] = await contract.verifyCertificate(certificateId);
  console.log("Verification:");
  console.log(`  valid:     ${valid}`);
  console.log(`  status:    ${STATUS_LABELS[Number(status)]}`);
  console.log(`  recipient: ${cert.recipientName}`);
  console.log(`  course:    ${cert.courseName}`);
  console.log(`  issuer:    ${cert.issuer}`);
  console.log(`  issuedAt:  ${new Date(Number(cert.issuedAt) * 1000).toISOString()}`);
}

main().catch((error) => {
  console.error(`\n${error.message}`);
  process.exitCode = 1;
});
