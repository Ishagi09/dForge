import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import CertificateCard from "../components/CertificateCard";
import FileHashInput from "../components/FileHashInput";
import Verdict from "../components/Verdict";
import { sha256File } from "../lib/hash";
import { describeError, getReadContract } from "../lib/contract";
import { formatTimestamp, ZERO_ADDRESS } from "../lib/status";

const list = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.2 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

export default function Verify() {
  const [file, setFile] = useState(null);
  const [fileHash, setFileHash] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  async function onFile(selected) {
    setError("");
    setResult(null);
    setFileHash("");
    setFile(selected ?? null);
    if (!selected) return;

    setBusy(true);
    try {
      const hash = await sha256File(selected);
      setFileHash(hash);

      const contract = getReadContract();
      const [valid, status, certificateId, cert] = await contract.verifyByFileHash(hash);
      setResult({ valid, status: Number(status), certificateId, cert });
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-20">
      <section>
        <p className="micro text-ink/40">Verification</p>
        <h2 className="display mt-4 text-4xl">Verify a certificate</h2>
        <p className="mt-6 max-w-md text-[15px] leading-[1.75] text-ink/60">
          The file is hashed in your browser and matched against the contract. It is never
          uploaded anywhere.
        </p>

        <div className="mt-10">
          <FileHashInput file={file} fileHash={fileHash} busy={busy} onFile={onFile} />
        </div>

        {busy && <p className="mt-6 text-[13px] text-ink/45">Checking on-chain…</p>}

        {error && (
          <p className="mt-6 border-l-2 border-[#A32118] py-1 pl-4 text-[14px] leading-relaxed text-[#A32118]">
            {error}
          </p>
        )}
      </section>

      <AnimatePresence mode="wait">
        {result && !busy && (
          <motion.div
            key={`${result.certificateId}-${result.status}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="space-y-14"
          >
            <Verdict status={result.status} />

            {result.status === 1 ? (
              <CertificateCard cert={result.cert} certificateId={result.certificateId} />
            ) : (
              result.status !== 0 && <DetailList result={result} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Revoked and Expired still have a real record worth reading, set quietly. */
function DetailList({ result }) {
  const { cert } = result;

  return (
    <motion.dl
      variants={list}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 gap-8 border-t border-ink/10 pt-10 sm:grid-cols-2"
    >
      <Entry label="Recipient">{cert.recipientName}</Entry>
      <Entry label="Course">{cert.courseName}</Entry>
      <Entry label="Issued">{formatTimestamp(cert.issuedAt)}</Entry>
      <Entry label="Expires">{formatTimestamp(cert.expiresAt)}</Entry>
      <Entry label="Issuer" mono>
        {cert.issuer}
      </Entry>
      {cert.recipient !== ZERO_ADDRESS && (
        <Entry label="Holder" mono>
          {cert.recipient}
        </Entry>
      )}
      <motion.div variants={item} className="sm:col-span-2">
        <dt className="micro text-ink/40">Certificate ID</dt>
        <dd className="mt-2 break-all font-mono text-[11px] tracking-[0.08em] text-ink/55">
          {result.certificateId}
        </dd>
      </motion.div>
    </motion.dl>
  );
}

function Entry({ label, children, mono = false }) {
  return (
    <motion.div variants={item}>
      <dt className="micro text-ink/40">{label}</dt>
      <dd
        className={`mt-2 break-all ${
          mono ? "font-mono text-[11px] tracking-[0.08em] text-ink/70" : "text-[15px]"
        }`}
      >
        {children}
      </dd>
    </motion.div>
  );
}
