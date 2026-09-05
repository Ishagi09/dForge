const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

// Public networks need confirmations before Etherscan can see the contract.
const CONFIRMATIONS = { sepolia: 5 };

const EXPLORERS = { sepolia: "https://sepolia.etherscan.io" };

async function preflight(networkName) {
  if (networkName === "hardhat" || networkName === "localhost") return;

  const problems = [];
  if (!process.env.SEPOLIA_RPC_URL) {
    problems.push("SEPOLIA_RPC_URL is empty - paste your Alchemy HTTPS URL into .env");
  }
  if (!process.env.PRIVATE_KEY) {
    problems.push("PRIVATE_KEY is empty - paste your deployer account's private key into .env");
  }
  if (problems.length > 0) {
    throw new Error(`.env is not ready:\n  - ${problems.join("\n  - ")}`);
  }

  const signers = await hre.ethers.getSigners();
  if (signers.length === 0) {
    throw new Error(
      "No deployer account available. PRIVATE_KEY in .env is missing or not a valid 32-byte hex key."
    );
  }
}

async function main() {
  const networkName = hre.network.name;
  await preflight(networkName);

  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(deployer.address);

  console.log(`Network:  ${networkName}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance:  ${hre.ethers.formatEther(balance)} ETH\n`);

  if (balance === 0n) {
    throw new Error(
      `Deployer has no ETH. Fund ${deployer.address} from a Sepolia faucet ` +
        `(https://www.alchemy.com/faucets/ethereum-sepolia) and try again.`
    );
  }

  const Factory = await hre.ethers.getContractFactory("SmartCertificateVerification");
  const contract = await Factory.deploy();

  console.log(`Deploy tx: ${contract.deploymentTransaction().hash}`);
  console.log("Waiting for deployment...");
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`\nSmartCertificateVerification deployed to: ${address}`);

  const confirmations = CONFIRMATIONS[networkName] ?? 0;
  if (confirmations > 0) {
    console.log(`Waiting for ${confirmations} confirmations...`);
    await contract.deploymentTransaction().wait(confirmations);
  }

  // Record the deployment so later scripts (and you) can find the address again.
  // blockNumber matters: the dashboard starts its log scan there rather than at genesis.
  const receipt = await contract.deploymentTransaction().wait();
  const record = {
    network: networkName,
    address,
    deployer: deployer.address,
    txHash: contract.deploymentTransaction().hash,
    blockNumber: receipt.blockNumber,
    deployedAt: new Date().toISOString(),
  };
  const dir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${networkName}.json`), JSON.stringify(record, null, 2) + "\n");
  console.log(`Saved deployments/${networkName}.json`);

  const explorer = EXPLORERS[networkName];
  if (explorer) {
    console.log(`\nExplorer: ${explorer}/address/${address}`);
    console.log(`Verify:   npx hardhat verify --network ${networkName} ${address}`);
  }
}

main().catch((error) => {
  console.error(`\n${error.message}`);
  process.exitCode = 1;
});
