import { useCallback, useEffect, useState } from "react";
import { connectWallet, discoverWallets } from "./contract";

/**
 * Discovers injected wallets (EIP-6963) and connects the one the user picks.
 * Shared by every page that needs to send a transaction.
 */
export function useWallet() {
  const [wallets, setWallets] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [account, setAccount] = useState("");

  useEffect(() => {
    let cancelled = false;
    discoverWallets().then((found) => {
      if (cancelled) return;
      setWallets(found);
      if (found.length === 1) setWallet(found[0]);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Connects and returns a signer-backed contract. Throws if no wallet is chosen. */
  const connect = useCallback(
    async (chosen) => {
      const target = chosen ?? wallet;
      if (!target) {
        throw new Error(
          wallets.length === 0
            ? "No wallet found. Install MetaMask to continue."
            : "Choose which wallet to connect."
        );
      }
      const { address, contract } = await connectWallet(target.provider);
      setWallet(target);
      setAccount(address);
      return contract;
    },
    [wallet, wallets.length]
  );

  return { wallets, wallet, account, connect };
}
