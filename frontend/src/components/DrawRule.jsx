import { motion } from "framer-motion";

/** Hairline rule that draws itself left to right. */
export default function DrawRule({ delay = 0, className = "" }) {
  return (
    <motion.div
      className={`h-px origin-left bg-ink/10 ${className}`}
      initial={{ scaleX: 0 }}
      animate={{ scaleX: 1 }}
      transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
    />
  );
}
