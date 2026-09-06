import { motion } from "motion/react";

/** Fade + slide as the block enters the viewport. Fires once. */
export default function Reveal({ children, delay = 0, y = 22, className = "" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Hairline that draws itself left to right when scrolled into view. */
export function DrawRule({ delay = 0, className = "" }) {
  return (
    <motion.div
      className={`h-px origin-left bg-line ${className}`}
      initial={{ scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
    />
  );
}
