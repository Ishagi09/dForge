import { useEffect, useState } from "react";
import { getReadProvider } from "./contract";

const POLL_MS = 12_000; // roughly one Sepolia block

/** Latest Sepolia block, polled. `null` until the first response. */
export function useBlockNumber() {
  const [block, setBlock] = useState(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const next = await getReadProvider().getBlockNumber();
        if (cancelled) return;
        setBlock(next);
        setOffline(false);
      } catch {
        if (!cancelled) setOffline(true);
      }
    }

    poll();
    const timer = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return { block, offline };
}
