import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ZeroAddress } from "ethers";
import DrawRule from "../components/DrawRule";
import FileHashInput from "../components/FileHashInput";
import WalletPicker from "../components/WalletPicker";
import { sha256File } from "../lib/hash";
import { useWallet } from "../lib/useWallet";
import { describeError, EXPLORER, shortHash } from "../lib/contract";

const EMPTY_FORM = {
  recipientName: "",
  courseName: "",
  recipientAddress: "",
  expiresAt: "",
};

const inputClass =
  "w-full border-0 border-b border-ink/15 bg-transparent px-0 py-2.5 text-[15px] outline-none transition-colors placeholder:text-ink/25 focus:border-accent";

export default function Issue() {
  const { wallets, wallet, account, connect } = useWallet();
  const [file, setFile] = useState(null);
  const [fileHash, setFileHash] = useState("");
  const [hashing, setHashing] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  function update(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  async function onFile(selected) {
    setError("");
    setResult(null);
    setFileHash("");
    setFile(selected ?? null);
    if (!selected) return;

    setHashing(true);
    try {
      setFileHash(await sha256File(selected));
    } catch (err) {
      setError(describeError(err));
    } finally {
      setHashing(false);
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
      setSubmitting(false);
    }
  }

  const disabled = submitting || hashing || !fileHash;

  return (
    <div className="space-y-20">
      <section>
        <p className="micro text-ink/40">Issuance</p>
        <h2 className="display mt-4 text-4xl">Issue a certificate</h2>
        <p className="mt-6 max-w-md text-[15px] leading-[1.75] text-ink/60">
          Only wallets authorized as issuers on the contract can do this.
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

        <form onSubmit={onSubmit} className="mt-12 space-y-10">
          <FileHashInput file={file} fileHash={fileHash} busy={hashing} onFile={onFile} />

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
            <label className="block">
              <span className="micro mb-2 block text-ink/40">Recipient name</span>
              <input
                required
                value={form.recipientName}
                onChange={update("recipientName")}
                placeholder="Jane Doe"
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="micro mb-2 block text-ink/40">Course name</span>
              <input
                required
                value={form.courseName}
                onChange={update("courseName")}
                placeholder="Blockchain Fundamentals"
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="micro mb-2 block text-ink/40">Recipient wallet — optional</span>
              <input
                value={form.recipientAddress}
                onChange={update("recipientAddress")}
                placeholder="0x…"
                className={`${inputClass} font-mono text-[13px] tracking-[0.06em]`}
              />
            </label>

            <label className="block">
              <span className="micro mb-2 block text-ink/40">Expires — optional</span>
              <input
                type="datetime-local"
                value={form.expiresAt}
                onChange={update("expiresAt")}
                className={inputClass}
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={disabled}
            className={`group relative overflow-hidden px-7 py-3 ${
              disabled
                ? "cursor-not-allowed bg-ink/10 text-ink/35"
                : "bg-accent text-cream"
            }`}
          >
            {!disabled && (
              <span className="absolute inset-0 origin-left scale-x-0 bg-ink transition-transform duration-300 ease-out group-hover:scale-x-100" />
            )}
            <span className="micro relative">
              {submitting ? "Issuing…" : "Issue certificate"}
            </span>
          </button>
        </form>

        {error && (
          <p className="mt-8 border-l-2 border-[#A32118] py-1 pl-4 text-[14px] leading-relaxed text-[#A32118]">
            {error}
          </p>
        )}
      </section>

      <AnimatePresence>
        {result && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <DrawRule />

            <p className="micro mt-10 text-ink/40">Result</p>

            <motion.h2
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 190, damping: 15, delay: 0.12 }}
              className="display mt-5 origin-left text-6xl"
              style={{ color: "#1F6B4A" }}
            >
              Issued
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.34, ease: [0.16, 1, 0.3, 1] }}
              className="mt-8 max-w-md text-[15px] leading-[1.75] text-ink/60"
            >
              The document is certified on-chain. Anyone can verify it by uploading the same file
              on the Verify page.
            </motion.p>

            <motion.dl
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="mt-12 space-y-8 border-t border-ink/10 pt-10"
            >
              <div>
                <dt className="micro text-ink/40">Certificate ID</dt>
                <dd className="mt-2 break-all font-mono text-[11px] tracking-[0.08em] text-ink/70">
                  {result.certificateId}
                </dd>
              </div>
              <div>
                <dt className="micro text-ink/40">Transaction</dt>
                <dd className="mt-2">
                  <a
                    className="break-all font-mono text-[11px] tracking-[0.08em] text-ink/70 underline decoration-ink/20 underline-offset-4 transition-colors hover:text-ink"
                    href={`${EXPLORER}/tx/${result.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {result.txHash}
                  </a>
                </dd>
              </div>
            </motion.dl>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
