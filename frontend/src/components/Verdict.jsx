import { motion } from "framer-motion";
import DrawRule from "./DrawRule";
import { STATUS_NOTES, STATUS_THEME } from "../lib/status";

/** The one loud moment on the page: the answer, set very large in the display serif. */
export default function Verdict({ status, note = true }) {
  const theme = STATUS_THEME[status];

  return (
    <div>
      <DrawRule />

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="micro mt-10 text-ink/40"
      >
        Result
      </motion.p>

      <motion.h2
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 190, damping: 15, delay: 0.12 }}
        className="display mt-5 origin-left text-7xl sm:text-8xl"
        style={{ color: theme.color }}
      >
        {theme.word}
      </motion.h2>

      {note && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.34, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8 max-w-md text-[15px] leading-[1.7] text-ink/60"
        >
          {STATUS_NOTES[status]}
        </motion.p>
      )}
    </div>
  );
}
