'use client';

import { motion } from 'framer-motion';
import type { Variation } from '@/services/designSession/types';

export type RevealMode = 'pick' | 'not-you' | 'locked';

/**
 * The four-design reveal (ADR-0012). Staggered entrance, tap to pick, then
 * the same grid hosts the most-not-you tap over the remaining three — one
 * clean negative signal instead of three noisy non-picks.
 */
export function RevealGrid({
  variations,
  mode,
  pickId,
  onSelect,
}: {
  variations: Variation[];
  mode: RevealMode;
  pickId?: string;
  onSelect?: (variationId: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {variations.map((variation, i) => {
        const isPick = variation.id === pickId;
        const disabled = mode === 'locked' || (mode === 'not-you' && isPick);
        const label =
          mode === 'not-you' && !isPick
            ? `Design ${i + 1} feels most not me`
            : `Pick design ${i + 1}`;
        return (
          <motion.div
            key={variation.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: i * 0.09, ease: 'easeOut' }}
          >
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSelect?.(variation.id)}
              aria-label={label}
              className={`press relative block w-full border-2 ${
                isPick ? 'border-pink' : 'hairline-white hover:border-pink'
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
                <span className="absolute top-2 left-2 bg-pink text-black font-body text-[10px] uppercase tracking-[0.2em] px-2 py-1">
                  Your pick
                </span>
              )}
            </button>
          </motion.div>
        );
      })}
    </div>
  );
}
