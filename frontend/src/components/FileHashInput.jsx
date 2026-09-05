import { useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import HashReveal from "./HashReveal";
import { formatBytes } from "../lib/hash";

// Certificates are documents; this is generous for that and well under the
// point where reading the file into memory threatens the tab.
const MAX_FILE_BYTES = 100 * 1024 * 1024;

/**
 * Drop zone that reports the chosen File and shows its computed SHA-256.
 * `onFile` receives a File, not an event, so drag-drop and browse share one path.
 */
export default function FileHashInput({
  label = "Certificate file",
  file,
  fileHash,
  busy = false,
  onFile,
}) {
  const inputRef = useRef(null);
  const reduce = useReducedMotion();
  const [dragging, setDragging] = useState(false);
  const [rejected, setRejected] = useState("");

  function take(list) {
    const next = list?.[0];
    if (!next) return;

    // sha256File reads the whole file into memory via arrayBuffer(), so an
    // oversized file OOMs the tab before hashing starts. Refuse it here.
    if (next.size > MAX_FILE_BYTES) {
      setRejected(
        `${next.name} is ${formatBytes(next.size)}. Maximum is ${formatBytes(MAX_FILE_BYTES)}.`
      );
      return;
    }

    setRejected("");
    onFile(next);
  }

  const idle = !file && !dragging && !reduce;

  return (
    <div>
      <p className="micro mb-[16px] text-muted">{label}</p>

      <motion.button
        type="button"
        data-cursor="drop"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          take(event.dataTransfer.files);
        }}
        animate={dragging ? { scale: 1.01 } : { scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        className={`sharp relative block w-full overflow-hidden border px-6 py-[56px] text-center transition-colors duration-200 ${
          dragging
            ? "border-accent bg-accent/[0.07]"
            : "border-white/[0.12] bg-surface/40 hover:border-white/25"
        }`}
      >
        {/* Idle breathing: a slow accent wash so the zone reads as live, not inert. */}
        {idle && (
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 50% 50%, rgba(255,107,44,0.10), transparent 70%)",
            }}
            animate={{ opacity: [0.35, 0.85, 0.35] }}
            transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        <span className="relative block">
          {file ? (
            <>
              <span className="block text-[15px] font-medium">{file.name}</span>
              <span className="micro mt-[16px] block text-muted">
                {formatBytes(file.size)}
                {busy ? " · Hashing" : " · Click or drop to replace"}
              </span>
            </>
          ) : (
            <>
              <span className="block text-[15px] text-night/80">
                {dragging ? "Release to hash" : "Drop a file here"}
              </span>
              <span className="micro mt-[16px] block text-muted">or click to browse</span>
            </>
          )}
        </span>
      </motion.button>

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(event) => take(event.target.files)}
      />

      {rejected && (
        <p className="mt-3 rounded-md border border-missing/30 bg-missing/[0.06] px-4 py-3 text-[13px] text-missing">
          {rejected}
        </p>
      )}

      {fileHash && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="mt-[24px]"
        >
          <p className="micro text-muted">SHA-256</p>
          <HashReveal
            value={fileHash}
            className="mt-[8px] break-all font-mono text-[11px] leading-[1.9] tracking-[0.06em] text-accent/85"
          />
        </motion.div>
      )}
    </div>
  );
}
