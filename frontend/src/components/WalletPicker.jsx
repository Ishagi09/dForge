/**
 * Lists every injected wallet found via EIP-6963 and connects the one clicked.
 * Showing them explicitly matters when several extensions are installed - they all
 * compete for window.ethereum, and the winner is not necessarily the intended one.
 */
export default function WalletPicker({ wallets, wallet, account, onSelect }) {
  return (
    <div>
      <p className="micro text-night/40">
        {wallets.length === 0
          ? "No wallet detected"
          : account
            ? `Connected · ${wallet?.info?.name ?? "wallet"}`
            : "Wallet"}
      </p>

      {wallets.length === 0 ? (
        <p className="mt-4 text-[13px] text-night/50">Install MetaMask, then reload this page.</p>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          {wallets.map((entry) => {
            const selected = wallet?.info?.uuid === entry.info.uuid;
            return (
              <button
                key={entry.info.uuid}
                type="button"
                onClick={() => onSelect(entry)}
                className={`group relative flex items-center gap-2 overflow-hidden rounded-full border px-4 py-2 text-[13px] font-medium transition-colors ${
                  selected
                    ? "border-neon bg-neon/10 text-night"
                    : "border-night/15 text-night/55 hover:border-night/40 hover:text-night"
                }`}
              >
                {entry.info.icon && <img src={entry.info.icon} alt="" className="h-4 w-4" />}
                <span>{entry.info.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {wallets.length > 1 && !account && (
        <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-night/50">
          More than one wallet extension is installed. Pick the one holding your issuer account.
        </p>
      )}
    </div>
  );
}
