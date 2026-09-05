import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { connectWallet, discoverWallets, silentAccounts } from "./contract";

const WalletContext = createContext(null);

/**
 * One wallet connection for the whole app. Previously each page held its own
 * hook state, so connecting in the header would not have been visible to the
 * page beneath it.
 */
export function WalletProvider({ children }) {
  const [wallets, setWallets] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [account, setAccount] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const found = await discoverWallets();
      if (cancelled) return;
      setWallets(found);
      if (found.length === 1) setWallet(found[0]);

      // Pick up an already-authorized account without prompting.
      for (const entry of found) {
        const accounts = await silentAccounts(entry.provider);
        if (accounts.length > 0) {
          if (cancelled) return;
          setWallet(entry);
          setAccount(accounts[0]);
          return;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  const value = useMemo(
    () => ({ wallets, wallet, account, connect }),
    [wallets, wallet, account, connect]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside <WalletProvider>");
  return ctx;
}
