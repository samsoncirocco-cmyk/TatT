"use client";

import { useState } from "react";
import StudioShell from "@/components/studio/StudioShell";
import ArtistCard from "@/components/punk/ArtistCard";
import SlashHeadline from "@/components/punk/SlashHeadline";

const COLORS = ["bg-pink", "bg-bone", "bg-cream", "bg-pink-deep", "bg-white/10", "bg-white/5"];
const NAMES = [
  "Kira Volkov", "Diego Marin", "Astrid Holm", "Yuki Tanaka",
  "Marcus Reed", "Léa Dupont", "Sven Eriksson", "Priya Anand",
  "Tomás Vega", "Hana Park", "Idris Khan", "Mira Bell",
  "Jonas Weiss", "Camila Rojas", "Otto Lindqvist", "Naima Said",
  "Ren Kobayashi", "Sasha Petrov", "Eli Sterling", "Zoe Marchetti",
  "Bash Carter", "Nori Hayashi", "Pia Falk", "Quincy Drake",
];
const CITIES = [
  "Brooklyn, NY", "Mexico City", "Berlin, DE", "Osaka, JP",
  "Austin, TX", "Paris, FR", "Stockholm, SE", "Mumbai, IN",
  "Lisbon, PT", "Seoul, KR", "Manchester, UK", "Portland, OR",
  "Munich, DE", "Buenos Aires", "Helsinki, FI", "Cairo, EG",
  "Tokyo, JP", "Kyiv, UA", "Toronto, CA", "Rome, IT",
  "Dallas, TX", "Yokohama, JP", "Copenhagen, DK", "Atlanta, GA",
];
const STYLES = [
  "Fineline", "Traditional", "Blackwork", "Irezumi", "Neo-Trad",
  "Script", "Nordic", "Mehndi", "Surreal", "Soft Color", "Lettering", "Botanical",
];

const ARTISTS = Array.from({ length: 24 }).map((_, i) => ({
  slug: NAMES[i].toLowerCase().replace(/\s+/g, "-"),
  name: NAMES[i],
  city: CITIES[i],
  style: STYLES[i % STYLES.length],
  color: COLORS[i % COLORS.length],
}));

const STYLE_FILTERS = ["All", ...STYLES] as const;

export default function ArtistsPage() {
  const [q, setQ] = useState("");
  const [style, setStyle] = useState<string>("All");
  const ql = q.trim().toLowerCase();
  const filtered = ARTISTS.filter((a) => {
    if (style !== "All" && a.style !== style) return false;
    if (!ql) return true;
    return (
      a.name.toLowerCase().includes(ql) ||
      a.city.toLowerCase().includes(ql) ||
      a.style.toLowerCase().includes(ql)
    );
  });

  return (
    <StudioShell>
      <div className="px-6 md:px-12 pt-6 pb-4 border-b hairline">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-white/50 tabular-nums font-body">
          <span>
            <span className="text-pink">●</span>&nbsp;&nbsp;Directory
          </span>
          <span>
            Showing:&nbsp;<span className="text-pink">{filtered.length}</span>
          </span>
        </div>
      </div>

      <div className="px-6 md:px-12 py-16 md:py-20">
        <div className="max-w-6xl mx-auto">
          <SlashHeadline
            before="The"
            slashed="roster"
            sizeClassName="text-[48px] md:text-[88px] leading-[0.88]"
          />
          <p className="mt-6 text-[14px] text-white/60 font-body max-w-xl leading-[1.55]">
            Hand-picked tattoo artists, ready to land your design.
          </p>

          {/* SEARCH */}
          <div className="mt-10">
            <label
              htmlFor="search"
              className="block text-[10px] uppercase tracking-[0.28em] text-pink mb-3 font-body"
            >
              ▸ Search
            </label>
            <input
              id="search"
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Name, city, or style…"
              className="w-full bg-black text-white placeholder-white/30 focus:outline-none text-[20px] md:text-[24px] leading-[1.4] tracking-tight border-2 hairline focus:border-pink p-5 transition-colors font-display"
            />
          </div>

          {/* STICKY FILTER CHIPS */}
          <div className="mt-6 sticky top-0 z-10 -mx-6 md:-mx-12 px-6 md:px-12 py-3 bg-black/90 backdrop-blur-sm border-y hairline">
            <div className="flex items-center gap-3 overflow-x-auto">
              <span className="text-[10px] uppercase tracking-[0.25em] text-pink font-body shrink-0">
                Style
              </span>
              {STYLE_FILTERS.map((s) => {
                const active = style === s;
                return (
                  <button
                    key={s}
                    onClick={() => setStyle(s)}
                    className={`text-[10px] uppercase tracking-[0.2em] border hairline px-3 py-2 press font-body shrink-0 ${
                      active
                        ? "bg-pink text-black border-pink"
                        : "text-white/70 hover:text-black hover:bg-pink"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
              {(style !== "All" || q) && (
                <button
                  onClick={() => {
                    setStyle("All");
                    setQ("");
                  }}
                  className="ml-auto text-[10px] uppercase tracking-[0.2em] text-white/40 hover:text-pink font-body shrink-0 press"
                >
                  Clear&nbsp;✕
                </button>
              )}
            </div>
          </div>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((a) => (
              <ArtistCard
                key={a.slug}
                slug={a.slug}
                name={a.name}
                city={a.city}
                color={a.color}
                style={a.style}
                showFavorite
                favoriteSize={20}
                favoritePosition="top-right"
              />
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="mt-16 border-2 hairline p-10 text-center">
              <div className="font-display text-[24px] tracking-wide text-white/60">
                No artists match&nbsp;
                <span className="text-pink">&quot;{q}&quot;</span>
              </div>
              <p className="mt-3 text-[12px] uppercase tracking-[0.2em] text-white/40 font-body">
                Try a broader term.
              </p>
            </div>
          )}
        </div>
      </div>
    </StudioShell>
  );
}
