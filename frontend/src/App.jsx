import { AnimatePresence, motion } from "motion/react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import AuroraBackground from "./components/AuroraBackground";
import Cursor from "./components/Cursor";
import GhostText from "./components/GhostText";
import GrainOverlay from "./components/GrainOverlay";
import HeroSeal from "./components/HeroSeal";
import IsoStack from "./components/IsoStack";
import Reveal, { DrawRule } from "./components/Reveal";
import StaggerWords from "./components/StaggerWords";
import StatusStrip from "./components/StatusStrip";
import Wordmark from "./components/Wordmark";
import { DotPattern } from "./components/ui/dot-pattern";
import { DarkSection } from "./components/Section";
import { Pill, TextAction } from "./components/Pill";
import { CONTRACT_ADDRESS, EXPLORER } from "./lib/contract";

const HERO = {
  "/verify": {
    kicker: "Proof",
    ghost: "VERIFY",
    micro: "Verification",
    lines: ["Prove a document", "is authentic"],
    sub: "Hash any certificate in your browser and check it against the chain. No account, no upload, no trust in us.",
    cta: "Verify a file",
  },
  "/issue": {
    kicker: "Forge",
    ghost: "ISSUE",
    micro: "Issuance",
    lines: ["Certify a document", "on-chain"],
    sub: "Authorized issuers bind a file's hash to a permanent record that cannot be edited or backdated.",
    cta: "Issue a certificate",
  },
  "/revoke": {
    kicker: "Withdraw",
    ghost: "REVOKE",
    micro: "Revocation",
    lines: ["Retire a record", "you issued"],
    sub: "Revoke a certificate you issued. Every future check reports it as revoked, permanently.",
    cta: "Revoke a certificate",
  },
  "/dashboard": {
    kicker: "Ledger",
    ghost: "ACTIVITY",
    micro: "Activity",
    lines: ["Everything this", "contract has issued"],
    sub: "Rebuilt from on-chain events. Public, read-only, and current as of the latest block.",
    cta: "View activity",
  },
};

function Tab({ to, children }) {
  return (
    <NavLink to={to} className="group relative py-1.5">
      {({ isActive }) => (
        <>
          <span
            className={`micro transition-colors duration-200 ${
              isActive ? "text-accent" : "text-muted group-hover:text-night"
            }`}
          >
            {children}
          </span>

          <span className="absolute inset-x-0 -bottom-px h-px origin-left scale-x-0 bg-white/25 transition-transform duration-300 ease-out group-hover:scale-x-100" />

          {isActive && (
            <motion.span
              layoutId="tab-underline"
              className="absolute inset-x-0 -bottom-px h-px bg-accent"
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
  const hero = HERO[location.pathname] ?? HERO["/verify"];

  function toWork() {
    document.getElementById("work")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="relative min-h-screen bg-ink">
      <AuroraBackground />

      <div className="pointer-events-none fixed inset-0 -z-10">
        <DotPattern
          width={26}
          height={26}
          cr={0.85}
          className="text-white/[0.13] [mask-image:radial-gradient(72%_58%_at_50%_20%,white,transparent)]"
        />
      </div>

      <GrainOverlay />
      <Cursor />

      <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-ink/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-8 px-6 sm:px-10 lg:px-16">
          <NavLink to="/verify" className="shrink-0">
            <Wordmark />
          </NavLink>

          <nav className="flex flex-wrap items-center gap-6 sm:gap-8">
            <Tab to="/verify">Verify</Tab>
            <Tab to="/issue">Issue</Tab>
            <Tab to="/revoke">Revoke</Tab>
            <Tab to="/dashboard">Dashboard</Tab>
          </nav>
        </div>
      </header>

      <DarkSection className="relative pb-[96px] pt-[64px] sm:pb-[128px] sm:pt-[96px]">
        <GhostText word={hero.ghost} />

        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative grid grid-cols-1 items-center gap-[64px] lg:grid-cols-[1.1fr_0.9fr] lg:gap-[40px]"
          >
            <div>
              <div className="flex items-center gap-4">
                <span className="h-px w-10 bg-accent" />
                <p className="micro text-muted">{hero.micro}</p>
              </div>

              <motion.p
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
                className="display mt-6 text-[13px] tracking-[0.42em] text-accent"
              >
                {hero.kicker}
              </motion.p>

              <h1 className="heading mt-5 max-w-2xl text-[clamp(2.25rem,5.2vw,4rem)]">
                <StaggerWords text={hero.lines[0]} startDelay={0.12} />
                <br />
                <StaggerWords text={hero.lines[1]} startDelay={0.22} />
              </h1>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.42, ease: [0.16, 1, 0.3, 1] }}
                className="mt-[24px] max-w-[52ch] text-[15px] leading-[1.7] text-muted"
              >
                {hero.sub}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.52, ease: [0.16, 1, 0.3, 1] }}
                className="mt-[40px] flex flex-wrap items-center gap-8"
              >
                <Pill onClick={toWork}>{hero.cta}</Pill>
                <TextAction
                  as="a"
                  href={`${EXPLORER}/address/${CONTRACT_ADDRESS}#code`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View contract
                </TextAction>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="hidden lg:block"
            >
              <HeroSeal />
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </DarkSection>

      <Outlet />

      <DarkSection className="py-[96px] pb-[128px]">
        <DrawRule className="mb-[64px]" />

        <Reveal>
          <div className="flex items-center gap-4">
            <span className="h-px w-10 bg-accent" />
            <p className="micro text-muted">Why it holds</p>
          </div>
        </Reveal>

        <div className="mt-[64px] grid grid-cols-1 items-center gap-[64px] lg:grid-cols-[0.85fr_1fr] lg:gap-[96px]">
          <Reveal>
            <IsoStack />
          </Reveal>

          <Reveal delay={0.1}>
            <h2 className="heading text-[clamp(1.75rem,3.5vw,2.5rem)]">
              A certificate is only as good as its proof
            </h2>

            <p className="mt-[24px] max-w-[52ch] text-[15px] leading-[1.7] text-muted">
              Paper credentials are trivial to forge and a database can be quietly edited. Binding a
              document's SHA-256 to an immutable record moves the proof out of the issuer's hands:
              anyone holding the file can confirm it independently, and any change to a single byte
              breaks the match.
            </p>

            <div className="mt-[40px]">
              <Pill
                as="a"
                href={`${EXPLORER}/address/${CONTRACT_ADDRESS}#code`}
                target="_blank"
                rel="noreferrer"
              >
                Read the contract
              </Pill>
            </div>
          </Reveal>
        </div>
      </DarkSection>

      <StatusStrip />
    </div>
  );
}
