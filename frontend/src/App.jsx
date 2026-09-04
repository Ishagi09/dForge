import { NavLink, Outlet } from "react-router-dom";
import { CONTRACT_ADDRESS, EXPLORER } from "./lib/contract";

function tabClass({ isActive }) {
  const base = "px-4 py-2 text-sm font-medium border-b-2";
  return isActive
    ? `${base} border-slate-900 text-slate-900`
    : `${base} border-transparent text-slate-500 hover:text-slate-800`;
}

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-3xl px-6 pt-6">
          <h1 className="text-xl font-semibold">Certificate Verification</h1>
          <p className="mt-1 text-sm text-slate-500">
            Document-hash certificates on Ethereum Sepolia
          </p>
          <nav className="mt-4 flex gap-2">
            <NavLink to="/verify" className={tabClass}>
              Verify
            </NavLink>
            <NavLink to="/issue" className={tabClass}>
              Issue
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <Outlet />
      </main>

      <footer className="mx-auto max-w-3xl px-6 pb-10 text-xs text-slate-500">
        Contract{" "}
        <a
          className="font-mono underline hover:text-slate-800"
          href={`${EXPLORER}/address/${CONTRACT_ADDRESS}#code`}
          target="_blank"
          rel="noreferrer"
        >
          {CONTRACT_ADDRESS}
        </a>{" "}
        on Sepolia
      </footer>
    </div>
  );
}
