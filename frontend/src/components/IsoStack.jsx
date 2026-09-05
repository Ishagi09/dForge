import { motion } from "motion/react";

/**
 * Large neon wireframe illustration for the closing dark section: a stack of
 * isometric plates standing in for a chain of blocks, each layer drawing itself
 * from the bottom up.
 */

const LAYERS = [0, 1, 2, 3, 4];
const STEP = 34;
const BASE_Y = 250;

function plate(y) {
  return `M150 ${y - 46} L280 ${y} L150 ${y + 46} L20 ${y} Z`;
}

export default function IsoStack({ className = "" }) {
  return (
    <svg
      viewBox="0 0 300 320"
      aria-hidden="true"
      className={`h-auto w-full max-w-sm ${className}`}
      fill="none"
    >
      <defs>
        <filter id="iso-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g filter="url(#iso-glow)">
        {LAYERS.map((index) => {
          const y = BASE_Y - index * STEP;
          return (
            <motion.g
              key={index}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.55, delay: index * 0.09, ease: [0.16, 1, 0.3, 1] }}
            >
              <path
                d={plate(y)}
                stroke="#FF6B2C"
                strokeWidth="1.25"
                strokeOpacity={0.45 + index * 0.11}
                fill="#FF6B2C"
                fillOpacity={0.04}
              />
              {/* Vertical struts at the corners. */}
              {index < LAYERS.length - 1 && (
                <g stroke="#FF6B2C" strokeWidth="1" strokeOpacity="0.35">
                  <path d={`M20 ${y} L20 ${y - STEP}`} />
                  <path d={`M280 ${y} L280 ${y - STEP}`} />
                  <path d={`M150 ${y + 46} L150 ${y + 46 - STEP}`} />
                </g>
              )}
            </motion.g>
          );
        })}
      </g>
    </svg>
  );
}
