import { motion } from "motion/react";
import { GlowingEffect } from "./ui/glowing-effect";
import { formatDate, ZERO_ADDRESS } from "../lib/status";
import { EXPLORER, shortHash } from "../lib/contract";

const list = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

function Entry({ label, children }) {
  return (
    <motion.div variants={item}>
      <dt className="micro text-muted">{label}</dt>
      <dd className="mt-2 text-[14px] text-night">{children}</dd>
    </motion.div>
  );
}

/** The Valid case, inside Aceternity's glowing border in the emerald variant. */
export default function CertificateCard({ cert, certificateId }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="sharp relative"
    >
      <GlowingEffect
        variant="emerald"
        disabled={false}
        glow
        blur={0}
        spread={44}
        proximity={72}
        borderWidth={2}
        inactiveZone={0.55}
      />

      <article className="sharp relative border border-line bg-card">
        <div className="border-b border-line px-7 py-9 sm:px-9">
          <p className="micro text-muted">Certificate of completion</p>

          <motion.h3
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.36, ease: [0.16, 1, 0.3, 1] }}
            className="h-display mt-8 text-4xl sm:text-5xl"
          >
            {cert.recipientName}
          </motion.h3>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.48, duration: 0.4 }}
            className="mt-5 text-[15px] text-muted"
          >
            {cert.courseName}
          </motion.p>
        </div>

        <motion.dl
          variants={list}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 gap-7 px-7 py-8 sm:grid-cols-4 sm:px-9"
        >
          <Entry label="Issued">{formatDate(cert.issuedAt)}</Entry>
          <Entry label="Expires">{formatDate(cert.expiresAt)}</Entry>
          <Entry label="Issuer">
            <a
              className="font-mono text-[11px] tracking-[0.06em] text-night underline decoration-line underline-offset-4 transition-colors hover:decoration-night"
              href={`${EXPLORER}/address/${cert.issuer}`}
              target="_blank"
              rel="noreferrer"
            >
              {shortHash(cert.issuer, 6, 4)}
            </a>
          </Entry>
          {cert.recipient !== ZERO_ADDRESS && (
            <Entry label="Holder">
              <span className="font-mono text-[11px] tracking-[0.06em]">
                {shortHash(cert.recipient, 6, 4)}
              </span>
            </Entry>
          )}
        </motion.dl>

        <div className="border-t border-line px-7 py-6 sm:px-9">
          <p className="micro text-muted">Certificate ID</p>
          <p className="mt-2 break-all font-mono text-[11px] tracking-[0.06em] text-muted">
            {certificateId}
          </p>
        </div>
      </article>
    </motion.div>
  );
}
