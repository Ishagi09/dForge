// Film grain. feTurbulence is rasterised once by the browser and then only
// translated, so the flicker costs nothing per frame.
const NOISE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'>
       <filter id='n'>
         <feTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='3' stitchTiles='stitch'/>
         <feColorMatrix type='saturate' values='0'/>
       </filter>
       <rect width='100%' height='100%' filter='url(#n)' opacity='0.55'/>
     </svg>`
  );

export default function GrainOverlay() {
  return (
    <div
      aria-hidden="true"
      className="grain pointer-events-none fixed inset-0 z-[55] opacity-[0.05] mix-blend-overlay"
      style={{ backgroundImage: `url("${NOISE}")`, backgroundRepeat: "repeat" }}
    />
  );
}
