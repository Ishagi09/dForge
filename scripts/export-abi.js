// Copies the compiled ABI and the deployed address into the frontend.
// Re-run after any contract change or redeploy:
//   npx hardhat run scripts/export-abi.js
//
// Reads deployments/sepolia.json by default; override with NETWORK=<name>.

const fs = require("fs");
const path = require("path");

const NETWORK = process.env.NETWORK || "sepolia";
const CONTRACT = "SmartCertificateVerification";

const root = path.join(__dirname, "..");
const artifactPath = path.join(
  root,
  "artifacts",
  "contracts",
  `${CONTRACT}.sol`,
  `${CONTRACT}.json`
);
const deploymentPath = path.join(root, "deployments", `${NETWORK}.json`);
const outDir = path.join(root, "frontend", "src", "contract");

function main() {
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`No artifact at ${artifactPath}. Run "npx hardhat compile" first.`);
  }
  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`No deployment record at ${deploymentPath}. Deploy first.`);
  }

  const { abi } = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "abi.json"), JSON.stringify(abi, null, 2) + "\n");
  fs.writeFileSync(
    path.join(outDir, "deployment.json"),
    JSON.stringify({ address: deployment.address, network: deployment.network }, null, 2) + "\n"
  );

  console.log(`Exported ABI (${abi.length} entries) and address ${deployment.address}`);
  console.log(`  -> frontend/src/contract/`);
}

main();
