import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

const INTERACTIVE = "a, button, input, label, select, textarea, [role='button']";

const VARIANTS = {
  default: { width: 14, height: 14, backgroundColor: "#F5F1EA", borderWidth: 0 },
  interactive: { width: 46, height: 46, backgroundColor: "#F5F1EA", borderWidth: 0 },
  drop: { width: 78, height: 78, backgroundColor: "rgba(245,241,234,0)", borderWidth: 1 },
};

/**
 * Circle that trails the pointer with spring lag.
 *
 * mix-blend-difference does the inverting for free: over the cream ground the
 * cream-filled circle reads near-black, and over dark text it reads light.
 * Only mounted for fine pointers, so touch devices are untouched.
 */
export default function Cursor() {
  const [enabled, setEnabled] = useState(false);
  const [variant, setVariant] = useState("default");

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const springX = useSpring(x, { stiffness: 480, damping: 38, mass: 0.55 });
  const springY = useSpring(y, { stiffness: 480, damping: 38, mass: 0.55 });

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)");
    const apply = () => setEnabled(fine.matches);
    apply();
    fine.addEventListener("change", apply);
    return () => fine.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;

    document.body.classList.add("cursor-hidden");

    const onMove = (event) => {
      x.set(event.clientX);
      y.set(event.clientY);
    };

    const onOver = (event) => {
      const target = event.target;
      if (!target?.closest) return;
      if (target.closest("[data-cursor='drop']")) setVariant("drop");
      else if (target.closest(INTERACTIVE)) setVariant("interactive");
      else setVariant("default");
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerover", onOver, { passive: true });

    return () => {
      document.body.classList.remove("cursor-hidden");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerover", onOver);
    };
  }, [enabled, x, y]);

  if (!enabled) return null;

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[100] mix-blend-difference"
      style={{ x: springX, y: springY }}
    >
      <motion.div
        animate={variant}
        variants={VARIANTS}
        initial="default"
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
        className="flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-cream"
      >
        <motion.svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          animate={{ opacity: variant === "drop" ? 1 : 0 }}
          transition={{ duration: 0.18 }}
        >
          <path d="M12 6v12M6 12h12" stroke="#F5F1EA" strokeWidth="1.25" strokeLinecap="round" />
        </motion.svg>
      </motion.div>
    </motion.div>
  );
}
