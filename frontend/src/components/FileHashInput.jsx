import { useRef, useState } from "react";
import { motion } from "framer-motion";
import HashReveal from "./HashReveal";
import { formatBytes } from "../lib/hash";

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
  const [dragging, setDragging] = useState(false);

  function take(list) {
    const next = list?.[0];
    if (next) onFile(next);
  }

  return (
    <div>
      <p className="micro mb-3 text-ink/40">{label}</p>

      <button
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
        className={`block w-full border px-6 py-12 text-center transition-colors ${
          dragging ? "border-accent bg-accent/5" : "border-ink/15 hover:border-ink/40"
        }`}
      >
        {file ? (
          <span className="block">
            <span className="block text-[15px]">{file.name}</span>
            <span className="micro mt-2 block text-ink/40">
              {formatBytes(file.size)}
              {busy ? " · Hashing" : " · Click or drop to replace"}
            </span>
          </span>
        ) : (
          <span className="block">
            <span className="block text-[15px] text-ink/60">Drop a file here</span>
            <span className="micro mt-2 block text-ink/40">or click to browse</span>
          </span>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(event) => take(event.target.files)}
      />

      {fileHash && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="mt-8"
        >
          <p className="micro text-ink/40">SHA-256</p>
          <HashReveal
            value={fileHash}
            className="mt-2 break-all font-mono text-[11px] leading-[1.9] tracking-[0.08em] text-ink/70"
          />
        </motion.div>
      )}
    </div>
  );
}
