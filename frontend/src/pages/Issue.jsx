import { useState } from "react";
import { ZeroAddress } from "ethers";
import { formatBytes, sha256File } from "../lib/hash";
import { connectWallet, describeError, EXPLORER, shortHash } from "../lib/contract";

const EMPTY_FORM = {
  recipientName: "",
  courseName: "",
  recipientAddress: "",
  expiresAt: "",
};

export default function Issue() {
  const [account, setAccount] = useState("");
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

  async function onFile(event) {
    const selected = event.target.files?.[0];
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

  async function onConnect() {
    setError("");
    try {
      const { address } = await connectWallet();
      setAccount(address);
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
      const { address, contract } = await connectWallet();
      setAccount(address);

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
      const event = receipt.logs
        .map((log) => {
          try {
            return contract.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((parsed) => parsed?.name === "CertificateIssued");

      setResult({ txHash: tx.hash, certificateId: event?.args?.certificateId ?? "" });
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold">Issue a certificate</h2>
            <p className="mt-1 text-sm text-slate-500">
              Only wallets authorized as issuers on the contract can do this.
            </p>
          </div>
          <button
            type="button"
            onClick={onConnect}
            className="shrink-0 rounded border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
          >
            {account ? shortHash(account, 6, 4) : "Connect wallet"}
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Certificate file</span>
            <input
              type="file"
              onChange={onFile}
              className="block w-full cursor-pointer rounded border border-slate-300 p-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-sm file:text-white"
            />
          </label>

          {file && (
            <p className="text-xs text-slate-500">
              {file.name} · {formatBytes(file.size)}
              {hashing && " · hashing…"}
            </p>
          )}

          {fileHash && (
            <div>
              <span className="text-xs font-medium text-slate-500">SHA-256</span>
              <p className="mt-1 break-all rounded bg-slate-50 p-2 font-mono text-xs">{fileHash}</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Recipient name</span>
              <input
                required
                value={form.recipientName}
                onChange={update("recipientName")}
                placeholder="Jane Doe"
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium">Course name</span>
              <input
                required
                value={form.courseName}
                onChange={update("courseName")}
                placeholder="Blockchain Fundamentals"
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium">
                Recipient wallet <span className="font-normal text-slate-400">(optional)</span>
              </span>
              <input
                value={form.recipientAddress}
                onChange={update("recipientAddress")}
                placeholder="0x…"
                className="w-full rounded border border-slate-300 px-3 py-2 font-mono text-xs"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium">
                Expires <span className="font-normal text-slate-400">(optional)</span>
              </span>
              <input
                type="datetime-local"
                value={form.expiresAt}
                onChange={update("expiresAt")}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting || hashing || !fileHash}
            className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? "Issuing…" : "Issue certificate"}
          </button>
        </form>

        {error && (
          <p className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </p>
        )}
      </section>

      {result && (
        <section className="rounded-lg border border-green-300 bg-green-50 p-6">
          <h2 className="text-base font-semibold text-green-900">Certificate issued</h2>
          <p className="mt-1 text-sm text-green-800">
            The document is now certified on-chain. Anyone can verify it by uploading the same file
            on the Verify page.
          </p>

          <div className="mt-4 space-y-3 text-sm">
            <div>
              <span className="text-xs font-medium text-green-900/70">Certificate ID</span>
              <p className="mt-0.5 break-all font-mono text-xs">{result.certificateId}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-green-900/70">Transaction</span>
              <p className="mt-0.5">
                <a
                  className="break-all font-mono text-xs underline"
                  href={`${EXPLORER}/tx/${result.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {result.txHash}
                </a>
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
