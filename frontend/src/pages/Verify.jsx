import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import CertificateCard from "../components/CertificateCard";
import FileHashInput from "../components/FileHashInput";
import PageShell from "../components/PageShell";
import Verdict from "../components/Verdict";
import { DarkSection } from "../components/Section";
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

  const resultSection = (
    <AnimatePresence mode="wait">
      {result && !busy && (
        <motion.div
          key={`${result.certificateId}-${result.status}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <DarkSection className="py-20 sm:py-28">
            <Verdict status={result.status} />

            <div className="mt-14">
              {result.status === 1 ? (
                <CertificateCard cert={result.cert} certificateId={result.certificateId} />
              ) : (
                result.status !== 0 && <DetailList result={result} />
              )}
            </div>
          </DarkSection>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <PageShell
      micro="Upload"
      heading={
        <>
          Drop the file.
          <br />
          Read the answer.
        </>
      }
      result={resultSection}
    >
      <FileHashInput file={file} fileHash={fileHash} busy={busy} onFile={onFile} />

      {busy && <p className="mt-6 text-[13px] text-night/50">Checking on-chain…</p>}

      {error && (
        <p className="mt-6 border-l-2 border-night py-1 pl-4 text-[14px] leading-relaxed text-night/70">
          {error}
        </p>
      )}
    </PageShell>
  );
}

/** Revoked and Expired still have a real record worth reading. */
function DetailList({ result }) {
  const { cert } = result;

  return (
    <motion.dl
      variants={list}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 gap-8 border-t border-white/12 pt-10 sm:grid-cols-2"
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
        <dt className="micro text-white/35">Certificate ID</dt>
        <dd className="mt-2 break-all font-mono text-[11px] tracking-[0.06em] text-white/50">
          {result.certificateId}
        </dd>
      </motion.div>
    </motion.dl>
  );
}

function Entry({ label, children, mono = false }) {
  return (
    <motion.div variants={item}>
      <dt className="micro text-white/35">{label}</dt>
      <dd
        className={`mt-2 break-all ${
          mono ? "font-mono text-[11px] tracking-[0.06em] text-white/70" : "text-[14px] text-white/85"
        }`}
      >
        {children}
      </dd>
    </motion.div>
  );
}
