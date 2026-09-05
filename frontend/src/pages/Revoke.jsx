import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import FileHashInput from "../components/FileHashInput";
import PageShell from "../components/PageShell";
import Verdict from "../components/Verdict";
import WalletPicker from "../components/WalletPicker";
import { DarkSection } from "../components/Section";
import { Pill } from "../components/Pill";
import { sha256File } from "../lib/hash";
import { useWallet } from "../lib/useWallet";
import { describeError, EXPLORER, getReadContract, shortHash } from "../lib/contract";
import { formatTimestamp } from "../lib/status";

// A certificate can be revoked only if it exists and is not already revoked.
// Expired certificates are still revocable - expiry and revocation are independent.
const REVOCABLE = new Set([1, 3]);

const BLOCKED_REASON = {
  0: "There is no certificate on the chain for this document, so there is nothing to revoke.",
  2: "This certificate has already been revoked. Revocation is permanent and cannot be undone.",
};

const list = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.2 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

export default function Revoke() {
  const { wallets, wallet, account, connect } = useWallet();
  const [file, setFile] = useState(null);
  const [fileHash, setFileHash] = useState("");
  const [busy, setBusy] = useState(false);
  const [lookup, setLookup] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  async function readStatus(hash) {
    const contract = getReadContract();
    const [, status, certificateId, cert] = await contract.verifyByFileHash(hash);
    return { status: Number(status), certificateId, cert };
  }

  async function onFile(selected) {
    setError("");
    setResult(null);
    setLookup(null);
    setFileHash("");
    setFile(selected ?? null);
    if (!selected) return;

    setBusy(true);
    try {
      const hash = await sha256File(selected);
      setFileHash(hash);
      setLookup(await readStatus(hash));
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  async function onSelectWallet(entry) {
    setError("");
    try {
      await connect(entry);
    } catch (err) {
      setError(describeError(err));
    }
  }

  async function onRevoke() {
    setError("");
    setResult(null);
    setSubmitting(true);
    try {
      const contract = await connect();
      const tx = await contract.revokeByFileHash(fileHash);
      await tx.wait();

      setResult({ txHash: tx.hash });
      setLookup(await readStatus(fileHash)); // reflect the new Revoked state
    } catch (err) {
      setError(describeError(err));
    } finally {
      setSubmitting(false);
    }
  }

  const canRevoke = lookup && REVOCABLE.has(lookup.status) && !submitting && !busy;

  const resultSection = (
    <AnimatePresence mode="wait">
      {lookup && !busy && (
        <motion.div
          key={`${lookup.certificateId}-${lookup.status}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <DarkSection className="py-20 sm:py-28">
            <Verdict status={lookup.status} note={false} />

            {lookup.status !== 0 && (
              <motion.dl
                variants={list}
                initial="hidden"
                animate="visible"
                className="mt-14 grid grid-cols-1 gap-8 border-t border-white/12 pt-10 sm:grid-cols-2"
              >
                <motion.div variants={item}>
                  <dt className="micro text-white/35">Recipient</dt>
                  <dd className="mt-2 text-[14px] text-white/85">{lookup.cert.recipientName}</dd>
                </motion.div>
                <motion.div variants={item}>
                  <dt className="micro text-white/35">Course</dt>
                  <dd className="mt-2 text-[14px] text-white/85">{lookup.cert.courseName}</dd>
                </motion.div>
                <motion.div variants={item}>
                  <dt className="micro text-white/35">Issued</dt>
                  <dd className="mt-2 text-[14px] text-white/85">
                    {formatTimestamp(lookup.cert.issuedAt)}
                  </dd>
                </motion.div>
                <motion.div variants={item}>
                  <dt className="micro text-white/35">Issuer</dt>
                  <dd className="mt-2 break-all font-mono text-[11px] tracking-[0.06em] text-white/70">
                    {lookup.cert.issuer}
                  </dd>
                </motion.div>
              </motion.dl>
            )}

            <div className="mt-12 border-t border-white/12 pt-10">
              {canRevoke ? (
                <>
                  <p className="max-w-md text-[14px] leading-relaxed text-white/50">
                    Revoking is permanent. The certificate stays on the chain, but every future
                    verification will report it as revoked.
                  </p>
                  <div className="mt-8">
                    <Pill onClick={onRevoke} disabled={submitting}>
                      {submitting ? "Revoking…" : "Revoke this certificate"}
                    </Pill>
                  </div>
                </>
              ) : (
                <p className="max-w-md text-[14px] leading-relaxed text-white/50">
                  {BLOCKED_REASON[lookup.status]}
                </p>
              )}

              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="mt-10"
                >
                  <p className="micro text-white/35">Transaction</p>
                  <a
                    className="mt-2 inline-block break-all font-mono text-[11px] tracking-[0.06em] text-white/70 underline decoration-white/25 underline-offset-4 transition-colors hover:text-white"
                    href={`${EXPLORER}/tx/${result.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {result.txHash}
                  </a>
                </motion.div>
              )}
            </div>
          </DarkSection>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <PageShell
      micro="Revoke"
      heading={
        <>
          Withdraw a record
          <br />
          you issued.
        </>
      }
      result={resultSection}
    >
      <div className="border-b border-night/10 pb-8">
        <WalletPicker
          wallets={wallets}
          wallet={wallet}
          account={account}
          onSelect={onSelectWallet}
        />
        {account && (
          <p className="mt-4 font-mono text-[11px] tracking-[0.06em] text-night/55">
            {shortHash(account, 6, 4)}
          </p>
        )}
      </div>

      <div className="mt-10">
        <FileHashInput file={file} fileHash={fileHash} busy={busy} onFile={onFile} />
      </div>

      {busy && <p className="mt-6 text-[13px] text-night/50">Looking up on-chain…</p>}

      {error && (
        <p className="mt-6 border-l-2 border-night py-1 pl-4 text-[14px] leading-relaxed text-night/70">
          {error}
        </p>
      )}
    </PageShell>
  );
}
