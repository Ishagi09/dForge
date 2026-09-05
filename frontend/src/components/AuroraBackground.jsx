import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";

/**
 * Slow gradient mesh behind everything. Three large blurred fields drift on
 * different periods so the pattern never visibly repeats, and the whole layer
 * scrolls slower than the content for parallax depth.
 */
export default function AuroraBackground() {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 2000], [0, 260]);

  const drift = (dx, dy, duration) =>
    reduce
      ? {}
      : {
          animate: { x: [0, dx, 0], y: [0, dy, 0] },
          transition: { duration, repeat: Infinity, ease: "easeInOut" },
        };

  return (
    <motion.div
      aria-hidden="true"
      style={{ y: reduce ? 0 : y }}
      className="pointer-events-none fixed inset-0 -z-20 overflow-hidden"
    >
      <motion.div
        {...drift(120, -80, 26)}
        className="absolute -left-[10%] top-[-15%] h-[70vh] w-[70vw] rounded-full blur-[120px]"
        style={{ background: "radial-gradient(circle, rgba(255,107,44,0.16), transparent 65%)" }}
      />
      <motion.div
        {...drift(-140, 90, 34)}
        className="absolute right-[-15%] top-[25%] h-[65vh] w-[60vw] rounded-full blur-[130px]"
        style={{ background: "radial-gradient(circle, rgba(120,90,255,0.10), transparent 65%)" }}
      />
      <motion.div
        {...drift(90, 110, 42)}
        className="absolute bottom-[-20%] left-[20%] h-[60vh] w-[65vw] rounded-full blur-[140px]"
        style={{ background: "radial-gradient(circle, rgba(255,107,44,0.09), transparent 65%)" }}
      />
    </motion.div>
  );
}
