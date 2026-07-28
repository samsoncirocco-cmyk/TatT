'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import type { DesignSession } from '@/services/designSession/types';
import { useDesigns } from '@/lib/tattStorage';

/**
 * The hard stop (ADR-0013). Shows the refined design plus the brief the
 * artist will actually receive — placement, styles, their meaning quoted
 * back, and any placement concerns surfaced honestly (ADR-0014). There is
 * deliberately NO regenerate/refine-again affordance here: refinement from
 * this point belongs to the canvas and the artist consult.
 *
 * Landing here also saves the refined cut into the local design library
 * (once per session), so the funnel's next rooms — the AR mirror at
 * /visualize and the /designs library — actually have the design waiting.
 */
export function HandoffCard({ session }: { session: DesignSession }) {
  const brief = session.brief;
  const placement = brief?.placement ?? session.intake.placement;
  const styleTags = brief?.styleTags ?? session.intake.styleTags;
  const meaning = brief?.meaning ?? session.intake.meaning;
  const placementNotes = brief?.placementNotes ?? [];
  const imageUrl = session.refinedVariation?.imageUrl;
  const refinedPrompt = session.refinedVariation?.prompt ?? '';

  // Persist the refined design to the local library exactly once, keyed by
  // session id so re-renders (and revisits) never duplicate it. The saved id
  // is derived from storage, so the CTA picks it up as soon as the write
  // round-trips through useDesigns' change event.
  const { designs, hydrated, addDesign } = useDesigns();
  const savedDesignId = hydrated
    ? (designs.find((d) => d.sessionId === session.id)?.id ?? null)
    : null;
  const savedOnce = useRef(false);
  useEffect(() => {
    if (!hydrated || !imageUrl || savedDesignId || savedOnce.current) return;
    savedOnce.current = true;
    addDesign(refinedPrompt, { image: imageUrl, sessionId: session.id });
  }, [hydrated, imageUrl, savedDesignId, refinedPrompt, session.id, addDesign]);

  // The AR mirror preselects ?design= when the save has landed; ds rides
  // along so the mirror's own "Find your artist" exit keeps the thread.
  const visualizeParams = new URLSearchParams();
  if (savedDesignId) visualizeParams.set('design', savedDesignId);
  visualizeParams.set('ds', session.id);
  const visualizeHref = `/visualize?${visualizeParams.toString()}`;

  return (
    <div className="border-2 hairline bg-white/[0.02]">
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- provider CDN image; next/image needs domain config
        <img src={imageUrl} alt="Your refined design" className="block w-full object-cover" />
      )}
      <div className="p-5 space-y-5">
        <h2 className="font-display uppercase tracking-wide text-[20px] text-white leading-none">
          This one&rsquo;s yours<span className="text-pink">.</span>
        </h2>

        <dl className="space-y-3 font-body text-[13px] leading-[1.55]">
          <div>
            <dt className="text-[10px] uppercase tracking-[0.25em] text-white/50">Placement</dt>
            <dd className="text-white/90 mt-1">{placement}</dd>
          </div>
          {styleTags.length > 0 && (
            <div>
              <dt className="text-[10px] uppercase tracking-[0.25em] text-white/50">Styles</dt>
              <dd className="mt-1 flex flex-wrap gap-2">
                {styleTags.map((tag) => (
                  <span
                    key={tag}
                    className="border hairline px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-white/70"
                  >
                    {tag}
                  </span>
                ))}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-[10px] uppercase tracking-[0.25em] text-white/50">What it means to you</dt>
            <dd className="text-white/90 mt-1">&ldquo;{meaning}&rdquo;</dd>
          </div>
        </dl>

        {placementNotes.length > 0 && (
          <div className="border hairline p-3 space-y-2">
            <div className="font-body text-[10px] uppercase tracking-[0.25em] text-pink">
              Straight talk for the consult
            </div>
            <ul className="font-body text-[13px] leading-[1.55] text-white/80 space-y-1">
              {placementNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>
        )}

        <p className="font-body text-[13px] leading-[1.55] text-white/70">
          This is where the bot stops. Last-mile tweaks happen on the canvas —
          the real refinement happens with your artist.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          {/* The conviction step (ADR-0028 funnel): live camera, this design
              already saved and waiting in the mirror's tray. */}
          <Link
            href={visualizeHref}
            className="tape press inline-flex items-center justify-center px-6 py-4 font-display text-[20px] leading-none tracking-[0.02em] uppercase"
          >
            See it on your skin<span className="ml-3 text-[14px]">▸</span>
          </Link>
          {/* Carries the session id so /smart-match can load the brief,
              pre-select mapped styles, and thread ds through to booking. */}
          <Link
            href={`/smart-match?ds=${encodeURIComponent(session.id)}`}
            className="press inline-flex items-center justify-center px-6 py-4 border hairline font-body text-[11px] uppercase tracking-[0.25em] text-white/80 hover:bg-pink hover:text-black"
          >
            Find your artist
          </Link>
          <Link
            href="/generate"
            className="press inline-flex items-center justify-center px-6 py-4 border hairline font-body text-[11px] uppercase tracking-[0.25em] text-white/80 hover:bg-pink hover:text-black"
          >
            Fine-tune on the canvas
          </Link>
        </div>
      </div>
    </div>
  );
}
