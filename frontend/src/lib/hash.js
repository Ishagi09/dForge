/**
 * SHA-256 of a file, as a 0x-prefixed 32-byte hex string suitable for a Solidity bytes32.
 *
 * Uses the Web Crypto API, which browsers only expose in a secure context -
 * https:// or localhost. Vite's dev server is localhost, so this works in development.
 */
export async function sha256File(file) {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return (
    "0x" +
    Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
