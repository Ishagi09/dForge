import { AnimatePresence, motion } from "motion/react";

/**
 * Oversized outlined word sitting behind the heading and bleeding off the right
 * edge. Decorative only, so it is hidden from assistive tech and from narrow
 * viewports where there is no room for it to run.
 */
export default function GhostText({ word }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 right-0 hidden select-none items-center overflow-hidden lg:flex"
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={word}
          initial={{ opacity: 0, x: 70 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="display translate-x-[22%] whitespace-nowrap text-[17vw] leading-none"
          style={{ color: "transparent", WebkitTextStroke: "1px rgba(255,255,255,0.055)" }}
        >
          {word}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
