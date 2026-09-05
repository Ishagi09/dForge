/** Solid accent pill. Hover fills from the left rather than just shifting colour. */
export function Pill({ as = "button", className = "", children, disabled, ...props }) {
  const Tag = as;

  return (
    <Tag
      disabled={disabled}
      className={`group sharp relative inline-flex items-center justify-center overflow-hidden px-6 py-3 transition-colors ${
        disabled ? "cursor-not-allowed bg-white/10 text-white/30" : "bg-accent text-ink"
      } ${className}`}
      {...props}
    >
      {!disabled && (
        <span className="absolute inset-0 -translate-x-full bg-night transition-transform duration-300 ease-out group-hover:translate-x-0" />
      )}
      <span className="micro relative">{children}</span>
    </Tag>
  );
}

/** The quiet second action that sits beside a pill. */
export function TextAction({ as = "button", className = "", children, ...props }) {
  const Tag = as;
  return (
    <Tag
      className={`micro group relative inline-flex items-center text-muted transition-colors hover:text-night ${className}`}
      {...props}
    >
      <span>{children}</span>
      <span className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-accent transition-transform duration-300 ease-out group-hover:scale-x-100" />
    </Tag>
  );
}
