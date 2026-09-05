/**
 * Small isometric cube marks for the feature grid.
 * Three face tones of the brand accent plus a blurred copy give the lit-3D look.
 */

const TOP = "#FF9A6B";
const LEFT = "#FF6B2C";
const RIGHT = "#B8420F";

function Cube({ x = 0, y = 0, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M24 4 L42 14.5 L24 25 L6 14.5 Z" fill={TOP} />
      <path d="M6 14.5 L24 25 L24 44 L6 33.5 Z" fill={LEFT} />
      <path d="M42 14.5 L42 33.5 L24 44 L24 25 Z" fill={RIGHT} />
    </g>
  );
}

function Shape({ variant }) {
  if (variant === "stack") {
    return (
      <>
        <Cube x={0} y={-8} s={0.62} />
        <Cube x={0} y={6} s={0.62} />
      </>
    );
  }

  if (variant === "grid") {
    return (
      <>
        <Cube x={-9} y={0} s={0.44} />
        <Cube x={9} y={0} s={0.44} />
        <Cube x={0} y={10} s={0.44} />
      </>
    );
  }

  if (variant === "hollow") {
    return (
      <g fill="none" stroke={LEFT} strokeWidth="2" strokeLinejoin="round">
        <path d="M24 6 L40 15.5 L40 32.5 L24 42 L8 32.5 L8 15.5 Z" />
        <path d="M24 6 L24 24 M24 24 L40 15.5 M24 24 L8 15.5" stroke={TOP} />
      </g>
    );
  }

  return <Cube />;
}

export default function IsoIcon({ variant = "cube", className = "" }) {
  return (
    <span aria-hidden="true" className={`relative inline-block h-12 w-12 ${className}`}>
      <span
        className="absolute inset-0 opacity-60 blur-[10px]"
        style={{
          background: "radial-gradient(circle at 50% 55%, rgba(255,107,44,0.55), transparent 65%)",
        }}
      />
      <svg viewBox="0 0 48 48" className="relative h-full w-full">
        <Shape variant={variant} />
      </svg>
    </span>
  );
}
