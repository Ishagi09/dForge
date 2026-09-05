import { useState } from "react";
import { motion } from "motion/react";
import { NavLink, Outlet } from "react-router-dom";
import { Ban, ChevronsLeft, FilePlus2, LayoutDashboard, ShieldCheck } from "lucide-react";
import Cursor from "./components/Cursor";
import GrainOverlay from "./components/GrainOverlay";
import Wordmark from "./components/Wordmark";
import { Pill } from "./components/Pill";
import { useWallet } from "./lib/WalletProvider";
import { useBlockNumber } from "./lib/useBlockNumber";
import { describeError, shortHash } from "./lib/contract";

const ROUTES = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/verify", label: "Verify", icon: ShieldCheck },
  { to: "/issue", label: "Issue", icon: FilePlus2 },
  { to: "/revoke", label: "Revoke", icon: Ban },
];

function NavItem({ to, label, icon: Icon, collapsed }) {
  return (
    <NavLink to={to} className="group relative block">
      {({ isActive }) => (
        <div
          className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-[13.5px] transition-colors duration-200 ${
            isActive
              ? "bg-accent/[0.09] text-accent"
              : "text-muted hover:bg-white/[0.035] hover:text-night"
          }`}
        >
          {isActive && (
            <motion.span
              layoutId="nav-active"
              className="absolute inset-y-1 left-0 w-[2px] rounded-full bg-accent"
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
            />
          )}
          <Icon size={17} strokeWidth={1.6} className="shrink-0" />
          {!collapsed && <span>{label}</span>}
        </div>
      )}
    </NavLink>
  );
}

export default function App() {
  const { wallets, wallet, account, connect } = useWallet();
  const { block, offline } = useBlockNumber();
  const [collapsed, setCollapsed] = useState(false);
  const [walletError, setWalletError] = useState("");

  async function onConnect() {
    setWalletError("");
    try {
      await connect(wallets[0]);
    } catch (err) {
      setWalletError(describeError(err));
    }
  }

  return (
    <div className="flex min-h-screen bg-ink text-night">
      <GrainOverlay />
      <Cursor />

      <aside
        className={`sticky top-0 flex h-screen shrink-0 flex-col border-r border-white/[0.07] bg-[#0C0C0E] transition-[width] duration-300 ${
          collapsed ? "w-[72px]" : "w-[236px]"
        }`}
      >
        <div className="px-5 pb-7 pt-6">
          <Wordmark />
          {!collapsed && <p className="micro mt-2 text-muted/60">Proof, not paperwork</p>}
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {ROUTES.map((route) => (
            <NavItem key={route.to} {...route} collapsed={collapsed} />
          ))}

        </nav>

        <div className="px-3 pb-4">
          {!collapsed && (
            <div className="rounded-md border border-white/[0.07] bg-white/[0.02] p-3.5">
              {account ? (
                <>
                  <p className="flex items-center gap-2 text-[11px] text-muted">
                    <span className="h-1.5 w-1.5 rounded-full bg-valid" />
                    Connected
                  </p>
                  <p className="mt-2 font-mono text-[12.5px] text-night">
                    {shortHash(account, 6, 4)}
                  </p>
                  <p className="mt-2 text-[11px] text-muted">
                    {wallet?.info?.name ?? "Wallet"} · Sepolia
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[11px] text-muted">Not connected</p>
                  <button
                    type="button"
                    onClick={onConnect}
                    className="micro mt-2.5 w-full rounded-md border border-white/12 py-2 text-night transition-colors hover:border-accent hover:text-accent"
                  >
                    Connect
                  </button>
                </>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="mt-3 flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-[13px] text-muted transition-colors hover:text-night"
          >
            <ChevronsLeft
              size={16}
              strokeWidth={1.6}
              className={`shrink-0 transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}
            />
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-[60px] shrink-0 items-center justify-end gap-3 border-b border-white/[0.07] bg-ink/85 px-6 backdrop-blur-md sm:px-8">
          <span className="flex items-center gap-2 rounded-md border border-white/[0.09] px-3 py-1.5 text-[12.5px] text-muted">
            <span
              className={`h-1.5 w-1.5 rounded-full ${offline ? "bg-missing" : "bg-valid"}`}
            />
            Sepolia
            <span className="tabular ml-1 font-mono text-[11px] text-muted/70">
              {offline ? "offline" : block ? `#${block.toLocaleString()}` : "—"}
            </span>
          </span>

          {account ? (
            <span className="flex items-center gap-2 rounded-md border border-white/[0.09] px-3 py-1.5 font-mono text-[12.5px] text-night">
              <span className="h-1.5 w-1.5 rounded-full bg-valid" />
              {shortHash(account, 6, 4)}
            </span>
          ) : (
            <Pill onClick={onConnect}>Connect wallet</Pill>
          )}
        </header>

        {walletError && (
          <p className="border-b border-missing/30 bg-missing/[0.06] px-6 py-2.5 text-[12.5px] text-missing sm:px-8">
            {walletError}
          </p>
        )}

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
