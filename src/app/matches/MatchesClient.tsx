"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import StudioShell from "@/components/studio/StudioShell";
import ArtistCard from "@/components/punk/ArtistCard";
import SlashHeadline from "@/components/punk/SlashHeadline";
import { useFavorites } from "@/lib/tattStorage";
import { getApiAuthHeaders } from "@/lib/client-api-auth";
import { artistSlug } from "@/lib/artist-slug";
import { CANONICAL_STYLES, parseStylesParam } from "@/lib/design-style-signal";

const COLORS = ["bg-pink", "bg-bone", "bg-cream", "bg-pink-deep", "bg-white/10"];

// Canonical style vocabulary of the live artist graph, plus the no-filter pill.
const STYLE_FILTERS = ["All", ...CANONICAL_STYLES];

type Match = {
  id: string;
  name: string;
  city?: string;
  state?: string;
  location?: string;
  styles: string[];
  score: number;
  instagram?: string;
};

type Status = "loading" | "ready" | "empty" | "offline" | "error";

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-[10px] uppercase tracking-[0.2em] border hairline px-3 py-2 press font-body shrink-0 ${
        active ? "bg-pink text-black border-pink" : "text-white/70 hover:text-black hover:bg-pink"
      }`}
    >
      {label}
    </button>
  );
}

export default function MatchesClient() {
  const { favorites, hydrated } = useFavorites();
  const favCount = hydrated ? favorites.length : 0;
  const hasFavorites = favCount > 0;

  // Style signal carried over from the Stencil Forge's "Find artists for
  // this design" CTA (/matches?styles=…&from=design). Validated against the
  // canonical vocabulary; garbage params degrade to no signal. Read once on
  // mount — clearing the chip or picking a pill drops the signal without
  // rewriting the URL.
  const searchParams = useSearchParams();
  const [designStyles, setDesignStyles] = useState<string[]>(() =>
    searchParams?.get("from") === "design"
      ? parseStylesParam(searchParams.get("styles"))
      : [],
  );

  const [style, setStyle] = useState("All");
  const [locationInput, setLocationInput] = useState("");
  const [location, setLocation] = useState("");
  const [hasPortfolio, setHasPortfolio] = useState(false);
  const [status, setStatus] = useState<Status>("loading");
  const [matches, setMatches] = useState<Match[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const fetchMatches = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("loading");

    try {
      // Matching requires a signed-in user (reached only after upload/generate).
      // getApiAuthHeaders attaches the Firebase ID token, or prompts sign-in
      // and throws if there is no session — handled by the catch below.
      const authHeaders = await getApiAuthHeaders();

      // A design signal supplies (possibly several) styles; a manually
      // picked pill supplies one. They never combine — picking a pill or
      // clearing the chip drops the signal.
      const activeStyles = designStyles.length
        ? designStyles
        : style === "All"
          ? []
          : [style];

      const res = await fetch("/api/v1/match/semantic", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        signal: controller.signal,
        body: JSON.stringify({
          query:
            [...activeStyles, location].filter(Boolean).join(" ") ||
            "tattoo artist",
          style_preferences: activeStyles,
          location: location || null,
          has_portfolio: hasPortfolio,
          max_results: 12,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Matching failed");

      // Honesty gate: if the backend fell back to its built-in demo
      // artists, say so instead of dressing them up as matches.
      if (data.query_info?.graphSource !== "live") {
        setMatches([]);
        setStatus("offline");
        return;
      }

      const real: Match[] = (data.matches || []).map((m: Match) => ({
        id: String(m.id),
        name: m.name,
        city: m.city,
        state: m.state,
        location: m.location,
        styles: m.styles || [],
        score: m.score,
        instagram: m.instagram,
      }));

      setMatches(real);
      setStatus(real.length === 0 ? "empty" : "ready");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.error("[Matches] Fetch failed:", err);
      setMatches([]);
      setStatus("error");
    }
  }, [designStyles, style, location, hasPortfolio]);

  useEffect(() => {
    fetchMatches();
    return () => abortRef.current?.abort();
  }, [fetchMatches]);

  const cards = useMemo(
    () =>
      matches.map((m, i) => {
        // Every match is a real graph artist with a live profile page.
        const slug = artistSlug(m.name, m.id);
        return {
          key: m.id,
          slug,
          name: m.name,
          city: m.location || m.city || "—",
          styles: m.styles.slice(0, 3),
          match: Math.min(99, Math.max(1, Math.round(m.score))),
          color: COLORS[i % COLORS.length],
          href: `/artists/${slug}`,
          bookHref: `/book?artistId=${encodeURIComponent(m.id)}`,
          external: false,
        };
      }),
    [matches]
  );

  const ordered = hydrated
    ? [
        ...cards.filter((a) => favorites.includes(a.slug)),
        ...cards.filter((a) => !favorites.includes(a.slug)),
      ]
    : cards;

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
            {hasFavorites ? (
              <SlashHeadline
                before="Your"
                slashed="matches"
                sizeClassName="text-[48px] md:text-[88px] leading-[0.88]"
              />
            ) : (
              <SlashHeadline
                before="Live"
                slashed="matches"
                sizeClassName="text-[48px] md:text-[88px] leading-[0.88]"
              />
            )}
          </div>
          <p className="text-[14px] text-white/60 font-body max-w-xl leading-[1.55]">
            {hasFavorites
              ? "Your pinned artists land first. The rest are ranked live from the artist graph by style fit and location."
              : "Real artists, matched live from the graph by style fit and location. Heart anyone to pin them to the top."}
          </p>

          {/* FILTERS */}
          <div className="mt-10 space-y-4 border-y-2 hairline py-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.25em] text-pink font-body mr-2">
                Style
              </span>
              {STYLE_FILTERS.map((s) => (
                <FilterPill
                  key={s}
                  label={s}
                  active={designStyles.length ? designStyles.includes(s) : style === s}
                  onClick={() => {
                    // Manual pick always overrides the design signal.
                    setDesignStyles([]);
                    setStyle(s);
                  }}
                />
              ))}
            </div>
            {designStyles.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] uppercase tracking-[0.25em] text-pink font-body mr-2">
                  ▸ Matched to your design
                </span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-black bg-pink border border-pink px-3 py-2 font-body">
                  {designStyles.join(" / ")}
                </span>
                <button
                  onClick={() => setDesignStyles([])}
                  className="text-[10px] uppercase tracking-[0.2em] text-white/40 hover:text-pink font-body press"
                >
                  Clear&nbsp;✕
                </button>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <label
                htmlFor="match-location"
                className="text-[10px] uppercase tracking-[0.25em] text-pink font-body mr-2"
              >
                Location
              </label>
              <input
                id="match-location"
                type="text"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                onBlur={() => setLocation(locationInput.trim())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setLocation(locationInput.trim());
                }}
                placeholder="Any city…"
                className="bg-black text-white placeholder-white/30 focus:outline-none text-[10px] uppercase tracking-[0.2em] border hairline focus:border-pink px-3 py-2 font-body w-40"
              />
              {location && (
                <button
                  onClick={() => {
                    setLocationInput("");
                    setLocation("");
                  }}
                  className="text-[10px] uppercase tracking-[0.2em] text-white/40 hover:text-pink font-body press"
                >
                  Clear&nbsp;✕
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.25em] text-pink font-body mr-2">
                Portfolio
              </span>
              <FilterPill
                label={hasPortfolio ? "Has portfolio ✓" : "Has portfolio"}
                active={hasPortfolio}
                onClick={() => setHasPortfolio((v) => !v)}
              />
            </div>
          </div>

          {/* LOADING */}
          {status === "loading" && (
            <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-3 animate-pulse">
                  <div className="aspect-[3/4] bg-white/5 border-2 hairline" />
                  <div className="h-[16px] bg-white/5 border hairline max-w-[70%]" />
                  <div className="h-[10px] bg-white/5 border hairline max-w-[45%]" />
                </div>
              ))}
            </div>
          )}

          {/* ERROR */}
          {status === "error" && (
            <div className="mt-16 border-2 hairline p-10 text-center">
              <div className="font-display text-[24px] tracking-wide text-white/60">
                Signal&nbsp;<span className="text-pink">lost</span>
              </div>
              <p className="mt-3 text-[12px] uppercase tracking-[0.2em] text-white/40 font-body">
                Couldn&apos;t reach the matching engine.
              </p>
              <button
                onClick={fetchMatches}
                className="mt-6 text-[10px] uppercase tracking-[0.2em] text-white/80 hover:text-black hover:bg-pink border-2 hairline px-4 py-3 press font-body"
              >
                Retry&nbsp;▸
              </button>
            </div>
          )}

          {/* OFFLINE — live graph unavailable; no stand-ins, ever */}
          {status === "offline" && (
            <div className="mt-16 border-2 hairline p-10 text-center bg-pink/5">
              <div className="font-display text-[24px] tracking-wide text-white/60">
                Matching engine&nbsp;<span className="text-pink">offline</span>
              </div>
              <p className="mt-3 text-[12px] uppercase tracking-[0.2em] text-white/40 font-body leading-[1.8]">
                The live artist graph is unreachable, and we don&apos;t fake matches.
                <br />
                Browse the roster instead.
              </p>
              <Link
                href="/artists"
                className="mt-6 inline-flex text-[10px] uppercase tracking-[0.2em] text-white/80 hover:text-black hover:bg-pink border-2 hairline px-4 py-3 press font-body"
              >
                Browse Roster&nbsp;<span className="ml-2">▸</span>
              </Link>
            </div>
          )}

          {/* EMPTY */}
          {status === "empty" && (
            <div className="mt-16 border-2 hairline p-10 text-center">
              <div className="font-display text-[24px] tracking-wide text-white/60">
                No artists match&nbsp;
                <span className="text-pink">
                  {[
                    designStyles.length ? designStyles.join(" / ") : style !== "All" ? style : null,
                    location,
                  ]
                    .filter(Boolean)
                    .join(" / ") || "that"}
                </span>
              </div>
              <p className="mt-3 text-[12px] uppercase tracking-[0.2em] text-white/40 font-body">
                Try a different style or a broader location.
              </p>
            </div>
          )}

          {/* GRID */}
          {status === "ready" && (
            <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {ordered.map((a) => (
                <ArtistCard
                  key={a.key}
                  variant="match"
                  slug={a.slug}
                  name={a.name}
                  city={a.city}
                  color={a.color}
                  styles={a.styles}
                  matchPercent={a.match}
                  href={a.href}
                  bookHref={a.bookHref}
                  external={a.external}
                  showFavorite
                  favoriteSize={18}
                  favoritePosition="top-left"
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="border-t hairline px-6 md:px-12 py-4 bg-black">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-white/50 tabular-nums font-body">
          <span>Sort:&nbsp;<span className="text-pink">Best Match</span></span>
          <span>
            {status === "offline" || status === "error" ? (
              <><span className="text-white/40">●</span>&nbsp;&nbsp;Offline</>
            ) : (
              <><span className="text-pink">●</span>&nbsp;&nbsp;Live</>
            )}
          </span>
        </div>
      </div>
    </StudioShell>
  );
}
