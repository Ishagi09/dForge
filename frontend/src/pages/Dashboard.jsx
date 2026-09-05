import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import CountUp from "../components/CountUp";
import Reveal from "../components/Reveal";
import WalletPicker from "../components/WalletPicker";
import { LightSection } from "../components/Section";
import { TextAction } from "../components/Pill";
import { useActivity } from "../lib/useActivity";
import { useWallet } from "../lib/useWallet";
import {
  describeError,
  discoverWallets,
  EXPLORER,
  getReadContract,
  shortHash,
  silentAccounts,
} from "../lib/contract";
import { STATUS_THEME } from "../lib/status";

function formatDay(seconds) {
  if (!seconds) return "—";
  return new Date(seconds * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function Count({ label, value, loading, accent = false }) {
  return (
    <div>
      <p className="micro text-muted">{label}</p>
      <p
        className={`display mt-[16px] text-[clamp(1.75rem,4vw,2.75rem)] ${
          accent ? "text-accent" : "text-night"
        }`}
      >
        {loading ? <span className="text-muted">--</span> : <CountUp value={value} />}
      </p>
    </div>
  );
}

export default function Dashboard() {
  const { rows, loading, error, reload } = useActivity();
  const { wallets, wallet, account, connect } = useWallet();

  const [silent, setSilent] = useState("");
  const [isIssuer, setIsIssuer] = useState(false);
  const [scope, setScope] = useState("all");
  const [touched, setTouched] = useState(false);
  const [walletError, setWalletError] = useState("");

  const viewer = (account || silent).toLowerCase();

  // Pick up an already-authorized account without popping a wallet dialog,
  // so the read-only page can personalise itself for a returning issuer.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const found = await discoverWallets();
      for (const entry of found) {
        const accounts = await silentAccounts(entry.provider);
        if (accounts.length > 0) {
          if (!cancelled) setSilent(accounts[0]);
          return;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Only authorized issuers get the "mine" default.
  useEffect(() => {
    let cancelled = false;
    if (!viewer) {
      setIsIssuer(false);
      return undefined;
    }
    (async () => {
      try {
        const authorized = await getReadContract().issuers(viewer);
        if (cancelled) return;
        setIsIssuer(authorized);
        if (authorized && !touched) setScope("mine");
      } catch {
        if (!cancelled) setIsIssuer(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [viewer, touched]);

  const visible = useMemo(() => {
    if (scope === "mine" && viewer) {
      return rows.filter((row) => row.issuer.toLowerCase() === viewer);
    }
    return rows;
  }, [rows, scope, viewer]);

  const counts = useMemo(
    () => ({
      issued: visible.length,
      revoked: visible.filter((row) => row.status === 2).length,
      active: visible.filter((row) => row.status === 1).length,
    }),
    [visible]
  );

  async function onSelectWallet(entry) {
    setWalletError("");
    try {
      await connect(entry);
    } catch (err) {
      setWalletError(describeError(err));
    }
  }

  return (
    <LightSection id="work" className="py-20 sm:py-28">
      <div className="flex flex-wrap items-end justify-between gap-8">
        <div>
          <p className="micro text-night/40">Activity</p>
          <h2 className="h-display mt-5 text-3xl sm:text-4xl">
            Every certificate
            <br />
            this contract has issued
          </h2>
        </div>

        <TextAction tone="light" onClick={reload}>
          {loading ? "Loading…" : "Refresh"}
        </TextAction>
      </div>

      <Reveal>
        <div className="mt-[64px] grid grid-cols-3 gap-8 border-y border-white/[0.09] py-[40px]">
          <Count label="Issued" value={counts.issued} loading={loading} />
          <Count label="Active" value={counts.active} loading={loading} accent />
          <Count label="Revoked" value={counts.revoked} loading={loading} />
        </div>
      </Reveal>

      {isIssuer && (
        <div className="mt-10 flex flex-wrap items-center gap-3">
          <p className="micro mr-2 text-night/40">Show</p>
          {[
            { key: "mine", label: "My certificates" },
            { key: "all", label: "All certificates" },
          ].map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => {
                setTouched(true);
                setScope(option.key);
              }}
              className={`micro rounded-full border px-4 py-2 transition-colors ${
                scope === option.key
                  ? "border-neon bg-neon/10 text-night"
                  : "border-night/15 text-night/50 hover:border-night/40 hover:text-night"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {!viewer && (
        <div className="mt-10 border-t border-night/10 pt-8">
          <WalletPicker
            wallets={wallets}
            wallet={wallet}
            account={account}
            onSelect={onSelectWallet}
          />
          <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-night/50">
            Optional. Connecting only filters this list to your own certificates — the table
            above is public and needs no wallet.
          </p>
          {walletError && (
            <p className="mt-4 border-l-2 border-night py-1 pl-4 text-[13px] text-night/70">
              {walletError}
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="mt-10 border-l-2 border-night py-1 pl-4 text-[14px] leading-relaxed text-night/70">
          {error}
        </p>
      )}

      <div className="mt-12 overflow-x-auto">
        <table className="w-full min-w-3xl border-collapse text-left">
          <thead>
            <tr className="border-b border-night/15">
              {["Recipient", "Course", "Status", "Issued", "Issuer", "Tx"].map((head) => (
                <th key={head} className="micro whitespace-nowrap pb-4 pr-6 text-night/40">
                  {head}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {!loading &&
              visible.map((row, index) => (
                <motion.tr
                  key={row.certificateId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.4,
                    delay: Math.min(index * 0.03, 0.3),
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="border-b border-night/10"
                >
                  <td className="py-5 pr-6 text-[15px] font-medium">{row.recipientName}</td>
                  <td className="py-5 pr-6 text-[14px] text-night/70">{row.courseName}</td>
                  <td className="py-5 pr-6">
                    <span
                      className={`micro ${
                        STATUS_THEME[row.status].accent ? "text-neon" : "text-night/55"
                      }`}
                    >
                      {STATUS_THEME[row.status].word}
                    </span>
                  </td>
                  <td className="whitespace-nowrap py-5 pr-6 text-[14px] text-night/70">
                    {formatDay(row.issuedAt)}
                  </td>
                  <td className="py-5 pr-6">
                    <a
                      href={`${EXPLORER}/address/${row.issuer}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-[11px] tracking-[0.06em] text-night/60 underline decoration-night/20 underline-offset-4 transition-colors hover:text-night"
                    >
                      {shortHash(row.issuer, 6, 4)}
                    </a>
                  </td>
                  <td className="py-5">
                    <a
                      href={`${EXPLORER}/tx/${row.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-[11px] tracking-[0.06em] text-night/60 underline decoration-night/20 underline-offset-4 transition-colors hover:text-night"
                    >
                      {shortHash(row.txHash, 8, 6)}
                    </a>
                  </td>
                </motion.tr>
              ))}
          </tbody>
        </table>

        {loading && <p className="py-10 text-[14px] text-night/50">Reading events from Sepolia…</p>}

        {!loading && visible.length === 0 && !error && (
          <p className="py-10 text-[14px] text-night/50">
            {scope === "mine"
              ? "This wallet has not issued any certificates yet."
              : "No certificates have been issued from this contract yet."}
          </p>
        )}
      </div>
    </LightSection>
  );
}
