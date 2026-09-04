import { useState } from "react";
import { formatBytes, sha256File } from "../lib/hash";
import { describeError, EXPLORER, getReadContract, STATUS_LABELS } from "../lib/contract";

const STATUS_STYLES = {
  0: "bg-slate-100 text-slate-700 border-slate-300",
  1: "bg-green-50 text-green-800 border-green-300",
  2: "bg-red-50 text-red-800 border-red-300",
  3: "bg-amber-50 text-amber-900 border-amber-300",
};

const STATUS_NOTES = {
  0: "This document has no certificate on-chain. It was never issued, or the file has been altered.",
  1: "This document matches a certificate that is active and has not expired.",
  2: "A certificate exists for this document, but the issuer revoked it.",
  3: "A certificate exists for this document, but it has passed its expiry date.",
};

function formatTimestamp(seconds) {
  const n = Number(seconds);
  return n === 0 ? "Never" : new Date(n * 1000).toLocaleString();
}

export default function Verify() {
  const [file, setFile] = useState(null);
  const [fileHash, setFileHash] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  async function onFile(event) {
    const selected = event.target.files?.[0];
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
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-base font-semibold">Verify a certificate</h2>
        <p className="mt-1 text-sm text-slate-500">
          Upload the certificate file. It is hashed locally in your browser and checked against the
          contract — the file itself is never uploaded anywhere.
        </p>

        <label className="mt-4 block">
          <span className="mb-1 block text-sm font-medium">Certificate file</span>
          <input
            type="file"
            onChange={onFile}
            className="block w-full cursor-pointer rounded border border-slate-300 p-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-sm file:text-white"
          />
        </label>

        {file && (
          <p className="mt-2 text-xs text-slate-500">
            {file.name} · {formatBytes(file.size)}
          </p>
        )}

        {fileHash && (
          <div className="mt-3">
            <span className="text-xs font-medium text-slate-500">SHA-256</span>
            <p className="mt-1 break-all rounded bg-slate-50 p-2 font-mono text-xs">{fileHash}</p>
          </div>
        )}

        {busy && <p className="mt-4 text-sm text-slate-600">Hashing and checking on-chain…</p>}

        {error && (
          <p className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </p>
        )}
      </section>

      {result && !busy && (
        <section className={`rounded-lg border p-6 ${STATUS_STYLES[result.status]}`}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{STATUS_LABELS[result.status]}</h2>
            <span className="rounded border border-current px-2 py-0.5 text-xs font-medium">
              {result.valid ? "VALID" : "NOT VALID"}
            </span>
          </div>
          <p className="mt-2 text-sm">{STATUS_NOTES[result.status]}</p>

          {result.status !== 0 && (
            <dl className="mt-5 grid grid-cols-1 gap-3 border-t border-current/20 pt-4 text-sm sm:grid-cols-2">
              <Field label="Recipient" value={result.cert.recipientName} />
              <Field label="Course" value={result.cert.courseName} />
              <Field label="Issued" value={formatTimestamp(result.cert.issuedAt)} />
              <Field label="Expires" value={formatTimestamp(result.cert.expiresAt)} />
              <Field label="Issuer" value={result.cert.issuer} mono />
              {result.cert.recipient !== "0x0000000000000000000000000000000000000000" && (
                <Field label="Recipient wallet" value={result.cert.recipient} mono />
              )}
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium opacity-70">Certificate ID</dt>
                <dd className="mt-0.5 break-all font-mono text-xs">{result.certificateId}</dd>
              </div>
              <div className="sm:col-span-2">
                <a
                  className="text-xs underline"
                  href={`${EXPLORER}/address/${result.cert.issuer}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View issuer on Etherscan
                </a>
              </div>
            </dl>
          )}
        </section>
      )}
    </div>
  );
}

function Field({ label, value, mono = false }) {
  return (
    <div>
      <dt className="text-xs font-medium opacity-70">{label}</dt>
      <dd className={`mt-0.5 break-all ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}
