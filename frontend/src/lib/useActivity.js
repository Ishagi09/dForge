import { useCallback, useEffect, useState } from "react";
import { DEPLOYMENT_BLOCK, describeError, getReadContract, getReadProvider } from "./contract";

// Providers disagree wildly about how large an eth_getLogs range they will serve:
// publicnode takes tens of thousands of blocks, Alchemy's free tier caps at 10.
// Start optimistic, shrink on rejection, and keep the size that worked.
const MAX_CHUNK = 45_000;
const MIN_CHUNK = 10;
const MAX_REQUESTS = 400; // stop rather than hammer a provider that wants tiny windows

async function queryChunked(contract, filter, from, to) {
  const found = [];
  let chunk = MAX_CHUNK;
  let start = from;
  let requests = 0;

  while (start <= to) {
    if (requests >= MAX_REQUESTS) {
      throw new Error(
        "This RPC only serves very small block ranges, so the history is too long to scan. " +
          "Set VITE_RPC_URL to a provider with a higher eth_getLogs limit."
      );
    }

    const end = Math.min(start + chunk - 1, to);
    try {
      requests += 1;
      found.push(...(await contract.queryFilter(filter, start, end)));
      start = end + 1;
    } catch (err) {
      if (chunk <= MIN_CHUNK) throw err;
      // Same window, smaller bite.
      chunk = Math.max(MIN_CHUNK, Math.floor(chunk / 10));
    }
  }

  return found;
}

/**
 * Rebuilds every certificate's current state from logs alone.
 *
 * CertificateIssued carries recipientName, courseName and expiresAt, and a
 * CertificateRevoked log is the only thing that can invalidate one, so the whole
 * table comes from two log queries - no per-certificate contract reads.
 */
export function useActivity() {
  const [rows, setRows] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const contract = getReadContract();
      const provider = getReadProvider();
      const latest = await provider.getBlockNumber();
      const from = DEPLOYMENT_BLOCK || 0;

      const [issued, revoked] = await Promise.all([
        queryChunked(contract, contract.filters.CertificateIssued(), from, latest),
        queryChunked(contract, contract.filters.CertificateRevoked(), from, latest),
      ]);

      const revokedIds = new Set(revoked.map((event) => event.args.certificateId));

      // Issue dates come from block timestamps - one lookup per distinct block,
      // not one per event. Revocation blocks are included so the activity feed
      // can timestamp those too.
      const blocks = [
        ...new Set([...issued, ...revoked].map((event) => event.blockNumber)),
      ];
      const stamps = new Map();
      for (const blockNumber of blocks) {
        const block = await provider.getBlock(blockNumber);
        stamps.set(blockNumber, block?.timestamp ?? 0);
      }

      const now = Math.floor(Date.now() / 1000);

      const next = issued.map((event) => {
        const certificateId = event.args.certificateId;
        const expiresAt = Number(event.args.expiresAt);
        const status = revokedIds.has(certificateId)
          ? 2
          : expiresAt !== 0 && expiresAt <= now
            ? 3
            : 1;

        return {
          certificateId,
          issuer: event.args.issuer,
          recipient: event.args.recipient,
          recipientName: event.args.recipientName,
          courseName: event.args.courseName,
          expiresAt,
          issuedAt: stamps.get(event.blockNumber) ?? 0,
          blockNumber: event.blockNumber,
          txHash: event.transactionHash,
          status,
        };
      });

      next.sort((a, b) => b.blockNumber - a.blockNumber);
      setRows(next);

      // Merged feed of what actually happened on-chain, newest first.
      const names = new Map(next.map((row) => [row.certificateId, row.recipientName]));
      const feed = [
        ...issued.map((event) => ({
          kind: "issued",
          certificateId: event.args.certificateId,
          recipientName: event.args.recipientName,
          blockNumber: event.blockNumber,
          txHash: event.transactionHash,
          at: stamps.get(event.blockNumber) ?? 0,
        })),
        ...revoked.map((event) => ({
          kind: "revoked",
          certificateId: event.args.certificateId,
          recipientName: names.get(event.args.certificateId) ?? "",
          blockNumber: event.blockNumber,
          txHash: event.transactionHash,
          at: stamps.get(event.blockNumber) ?? 0,
        })),
      ].sort((a, b) => b.blockNumber - a.blockNumber);

      setEvents(feed);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { rows, events, loading, error, reload: load };
}
