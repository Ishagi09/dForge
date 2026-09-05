import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { CONTRACT_ADDRESS, EXPLORER, getReadProvider } from "../lib/contract";

const POLL_MS = 12_000; // roughly one Sepolia block

/** Persistent strip: what contract we are reading, and proof the chain is live. */
export default function StatusStrip() {
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

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-ink/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-2.5 sm:px-10 lg:px-16">
        <a
          href={`${EXPLORER}/address/${CONTRACT_ADDRESS}#code`}
          target="_blank"
          rel="noreferrer"
          className="group flex min-w-0 items-center gap-3"
        >
          <span className="micro hidden text-white/30 sm:inline">Contract</span>
          <span className="truncate font-mono text-[10px] tracking-[0.06em] text-white/50 transition-colors group-hover:text-white">
            {CONTRACT_ADDRESS}
          </span>
        </a>

        <div className="flex shrink-0 items-center gap-2.5">
          <motion.span
            className={`h-1.5 w-1.5 rounded-full ${offline ? "bg-white/40" : "bg-neon"}`}
            animate={offline ? { opacity: 1 } : { opacity: [1, 0.2, 1] }}
            transition={
              offline ? { duration: 0 } : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
            }
          />
          <span className="micro text-white/50">
            {offline ? "RPC unreachable" : block ? `Block ${block.toLocaleString()}` : "Syncing"}
          </span>
        </div>
      </div>
    </div>
  );
}
