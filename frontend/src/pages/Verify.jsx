import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ExternalLink, FileSearch } from "lucide-react";
import FileHashInput from "../components/FileHashInput";
import { sha256File } from "../lib/hash";
import { describeError, EXPLORER, getReadContract, shortHash } from "../lib/contract";
import { formatTimestamp, STATUS_THEME, ZERO_ADDRESS } from "../lib/status";

// Card classes are copied rather than shared: the Dashboard owns its own copy
// and must not be refactored into a common component.
const CARD = "rounded-lg border border-line bg-card";
const CARD_HEAD =
  "flex items-center justify-between gap-4 border-b border-line px-5 py-4";

function Row({ label, children, mono = false }) {
  return (
    <div>
      <dt className="text-[11px] text-muted">{label}</dt>
      <dd className={`mt-1.5 break-all ${mono ? "font-mono text-[12px]" : "text-[13.5px]"}`}>
        {children}
      </dd>
    </div>
  );
}

export default function Verify() {
  const [file, setFile] = useState(null);
  const [fileHash, setFileHash] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  // Each drop claims a ticket. A slower earlier run resuming after a newer one
  // started must not write its hash or result over the newer file's.
  const runId = useRef(0);

  async function onFile(selected) {
    const id = ++runId.current;

    setError("");
    setResult(null);
    setFileHash("");
    setFile(selected ?? null);
    if (!selected) return;

    setBusy(true);
    try {
      const hash = await sha256File(selected);
      if (runId.current !== id) return;
      setFileHash(hash);

      const contract = getReadContract();
      const [valid, status, certificateId, cert] = await contract.verifyByFileHash(hash);
      if (runId.current !== id) return;
      setResult({ valid, status: Number(status), certificateId, cert });
    } catch (err) {
      if (runId.current !== id) return;
      setError(describeError(err));
    } finally {
      if (runId.current === id) setBusy(false);
    }
  }

  const theme = result ? STATUS_THEME[result.status] : null;

  return (
    <div className="px-6 py-7 sm:px-8">
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        <p className="micro text-muted">Verify</p>
        <h1 className="mt-2.5 text-[26px] font-semibold tracking-tight">Verify a certificate</h1>
        <p className="mt-1.5 max-w-[76ch] text-[14px] text-muted">
          The file is hashed with SHA-256 in your browser, then checked against the contract. The
          file itself never leaves your device.
        </p>
      </motion.header>

      <div className="mt-7 grid grid-cols-1 gap-4 lg:grid-cols-[1.55fr_1fr]">
        {/* Left — the dropzone */}
        <section className={CARD}>
          <header className={CARD_HEAD}>
            <h2 className="micro text-night">Document</h2>
          </header>

          <div className="p-5">
            <FileHashInput file={file} fileHash={fileHash} busy={busy} onFile={onFile} />

            {busy && <p className="mt-5 text-[13px] text-muted">Checking on-chain…</p>}

            {error && (
              <p className="mt-5 rounded-md border border-missing/30 bg-missing/[0.06] px-4 py-3 text-[13px] text-missing">
                {error}
              </p>
            )}
          </div>
        </section>

        {/* Right — persistent result card */}
        <section className={CARD}>
          <header className={CARD_HEAD}>
            <h2 className="micro text-night">Result</h2>
            {theme && (
              <span
                className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-[10.5px] font-medium uppercase tracking-wider"
                style={{ background: theme.color, color: "#FFFFFF" }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.85)" }} />
                {theme.word}
              </span>
            )}
          </header>

          <AnimatePresence mode="wait">
            {!result ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col items-center justify-center px-5 py-14 text-center"
              >
                <FileSearch size={22} strokeWidth={1.5} className="text-muted/50" />
                <p className="mt-3.5 text-[13.5px] text-muted">No file checked yet</p>
                <p className="mt-1.5 max-w-[34ch] text-[12px] text-muted/60">
                  Drop a certificate on the left to check it against the chain.
                </p>
              </motion.div>
            ) : (
              <motion.dl
                key={`${result.certificateId}-${result.status}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-4 p-5"
              >
                <Row label="SHA-256" mono>
                  <span className="text-[11px] leading-relaxed text-muted">{fileHash}</span>
                </Row>

                {result.status === 0 ? (
                  <p className="rounded-md border border-line bg-secondary px-4 py-3 text-[12.5px] leading-relaxed text-muted">
                    No certificate on the chain carries this hash. The document was never issued, or
                    it has been altered since it was.
                  </p>
                ) : (
                  <>
                    <Row label="Recipient">{result.cert.recipientName}</Row>
                    <Row label="Course">{result.cert.courseName}</Row>
                    <Row label="Issued">{formatTimestamp(result.cert.issuedAt)}</Row>
                    <Row label="Expires">{formatTimestamp(result.cert.expiresAt)}</Row>
                    <Row label="Issuer" mono>
                      {shortHash(result.cert.issuer, 6, 4)}
                    </Row>
                    {result.cert.recipient !== ZERO_ADDRESS && (
                      <Row label="Holder" mono>
                        {shortHash(result.cert.recipient, 6, 4)}
                      </Row>
                    )}
                    <Row label="Certificate ID" mono>
                      <span className="text-[11px] text-muted">{result.certificateId}</span>
                    </Row>

                    <a
                      href={`${EXPLORER}/address/${result.cert.issuer}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 pt-1 text-[12.5px] text-night underline decoration-line underline-offset-4 transition-colors hover:decoration-night"
                    >
                      View issuer on Etherscan <ExternalLink size={13} strokeWidth={1.7} />
                    </a>
                  </>
                )}
              </motion.dl>
            )}
          </AnimatePresence>
        </section>
      </div>
    </div>
  );
}
