import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "react-router-dom";

const WORDS = {
  "/verify": "VERIFY",
  "/issue": "ISSUE",
  "/revoke": "REVOKE",
};

/**
 * Oversized outlined word bleeding off the right edge, filling the empty half of
 * the spread. Purely decorative, so it is hidden from assistive tech and from
 * narrow viewports where there is no empty space to fill.
 */
export default function GhostWord() {
  const { pathname } = useLocation();
  const word = WORDS[pathname] ?? "VERIFY";

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-y-0 right-0 hidden select-none items-center overflow-hidden lg:flex"
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={word}
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="display translate-x-[18%] whitespace-nowrap text-[20vw] leading-none"
          style={{
            color: "transparent",
            WebkitTextStroke: "1px rgba(26, 24, 21, 0.10)",
          }}
        >
          {word}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
