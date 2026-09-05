import { motion } from "motion/react";
import IsoIcon from "./IsoIcon";

// Bento: the first cell is deliberately wider so the grid reads as composed
// rather than as four equal boxes.
const ITEMS = [
  {
    icon: "cube",
    index: "01",
    label: "Document hashing",
    body: "The file is hashed with SHA-256 in your browser. Only the 32-byte digest is ever sent anywhere.",
    span: "sm:col-span-4",
  },
  {
    icon: "stack",
    index: "02",
    label: "Recorded on-chain",
    body: "An authorized issuer writes that digest to the contract, where it cannot be edited or backdated.",
    span: "sm:col-span-2",
  },
  {
    icon: "grid",
    index: "03",
    label: "Anyone can verify",
    body: "A verifier hashes the same file and reads the record directly. No account, no wallet, no trust in us.",
    span: "sm:col-span-2",
  },
  {
    icon: "hollow",
    index: "04",
    label: "Revocable by the issuer",
    body: "Issued in error, or no longer valid? The issuer revokes it and every future check reports it.",
    span: "sm:col-span-4",
  },
];

export default function FeatureGrid() {
  return (
    <div className="grid grid-cols-1 gap-[8px] sm:grid-cols-6">
      {ITEMS.map((entry, i) => (
        <motion.div
          key={entry.index}
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.45, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
          className={`sharp group relative border border-white/[0.07] bg-surface/60 p-[24px] transition-colors duration-300 hover:border-white/15 ${entry.span}`}
        >
          <div className="flex items-start justify-between gap-4">
            <IsoIcon variant={entry.icon} />
            <span className="micro tabular text-muted/60">{entry.index}</span>
          </div>

          <h3 className="heading mt-[24px] text-[17px]">{entry.label}</h3>
          <p className="mt-[8px] max-w-[42ch] text-[13.5px] leading-[1.65] text-muted">
            {entry.body}
          </p>

          <span className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-accent transition-transform duration-400 ease-out group-hover:scale-x-100" />
        </motion.div>
      ))}
    </div>
  );
}
