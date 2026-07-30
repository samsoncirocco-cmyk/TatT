"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
 *
 * A design-session handoff arrives as /swipe?ds=<sessionId>; the "ds"
 * param threads onward into the pinned artists' Book CTAs
 * (/book?artistId=…&ds=…) so the booking can carry designSessionId.
 */

type SwipeCard = {
  id: string;
  name: string;
  slug: string;
  matchPercent: number;
  styles: string[];
  /** Honest, payload-backed "why" chips derived at search time. */
  reasonChips: string[];
  location?: string;
  instagram?: string;
};

export default function SwipeClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const designSessionId = searchParams.get("ds");
  const storedMatches = useMatchStore((s) => s.matches);
  const hasHydrated = useMatchStore((s) => s.hasHydrated);

  const bookHref = (artistId: string) =>
    `/book?artistId=${encodeURIComponent(artistId)}${
      designSessionId ? `&ds=${encodeURIComponent(designSessionId)}` : ""
    }`;

  const cards = useMemo<SwipeCard[]>(
    () =>
      storedMatches.map((m) => ({
        id: m.artistId,
        name: m.artistName,
        slug: artistSlug(m.artistName, m.artistId),
        matchPercent: Math.min(99, Math.max(1, Math.round(m.matchScore || 0))),
        styles: (m.styles || m.tags || []).slice(0, 3),
        reasonChips: (m.reasonChips || []).slice(0, 3),
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
              className="mt-6 inline-flex items-center min-h-[44px] text-[10px] uppercase tracking-[0.2em] text-white/80 hover:text-black hover:bg-pink border-2 hairline px-4 py-3 press font-body"
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
                    </div>

                    <div className="flex-1 p-6 flex flex-col justify-between bg-black">
                      <div>
                        {/* The chips lead: honest, payload-backed reasons in
                            words. The raw match % stays but rides shotgun as
                            a small tabular figure — a first-timer wants WHY,
                            not a machine score. */}
                        {card.reasonChips.length > 0 && (
                          <div className="mb-3 flex flex-wrap gap-1.5">
                            {card.reasonChips.map((chip) => (
                              <span
                                key={chip}
                                className="text-[10px] uppercase tracking-[0.18em] bg-pink text-black px-2 py-1 font-body font-bold"
                              >
                                {chip}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-baseline justify-between gap-3">
                          <div className="font-display text-[24px] tracking-wide text-white">
                            {card.name}
                          </div>
                          <div className="shrink-0 text-[10px] uppercase tracking-[0.18em] text-white/40 tabular-nums font-body">
                            {card.matchPercent}% match
                          </div>
                        </div>
                        <div className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-body mt-1">
                          {card.location || "—"}
                        </div>
                        {/* Older persisted decks predate reasonChips — fall
                            back to the plain style tags rather than nothing. */}
                        {card.reasonChips.length === 0 && card.styles.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {card.styles.map((s) => (
                              <span
                                key={s}
                                className="text-[10px] uppercase tracking-[0.18em] text-white/70 border hairline px-2 py-1 font-body"
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
                          className="flex-1 min-h-[44px] border hairline text-white/60 hover:bg-white/10 py-3 text-[10px] uppercase tracking-widest font-body press"
                        >
                          Pass
                        </button>
                        <button
                          type="button"
                          onClick={() => swiped("right", card)}
                          className="flex-1 min-h-[44px] bg-pink text-black py-3 text-[10px] uppercase tracking-widest font-body press"
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
          /* The booking affordance speaks quiet (ADR-0032): the deck above is
             loud, but the moment the sheet offers a commitment — booking a
             pinned artist — the register flips. */
          <div className="max-w-md w-full text-center border hairline-quiet p-10 md:p-12">
            <p className="text-quiet-dim text-[12px] mb-4 font-body">
              Deck complete
            </p>
            <div className="font-display-quiet text-[24px] mb-4 text-quiet">
              {liked.length} pinned
            </div>
            <p className="text-[13px] text-quiet-dim font-body leading-[1.7] mb-10">
              {liked.length > 0
                ? "Book a pinned artist below, or browse the full roster."
                : "Nothing pinned this round — try different preferences."}
            </p>
            {liked.length > 0 && (
              <ul className="mb-10 space-y-3 text-left">
                {liked.map((card) => (
                  <li
                    key={card.id}
                    className="flex items-center justify-between gap-3 border hairline-quiet-soft px-4 py-3"
                  >
                    <span className="font-body text-[13px] text-quiet truncate">
                      {card.name}
                    </span>
                    <Link
                      href={bookHref(card.id)}
                      className="shrink-0 inline-flex items-center min-h-[44px] text-[12px] bg-quiet text-black hover:bg-white px-4 py-2.5 press font-body"
                    >
                      Book
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={() => router.push(liked.length > 0 ? "/artists" : "/smart-match")}
              className="w-full text-[13px] border hairline-quiet text-quiet hover:border-quiet hover:text-white px-8 py-4 press font-body"
            >
              {liked.length > 0 ? "Browse the roster" : "Try again"}
            </button>
          </div>
        )}
      </div>
    </StudioShell>
  );
}
