import Link from "next/link";
import StudioShell from "@/components/studio/StudioShell";
import TapeCTA from "@/components/punk/TapeCTA";
import ReinstateDoor from "./ReinstateDoor";

/**
 * The artist-scoped 404 — and, deliberately, the door back in.
 *
 * A removed artist's profile URL and a never-existed one render EXACTLY this,
 * byte for byte. That is the point: the profile lookup suppresses removed
 * artists inside the query (docs/adr/0025), so by the time this boundary
 * renders, the reason is unknowable — this file receives no props and reads
 * no data, and the test beside it pins that it stays that way. Showing the
 * reclaim line only on removed profiles would leak from the UI exactly what
 * the reinstatement API refuses to confirm (docs/adr/0026: no enumeration).
 *
 * So the door is on every artist 404, quietly. To a lost visitor it is one
 * ignorable line; to the person who had themselves removed and typed their
 * old URL, it is the way back they were promised.
 */
export default function ArtistNotFound() {
  return (
    <StudioShell>
      <div className="px-6 md:px-12 pt-6 pb-4 border-b hairline">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-white/50 tabular-nums font-body">
          <Link href="/artists" className="hover:text-pink">
            ←&nbsp;Roster
          </Link>
          <span>
            Profile&nbsp;/&nbsp;<span className="text-pink">not&nbsp;found</span>
          </span>
        </div>
      </div>

      <div className="px-6 md:px-12 py-16 md:py-24">
        <div className="max-w-4xl mx-auto w-full">
          <h1 className="font-display text-white leading-[0.88] text-[56px] sm:text-[96px] md:text-[128px] tracking-[0.005em]">
            No one&nbsp;<span className="slash"><span>here</span></span>
            <span className="text-pink">.</span>
          </h1>

          <p className="mt-10 max-w-xl text-[15px] leading-[1.55] text-white/70 font-body">
            There&apos;s no profile at this address. Maybe the link rotted, maybe
            this artist was never on TatT, maybe they asked us to remove them —
            we don&apos;t say which, on purpose, so that nobody can use this page
            to find out who asked to be taken down.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-5">
            <TapeCTA href="/artists" size="lg">
              Browse the roster
            </TapeCTA>
            <Link
              href="/generate/stencil"
              className="text-[10px] uppercase tracking-[0.25em] text-white/60 hover:text-pink border hairline px-4 py-3 press font-body"
            >
              ▸ Start a design instead
            </Link>
          </div>

          {/* The quiet line. Same for everyone, meaningful to one person. */}
          <ReinstateDoor />
        </div>
      </div>
    </StudioShell>
  );
}
