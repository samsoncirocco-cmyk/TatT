'use client';

import { useEffect, useState } from 'react';

/**
 * The while-generating state for the reveal (TAT-52) — an in-voice progress
 * beat instead of a spinner. Rotates through a few designed lines while the
 * machines run. No fake percentages, no fake specifics: every line is
 * generic enough to be true of every generation.
 *
 * Screen readers get one stable "Working" status; the rotating line is
 * visual flavor and stays out of the live region so it doesn't narrate
 * every beat.
 */

/** The reveal generation — four cuts always, so every line holds. */
export const REVEAL_BEAT_LINES = [
  'warming up the machines…',
  'mixing ink…',
  'pulling four directions apart…',
  'four cuts, almost dry…',
] as const;

/** The one refinement regen (ADR-0013). */
export const REFINE_BEAT_LINES = [
  'one more pass on the machine…',
  'holding your pick, shifting the rest…',
  'reworking the lines…',
] as const;

const BEAT_MS = 2600;

export function GeneratingBeat({ lines }: { lines: readonly string[] }) {
  const [beat, setBeat] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setBeat((b) => b + 1), BEAT_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      role="status"
      aria-label="Working"
      className="flex items-center gap-3 font-body text-[11px] lowercase tracking-[0.14em] text-white/60"
    >
      <span className="text-pink motion-safe:animate-pulse" aria-hidden="true">
        ●
      </span>
      <span aria-hidden="true">{lines[beat % lines.length]}</span>
    </div>
  );
}
