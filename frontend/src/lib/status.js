/**
 * Presentation for the contract's Status enum:
 * 0 NonExistent, 1 Valid, 2 Revoked, 3 Expired.
 *
 * These are badge fill colours; the label on top of them is always white.
 * They are never used as standalone text on the light ground.
 */

export const STATUS_THEME = {
  0: { word: "NOT FOUND", color: "#DC2626" },
  1: { word: "VALID", color: "#15803D" },
  2: { word: "REVOKED", color: "#B45309" },
  3: { word: "EXPIRED", color: "#78716C" },
};

export const STATUS_NOTES = {
  0: "This document has no certificate on the chain. It was never issued, or the file has been altered since it was.",
  1: "This document matches a certificate that is active and has not expired.",
  2: "A certificate exists for this document, but the issuer revoked it.",
  3: "A certificate exists for this document, but it has passed its expiry date.",
};

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export function formatTimestamp(seconds) {
  const value = Number(seconds);
  return value === 0 ? "Never" : new Date(value * 1000).toLocaleString();
}

export function formatDate(seconds) {
  const value = Number(seconds);
  if (value === 0) return "No expiry";
  return new Date(value * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
