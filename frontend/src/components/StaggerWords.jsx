import { motion } from "motion/react";

/** Splits a line into words that fade up one after another. */
export default function StaggerWords({ text, startDelay = 0, step = 0.08, className = "" }) {
  const words = text.split(" ");

  return (
    <span className={className} aria-label={text}>
      {words.map((word, index) => (
        <motion.span
          key={`${index}-${word}`}
          aria-hidden="true"
          className="inline-block"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.65,
            delay: startDelay + index * step,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          {word}
          {index < words.length - 1 ? " " : ""}
        </motion.span>
      ))}
    </span>
  );
}
