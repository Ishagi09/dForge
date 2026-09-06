import { lazy, Suspense, useMemo } from "react";
import { motion } from "motion/react";
import { CheckCircle2, Ban, FileText, ExternalLink, RotateCw } from "lucide-react";
import CountUp from "../components/CountUp";

// three.js is ~1MB and the core is a supporting visual, so it loads after the
// dashboard has painted rather than blocking it.
const ProofCore = lazy(() => import("../components/ProofCore"));
import { useActivity } from "../lib/useActivity";
import { useBlockNumber } from "../lib/useBlockNumber";
import { useNow } from "../lib/useNow";
import { CONTRACT_ADDRESS, EXPLORER, shortHash } from "../lib/contract";
import { STATUS_THEME } from "../lib/status";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/** `now` is passed in so every row on a render shares one clock and the values
 *  update when useNow ticks. */
function ago(seconds, now) {
  if (!seconds) return "—";
  const d = Math.max(0, now - seconds);
  if (d < 60) return `${d}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

function Stat({ label, value, suffix, note, dot, loading }) {
  return (
    <div className="rounded-lg border border-line bg-card px-6 py-[26px] transition-colors duration-200 hover:border-night/20">
      <p className="tabular text-[32px] font-semibold leading-none tracking-tight">
        {loading ? <span className="text-muted">—</span> : <CountUp value={value} />}
        {!loading && suffix && <span className="text-[21px] text-muted">{suffix}</span>}
      </p>
      {/* Label stays muted. Per-metric colour is carried by a filled dot, so the
          hue never appears as standalone type. */}
      <p className="micro mt-3.5 flex items-center gap-2 text-muted">
        {dot && (
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ background: dot }}
          />
        )}
        {label}
      </p>
      <p className="mt-3 text-[12px] text-muted">{loading ? " " : note}</p>
    </div>
  );
}

function Panel({ title, action, children, className = "" }) {
  return (
    <section className={`rounded-lg border border-line bg-card ${className}`}>
      <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
        <h2 className="micro text-night">{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}

export default function Dashboard() {
  const { rows, events, loading, error, reload } = useActivity();
  const { block, offline } = useBlockNumber();
  const now = useNow();

  const stats = useMemo(() => {
    const issued = rows.length;
    const active = rows.filter((r) => r.status === 1).length;
    const revoked = rows.filter((r) => r.status === 2).length;
    const rate = issued === 0 ? 0 : Math.round((active / issued) * 1000) / 10;

    const monthAgo = Math.floor(Date.now() / 1000) - 30 * 86400;
    const newThisMonth = rows.filter((r) => r.issuedAt >= monthAgo).length;

    return { issued, active, revoked, rate, newThisMonth };
  }, [rows]);

  const recent = rows.slice(0, 6);
  const feed = events.slice(0, 6);
  const lastAt = events[0]?.at ?? 0;

  return (
    <div className="px-6 py-7 sm:px-8">
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1 className="text-[26px] font-semibold tracking-tight">{greeting()}, Issuer.</h1>
        <p className="mt-1.5 text-[14px] text-muted">Here's what's happening on-chain.</p>
      </motion.header>

      {error && (
        <p className="mt-6 rounded-md border border-missing/30 bg-missing/[0.06] px-4 py-3 text-[13px] text-missing">
          {error}
        </p>
      )}

      {/* Row 1 — Proof Core + network status */}
      <div className="mt-7 grid grid-cols-1 gap-4 lg:grid-cols-[1.55fr_1fr]">
        <Panel
          title="Proof Core"
          action={
            <span className="flex items-center gap-2 text-[11px] text-muted">
              <span className={`h-1.5 w-1.5 rounded-full ${offline ? "bg-missing" : "bg-valid"}`} />
              {offline ? "OFFLINE" : "LIVE"}
            </span>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-[1.4fr_1fr]">
            <div className="h-[280px]">
              <Suspense fallback={<div className="h-full w-full" />}>
                <ProofCore />
              </Suspense>
            </div>

            <dl className="space-y-5 border-t border-line p-5 sm:border-l sm:border-t-0">
              <div>
                <dt className="text-[11px] text-muted">Contract</dt>
                <dd className="mt-1.5">
                  <a
                    className="font-mono text-[12.5px] text-night transition-colors hover:text-night"
                    href={`${EXPLORER}/address/${CONTRACT_ADDRESS}#code`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {shortHash(CONTRACT_ADDRESS, 6, 4)}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-muted">Latest block</dt>
                <dd className="tabular mt-1.5 font-mono text-[12.5px]">
                  {block ? `#${block.toLocaleString()}` : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-muted">Last activity</dt>
                <dd className="mt-1.5 text-[12.5px]">{loading ? "—" : ago(lastAt, now)}</dd>
              </div>
            </dl>
          </div>
        </Panel>

        <Panel title="Network status">
          <dl className="divide-y divide-line px-5">
            {[
              ["Contract", <span className="text-valid">Active</span>],
              ["Network", "Sepolia testnet"],
              ["Latest block", block ? `#${block.toLocaleString()}` : "—"],
              ["Certificates", loading ? "—" : stats.issued],
              ["RPC", offline ? <span className="text-missing">Unreachable</span> : <span className="text-valid">Connected</span>],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between py-3.5">
                <dt className="text-[13px] text-muted">{k}</dt>
                <dd className="tabular text-[13px]">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="px-5 pb-5 pt-1">
            <a
              className="inline-flex items-center gap-1.5 text-[12.5px] text-night underline decoration-line underline-offset-4 transition-colors hover:decoration-night"
              href={`${EXPLORER}/address/${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noreferrer"
            >
              View on explorer <ExternalLink size={13} strokeWidth={1.7} />
            </a>
          </div>
        </Panel>
      </div>

      {/* Row 2 — statistics, all derived from the same on-chain rows */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Issued"
          value={stats.issued}
          note={`+${stats.newThisMonth} in 30 days`}
          dot="#F26B1D"
          loading={loading}
        />
        <Stat
          label="Active"
          value={stats.active}
          note="Valid and unexpired"
          dot="#15803D"
          loading={loading}
        />
        <Stat
          label="Revoked"
          value={stats.revoked}
          note="Permanently withdrawn"
          dot="#B45309"
          loading={loading}
        />
        <Stat
          label="Validity rate"
          value={stats.rate}
          suffix="%"
          note="Active of all issued"
          dot="#1C1917"
          loading={loading}
        />
      </div>

      {/* Row 3 — certificates + activity */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.55fr_1fr]">
        <Panel
          title="Recent certificates"
          action={
            <button
              type="button"
              onClick={reload}
              className="flex items-center gap-1.5 text-[12px] text-muted transition-colors hover:text-night"
            >
              <RotateCw size={12.5} strokeWidth={1.7} />
              Refresh
            </button>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line">
                  {["Certificate", "Recipient", "Course", "Status", "Time"].map((h) => (
                    <th key={h} className="micro px-5 py-3 font-medium text-muted">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.map((row, i) => {
                  const theme = STATUS_THEME[row.status];
                  return (
                    <motion.tr
                      key={row.certificateId}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.25) }}
                      className="border-b border-line transition-colors hover:bg-secondary"
                    >
                      <td className="px-5 py-3.5">
                        <span className="flex items-center gap-2.5">
                          <FileText size={14} strokeWidth={1.6} className="shrink-0 text-muted" />
                          <span className="font-mono text-[12px]">
                            {shortHash(row.certificateId, 6, 4)}
                          </span>
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[13px]">{row.recipientName}</td>
                      <td className="px-5 py-3.5 text-[13px] text-muted">{row.courseName}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-[10.5px] font-medium uppercase tracking-wider"
                          style={{ background: theme.color, color: "#FFFFFF" }}
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ background: "rgba(255,255,255,0.85)" }}
                          />
                          {theme.word}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[12.5px] text-muted">
                        {ago(row.issuedAt, now)}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>

            {!loading && recent.length === 0 && (
              <p className="px-5 py-10 text-[13px] text-muted">
                No certificates have been issued from this contract yet.
              </p>
            )}
            {loading && (
              <p className="px-5 py-10 text-[13px] text-muted">Reading events from Sepolia…</p>
            )}
          </div>
        </Panel>

        <Panel title="Live activity">
          <ul className="px-5 py-2">
            {feed.map((entry, i) => {
              const revoked = entry.kind === "revoked";
              const Icon = revoked ? Ban : CheckCircle2;
              const colour = revoked ? "#F59E0B" : "#10B981";

              return (
                <motion.li
                  key={`${entry.txHash}-${entry.kind}-${i}`}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(i * 0.05, 0.3) }}
                  className="flex items-start gap-3 border-b border-line py-3.5 last:border-0"
                >
                  <Icon size={15} strokeWidth={1.7} className="mt-0.5 shrink-0" color={colour} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px]">
                      {entry.recipientName || shortHash(entry.certificateId, 6, 4)}{" "}
                      <span className="text-muted">was {entry.kind}</span>
                    </p>
                    <a
                      href={`${EXPLORER}/tx/${entry.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-[11px] text-muted transition-colors hover:text-night"
                    >
                      {shortHash(entry.txHash, 8, 6)}
                    </a>
                  </div>
                  <span className="shrink-0 text-[11.5px] text-muted">{ago(entry.at, now)}</span>
                </motion.li>
              );
            })}

            {!loading && feed.length === 0 && (
              <li className="py-10 text-[13px] text-muted">No on-chain activity yet.</li>
            )}
            {loading && <li className="py-10 text-[13px] text-muted">Loading activity…</li>}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
