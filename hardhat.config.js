require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const { SEPOLIA_RPC_URL, PRIVATE_KEY, ETHERSCAN_API_KEY, REPORT_GAS } = process.env;

// MetaMask exports keys with a 0x prefix, editors add stray whitespace, and either
// one produces a cryptic error deep inside ethers. Normalise here instead.
function normalizeKey(key) {
  if (!key) return undefined;
  const trimmed = key.trim().replace(/^0x/i, "");
  if (!/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    console.warn(
      "\x1b[33m[hardhat.config] PRIVATE_KEY in .env is not a valid 32-byte hex key - ignoring it.\x1b[0m"
    );
    return undefined;
  }
  return `0x${trimmed}`;
}

const deployerKey = normalizeKey(PRIVATE_KEY);
const accounts = deployerKey ? [deployerKey] : [];

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    sepolia: {
      url: SEPOLIA_RPC_URL || "",
      accounts,
      chainId: 11155111,
    },
  },
  etherscan: {
    apiKey: {
      sepolia: ETHERSCAN_API_KEY || "",
    },
  },
  gasReporter: {
    enabled: REPORT_GAS === "true",
    currency: "USD",
  },
  mocha: {
    timeout: 120000,
  },
};
