import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ZeroAddress } from "ethers";
import { CheckCircle2, ExternalLink, Loader2, Receipt } from "lucide-react";
import FileHashInput from "../components/FileHashInput";
import { Pill } from "../components/Pill";
import { sha256File } from "../lib/hash";
import { useWallet } from "../lib/useWallet";
import { describeError, EXPLORER, shortHash } from "../lib/contract";

// Card classes are copied rather than shared: the Dashboard owns its own copy
// and must not be refactored into a common component.
const CARD = "rounded-lg border border-line bg-card";
const CARD_HEAD =
  "flex items-center justify-between gap-4 border-b border-line px-5 py-4";

const EMPTY_FORM = {
  recipientName: "",
  courseName: "",
  recipientAddress: "",
  expiresAt: "",
};

const inputClass =
  "w-full rounded-md border border-line bg-secondary px-3 py-2.5 text-[14px] outline-none transition-colors placeholder:text-muted/40 focus:border-accent";

export default function Issue() {
  const { wallets, wallet, account, connect, disconnect } = useWallet();
  const [file, setFile] = useState(null);
  const [fileHash, setFileHash] = useState("");
  const [hashing, setHashing] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [pendingTx, setPendingTx] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  function update(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  // Each drop claims a ticket. A slower earlier run resuming after a newer one
  // started must not write its hash over the newer file's - that hash is what
  // gets submitted to the contract.
  const runId = useRef(0);

  async function onFile(selected) {
    const id = ++runId.current;

    setError("");
    setResult(null);
    setFileHash("");
    setFile(selected ?? null);
    if (!selected) return;

    setHashing(true);
    try {
      const hash = await sha256File(selected);
      if (runId.current !== id) return;
      setFileHash(hash);
    } catch (err) {
      if (runId.current !== id) return;
      setError(describeError(err));
    } finally {
      if (runId.current === id) setHashing(false);
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

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    setResult(null);

    if (!fileHash) {
      setError("Choose a certificate file first.");
      return;
    }

    setSubmitting(true);
    try {
      const contract = await connect();

      const expiresAt = form.expiresAt
        ? Math.floor(new Date(form.expiresAt).getTime() / 1000)
        : 0;

      const tx = await contract.issueCertificate(
        fileHash,
        form.recipientAddress.trim() || ZeroAddress,
        form.recipientName.trim(),
        form.courseName.trim(),
        "",
        expiresAt
      );

      setPendingTx(tx.hash); // display only - the call sequence is unchanged

      const receipt = await tx.wait();
      const issued = receipt.logs
        .map((log) => {
          try {
            return contract.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((parsed) => parsed?.name === "CertificateIssued");

      setResult({ txHash: tx.hash, certificateId: issued?.args?.certificateId ?? "" });
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setPendingTx("");
      setSubmitting(false);
    }
  }

  return (
    <div className="px-6 py-7 sm:px-8">
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        <p className="micro text-muted">Issue</p>
        <h1 className="mt-2.5 text-[26px] font-semibold tracking-tight">Issue a certificate</h1>
        <p className="mt-1.5 max-w-[76ch] text-[14px] text-muted">
          The document's SHA-256 digest is written to the contract. Only the 32-byte hash is stored
          on-chain.
        </p>
      </motion.header>

      <div className="mt-7 grid grid-cols-1 gap-4 lg:grid-cols-[1.55fr_1fr]">
        {/* Left — form */}
        <section className={CARD}>
          <header className={CARD_HEAD}>
            <h2 className="micro text-night">Certificate details</h2>
          </header>

          <div className="p-5">
            {/* Wallet: one row when connected, chips only when disconnected. */}
            {account ? (
              <div className="mb-6 flex items-center justify-between gap-4 rounded-md border border-line bg-secondary px-4 py-3">
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
                        className="flex items-center gap-2 rounded-md border border-line px-3 py-2 text-[13px] text-muted transition-colors hover:border-accent hover:text-night"
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

            <form onSubmit={onSubmit} className="space-y-6">
              <FileHashInput file={file} fileHash={fileHash} busy={hashing} onFile={onFile} />

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-[11px] text-muted">Recipient name</span>
                  <input
                    required
                    value={form.recipientName}
                    onChange={update("recipientName")}
                    placeholder="Jane Doe"
                    className={inputClass}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-[11px] text-muted">Course name</span>
                  <input
                    required
                    value={form.courseName}
                    onChange={update("courseName")}
                    placeholder="Blockchain Fundamentals"
                    className={inputClass}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-[11px] text-muted">
                    Recipient wallet — optional
                  </span>
                  <input
                    value={form.recipientAddress}
                    onChange={update("recipientAddress")}
                    placeholder="0x…"
                    className={`${inputClass} font-mono text-[12.5px]`}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-[11px] text-muted">Expires — optional</span>
                  <input
                    type="datetime-local"
                    value={form.expiresAt}
                    onChange={update("expiresAt")}
                    className={inputClass}
                  />
                </label>
              </div>

              <Pill as="button" type="submit" disabled={submitting || hashing || !fileHash}>
                {submitting ? "Issuing…" : "Issue certificate"}
              </Pill>
            </form>

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
                  Confirmed on-chain
                </p>

                <div>
                  <dt className="text-[11px] text-muted">Certificate ID</dt>
                  <dd className="mt-1.5 break-all font-mono text-[11px] text-muted">
                    {result.certificateId}
                  </dd>
                </div>

                <div>
                  <dt className="text-[11px] text-muted">Transaction</dt>
                  <dd className="mt-1.5">
                    <a
                      href={`${EXPLORER}/tx/${result.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 break-all font-mono text-[12px] text-night underline decoration-line underline-offset-4 transition-colors hover:decoration-night"
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
                <p className="flex items-center gap-2 text-[13.5px] text-night">
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
                        className="inline-flex items-center gap-1.5 break-all font-mono text-[12px] text-night underline decoration-line underline-offset-4 transition-colors hover:decoration-night"
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
                <Receipt size={22} strokeWidth={1.5} className="text-muted/50" />
                <p className="mt-3.5 text-[13.5px] text-muted">No transaction yet</p>
                <p className="mt-1.5 max-w-[34ch] text-[12px] text-muted/60">
                  Fill in the details and issue to see the transaction here.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </div>
  );
}
