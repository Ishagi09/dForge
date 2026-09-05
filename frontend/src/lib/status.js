/**
 * Presentation for the contract's Status enum:
 * 0 NonExistent, 1 Valid, 2 Revoked, 3 Expired.
 *
 * These are semantic colours and deliberately never the brand accent - a verdict
 * must not be confusable with a button.
 */

export const STATUS_THEME = {
  0: { word: "NOT FOUND", color: "#EF4444", text: "text-missing" },
  1: { word: "VALID", color: "#10B981", text: "text-valid" },
  2: { word: "REVOKED", color: "#F59E0B", text: "text-revoked" },
  3: { word: "EXPIRED", color: "#8B8B8B", text: "text-expired" },
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
