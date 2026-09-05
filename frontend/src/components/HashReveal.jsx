import { motion } from "motion/react";

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.008 } },
};

const character = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.18 } },
};

/**
 * Reveals a hash one character at a time.
 * The animated spans are hidden from assistive tech; the full value is exposed
 * once via aria-label so a screen reader reads it as a single string.
 */
export default function HashReveal({ value, className = "" }) {
  if (!value) return null;

  return (
    <motion.p
      key={value}
      variants={container}
      initial="hidden"
      animate="visible"
      className={className}
      aria-label={value}
    >
      {value.split("").map((char, index) => (
        <motion.span key={`${index}-${char}`} variants={character} aria-hidden="true">
          {char}
        </motion.span>
      ))}
    </motion.p>
  );
}
