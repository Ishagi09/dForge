import { BrowserProvider, JsonRpcProvider, Contract } from "ethers";
import abi from "../contract/abi.json";
import deployment from "../contract/deployment.json";

export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || deployment.address;

/** Log scans start here rather than at genesis - public RPCs will not serve that range. */
export const DEPLOYMENT_BLOCK = Number(deployment.blockNumber ?? 0);
export const SEPOLIA_CHAIN_ID = 11155111;
const SEPOLIA_CHAIN_ID_HEX = "0xaa36a7";

// Reads go through a public RPC so verification works with no wallet installed.
const READ_RPC = import.meta.env.VITE_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";

export const EXPLORER = "https://sepolia.etherscan.io";

/** Status enum, index-aligned with the contract's `Status`. */
export const STATUS_LABELS = ["Not Found", "Valid", "Revoked", "Expired"];

let readProvider;

/** Shared read-only provider, reused so the block poller and reads share one connection. */
export function getReadProvider() {
  if (!readProvider) readProvider = new JsonRpcProvider(READ_RPC, SEPOLIA_CHAIN_ID);
  return readProvider;
}

/** Read-only contract instance. No wallet required. */
export function getReadContract() {
  return new Contract(CONTRACT_ADDRESS, abi, getReadProvider());
}

/**
 * Enumerate injected wallets via EIP-6963.
 *
 * `window.ethereum` is a single global that every wallet extension races to claim, so with
 * more than one installed it is whichever won - not necessarily the one the user wants.
 * EIP-6963 has each wallet announce itself separately, which is the only reliable way to
 * offer a real choice. Wallets answer synchronously, so a short collection window is enough.
 */
export function discoverWallets(timeoutMs = 350) {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve([]);

    const found = new Map();
    const onAnnounce = (event) => {
      const { info, provider } = event.detail ?? {};
      if (info?.uuid && provider) found.set(info.uuid, { info, provider });
    };

    window.addEventListener("eip6963:announceProvider", onAnnounce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));

    setTimeout(() => {
      window.removeEventListener("eip6963:announceProvider", onAnnounce);

      const wallets = [...found.values()];
      // Fall back to the legacy global only if nothing announced itself.
      if (wallets.length === 0 && window.ethereum) {
        wallets.push({
          info: { uuid: "legacy", name: "Injected wallet", rdns: "legacy" },
          provider: window.ethereum,
        });
      }
      resolve(wallets);
    }, timeoutMs);
  });
}

async function switchToSepolia(injected) {
  try {
    await injected.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }],
    });
  } catch (err) {
    // 4902 = chain not present in the wallet yet.
    if (err?.code === 4902) {
      await injected.request({
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

/**
 * Connect to a specific injected provider, ensure Sepolia, and return a signer-backed contract.
 * @param injected an EIP-1193 provider from `discoverWallets`.
 */
export async function connectWallet(injected) {
  const target = injected ?? window.ethereum;
  if (!target) {
    throw new Error("No wallet found. Install MetaMask to issue certificates.");
  }

  await target.request({ method: "eth_requestAccounts" });

  let provider = new BrowserProvider(target);
  const network = await provider.getNetwork();
  if (network.chainId !== BigInt(SEPOLIA_CHAIN_ID)) {
    await switchToSepolia(target);
    provider = new BrowserProvider(target); // rebuild after the chain change
  }

  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  return { address, contract: new Contract(CONTRACT_ADDRESS, abi, signer) };
}

/**
 * Accounts this site is already authorized to see. Uses eth_accounts, which never
 * prompts - so a read-only page can personalise without popping a wallet dialog.
 */
export async function silentAccounts(injected) {
  try {
    return (await injected.request({ method: "eth_accounts" })) ?? [];
  } catch {
    return [];
  }
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
  if (err?.code === "ACTION_REJECTED" || err?.code === 4001) {
    return "Request rejected in the wallet.";
  }
  if (err?.code === "INSUFFICIENT_FUNDS") return "Not enough Sepolia ETH to cover gas.";

  const raw = err?.shortMessage || err?.message || String(err);
  // Wallet extensions fighting over window.ethereum surface as opaque "Unexpected error".
  if (/unexpected error/i.test(raw)) {
    return `${raw} - this usually means another wallet extension intercepted the request. Pick a specific wallet above and try again.`;
  }
  return raw;
}

export function shortHash(value, lead = 10, tail = 8) {
  if (!value) return "";
  return value.length <= lead + tail + 2 ? value : `${value.slice(0, lead)}…${value.slice(-tail)}`;
}
