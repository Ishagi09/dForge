import FeatureGrid from "./FeatureGrid";
import Reveal, { DrawRule } from "./Reveal";
import { LightSection, SplitRow } from "./Section";

/**
 * Every route lays out the same way: one band holding the working panel and the
 * explainer grid, then an optional band for the result.
 */
export default function PageShell({ micro, heading, children, result = null }) {
  return (
    <>
      <LightSection id="work" className="py-[96px]">
        <Reveal>
          <SplitRow micro={micro} heading={heading}>
            {children}
          </SplitRow>
        </Reveal>

        <DrawRule className="mt-[96px]" />

        <div className="mt-[64px]">
          <Reveal>
            <SplitRow
              micro="How it works"
              heading={
                <>
                  Hashes recorded on-chain,
                  <br />
                  checked by anyone
                </>
              }
            >
              <FeatureGrid />
            </SplitRow>
          </Reveal>
        </div>
      </LightSection>

      {result}
    </>
  );
}
