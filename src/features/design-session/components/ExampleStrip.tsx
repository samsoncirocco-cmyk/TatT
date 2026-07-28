'use client';

import { EXAMPLE_DESIGNS } from '@/lib/example-designs';

/**
 * "What comes out of this" — a small proof row for the empty design session,
 * reusing the homepage's real pipeline outputs (src/lib/example-designs.ts).
 * Honest-UI rules carry over unchanged: every image is a real TatT generation
 * labeled as an AI-generated example — never community work, never attributed
 * to a real artist. Rendered on the first-run empty state only; the
 * conversation owns the screen once the user speaks.
 */
export function ExampleStrip() {
  return (
    <div className="space-y-3 pt-2" data-testid="example-strip">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] uppercase tracking-[0.25em] text-white/50 font-body">
          What comes out of this
        </span>
        <span className="text-[10px] uppercase tracking-[0.2em] text-pink font-body whitespace-nowrap">
          AI-generated examples
        </span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {EXAMPLE_DESIGNS.map((d) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={d.src}
            src={d.src}
            alt={d.alt}
            loading="lazy"
            className="w-full aspect-square object-cover border hairline-soft"
          />
        ))}
      </div>
    </div>
  );
}
