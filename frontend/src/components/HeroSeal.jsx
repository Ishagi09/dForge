import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

const HEX = "0123456789abcdef";

function randomHex(length) {
  let out = "";
  for (let i = 0; i < length; i += 1) out += HEX[Math.floor(Math.random() * 16)];
  return out;
}

/**
 * A document being sealed: the page settles, two rings counter-rotate around it,
 * and a hash resolves underneath - a few glyphs churn on each tick rather than
 * the whole string, so it reads as digits locking into place.
 */
export default function HeroSeal() {
  const reduce = useReducedMotion();
  const [hash, setHash] = useState(() => randomHex(24));

  useEffect(() => {
    if (reduce) return undefined;
    const timer = setInterval(() => {
      setHash((prev) => {
        const chars = prev.split("");
        for (let i = 0; i < 3; i += 1) {
          chars[Math.floor(Math.random() * chars.length)] = HEX[Math.floor(Math.random() * 16)];
        }
        return chars.join("");
      });
    }, 110);
    return () => clearInterval(timer);
  }, [reduce]);

  const spin = (duration, direction = 1) =>
    reduce
      ? {}
      : {
          animate: { rotate: 360 * direction },
          transition: { duration, repeat: Infinity, ease: "linear" },
        };

  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-[380px] select-none">
      <svg viewBox="0 0 320 320" className="h-auto w-full overflow-visible">
        <defs>
          <linearGradient id="seal-edge" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FF6B2C" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#FF6B2C" stopOpacity="0.15" />
          </linearGradient>
        </defs>

        {/* Counter-rotating seal rings */}
        <motion.g {...spin(28)} style={{ originX: "160px", originY: "160px" }}>
          <circle
            cx="160"
            cy="160"
            r="128"
            fill="none"
            stroke="url(#seal-edge)"
            strokeWidth="1"
            strokeDasharray="3 9"
          />
        </motion.g>
        <motion.g {...spin(44, -1)} style={{ originX: "160px", originY: "160px" }}>
          <circle
            cx="160"
            cy="160"
            r="112"
            fill="none"
            stroke="#FF6B2C"
            strokeOpacity="0.28"
            strokeWidth="1"
            strokeDasharray="28 14"
          />
        </motion.g>

        {/* The document */}
        <motion.g
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.g
            animate={reduce ? {} : { y: [0, -6, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          >
            <rect
              x="104"
              y="88"
              width="112"
              height="144"
              rx="3"
              fill="#121214"
              stroke="#FFFFFF"
              strokeOpacity="0.14"
            />
            {[112, 128, 144, 160, 176].map((y, i) => (
              <motion.rect
                key={y}
                x="120"
                y={y}
                width={i === 4 ? 48 : 80}
                height="4"
                rx="2"
                fill="#FFFFFF"
                fillOpacity="0.14"
                initial={{ scaleX: 0, originX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.5, delay: 0.3 + i * 0.09, ease: [0.16, 1, 0.3, 1] }}
              />
            ))}

            {/* Seal stamp */}
            <circle cx="160" cy="206" r="17" fill="#FF6B2C" fillOpacity="0.12" />
            <circle cx="160" cy="206" r="17" fill="none" stroke="#FF6B2C" strokeOpacity="0.7" />
            <motion.path
              d="M152 206 l6 6 l11 -12"
              fill="none"
              stroke="#FF6B2C"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, delay: 1, ease: "easeOut" }}
            />
          </motion.g>
        </motion.g>
      </svg>

      {/* The hash resolving beneath */}
      <p className="mt-2 break-all text-center font-mono text-[11px] leading-relaxed tracking-[0.12em] text-accent/70">
        {hash}
      </p>
    </div>
  );
}
