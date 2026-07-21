"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import StudioShell from "@/components/studio/StudioShell";
import SlashHeadline from "@/components/punk/SlashHeadline";
import { useMatchStore } from "@/store/useMatchStore";
import { artistSlug } from "@/lib/artist-slug";
import { trackSwipe } from "@/utils/matching";

// react-tinder-card touches the DOM directly on mount — load client-only.
const TinderCard = dynamic(() => import("react-tinder-card"), { ssr: false });

/**
 * Card-deck swipe UI over whatever /smart-match put in useMatchStore.
 * Real graph artists only — no fake fallback deck. If the store is
 * empty (direct nav, refresh after a session), send the visitor back
 * to /smart-match to run a real search instead of showing stand-ins.
 */

type SwipeCard = {
  id: string;
  name: string;
  slug: string;
  matchPercent: number;
  styles: string[];
  location?: string;
  instagram?: string;
};

export default function SwipePage() {
  const router = useRouter();
  const storedMatches = useMatchStore((s) => s.matches);
  const hasHydrated = useMatchStore((s) => s.hasHydrated);

  const cards = useMemo<SwipeCard[]>(
    () =>
      storedMatches.map((m) => ({
        id: m.artistId,
        name: m.artistName,
        slug: artistSlug(m.artistName, m.artistId),
        matchPercent: Math.min(99, Math.max(1, Math.round(m.matchScore || 0))),
        styles: (m.styles || m.tags || []).slice(0, 3),
        location: m.location,
        instagram: m.instagramUrl,
      })),
    [storedMatches]
  );

  // Tracked by id rather than a numeric index: useMatchStore is
  // zustand-persist-backed, so on a fresh load (or a reload mid-swipe) the
  // store starts empty and hydrates from localStorage asynchronously —
  // an index-based "cards.length - 1" initial value would capture 0 from
  // that first, pre-hydration render and never recover. A Set of swiped
  // ids has no such initialization race: it starts empty regardless of
  // when cards arrives, and "done" just compares sizes.
  const [swipedIds, setSwipedIds] = useState<Set<string>>(new Set());
  const [liked, setLiked] = useState<SwipeCard[]>([]);

  const swiped = (direction: string, card: SwipeCard) => {
    if (direction === "right") setLiked((prev) => [...prev, card]);
    trackSwipe(card.id, direction);
    setSwipedIds((prev) => new Set(prev).add(card.id));
  };

  // Persist rehydration is async: matches starts as [] even when a deck
  // exists in localStorage. Wait before deciding the empty state so a
  // reload / direct nav to /swipe does not flash "No deck yet."
  if (!hasHydrated) {
    return (
      <StudioShell>
        <div className="px-6 md:px-12 py-16 md:py-20 flex flex-col items-center">
          <div className="max-w-3xl w-full text-center mb-10">
            <div className="h-[56px] md:h-[64px] bg-white/5 border-2 hairline max-w-md mx-auto" />
            <div className="mt-3 h-[14px] bg-white/5 border hairline max-w-sm mx-auto" />
          </div>
          <div
            className="w-full max-w-sm h-[520px] bg-white/5 border-2 hairline"
            aria-busy="true"
            aria-label="Loading swipe deck"
          />
        </div>
      </StudioShell>
    );
  }

  if (cards.length === 0) {
    return (
      <StudioShell>
        <div className="px-6 md:px-12 py-24 text-center">
          <div className="max-w-md mx-auto border-2 hairline p-10">
            <div className="font-display text-[24px] tracking-wide text-white/60">
              No deck&nbsp;<span className="text-pink">yet</span>
            </div>
            <p className="mt-3 text-[12px] uppercase tracking-[0.2em] text-white/40 font-body leading-[1.8]">
              Run a match search first — swipe works over real results, never a stand-in deck.
            </p>
            <Link
              href="/smart-match"
              className="mt-6 inline-flex text-[10px] uppercase tracking-[0.2em] text-white/80 hover:text-black hover:bg-pink border-2 hairline px-4 py-3 press font-body"
            >
              Set preferences&nbsp;<span className="ml-2">▸</span>
            </Link>
          </div>
        </div>
      </StudioShell>
    );
  }

  const done = cards.length > 0 && swipedIds.size >= cards.length;

  return (
    <StudioShell>
      <div className="px-6 md:px-12 pt-6 pb-4 border-b hairline">
        <div className="max-w-3xl mx-auto flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-white/50 tabular-nums font-body">
          <span>
            <span className="text-pink">●</span>&nbsp;&nbsp;Step&nbsp;02/02 — Swipe
          </span>
          <span>
            Pinned:&nbsp;<span className="text-pink tabular-nums">{liked.length}</span>
          </span>
        </div>
      </div>

      <div className="px-6 md:px-12 py-16 md:py-20 flex flex-col items-center">
        <div className="max-w-3xl w-full text-center mb-10">
          <SlashHeadline
            before="Real"
            slashed="artists"
            sizeClassName="text-[40px] md:text-[56px] leading-[0.9]"
            className="justify-center"
          />
          <p className="mt-3 text-[14px] text-white/60 font-body">
            Swipe right to pin, left to pass. Ranked live from the graph.
          </p>
        </div>

        {!done ? (
          <div className="w-full max-w-sm h-[520px] relative">
            {/* Cards not yet swiped, stacked via CSS (absolute + source
                order — later siblings paint on top). Explicit filter
                rather than relying on TinderCard's internal DOM removal,
                which fights React's own reconciliation on re-render. */}
            {cards.filter((card) => !swipedIds.has(card.id)).map((card) => (
                <TinderCard
                  key={card.id}
                  onSwipe={(dir) => swiped(dir, card)}
                  preventSwipe={["up", "down"]}
                  className="absolute w-full h-full"
                >
                  <div className="relative w-full h-full border-2 hairline overflow-hidden bg-black flex flex-col">
                    {/* Monogram tile — the live match API doesn't return
                        portfolio image URLs, only a count. Same honest
                        fallback ArtistCard uses everywhere else, rather
                        than faking a stock photo. */}
                    <div className="relative h-3/5 bg-pink flex items-center justify-center">
                      <span className="font-display text-[96px] leading-none text-black/25 select-none">
                        {card.name
                          .split(/\s+/)
                          .map((w) => w[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                      </span>
                      <div className="absolute top-4 right-4 sticker px-2 py-1">
                        <div className="font-display text-[11px] tracking-widest leading-none">
                          {card.matchPercent}%
                        </div>
                        <div className="font-body text-[8px] uppercase tracking-widest leading-none mt-0.5">
                          Match
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 p-6 flex flex-col justify-between bg-black">
                      <div>
                        <div className="font-display text-[24px] tracking-wide text-white">
                          {card.name}
                        </div>
                        <div className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-body mt-1">
                          {card.location || "—"}
                        </div>
                        {card.styles.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {card.styles.map((s) => (
                              <span
                                key={s}
                                className="text-[9px] uppercase tracking-[0.18em] text-white/70 border hairline px-2 py-1 font-body"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex justify-between gap-3 mt-4">
                        <button
                          type="button"
                          onClick={() => swiped("left", card)}
                          className="flex-1 border hairline text-white/60 hover:bg-white/10 py-3 text-[10px] uppercase tracking-widest font-body press"
                        >
                          Pass
                        </button>
                        <button
                          type="button"
                          onClick={() => swiped("right", card)}
                          className="flex-1 bg-pink text-black py-3 text-[10px] uppercase tracking-widest font-body press"
                        >
                          Pin
                        </button>
                      </div>
                    </div>
                  </div>
                </TinderCard>
            ))}
          </div>
        ) : (
          <div className="max-w-md w-full text-center border-2 hairline p-10">
            <p className="text-pink text-[10px] uppercase tracking-[0.4em] mb-4 font-body">
              Deck&nbsp;complete
            </p>
            <div className="font-display text-[28px] tracking-tighter mb-3 text-white">
              {liked.length} pinned
            </div>
            <p className="text-[12px] uppercase tracking-[0.2em] text-white/40 font-body mb-8">
              {liked.length > 0
                ? "Head to your matches to book the chair."
                : "Nothing pinned this round — try different preferences."}
            </p>
            <button
              type="button"
              onClick={() => router.push(liked.length > 0 ? "/matches" : "/smart-match")}
              className="w-full text-[10px] uppercase tracking-[0.25em] bg-pink text-black px-8 py-4 press font-body"
            >
              {liked.length > 0 ? "View Matches ▸" : "Try Again ▸"}
            </button>
          </div>
        )}
      </div>
    </StudioShell>
  );
}
