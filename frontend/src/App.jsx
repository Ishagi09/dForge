import { AnimatePresence, motion } from "framer-motion";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import Cursor from "./components/Cursor";
import DrawRule from "./components/DrawRule";
import GhostWord from "./components/GhostWord";
import StaggerWords from "./components/StaggerWords";
import StatusStrip from "./components/StatusStrip";

function Tab({ to, children }) {
  return (
    <NavLink to={to} className="group relative pb-2">
      {({ isActive }) => (
        <>
          <span
            className={`micro transition-colors ${
              isActive ? "text-accent" : "text-ink/40 group-hover:text-ink"
            }`}
          >
            {children}
          </span>

          {/* Hover: a hairline grows in from the left. */}
          <span className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-ink/30 transition-transform duration-300 ease-out group-hover:scale-x-100" />

          {/* Active: one shared element, so it slides between tabs. */}
          {isActive && (
            <motion.span
              layoutId="tab-underline"
              className="absolute inset-x-0 bottom-0 h-px bg-accent"
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
            />
          )}
        </>
      )}
    </NavLink>
  );
}

export default function App() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-cream text-ink">
      <Cursor />
      <GhostWord />

      <div className="relative mx-auto max-w-5xl px-8 pb-20 sm:px-12 lg:px-16">
        <div className="max-w-[38rem]">
          <header className="pt-20 sm:pt-28">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="micro text-ink/40"
            >
              Ethereum Sepolia
            </motion.p>

            <h1 className="display mt-7 text-6xl sm:text-7xl">
              <StaggerWords text="Certificate" startDelay={0.15} />
              <br />
              <StaggerWords text="Verification" startDelay={0.25} />
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="mt-9 max-w-md text-[15px] leading-[1.75] text-ink/60"
            >
              Every certificate is bound to the hash of its document. Upload a file to check it
              against the chain.
            </motion.p>

            <DrawRule delay={0.6} className="mt-16" />

            <nav className="flex gap-8 pt-6">
              <Tab to="/verify">Verify</Tab>
              <Tab to="/issue">Issue</Tab>
              <Tab to="/revoke">Revoke</Tab>
            </nav>
          </header>

          <main className="py-16">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      <StatusStrip />
    </div>
  );
}
