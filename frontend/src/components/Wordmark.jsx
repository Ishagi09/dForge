import { motion } from "motion/react";

/**
 * dFORGE. The lowercase "d" carries the accent and sits tight against the
 * uppercase stem, so the mark reads as one word rather than a letter plus a
 * label. Syncopate's width does the rest.
 */
export default function Wordmark({ className = "", animate = true }) {
  const Tag = animate ? motion.span : "span";
  const motionProps = animate
    ? {
        initial: { opacity: 0, y: 6 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
      }
    : {};

  return (
    <Tag
      {...motionProps}
      aria-label="dForge"
      className={`display inline-flex items-baseline text-[15px] leading-none ${className}`}
    >
      <span aria-hidden="true" className="text-accent">
        d
      </span>
      <span aria-hidden="true" className="tracking-[0.16em] text-night">
        FORGE
      </span>
    </Tag>
  );
}
