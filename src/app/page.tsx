import Link from "next/link";
import StudioShell from "@/components/studio/StudioShell";
import SlashHeadline from "@/components/punk/SlashHeadline";
import ArtistCard from "@/components/punk/ArtistCard";
import { getFeaturedArtists } from "@/lib/featured-artists";
import { artistSlug } from "@/lib/artist-slug";
import { EXAMPLE_DESIGNS } from "@/lib/example-designs";

// The featured grid is curated but suppression-checked against the live graph,
// so a completed takedown drops off the homepage on its own rather than waiting
// for someone to re-run a script and redeploy. Revalidated rather than
// force-dynamic: the landing page stays cached, and the worst case is that a
// removed artist lingers for up to a minute instead of indefinitely.
// See src/lib/featured-artists.ts and docs/adr/0025.
export const revalidate = 60;

const STEPS = [
  {
    n: "01",
    title: "Describe",
    body: "Type one sentence. Subject, placement, mood. We'll handle the noise.",
  },
  {
    n: "02",
    title: "Generate",
    body: "AI cuts four passes in seconds. Pick the one that bites. Iterate or ship.",
  },
  {
    n: "03",
    title: "Connect",
    body: "Match with vetted artists who actually do this style. Book the chair.",
  },
];

export default async function Home() {
  // Curated from the live graph (scripts/pick-featured-artists.mjs), then
  // suppression-checked on render. May be short, or empty, and is rendered
  // honestly either way — backfilling would defeat the point.
  const featured = await getFeaturedArtists();

  return (
    <StudioShell>
      <div className="flex flex-col">
        {/* HERO — full-bleed studio photo, left-weighted scrim */}
        <section className="relative min-h-[520px] md:min-h-[620px] overflow-hidden flex">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/hero.png"
            alt="Tattoo in progress at the studio"
            className="absolute inset-0 w-full h-full object-cover object-[center_35%]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,#0a0a0a_22%,rgba(10,10,10,0.5)_55%,rgba(10,10,10,0.15)_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(0deg,#0a0a0a_4%,transparent_40%)]" />
          <div className="halftone absolute inset-0" />

          <div className="relative z-[2] px-6 md:px-14 py-16 md:py-[70px] max-w-[820px] flex flex-col justify-center">
            <div className="sticker self-start px-3.5 py-1.5 mb-6 rise rise-1">
              <div className="font-display text-[14px] tracking-widest leading-none">
                NEW
              </div>
              <div className="font-body text-[10px] uppercase tracking-widest leading-none mt-0.5">
                Side&nbsp;B&nbsp;Out&nbsp;Now
              </div>
            </div>

            <div className="text-[11px] uppercase tracking-[0.28em] text-pink mb-5 font-body rise rise-1">
              ▸&nbsp;Think it. Ink it.
            </div>

            <SlashHeadline
              before={<>Tattoo<br />your</>}
              slashed="way"
              size="hero"
              className="rise rise-2 text-balance"
            />

            <p className="rise rise-3 mt-7 max-w-[40ch] text-[15px] leading-[1.55] text-white/70 font-body">
              The AI tattoo studio that doesn&rsquo;t flinch. Describe the ink you
              want, get four cuts back, then{" "}
              <span className="scribble text-pink">find the artist</span> who can land it.
            </p>

            <div className="rise rise-4 mt-10 flex flex-col sm:flex-row sm:items-stretch gap-5">
              <Link
                href="/design"
                className="tape press inline-flex items-center justify-center px-9 py-[18px] font-display text-[28px] sm:text-[34px] leading-none tracking-[0.02em] self-start"
              >
                Start your design
                <span className="ml-3 text-[20px]">▸</span>
              </Link>
              <Link
                href="/artists"
                className="text-[10px] uppercase tracking-[0.2em] text-white/70 hover:text-black hover:bg-pink border-2 hairline px-6 py-5 press font-body self-start inline-flex items-center"
              >
                Browse artists&nbsp;&nbsp;→
              </Link>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="px-6 md:px-12 py-20 md:py-28 border-t-2 hairline">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-baseline justify-between mb-12">
              <h2 className="font-display text-white text-[32px] md:text-[48px] tracking-wide leading-none">
                How it works
              </h2>
              <span className="text-[10px] uppercase tracking-[0.25em] text-pink tabular-nums font-body">
                03&nbsp;steps
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
              {STEPS.map((s, i) => (
                <div key={s.n} className="relative">
                  <div className="sticker inline-block px-4 py-2 mb-6">
                    <div className="font-display text-[14px] tracking-widest leading-none">
                      Step&nbsp;{s.n}
                    </div>
                    <div className="font-body text-[10px] uppercase tracking-widest leading-none mt-1">
                      {s.title}
                    </div>
                  </div>
                  <h3 className="font-display text-white text-[36px] md:text-[48px] tracking-wide leading-[0.95]">
                    {i === 1 ? (
                      <>
                        <span className="slash"><span>{s.title}</span></span>
                        <span className="text-pink">.</span>
                      </>
                    ) : (
                      <>
                        {s.title}
                        <span className="text-pink">.</span>
                      </>
                    )}
                  </h3>
                  <p className="mt-4 text-[14px] text-white/70 font-body leading-[1.55] max-w-[280px]">
                    {s.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* EXAMPLE DESIGNS — the zero-signup product preview (TAT-36).
            Real outputs of the generation pipeline, labeled as AI-generated
            examples. NOT community posts (the gallery stays honestly empty
            until people share), no view counts, no artist attribution. */}
        <section className="px-6 md:px-12 py-20 md:py-28 border-t-2 hairline">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-baseline justify-between mb-6">
              <h2 className="font-display text-white text-[32px] md:text-[48px] tracking-wide leading-none">
                Straight off the Forge
              </h2>
              <span className="text-[10px] uppercase tracking-[0.25em] text-pink font-body">
                AI-generated&nbsp;examples
              </span>
            </div>
            <p className="mb-12 text-[14px] text-white/60 font-body leading-[1.55] max-w-[52ch]">
              Four cuts from the same pipeline behind{" "}
              <span className="text-white/80">Start your design</span> — shown
              as examples, not community posts.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
              {EXAMPLE_DESIGNS.map((d) => (
                <figure key={d.src} className="border-2 hairline bg-white/[0.03]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={d.src}
                    alt={d.alt}
                    loading="lazy"
                    className="w-full aspect-square object-cover"
                  />
                  <figcaption className="px-3 py-2.5 flex items-baseline justify-between gap-2">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-white/70 font-body">
                      {d.style}
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-pink font-body whitespace-nowrap">
                      Example
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>

            <div className="mt-12">
              <Link
                href="/design"
                className="text-[10px] uppercase tracking-[0.25em] text-white/70 hover:text-pink font-body"
              >
                Make your own&nbsp;&nbsp;→
              </Link>
            </div>
          </div>
        </section>

        {/* FEATURED ARTISTS */}
        <section className="px-6 md:px-12 py-20 md:py-28 border-t-2 hairline">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-baseline justify-between mb-12">
              <h2 className="font-display text-white text-[32px] md:text-[48px] tracking-wide leading-none">
                Featured artists
              </h2>
              <Link
                href="/artists"
                className="text-[10px] uppercase tracking-[0.25em] text-white/70 hover:text-pink font-body"
              >
                See all&nbsp;&nbsp;→
              </Link>
            </div>

            {featured.length ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
                {featured.map((a, i) => (
                  <ArtistCard
                    key={a.id}
                    variant="compact"
                    slug={artistSlug(a.name, a.id)}
                    name={a.name}
                    city={`${a.city}, ${a.state}`}
                    style={a.styles[0]}
                    color={["bg-pink", "bg-bone", "bg-cream", "bg-pink-deep"][i % 4]}
                    handle={a.instagram}
                  />
                ))}
              </div>
            ) : (
              // Empty is a legitimate outcome: everyone curated has been removed,
              // or the graph could not vouch for them and the gate failed closed.
              // Say nothing about why, and point at the roster instead.
              <p className="text-[14px] text-white/60 font-body leading-[1.55] max-w-[46ch]">
                Nothing featured right now.{" "}
                <Link href="/artists" className="text-pink hover:underline">
                  Browse the full roster
                </Link>{" "}
                instead.
              </p>
            )}
          </div>
        </section>
      </div>
    </StudioShell>
  );
}
