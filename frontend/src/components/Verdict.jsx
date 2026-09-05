import { motion } from "motion/react";
import { STATUS_NOTES, STATUS_THEME } from "../lib/status";

/** The answer, set as large as the page allows, in its own semantic colour. */
export default function Verdict({ status, note = true }) {
  const theme = STATUS_THEME[status];

  return (
    <div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="micro text-white/40"
      >
        Result
      </motion.p>

      <motion.h2
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 190, damping: 15, delay: 0.1 }}
        className="display mt-6 origin-left text-[clamp(2rem,7vw,4.5rem)] leading-none"
        style={{ color: theme.color, textShadow: `0 0 80px ${theme.color}55` }}
      >
        {theme.word}
      </motion.h2>

      {note && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.32, ease: [0.16, 1, 0.3, 1] }}
          className="mt-7 max-w-md text-[14px] leading-relaxed text-white/50"
        >
          {STATUS_NOTES[status]}
        </motion.p>
      )}
    </div>
  );
}
