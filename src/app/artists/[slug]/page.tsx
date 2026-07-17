import Link from "next/link";
import { notFound } from "next/navigation";
import StudioShell from "@/components/studio/StudioShell";
import FavoriteButton from "@/components/punk/FavoriteButton";
import SlashHeadline from "@/components/punk/SlashHeadline";
import TapeCTA from "@/components/punk/TapeCTA";
import { getAllArtists, getArtistBySlug } from "@/lib/artists";

export function generateStaticParams() {
  return getAllArtists().map((a) => ({ slug: a.slug }));
}

export default async function ArtistProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const artist = getArtistBySlug(slug);
  if (!artist) notFound();

  const nameParts = artist.name.split(" ");
  const lastName = nameParts.pop() ?? artist.name;
  const firstNames = nameParts.join(" ");
  // Same algorithm as ArtistCard initials() — first+last word, or 2 chars.
  const monogramParts = artist.name.trim().split(/\s+/).filter(Boolean);
  const monogram =
    monogramParts.length === 0
      ? "?"
      : monogramParts.length === 1
        ? monogramParts[0].slice(0, 2).toUpperCase()
        : (monogramParts[0][0] + monogramParts[monogramParts.length - 1][0]).toUpperCase();

  return (
    <StudioShell>
      {/* breadcrumb meta */}
      <div className="px-6 md:px-12 pt-6 pb-4 border-b hairline">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-white/50 tabular-nums font-body">
          <Link href="/artists" className="hover:text-pink">
            ←&nbsp;Roster
          </Link>
          <span>
            Profile&nbsp;/&nbsp;<span className="text-pink">{artist.slug}</span>
          </span>
        </div>
      </div>

      {/* HERO — portfolio image | info panel */}
      <div className="px-6 md:px-12 py-12 md:py-16">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-start">
          <div className="md:col-span-5">
            <div
              className={`aspect-[3/4] ${
                artist.portfolioImages[0] ? "bg-bone" : "bg-pink-deep"
              } border-2 hairline relative overflow-hidden`}
            >
              {artist.portfolioImages[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={artist.portfolioImages[0]}
                  alt={`${artist.name} portfolio work`}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                // No portfolio image scraped — monogram fallback, matching
                // ArtistCard (first+last word initials, or first 2 chars).
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-transparent to-black/60">
                  <span
                    aria-hidden="true"
                    className="font-display text-[96px] leading-none tracking-wide text-black/25 select-none"
                  >
                    {(() => {
                      const parts = artist.name.trim().split(/\s+/).filter(Boolean);
                      if (parts.length === 0) return "?";
                      if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
                      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
                    })()}
                  </span>
                </div>
              )}
              <span className="absolute bottom-3 left-3 text-[9px] uppercase tracking-[0.2em] font-body bg-cream text-black px-2 py-1">
                {artist.styles[0]}
              </span>
            </div>
          </div>

          <div className="md:col-span-7 relative">
            {artist.rating != null && (
              <div className="hidden sm:block absolute top-0 right-0 sticker px-3 py-1.5 z-10">
                <div className="font-display text-[13px] tracking-widest leading-none tabular-nums">
                  ★&nbsp;{artist.rating.toFixed(1)}
                </div>
                <div className="font-body text-[8px] uppercase tracking-widest leading-none mt-0.5 tabular-nums">
                  {artist.reviewCount}&nbsp;reviews
                </div>
              </div>
            )}

            <div className="text-[10px] uppercase tracking-[0.28em] text-pink mb-5 font-body">
              ▸&nbsp;{artist.styles.join(" · ")}
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
              <span>{artist.shopName}</span>
              <span className="text-pink">●</span>
              <span>{artist.location}</span>
            </div>

            <p className="mt-8 max-w-xl text-[15px] leading-[1.55] text-white/70 font-body">
              {artist.bio}{" "}
              {artist.bookingAvailable && (
                <span className="scribble text-pink">Chair is open.</span>
              )}
            </p>

            {/* STAT ROW — only fields we actually have. Scraped artists
                have no hourlyRate/yearsExperience, so those stats are
                omitted rather than shown as "$null/hr". */}
            <div className="mt-10 flex flex-wrap max-w-md border-t hairline pt-6 gap-x-10 gap-y-6">
              {(
                [
                  artist.yearsExperience != null
                    ? [`${artist.yearsExperience}yr`, "Experience"]
                    : null,
                  [`${artist.reviewCount}`, "Reviews"],
                  artist.hourlyRate != null
                    ? [`$${artist.hourlyRate}/hr`, "Rate"]
                    : null,
                ].filter(Boolean) as [string, string][]
              ).map(([n, label]) => (
                <div key={label}>
                  <div className="font-display text-[30px] sm:text-[38px] leading-none text-pink tabular-nums">
                    {n}
                  </div>
                  <div className="mt-2 text-[9px] uppercase tracking-[0.22em] text-white/50 font-body">
                    {label}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 flex flex-col sm:flex-row sm:items-stretch gap-5">
              <TapeCTA href="/book" size="md" className="self-start">
                Book the chair
              </TapeCTA>
              <span className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-body self-start sm:self-center">
                {artist.instagram}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* PORTFOLIO GRID — only when the artist has scraped images. */}
      {artist.portfolioImages.length > 0 && (
      <div className="px-6 md:px-12 pb-32">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="font-display text-white text-[24px] tracking-wide">
              Portfolio
            </h2>
            <span className="text-[10px] uppercase tracking-[0.25em] text-pink font-body tabular-nums">
              {String(artist.portfolioImages.length).padStart(2, "0")}
              &nbsp;pieces
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {artist.portfolioImages.map((src, i) => (
              <div
                key={src}
                className="aspect-square bg-bone border-2 hairline press relative overflow-hidden"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`${artist.name} piece ${i + 1}`}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                />
                <span className="absolute bottom-2 left-2 text-[9px] uppercase tracking-[0.2em] text-white font-body tabular-nums bg-black/60 px-1.5 py-0.5">
                  #{String(i + 1).padStart(2, "0")}
                </span>
              </div>
            ))}
            <Link
              href="/book"
              className="aspect-square border-2 hairline press relative overflow-hidden flex flex-col items-center justify-center gap-3 hover:border-pink group"
            >
              <span className="font-display text-[40px] leading-none text-pink/40 group-hover:text-pink">
                {"//"}
              </span>
              <span className="text-[10px] uppercase tracking-[0.22em] text-white/50 font-body group-hover:text-white">
                More at the shop
              </span>
            </Link>
          </div>
        </div>
      </div>
      )}

      {/* FLOATING CTA */}
      <div className="sticky bottom-6 z-30 px-6 md:px-12 pointer-events-none">
        <div className="max-w-6xl mx-auto flex justify-end">
          <Link
            href="/book"
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
