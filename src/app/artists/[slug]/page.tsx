import Link from "next/link";
import { notFound } from "next/navigation";
import StudioShell from "@/components/studio/StudioShell";
import FavoriteButton from "@/components/punk/FavoriteButton";
import InstagramEmbed from "@/components/punk/InstagramEmbed";
import SlashHeadline from "@/components/punk/SlashHeadline";
import TapeCTA from "@/components/punk/TapeCTA";
import { artistIdFromSlug } from "@/lib/artist-slug";
import { getRosterArtistById, instagramUrl } from "@/lib/artists-graph";

// 10k+ artists live in the graph — profiles render on demand, never at build.
export const dynamic = "force-dynamic";

// Surface budget for the embed tier (TAT-40): full Instagram embeds render
// HERE and only here — a handful, lazily. Card grids (/artists roster) and
// the swipe deck never mount iframes; they stay on hosted-image/stub tiles.
const PROFILE_EMBED_LIMIT = 4;

export default async function ArtistProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const artist = await getRosterArtistById(artistIdFromSlug(slug));
  if (!artist) notFound();

  const nameParts = artist.name.split(" ");
  const lastName = nameParts.pop() ?? artist.name;
  const firstNames = nameParts.join(" ");
  const igUrl = instagramUrl(artist.instagram);
  const heroImage = artist.portfolioImages[0];
  const monogram = artist.name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <StudioShell>
      {/* breadcrumb meta */}
      <div className="px-6 md:px-12 pt-6 pb-4 border-b hairline">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-white/50 tabular-nums font-body">
          <Link href="/artists" className="hover:text-pink">
            ←&nbsp;Roster
          </Link>
          <span>
            Profile&nbsp;/&nbsp;<span className="text-pink">{artist.id}</span>
          </span>
        </div>
      </div>

      {/* HERO — portfolio image (self-hosted) or monogram tile | info panel.
          Instagram remains the see-their-work affordance either way. */}
      <div className="px-6 md:px-12 py-12 md:py-16">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-start">
          <div className="md:col-span-5">
            <div
              className={`aspect-[3/4] ${heroImage ? "bg-bone" : "bg-pink"} border-2 hairline relative overflow-hidden`}
            >
              {heroImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={heroImage}
                  alt={`${artist.name} portfolio work`}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <>
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60 mix-blend-multiply" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="font-display text-[120px] md:text-[160px] leading-none text-black/25 select-none">
                      {monogram}
                    </span>
                  </div>
                </>
              )}
              {artist.instagram && (
                <div className="absolute top-4 left-4 sticker px-2.5 py-1.5 -rotate-3">
                  <span className="font-body text-[10px] uppercase tracking-[0.18em]">
                    {artist.instagram}&nbsp;→
                  </span>
                </div>
              )}
              {igUrl && (
                <a
                  href={igUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute bottom-4 left-4 right-4 text-center text-[10px] uppercase tracking-[0.22em] font-body bg-cream text-black px-3 py-3 press hover:bg-white"
                >
                  See their work on Instagram&nbsp;▸
                </a>
              )}
            </div>
          </div>

          <div className="md:col-span-7 relative">
            {artist.rating != null && (
              <div className="hidden sm:block absolute top-0 right-0 sticker px-3 py-1.5 z-10">
                <div className="font-display text-[14px] tracking-widest leading-none tabular-nums">
                  ★&nbsp;{artist.rating.toFixed(1)}
                </div>
                <div className="font-body text-[10px] uppercase tracking-widest leading-none mt-0.5 tabular-nums">
                  Shop&nbsp;rating
                  {artist.reviewCount != null && (
                    <>&nbsp;·&nbsp;{artist.reviewCount.toLocaleString()}&nbsp;reviews</>
                  )}
                </div>
              </div>
            )}

            <div className="text-[10px] uppercase tracking-[0.28em] text-pink mb-5 font-body">
              {artist.styles.length > 0 ? (
                <>▸&nbsp;{artist.styles.join(" · ")}</>
              ) : (
                <span className="text-white/40">▸&nbsp;Styles not cataloged yet</span>
              )}
            </div>

            <div className="flex items-start justify-between gap-4">
              <SlashHeadline
                before={firstNames || undefined}
                slashed={lastName}
                sizeClassName="text-[48px] sm:text-[72px] md:text-[88px] leading-[0.88]"
                className="text-balance"
              />
              <FavoriteButton
                slug={artist.slug}
                label={artist.name}
                size={28}
                className="mt-2 shrink-0"
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-[0.25em] text-white/60 font-body">
              {artist.shopName && (
                <>
                  <span>{artist.shopName}</span>
                  <span className="text-pink">●</span>
                </>
              )}
              <span>{artist.location}</span>
            </div>

            {/* STAT ROW — shop-level signals, labeled as such */}
            {(artist.rating != null || artist.reviewCount != null) && (
              <div className="mt-10 grid grid-cols-2 max-w-md border-t hairline pt-6 gap-6">
                {artist.rating != null && (
                  <div>
                    <div className="font-display text-[30px] sm:text-[38px] leading-none text-pink tabular-nums">
                      ★{artist.rating.toFixed(1)}
                    </div>
                    <div className="mt-2 text-[10px] uppercase tracking-[0.22em] text-white/50 font-body">
                      Shop rating
                    </div>
                  </div>
                )}
                {artist.reviewCount != null && (
                  <div>
                    <div className="font-display text-[30px] sm:text-[38px] leading-none text-pink tabular-nums">
                      {artist.reviewCount.toLocaleString()}
                    </div>
                    <div className="mt-2 text-[10px] uppercase tracking-[0.22em] text-white/50 font-body">
                      Shop reviews
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-10 flex flex-col sm:flex-row sm:items-stretch gap-5">
              <TapeCTA
                href={`/book?artistId=${encodeURIComponent(artist.id)}`}
                size="md"
                className="self-start"
              >
                Book the chair
              </TapeCTA>
              {igUrl && (
                <a
                  href={igUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] uppercase tracking-[0.2em] text-white/50 hover:text-pink font-body self-start sm:self-center press"
                >
                  {artist.instagram}&nbsp;→
                </a>
              )}
            </div>

            {/* Provenance label (ADR-0033 law 3): an unclaimed profile says
                plainly that it is unclaimed and where the work comes from,
                with credit — and keeps both endings one click away: run it,
                or have it removed (docs/adr/0025). Profile page only; roster
                cards stay unlabeled. Claimed artists run their own profile,
                so none of this renders for them. */}
            {!artist.claimed && (
              <div className="mt-10 pt-6 border-t hairline font-body text-[11px] text-white/40 leading-[1.6]">
                {/* wording pending counsel review (TAT-31) */}
                <p>
                  This profile is unclaimed — {artist.name} hasn&apos;t taken it
                  over yet. The work shown here is {artist.name}&apos;s, from
                  their public Instagram
                  {artist.instagram ? <> ({artist.instagram})</> : null}.
                </p>
                <p className="mt-2">
                  Are you {artist.name}?{" "}
                  <Link
                    href={`/claim/${encodeURIComponent(artist.id)}`}
                    className="text-white/60 hover:text-pink press"
                  >
                    Claim your profile
                  </Link>
                  {" · "}
                  <Link
                    href={`/takedown/${encodeURIComponent(artist.id)}`}
                    className="text-white/60 hover:text-pink press"
                  >
                    Have it removed
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RECENT WORK — Instagram embed tier (TAT-40). portfolioPermalinks is
          policy-filtered server-side (src/lib/portfolio-display): it is empty
          unless ENABLE_IG_EMBEDS=true and this artist is unclaimed, so this
          whole section is inert until that flag is deliberately flipped.
          The media is served by Instagram inside Instagram's iframe — nothing
          here is hosted or cached on TatT infrastructure. */}
      {artist.portfolioPermalinks.length > 0 && (
        <div className="px-6 md:px-12 pb-12 md:pb-16">
          <div className="max-w-6xl mx-auto">
            <div className="text-[10px] uppercase tracking-[0.28em] text-pink mb-6 font-body border-t hairline pt-8">
              ▸&nbsp;Recent&nbsp;work&nbsp;·&nbsp;via&nbsp;Instagram
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
              {artist.portfolioPermalinks.slice(0, PROFILE_EMBED_LIMIT).map((permalink) => (
                <InstagramEmbed
                  key={permalink}
                  permalink={permalink}
                  className="border-2 hairline bg-black/40"
                  // A deleted/private post degrades to the same deliberate
                  // monogram tile the hero uses — never a broken box.
                  fallback={
                    <div className="aspect-[3/4] bg-pink border-2 hairline relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60 mix-blend-multiply" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="font-display text-[88px] leading-none text-black/25 select-none">
                          {monogram}
                        </span>
                      </div>
                    </div>
                  }
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FLOATING CTA */}
      <div className="sticky bottom-6 z-30 px-6 md:px-12 pb-10 pointer-events-none">
        <div className="max-w-6xl mx-auto flex justify-end">
          <Link
            href={`/book?artistId=${encodeURIComponent(artist.id)}`}
            className="tape press inline-flex items-center justify-center px-8 py-4 font-display text-[24px] sm:text-[32px] leading-none tracking-[0.02em] pointer-events-auto"
          >
            Book Consultation
            <span className="ml-3 text-[18px]">▸</span>
          </Link>
        </div>
      </div>
    </StudioShell>
  );
}
