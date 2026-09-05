import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, ExternalLink, Loader2, Ban } from "lucide-react";
import FileHashInput from "../components/FileHashInput";
import { Pill } from "../components/Pill";
import { sha256File } from "../lib/hash";
import { useWallet } from "../lib/useWallet";
import { describeError, EXPLORER, getReadContract, shortHash } from "../lib/contract";
import { formatTimestamp, STATUS_THEME } from "../lib/status";

// Card classes are copied rather than shared: the Dashboard owns its own copy
// and must not be refactored into a common component.
const CARD = "rounded-lg border border-white/[0.07] bg-[#0E0E10]";
const CARD_HEAD =
  "flex items-center justify-between gap-4 border-b border-white/[0.06] px-5 py-4";

// A certificate can be revoked only if it exists and is not already revoked.
// Expired certificates are still revocable - expiry and revocation are independent.
const REVOCABLE = new Set([1, 3]);

const BLOCKED_REASON = {
  0: "There is no certificate on the chain for this document, so there is nothing to revoke.",
  2: "This certificate has already been revoked. Revocation is permanent and cannot be undone.",
};

export default function Revoke() {
  const { wallets, wallet, account, connect, disconnect } = useWallet();
  const [file, setFile] = useState(null);
  const [fileHash, setFileHash] = useState("");
  const [busy, setBusy] = useState(false);
  const [lookup, setLookup] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendingTx, setPendingTx] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  async function readStatus(hash) {
    const contract = getReadContract();
    const [, status, certificateId, cert] = await contract.verifyByFileHash(hash);
    return { status: Number(status), certificateId, cert };
  }

  // Each drop claims a ticket. A slower earlier run resuming after a newer one
  // started must not write its hash or lookup over the newer file's.
  const runId = useRef(0);

  async function onFile(selected) {
    const id = ++runId.current;

    setError("");
    setResult(null);
    setLookup(null);
    setFileHash("");
    setFile(selected ?? null);
    if (!selected) return;

    setBusy(true);
    try {
      const hash = await sha256File(selected);
      if (runId.current !== id) return;
      setFileHash(hash);

      const status = await readStatus(hash);
      if (runId.current !== id) return;
      setLookup(status);
    } catch (err) {
      if (runId.current !== id) return;
      setError(describeError(err));
    } finally {
      if (runId.current === id) setBusy(false);
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

      setPendingTx(tx.hash); // display only - the call sequence is unchanged

      await tx.wait();

      setResult({ txHash: tx.hash });
      setLookup(await readStatus(fileHash)); // reflect the new Revoked state
    } catch (err) {
      setError(describeError(err));
    } finally {
      setPendingTx("");
      setSubmitting(false);
    }
  }

  const canRevoke = lookup && REVOCABLE.has(lookup.status) && !submitting && !busy;
  const theme = lookup ? STATUS_THEME[lookup.status] : null;

  return (
    <div className="px-6 py-7 sm:px-8">
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        <p className="micro text-muted">Revoke</p>
        <h1 className="mt-2.5 text-[26px] font-semibold tracking-tight">Revoke a certificate</h1>
        <p className="mt-1.5 max-w-[76ch] text-[14px] text-muted">
          Marks a certificate as withdrawn on-chain. The original issuance record stays permanently
          visible.
        </p>
      </motion.header>

      <div className="mt-7 grid grid-cols-1 gap-4 lg:grid-cols-[1.55fr_1fr]">
        {/* Left — lookup + action */}
        <section className={CARD}>
          <header className={CARD_HEAD}>
            <h2 className="micro text-night">Document</h2>
            {theme && (
              <span
                className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-[10.5px] font-medium uppercase tracking-wider"
                style={{ color: theme.color, background: `${theme.color}14` }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: theme.color }} />
                {theme.word}
              </span>
            )}
          </header>

          <div className="p-5">
            {account ? (
              <div className="mb-6 flex items-center justify-between gap-4 rounded-md border border-white/[0.07] bg-white/[0.02] px-4 py-3">
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-valid" />
                  <span className="truncate font-mono text-[12.5px]">
                    {shortHash(account, 6, 4)}
                  </span>
                  <span className="shrink-0 text-[11.5px] text-muted">
                    {wallet?.info?.name ?? "Wallet"}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={disconnect}
                  className="shrink-0 text-[11.5px] text-muted transition-colors hover:text-missing"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <div className="mb-6">
                <p className="micro text-muted">
                  {wallets.length === 0 ? "No wallet detected" : "Connect a wallet"}
                </p>
                {wallets.length === 0 ? (
                  <p className="mt-2.5 text-[13px] text-muted">
                    Install MetaMask, then reload this page.
                  </p>
                ) : (
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {wallets.map((entry) => (
                      <button
                        key={entry.info.uuid}
                        type="button"
                        onClick={() => onSelectWallet(entry)}
                        className="flex items-center gap-2 rounded-md border border-white/[0.10] px-3 py-2 text-[13px] text-muted transition-colors hover:border-accent hover:text-night"
                      >
                        {entry.info.icon && (
                          <img src={entry.info.icon} alt="" className="h-4 w-4" />
                        )}
                        {entry.info.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <FileHashInput file={file} fileHash={fileHash} busy={busy} onFile={onFile} />

            {busy && <p className="mt-5 text-[13px] text-muted">Looking up on-chain…</p>}

            {lookup && !busy && (
              <div className="mt-6 border-t border-white/[0.06] pt-5">
                {lookup.status !== 0 && (
                  <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <dt className="text-[11px] text-muted">Recipient</dt>
                      <dd className="mt-1.5 text-[13.5px]">{lookup.cert.recipientName}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] text-muted">Course</dt>
                      <dd className="mt-1.5 text-[13.5px]">{lookup.cert.courseName}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] text-muted">Issued</dt>
                      <dd className="mt-1.5 text-[13.5px]">
                        {formatTimestamp(lookup.cert.issuedAt)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] text-muted">Issuer</dt>
                      <dd className="mt-1.5 font-mono text-[12px]">
                        {shortHash(lookup.cert.issuer, 6, 4)}
                      </dd>
                    </div>
                  </dl>
                )}

                <div className="mt-5">
                  {canRevoke ? (
                    <>
                      <p className="max-w-[60ch] text-[13px] leading-relaxed text-muted">
                        Revoking is permanent. The certificate stays on the chain, but every future
                        verification will report it as revoked.
                      </p>
                      <div className="mt-4">
                        <Pill onClick={onRevoke} disabled={submitting}>
                          {submitting ? "Revoking…" : "Revoke this certificate"}
                        </Pill>
                      </div>
                    </>
                  ) : (
                    <p className="max-w-[60ch] text-[13px] leading-relaxed text-muted">
                      {BLOCKED_REASON[lookup.status]}
                    </p>
                  )}
                </div>
              </div>
            )}

            {error && (
              <p className="mt-5 rounded-md border border-missing/30 bg-missing/[0.06] px-4 py-3 text-[13px] text-missing">
                {error}
              </p>
            )}
          </div>
        </section>

        {/* Right — transaction status */}
        <section className={CARD}>
          <header className={CARD_HEAD}>
            <h2 className="micro text-night">Transaction</h2>
          </header>

          <AnimatePresence mode="wait">
            {result ? (
              <motion.dl
                key="done"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-4 p-5"
              >
                <p className="flex items-center gap-2 text-[13.5px] text-valid">
                  <CheckCircle2 size={15} strokeWidth={1.8} />
                  Revocation confirmed
                </p>
                <p className="text-[12.5px] leading-relaxed text-muted">
                  Verification of this document now reports it as revoked.
                </p>
                <div>
                  <dt className="text-[11px] text-muted">Transaction</dt>
                  <dd className="mt-1.5">
                    <a
                      href={`${EXPLORER}/tx/${result.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 break-all font-mono text-[12px] text-accent transition-opacity hover:opacity-80"
                    >
                      {shortHash(result.txHash, 10, 8)}
                      <ExternalLink size={12.5} strokeWidth={1.7} />
                    </a>
                  </dd>
                </div>
              </motion.dl>
            ) : submitting ? (
              <motion.div
                key="pending"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="space-y-4 p-5"
              >
                <p className="flex items-center gap-2 text-[13.5px] text-accent">
                  <Loader2 size={15} strokeWidth={1.8} className="animate-spin" />
                  {pendingTx ? "Waiting for confirmation…" : "Awaiting wallet signature…"}
                </p>
                {pendingTx && (
                  <div>
                    <dt className="text-[11px] text-muted">Transaction</dt>
                    <dd className="mt-1.5">
                      <a
                        href={`${EXPLORER}/tx/${pendingTx}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 break-all font-mono text-[12px] text-accent transition-opacity hover:opacity-80"
                      >
                        {shortHash(pendingTx, 10, 8)}
                        <ExternalLink size={12.5} strokeWidth={1.7} />
                      </a>
                    </dd>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col items-center justify-center px-5 py-14 text-center"
              >
                <Ban size={22} strokeWidth={1.5} className="text-muted/50" />
                <p className="mt-3.5 text-[13.5px] text-muted">No transaction yet</p>
                <p className="mt-1.5 max-w-[34ch] text-[12px] text-muted/60">
                  Look up a certificate on the left, then revoke it to see the transaction here.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </div>
  );
}
