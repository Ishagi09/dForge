/**
 * Presentation for the contract's Status enum:
 * 0 NonExistent, 1 Valid, 2 Revoked, 3 Expired.
 *
 * Verdict colours are chosen for contrast against the cream ground, and are
 * deliberately distinct from the burnt-orange accent so the two never read as
 * the same signal.
 */

export const STATUS_THEME = {
  0: { word: "Not found", color: "#A32118" },
  1: { word: "Valid", color: "#1F6B4A" },
  2: { word: "Revoked", color: "#8A5A0B" },
  3: { word: "Expired", color: "#6B6660" },
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
