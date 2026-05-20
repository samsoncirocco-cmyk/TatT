"use client";

import Link from "next/link";
import StudioShell from "@/components/studio/StudioShell";
import FavoriteButton from "@/components/punk/FavoriteButton";
import { useFavorites } from "@/lib/tattStorage";

const COLORS = ["bg-pink", "bg-bone", "bg-cream", "bg-pink-deep", "bg-white/10"];

const ARTISTS = Array.from({ length: 12 }).map((_, i) => ({
  slug: `artist-${i + 1}`,
  name: [
    "Kira Volkov",
    "Diego Marin",
    "Astrid Holm",
    "Yuki Tanaka",
    "Marcus Reed",
    "Léa Dupont",
    "Sven Eriksson",
    "Priya Anand",
    "Tomás Vega",
    "Hana Park",
    "Idris Khan",
    "Mira Bell",
  ][i],
  city: [
    "Brooklyn, NY",
    "Mexico City",
    "Berlin, DE",
    "Osaka, JP",
    "Austin, TX",
    "Paris, FR",
    "Stockholm, SE",
    "Mumbai, IN",
    "Lisbon, PT",
    "Seoul, KR",
    "Manchester, UK",
    "Portland, OR",
  ][i],
  styles: [
    ["Fineline", "Floral", "Minimal"],
    ["Traditional", "Bold", "Color"],
    ["Blackwork", "Geometric", "Heavy"],
    ["Irezumi", "Color", "Large"],
    ["Neo-Trad", "Animal", "Color"],
    ["Fineline", "Script", "Micro"],
    ["Nordic", "Linework", "Pagan"],
    ["Mehndi", "Ornamental", "Floral"],
    ["Surreal", "Black/Grey", "Portrait"],
    ["K-Trad", "Pastel", "Soft"],
    ["Graffiti", "Lettering", "Bold"],
    ["Botanical", "Fineline", "Soft"],
  ][i],
  match: [98, 96, 94, 92, 91, 89, 88, 86, 84, 83, 81, 79][i],
  color: COLORS[i % COLORS.length],
}));

const STYLE_FILTERS = ["All", "Fineline", "Traditional", "Blackwork", "Color", "Geometric"];
const LOCATION_FILTERS = ["Anywhere", "USA", "Europe", "Asia"];
const PRICE_FILTERS = ["Any", "$", "$$", "$$$"];

function FilterPill({ label, active }: { label: string; active?: boolean }) {
  return (
    <button
      className={`text-[10px] uppercase tracking-[0.2em] border hairline px-3 py-2 press font-body ${
        active ? "bg-pink text-black border-pink" : "text-white/70 hover:text-black hover:bg-pink"
      }`}
    >
      {label}
    </button>
  );
}

export default function MatchesPage() {
  const { favorites, hydrated } = useFavorites();
  const favCount = hydrated ? favorites.length : 0;
  const hasFavorites = favCount > 0;
  const ordered = hydrated
    ? [
        ...ARTISTS.filter((a) => favorites.includes(a.slug)),
        ...ARTISTS.filter((a) => !favorites.includes(a.slug)),
      ]
    : ARTISTS;

  return (
    <StudioShell>
      <div className="px-6 md:px-12 pt-6 pb-4 border-b hairline">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-white/50 tabular-nums font-body">
          <span>
            <span className="text-pink">●</span>&nbsp;&nbsp;Step&nbsp;03/04 — Match
          </span>
          <span>
            {hasFavorites ? (
              <>Pinned:&nbsp;<span className="text-pink tabular-nums">{favCount}</span></>
            ) : (
              <>Status:&nbsp;<span className="text-pink">Exploring</span></>
            )}
          </span>
        </div>
      </div>

      <div className="px-6 md:px-12 py-16 md:py-20">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-baseline justify-between mb-3">
            <h1 className="font-display text-white text-[48px] md:text-[88px] leading-[0.88] tracking-[0.005em]">
              {hasFavorites ? (
                <>
                  Your&nbsp;<span className="slash"><span>matches</span></span>
                  <span className="text-pink">.</span>
                </>
              ) : (
                <>
                  Explore the&nbsp;<span className="slash"><span>roster</span></span>
                  <span className="text-pink">.</span>
                </>
              )}
            </h1>
          </div>
          <p className="text-[14px] text-white/60 font-body max-w-xl leading-[1.55]">
            {hasFavorites
              ? "Your pinned artists land first. The rest are ranked by style fit, location, and availability."
              : "Heart any artist below or over on the Roster — they'll get pinned to the top of this page."}
          </p>

          {!hasFavorites && hydrated && (
            <div className="mt-8 border-2 hairline p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-pink/5">
              <p className="text-[12px] uppercase tracking-[0.2em] text-white/70 font-body leading-[1.6]">
                <span className="text-pink">▸</span>&nbsp;&nbsp;No favorites yet. Below is the full roster as a warm-up.
              </p>
              <Link
                href="/artists"
                className="text-[10px] uppercase tracking-[0.2em] text-white/80 hover:text-black hover:bg-pink border-2 hairline px-4 py-3 press font-body whitespace-nowrap inline-flex items-center justify-center self-start sm:self-auto"
              >
                Browse Roster&nbsp;<span className="ml-2">▸</span>
              </Link>
            </div>
          )}

          {/* FILTERS */}
          <div className="mt-10 space-y-4 border-y-2 hairline py-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.25em] text-pink font-body mr-2">
                Style
              </span>
              {STYLE_FILTERS.map((s, i) => (
                <FilterPill key={s} label={s} active={i === 0} />
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.25em] text-pink font-body mr-2">
                Location
              </span>
              {LOCATION_FILTERS.map((s, i) => (
                <FilterPill key={s} label={s} active={i === 0} />
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.25em] text-pink font-body mr-2">
                Price
              </span>
              {PRICE_FILTERS.map((s, i) => (
                <FilterPill key={s} label={s} active={i === 0} />
              ))}
            </div>
          </div>

          {/* GRID */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {ordered.map((a) => {
              const isFav = hydrated && favorites.includes(a.slug);
              return (
                <div key={a.slug} className="relative group">
                  <Link href={`/artists/${a.slug}`} className="block press">
                    <div className={`aspect-[3/4] ${a.color} border-2 ${isFav ? "border-pink" : "hairline"} relative overflow-hidden`}>
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60 mix-blend-multiply" />
                      <div className="absolute top-3 right-3 sticker px-2 py-1 z-10">
                        <div className="font-display text-[11px] tracking-widest leading-none">
                          {a.match}%
                        </div>
                        <div className="font-body text-[8px] uppercase tracking-widest leading-none mt-0.5">
                          Match
                        </div>
                      </div>
                      {isFav && (
                        <span className="absolute bottom-3 left-3 text-[9px] uppercase tracking-[0.2em] text-pink font-body">
                          ★ Pinned
                        </span>
                      )}
                    </div>
                    <div className="mt-3">
                      <div className="font-display text-[20px] tracking-wide text-white group-hover:text-pink">
                        {a.name}
                      </div>
                      <div className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-body mt-1">
                        {a.city}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {a.styles.map((s) => (
                          <span
                            key={s}
                            className="text-[9px] uppercase tracking-[0.18em] text-white/70 border hairline px-2 py-1 font-body"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </Link>
                  <FavoriteButton
                    slug={a.slug}
                    label={a.name}
                    size={18}
                    className="absolute top-3 left-3 z-20"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="border-t hairline px-6 md:px-12 py-4 bg-black">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-white/50 tabular-nums font-body">
          <span>Sort:&nbsp;<span className="text-pink">Best Match</span></span>
          <span>
            <span className="text-pink">●</span>&nbsp;&nbsp;Live
          </span>
        </div>
      </div>
    </StudioShell>
  );
}
