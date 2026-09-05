/**
 * Lists every injected wallet found via EIP-6963 and connects the one clicked.
 * Showing them explicitly matters when several extensions are installed - they all
 * compete for window.ethereum, and the winner is not necessarily the intended one.
 */
export default function WalletPicker({ wallets, wallet, account, onSelect }) {
  return (
    <div>
      <p className="micro text-ink/40">
        {wallets.length === 0
          ? "No wallet detected"
          : account
            ? `Connected · ${wallet?.info?.name ?? "wallet"}`
            : "Wallet"}
      </p>

      {wallets.length === 0 ? (
        <p className="mt-3 text-[13px] text-ink/45">Install MetaMask, then reload this page.</p>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          {wallets.map((entry) => {
            const selected = wallet?.info?.uuid === entry.info.uuid;
            return (
              <button
                key={entry.info.uuid}
                type="button"
                onClick={() => onSelect(entry)}
                className={`group relative flex items-center gap-2 overflow-hidden border px-4 py-2 text-[13px] transition-colors ${
                  selected ? "border-ink/40 text-ink" : "border-ink/15 text-ink/55 hover:text-cream"
                }`}
              >
                {!selected && (
                  <span className="absolute inset-0 origin-left scale-x-0 bg-ink transition-transform duration-300 ease-out group-hover:scale-x-100" />
                )}
                {entry.info.icon && (
                  <img src={entry.info.icon} alt="" className="relative h-4 w-4" />
                )}
                <span className="relative">{entry.info.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {wallets.length > 1 && !account && (
        <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-ink/45">
          More than one wallet extension is installed. Pick the one holding your issuer account.
        </p>
      )}
    </div>
  );
}
