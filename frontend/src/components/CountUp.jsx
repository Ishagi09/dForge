import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "motion/react";

/** Counts from 0 to `value` once the element scrolls into view. */
export default function CountUp({ value, duration = 1.1, className = "" }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const target = Number(value) || 0;

    if (!inView) return undefined;
    if (reduce) {
      setShown(target);
      return undefined;
    }

    const controls = animate(0, target, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => setShown(Math.round(latest)),
    });
    return () => controls.stop();
  }, [inView, value, duration, reduce]);

  return (
    <span ref={ref} className={`tabular ${className}`}>
      {shown}
    </span>
  );
}
