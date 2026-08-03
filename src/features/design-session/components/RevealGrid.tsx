'use client';

import type { Variation } from '@/services/designSession/types';
import { cutIdentity } from '../services/revealCutNames';

export type RevealMode = 'pick' | 'not-you' | 'locked';

/**
 * The four-design reveal (ADR-0012). Staggered entrance, tap to pick, then
 * the same grid hosts the most-not-you tap over the remaining three — one
 * clean negative signal instead of three noisy non-picks.
 *
 * The theater (TAT-52): cuts land one at a time on the design system's
 * `snap` hard cut-in — `.reveal-cut-1..4` spaces them a full beat apart
 * (260ms; `prefers-reduced-motion` renders everything at once). Each cut
 * carries a human name derived from its variation axes (`cutIdentity` —
 * designed strings only, never raw axis internals). The pick lands as a
 * tape-corner tag on a tilted card; the most-not-you round flips the
 * remaining cuts to a dashed "not you?" affordance.
 */
export function RevealGrid({
  variations,
  mode,
  pickId,
  onSelect,
  indexOffset = 0,
}: {
  variations: Variation[];
  mode: RevealMode;
  pickId?: string;
  onSelect?: (variationId: string) => void;
  /**
   * Where this grid's cuts start counting. The critique lane (ADR-0039)
   * renders its re-cuts in a second grid below the reveal — without an offset
   * both grids would announce a "Design 1", leaving two identically-labelled
   * pick targets for anyone on a screen reader.
   */
  indexOffset?: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {variations.map((variation, position) => {
        const i = position + indexOffset;
        const { name, caption } = cutIdentity(variation, i);
        const isPick = variation.id === pickId;
        const notYouCandidate = mode === 'not-you' && !isPick;
        const disabled = mode === 'locked' || (mode === 'not-you' && isPick);
        const label = notYouCandidate
          ? `Design ${i + 1} feels most not me — ${name}`
          : `Pick design ${i + 1} — ${name}`;
        return (
          <div key={variation.id} className={`reveal-cut reveal-cut-${position + 1}`}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSelect?.(variation.id)}
              aria-label={label}
              className={`press relative block w-full border-2 ${
                isPick
                  ? 'border-pink -rotate-1'
                  : notYouCandidate
                    ? 'border-dashed hairline-white hover:border-pink'
                    : 'hairline-white hover:border-pink'
              } ${disabled && !isPick ? 'opacity-40' : ''}`}
            >
              {variation.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- generated images come from provider CDNs; next/image needs domain config
                <img
                  src={variation.imageUrl}
                  alt={`Design ${i + 1}`}
                  className="block w-full aspect-square object-cover"
                />
              ) : (
                <div className="flex w-full aspect-square items-center justify-center font-display text-white/30 text-[24px]">
                  ✕
                </div>
              )}
              {isPick && (
                // Tape-corner confirm — pink tape, hard white shadow, crooked
                // on purpose. Mounts with the pick, so it snaps in on cue.
                <span
                  className="reveal-cut absolute -top-2 -left-2 -rotate-3 bg-pink text-black font-body text-[10px] uppercase tracking-[0.2em] px-2 py-1 shadow-[3px_3px_0_0_#f5f5f0]"
                >
                  Your pick
                </span>
              )}
              {notYouCandidate && (
                <span className="absolute bottom-2 right-2 border hairline-white bg-black/70 font-body text-[10px] lowercase tracking-[0.14em] text-white/70 px-2 py-1">
                  not you?
                </span>
              )}
            </button>
            <div className="mt-2 space-y-0.5">
              <p className="font-body text-[11px] lowercase tracking-[0.1em] text-white">
                {name}
              </p>
              {caption && (
                <p className="font-body text-[10px] lowercase tracking-[0.06em] text-white/50">
                  {caption}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
