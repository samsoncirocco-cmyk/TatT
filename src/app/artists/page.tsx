"use client";

import { useState } from "react";
import Link from "next/link";
import StudioShell from "@/components/studio/StudioShell";
import FavoriteButton from "@/components/punk/FavoriteButton";

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

export default function ArtistsPage() {
  const [q, setQ] = useState("");
  const filtered = ARTISTS.filter(
    (a) =>
      a.name.toLowerCase().includes(q.toLowerCase()) ||
      a.city.toLowerCase().includes(q.toLowerCase()) ||
      a.style.toLowerCase().includes(q.toLowerCase())
  );

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
          <h1 className="font-display text-white text-[48px] md:text-[88px] leading-[0.88] tracking-[0.005em]">
            The&nbsp;<span className="slash"><span>roster</span></span>
            <span className="text-pink">.</span>
          </h1>
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

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((a) => (
              <div key={a.slug} className="relative group">
                <Link
                  href={`/artists/${a.slug}`}
                  className="block press"
                >
                  <div className={`aspect-[3/4] ${a.color} border-2 hairline relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60 mix-blend-multiply" />
                    <span className="absolute bottom-3 left-3 text-[9px] uppercase tracking-[0.2em] text-white/80 font-body">
                      {a.style}
                    </span>
                  </div>
                  <div className="mt-3">
                    <div className="font-display text-[20px] tracking-wide text-white group-hover:text-pink">
                      {a.name}
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-body mt-1">
                      {a.city}
                    </div>
                  </div>
                </Link>
                <FavoriteButton
                  slug={a.slug}
                  label={a.name}
                  size={20}
                  className="absolute top-2 right-2 z-10"
                />
              </div>
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
