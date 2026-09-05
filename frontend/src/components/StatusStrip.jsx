import { useEffect, useState } from "react";
import { motion } from "framer-motion";
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
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-cream/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-6 px-8 py-3 sm:px-12 lg:px-16">
        <a
          href={`${EXPLORER}/address/${CONTRACT_ADDRESS}#code`}
          target="_blank"
          rel="noreferrer"
          className="group flex min-w-0 items-baseline gap-3"
        >
          <span className="hidden font-mono text-[9px] uppercase tracking-[0.24em] text-ink/35 sm:inline">
            Contract
          </span>
          <span className="truncate font-mono text-[10px] tracking-[0.08em] text-ink/55 transition-colors group-hover:text-ink">
            {CONTRACT_ADDRESS}
          </span>
        </a>

        <div className="flex shrink-0 items-center gap-2.5">
          <motion.span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: offline ? "#A32118" : "#D2560B" }}
            animate={offline ? { opacity: 1 } : { opacity: [1, 0.25, 1] }}
            transition={
              offline ? { duration: 0 } : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
            }
          />
          <span className="font-mono text-[10px] tracking-[0.12em] text-ink/55">
            {offline ? "RPC UNREACHABLE" : block ? `BLOCK ${block.toLocaleString()}` : "SYNCING"}
          </span>
        </div>
      </div>
    </div>
  );
}
