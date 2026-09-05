import { motion } from "framer-motion";
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

/** Hairline stamp - the single accent element on the Verify screen. */
function Stamp() {
  return (
    <motion.div
      initial={{ opacity: 0, rotate: -16, scale: 0.9 }}
      animate={{ opacity: 1, rotate: -9, scale: 1 }}
      transition={{ type: "spring", stiffness: 160, damping: 14, delay: 0.4 }}
      className="shrink-0"
      aria-hidden="true"
    >
      <svg viewBox="0 0 96 96" className="h-20 w-20" fill="none">
        <circle cx="48" cy="48" r="46" stroke="#D2560B" strokeOpacity="0.35" />
        <circle cx="48" cy="48" r="39" stroke="#D2560B" strokeOpacity="0.55" />
        <motion.path
          d="M34 49 L44 59 L63 39"
          stroke="#D2560B"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, delay: 0.75, ease: "easeOut" }}
        />
      </svg>
    </motion.div>
  );
}

function Entry({ label, children }) {
  return (
    <motion.div variants={item}>
      <dt className="micro text-ink/40">{label}</dt>
      <dd className="mt-2 text-[15px] leading-relaxed">{children}</dd>
    </motion.div>
  );
}

/** The Valid case, set as a document rather than a data table. */
export default function CertificateCard({ cert, certificateId }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="border border-ink/10"
    >
      <div className="border-b border-ink/10 px-8 py-10 sm:px-10">
        <div className="flex items-start justify-between gap-8">
          <div className="min-w-0">
            <p className="micro text-ink/40">Certificate of completion</p>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              className="mt-10 text-[13px] italic text-ink/45"
            >
              This certifies that
            </motion.p>
            <h3 className="display mt-3 text-5xl sm:text-6xl">
              <motion.span
                className="inline-block"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.46, ease: [0.16, 1, 0.3, 1] }}
              >
                {cert.recipientName}
              </motion.span>
            </h3>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.56, duration: 0.4 }}
              className="mt-8 text-[13px] italic text-ink/45"
            >
              has completed
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.62, ease: [0.16, 1, 0.3, 1] }}
              className="display mt-3 text-3xl sm:text-4xl"
            >
              {cert.courseName}
            </motion.p>
          </div>

          <Stamp />
        </div>
      </div>

      <motion.dl
        variants={list}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 gap-8 px-8 py-8 sm:grid-cols-3 sm:px-10"
      >
        <Entry label="Issued">{formatDate(cert.issuedAt)}</Entry>
        <Entry label="Expires">{formatDate(cert.expiresAt)}</Entry>
        <Entry label="Issuer">
          <a
            className="font-mono text-xs tracking-wider underline decoration-ink/20 underline-offset-4 transition-colors hover:decoration-ink/60"
            href={`${EXPLORER}/address/${cert.issuer}`}
            target="_blank"
            rel="noreferrer"
          >
            {shortHash(cert.issuer, 6, 4)}
          </a>
        </Entry>
        {cert.recipient !== ZERO_ADDRESS && (
          <Entry label="Holder">
            <span className="font-mono text-xs tracking-wider">
              {shortHash(cert.recipient, 6, 4)}
            </span>
          </Entry>
        )}
      </motion.dl>

      <div className="border-t border-ink/10 px-8 py-6 sm:px-10">
        <p className="micro text-ink/40">Certificate ID</p>
        <p className="mt-2 break-all font-mono text-[11px] tracking-[0.08em] text-ink/55">
          {certificateId}
        </p>
      </div>
    </motion.article>
  );
}
