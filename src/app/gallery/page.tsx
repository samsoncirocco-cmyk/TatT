import { Metadata } from "next";
import Link from "next/link";
import StudioShell from "@/components/studio/StudioShell";
import SlashHeadline from "@/components/punk/SlashHeadline";
import TapeCTA from "@/components/punk/TapeCTA";

export const metadata: Metadata = {
  title: "Gallery — TattTester",
  description:
    "Shared cuts from the TattTester community. Nothing here yet — the design session is where designs are born.",
};

/**
 * Community gallery. There is no shared-design feed backing this page
 * yet (designs live in each user's own library), so it renders a
 * deliberate empty state instead of demo filler. Honest UI: no fake
 * designs, no fake view counts.
 */
export default function GalleryPage() {
  return (
    <StudioShell>
      <div className="px-6 md:px-12 pt-6 pb-4 border-b hairline">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-white/50 tabular-nums font-body">
          <span>
            <span className="text-pink">●</span>&nbsp;&nbsp;Gallery
          </span>
          <span>
            Shared:&nbsp;<span className="text-pink">0</span>
          </span>
        </div>
      </div>

      <div className="px-6 md:px-12 py-16 md:py-24">
        <div className="max-w-6xl mx-auto">
          <SlashHeadline
            before="Nothing on the"
            slashed="wall"
            after="yet"
            size="section"
          />
          <p className="mt-8 max-w-xl text-[15px] leading-[1.55] text-white/70 font-body">
            The community wall opens when people start sharing cuts. Until
            then, it stays blank —{" "}
            <span className="scribble text-pink">no fake ink here.</span>
          </p>
          <div className="mt-12 flex flex-wrap items-center gap-5">
            <TapeCTA href="/design" size="lg">
              Start Designing
            </TapeCTA>
            <Link
              href="/designs"
              className="text-[10px] uppercase tracking-[0.2em] text-white/70 hover:text-black hover:bg-pink border-2 hairline px-4 py-3 press font-body"
            >
              ▸ Your designs
            </Link>
          </div>
        </div>
      </div>
    </StudioShell>
  );
}
