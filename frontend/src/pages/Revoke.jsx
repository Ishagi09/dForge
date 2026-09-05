import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import FileHashInput from "../components/FileHashInput";
import WalletPicker from "../components/WalletPicker";
import Verdict from "../components/Verdict";
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

  return (
    <div className="space-y-20">
      <section>
        <p className="micro text-ink/40">Revocation</p>
        <h2 className="display mt-4 text-4xl">Revoke a certificate</h2>
        <p className="mt-6 max-w-md text-[15px] leading-[1.75] text-ink/60">
          Upload the file to look it up first. Only the wallet that issued it, or the contract
          owner, can revoke it.
        </p>

        <div className="mt-12 border-t border-ink/10 pt-8">
          <WalletPicker
            wallets={wallets}
            wallet={wallet}
            account={account}
            onSelect={onSelectWallet}
          />
          {account && (
            <p className="mt-4 font-mono text-[11px] tracking-[0.08em] text-ink/55">
              {shortHash(account, 6, 4)}
            </p>
          )}
        </div>

        <div className="mt-12">
          <FileHashInput file={file} fileHash={fileHash} busy={busy} onFile={onFile} />
        </div>

        {busy && <p className="mt-6 text-[13px] text-ink/45">Looking up on-chain…</p>}

        {error && (
          <p className="mt-6 border-l-2 border-[#A32118] py-1 pl-4 text-[14px] leading-relaxed text-[#A32118]">
            {error}
          </p>
        )}
      </section>

      <AnimatePresence mode="wait">
        {lookup && !busy && (
          <motion.div
            key={`${lookup.certificateId}-${lookup.status}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="space-y-12"
          >
            <Verdict status={lookup.status} note={false} />

            {lookup.status !== 0 && (
              <motion.dl
                variants={list}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 gap-8 border-t border-ink/10 pt-10 sm:grid-cols-2"
              >
                <motion.div variants={item}>
                  <dt className="micro text-ink/40">Recipient</dt>
                  <dd className="mt-2 text-[15px]">{lookup.cert.recipientName}</dd>
                </motion.div>
                <motion.div variants={item}>
                  <dt className="micro text-ink/40">Course</dt>
                  <dd className="mt-2 text-[15px]">{lookup.cert.courseName}</dd>
                </motion.div>
                <motion.div variants={item}>
                  <dt className="micro text-ink/40">Issued</dt>
                  <dd className="mt-2 text-[15px]">{formatTimestamp(lookup.cert.issuedAt)}</dd>
                </motion.div>
                <motion.div variants={item}>
                  <dt className="micro text-ink/40">Issuer</dt>
                  <dd className="mt-2 break-all font-mono text-[11px] tracking-[0.08em] text-ink/70">
                    {lookup.cert.issuer}
                  </dd>
                </motion.div>
              </motion.dl>
            )}

            <div className="border-t border-ink/10 pt-10">
              {canRevoke ? (
                <>
                  <p className="max-w-md text-[15px] leading-[1.75] text-ink/60">
                    Revoking is permanent. The certificate stays on the chain, but every future
                    verification will report it as revoked.
                  </p>
                  <button
                    type="button"
                    onClick={onRevoke}
                    disabled={submitting}
                    className={`group relative mt-8 overflow-hidden px-7 py-3 ${
                      submitting
                        ? "cursor-not-allowed bg-ink/10 text-ink/35"
                        : "bg-accent text-cream"
                    }`}
                  >
                    {!submitting && (
                      <span className="absolute inset-0 origin-left scale-x-0 bg-ink transition-transform duration-300 ease-out group-hover:scale-x-100" />
                    )}
                    <span className="micro relative">
                      {submitting ? "Revoking…" : "Revoke this certificate"}
                    </span>
                  </button>
                </>
              ) : (
                <p className="max-w-md text-[15px] leading-[1.75] text-ink/60">
                  {BLOCKED_REASON[lookup.status]}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {result && (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="border-t border-ink/10 pt-10"
          >
            <p className="micro text-ink/40">Confirmed</p>
            <h3 className="display mt-4 text-3xl">Revocation recorded</h3>
            <p className="mt-5 max-w-md text-[15px] leading-[1.75] text-ink/60">
              Verification of this document now reports as revoked.
            </p>
            <div className="mt-8">
              <p className="micro text-ink/40">Transaction</p>
              <a
                className="mt-2 inline-block break-all font-mono text-[11px] tracking-[0.08em] text-ink/70 underline decoration-ink/20 underline-offset-4 transition-colors hover:text-ink"
                href={`${EXPLORER}/tx/${result.txHash}`}
                target="_blank"
                rel="noreferrer"
              >
                {result.txHash}
              </a>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
