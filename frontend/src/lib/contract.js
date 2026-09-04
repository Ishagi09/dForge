import { BrowserProvider, JsonRpcProvider, Contract } from "ethers";
import abi from "../contract/abi.json";
import deployment from "../contract/deployment.json";

export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || deployment.address;
export const SEPOLIA_CHAIN_ID = 11155111;
const SEPOLIA_CHAIN_ID_HEX = "0xaa36a7";

// Reads go through a public RPC so verification works with no wallet installed.
const READ_RPC = import.meta.env.VITE_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";

export const EXPLORER = "https://sepolia.etherscan.io";

/** Status enum, index-aligned with the contract's `Status`. */
export const STATUS_LABELS = ["Not Found", "Valid", "Revoked", "Expired"];

/** Read-only contract instance. No wallet required. */
export function getReadContract() {
  const provider = new JsonRpcProvider(READ_RPC, SEPOLIA_CHAIN_ID);
  return new Contract(CONTRACT_ADDRESS, abi, provider);
}

async function switchToSepolia(ethereum) {
  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }],
    });
  } catch (err) {
    // 4902 = chain not present in the wallet yet.
    if (err?.code === 4902) {
      await ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: SEPOLIA_CHAIN_ID_HEX,
            chainName: "Sepolia",
            nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
            rpcUrls: [READ_RPC],
            blockExplorerUrls: [EXPLORER],
          },
        ],
      });
    } else {
      throw err;
    }
  }
}

/** Prompts for wallet access, ensures Sepolia, and returns a signer-backed contract. */
export async function connectWallet() {
  const { ethereum } = window;
  if (!ethereum) {
    throw new Error("No wallet found. Install MetaMask to issue certificates.");
  }

  await ethereum.request({ method: "eth_requestAccounts" });

  let provider = new BrowserProvider(ethereum);
  const network = await provider.getNetwork();
  if (network.chainId !== BigInt(SEPOLIA_CHAIN_ID)) {
    await switchToSepolia(ethereum);
    provider = new BrowserProvider(ethereum); // rebuild after the chain change
  }

  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  return { address, contract: new Contract(CONTRACT_ADDRESS, abi, signer) };
}

/** Turns contract custom errors and wallet rejections into readable text. */
export function describeError(err) {
  const messages = {
    FileHashAlreadyRegistered: "This document already has a certificate on-chain.",
    NotIssuer: "This wallet is not an authorized issuer on the contract.",
    InvalidFileHash: "The document hash is empty or invalid.",
    EmptyField: "Recipient name and course name are both required.",
    InvalidExpiry: "The expiry date must be in the future.",
    CertificateNotFound: "No certificate found for that document.",
    AlreadyRevoked: "That certificate is already revoked.",
    NotAuthorized: "This wallet is not allowed to perform that action.",
    NotOwner: "Only the contract owner can do that.",
    ZeroAddress: "That address is not valid.",
    LengthMismatch: "Batch inputs must all be the same length.",
  };

  const name = err?.revert?.name;
  if (name && messages[name]) return messages[name];
  if (err?.code === "ACTION_REJECTED") return "Transaction rejected in the wallet.";
  if (err?.code === "INSUFFICIENT_FUNDS") return "Not enough Sepolia ETH to cover gas.";
  return err?.shortMessage || err?.message || String(err);
}

export function shortHash(value, lead = 10, tail = 8) {
  if (!value) return "";
  return value.length <= lead + tail + 2 ? value : `${value.slice(0, lead)}…${value.slice(-tail)}`;
}
