import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ZeroAddress } from "ethers";
import FileHashInput from "../components/FileHashInput";
import PageShell from "../components/PageShell";
import WalletPicker from "../components/WalletPicker";
import { DarkSection } from "../components/Section";
import { Pill } from "../components/Pill";
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
  "w-full border-0 border-b border-night/15 bg-transparent px-0 py-3 text-[15px] outline-none transition-colors placeholder:text-night/25 focus:border-neon";

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

  const resultSection = (
    <AnimatePresence>
      {result && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <DarkSection className="py-20 sm:py-28">
            <p className="micro text-white/40">Result</p>

            <motion.h2
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 190, damping: 15, delay: 0.1 }}
              className="h-display mt-6 origin-left text-6xl text-neon sm:text-8xl"
            >
              ISSUED
            </motion.h2>

            <p className="mt-7 max-w-md text-[14px] leading-relaxed text-white/50">
              The document is certified on-chain. Anyone can verify it by uploading the same file
              on the Verify tab.
            </p>

            <dl className="mt-14 grid grid-cols-1 gap-8 border-t border-white/12 pt-10 sm:grid-cols-2">
              <div>
                <dt className="micro text-white/35">Certificate ID</dt>
                <dd className="mt-2 break-all font-mono text-[11px] tracking-[0.06em] text-white/70">
                  {result.certificateId}
                </dd>
              </div>
              <div>
                <dt className="micro text-white/35">Transaction</dt>
                <dd className="mt-2">
                  <a
                    className="break-all font-mono text-[11px] tracking-[0.06em] text-white/70 underline decoration-white/25 underline-offset-4 transition-colors hover:text-white"
                    href={`${EXPLORER}/tx/${result.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {result.txHash}
                  </a>
                </dd>
              </div>
            </dl>
          </DarkSection>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <PageShell
      micro="Issue"
      heading={
        <>
          Bind a document
          <br />
          to the chain.
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

      <form onSubmit={onSubmit} className="mt-10 space-y-10">
        <FileHashInput file={file} fileHash={fileHash} busy={hashing} onFile={onFile} />

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          <label className="block">
            <span className="micro mb-2 block text-night/40">Recipient name</span>
            <input
              required
              value={form.recipientName}
              onChange={update("recipientName")}
              placeholder="Jane Doe"
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className="micro mb-2 block text-night/40">Course name</span>
            <input
              required
              value={form.courseName}
              onChange={update("courseName")}
              placeholder="Blockchain Fundamentals"
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className="micro mb-2 block text-night/40">Recipient wallet — optional</span>
            <input
              value={form.recipientAddress}
              onChange={update("recipientAddress")}
              placeholder="0x…"
              className={`${inputClass} font-mono text-[13px]`}
            />
          </label>

          <label className="block">
            <span className="micro mb-2 block text-night/40">Expires — optional</span>
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
        <p className="mt-8 border-l-2 border-night py-1 pl-4 text-[14px] leading-relaxed text-night/70">
          {error}
        </p>
      )}
    </PageShell>
  );
}
