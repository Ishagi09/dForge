import { useEffect, useState } from "react";

/**
 * Current unix time, re-published on an interval so relative timestamps
 * ("6h ago") age during a long session instead of freezing at mount.
 */
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const timer = setInterval(() => setNow(Math.floor(Date.now() / 1000)), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}
