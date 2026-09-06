/**
 * One ground now: every band sits on the same near-black with the dot pattern
 * showing through. The two exports are kept so pages need no changes - they
 * differ only in whether a hairline separates them.
 */

export function DarkSection({ children, className = "", id }) {
  return (
    <section id={id} className={`relative w-full ${className}`}>
      <div className="relative mx-auto w-full max-w-6xl px-6 sm:px-10 lg:px-16">{children}</div>
    </section>
  );
}

export function LightSection({ children, className = "", id }) {
  return (
    <section id={id} className={`relative w-full border-t border-line ${className}`}>
      <div className="relative mx-auto w-full max-w-6xl px-6 sm:px-10 lg:px-16">{children}</div>
    </section>
  );
}

/** The recurring split: statement heading on the left, content on the right. */
export function SplitRow({ heading, micro, aside, children, className = "" }) {
  return (
    <div className={`grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16 ${className}`}>
      <div>
        {micro && <p className="micro text-night/40">{micro}</p>}
        <h2 className="h-display mt-5 text-3xl sm:text-4xl">{heading}</h2>
        {aside}
      </div>
      <div>{children}</div>
    </div>
  );
}
