'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import StudioShell from '@/components/studio/StudioShell';
import TapeCTA from '@/components/punk/TapeCTA';
import { useDesigns, type TattDesign } from '@/lib/tattStorage';
import {
  smartMatchUrlForDesign,
  studioUrlForDesign,
  visualizeUrlForDesign,
} from '@/lib/design-style-signal';
import { deriveDesignTitle } from '../designs/designJourney';

const LegacyContent = dynamic(() => import('../../features/Generate.jsx'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-black text-white font-body text-[10px] uppercase tracking-[0.28em]">
      <span className="text-pink">●</span>&nbsp;&nbsp;Loading&nbsp;the&nbsp;studio…
    </div>
  )
});

/**
 * The refinery's front door when nobody brought a design (ADR-0038: the
 * Studio is entered from a picked design, never from cold). Rather than an
 * empty canvas, this says so in voice and offers the shortest way to a
 * design worth refining — the most recent saved cut, or /design.
 */
function NoDesignYet({
  suggestion,
}: {
  suggestion: { id: string; title: string } | null;
}) {
  return (
    <div className="px-6 md:px-12 py-16 md:py-24">
      <div className="max-w-3xl mx-auto">
        <div className="text-[10px] uppercase tracking-[0.28em] text-pink font-body">
          The Studio — the refinery
        </div>
        <h1 className="mt-4 font-display text-white leading-[0.88] text-[48px] sm:text-[72px] tracking-[0.005em]">
          {suggestion ? (
            <>
              Bring&nbsp;a&nbsp;<span className="slash"><span>design</span></span>
            </>
          ) : (
            <>
              Nothing&nbsp;to&nbsp;<span className="slash"><span>refine</span></span>
            </>
          )}
          <span className="text-pink">.</span>
        </h1>
        <p className="mt-8 max-w-xl text-[15px] leading-[1.55] text-white/70 font-body">
          {suggestion ? (
            <>
              this room fixes a cut you&rsquo;ve already picked — the mangled
              hand, the crowded corner, the bit that&rsquo;s bugging you. pick up
              your last one, or start something new.
            </>
          ) : (
            <>
              nothing to refine yet — let&rsquo;s make something first. the
              Studio takes a cut from <em>almost</em> to <em>yes</em>, so it
              needs a cut to work on.
            </>
          )}
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-5">
          {suggestion ? (
            <>
              <TapeCTA href={studioUrlForDesign(suggestion.id)} size="lg">
                Refine {suggestion.title}
              </TapeCTA>
              <Link
                href="/designs"
                className="text-[10px] uppercase tracking-[0.25em] text-white/60 hover:text-pink border hairline px-4 py-3 press font-body"
              >
                ▸ All your designs
              </Link>
            </>
          ) : (
            <TapeCTA href="/design" size="lg">
              Start a design
            </TapeCTA>
          )}
          <Link
            href="/design"
            className="text-[10px] uppercase tracking-[0.25em] text-white/60 hover:text-pink border hairline px-4 py-3 press font-body"
          >
            ▸ Start something new
          </Link>
        </div>
      </div>
    </div>
  );
}

function StudioContent() {
  const searchParams = useSearchParams();
  const designId = searchParams.get('design');
  const { designs, hydrated } = useDesigns();

  if (!hydrated) {
    return (
      <StudioShell>
        <div className="min-h-[70vh] flex items-center justify-center bg-black">
          <span className="font-body text-[10px] uppercase tracking-[0.28em] text-white/50">
            <span className="text-pink">●</span>&nbsp;&nbsp;Opening&nbsp;the&nbsp;Studio…
          </span>
        </div>
      </StudioShell>
    );
  }

  const design = designId ? designs.find((d) => d.id === designId) : undefined;

  // No design carried in (or the id no longer resolves): offer the most
  // recent finished cut rather than an empty canvas. Only cuts with an image
  // qualify — an idea with no render has nothing to refine.
  if (!design) {
    const recent = designs.reduce<TattDesign | null>(
      (best, d) =>
        d.image && (!best || d.createdAt > best.createdAt) ? d : best,
      null,
    );
    return (
      <StudioShell>
        <NoDesignYet
          suggestion={
            recent ? { id: recent.id, title: deriveDesignTitle(recent) } : null
          }
        />
      </StudioShell>
    );
  }

  const title = deriveDesignTitle(design);

  return (
    <StudioShell footer={false}>
      {/* Compact top bar: where you are, what this room is for, and the two
          forward doors. The canvas is the point, so no hero (facelift spec,
          Loud register). */}
      <div className="px-6 md:px-12 pt-6 pb-4 border-b hairline">
        <div className="max-w-6xl mx-auto space-y-3">
          <div className="flex items-center justify-between gap-4 text-[10px] uppercase tracking-[0.25em] text-white/50 tabular-nums font-body">
            <div className="flex items-center gap-4">
              <TapeCTA
                href={`/designs/${design.id}`}
                variant="ghost"
                size="sm"
                arrow={false}
              >
                ◂ Back to the design
              </TapeCTA>
              <span className="hidden sm:inline">
                <span className="text-pink">●</span>
                &nbsp;&nbsp;The&nbsp;Studio&nbsp;— the&nbsp;refinery
              </span>
            </div>
            <span>
              ID:&nbsp;<span className="text-pink">{design.id.slice(0, 8)}</span>
            </span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-[13px] leading-[1.5] text-white/70 font-body max-w-xl">
              <span className="text-white/90">{title}</span> — this is the last
              ten percent. fix the one thing that&rsquo;s bugging you, then take
              it forward.
            </p>
            {/* The funnel's forward doors — same joints every other surface
                uses (ADR-0028/0029), built by the shared helpers. */}
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={visualizeUrlForDesign(design.id, design.sessionId)}
                className="text-[10px] uppercase tracking-[0.25em] text-white/70 hover:text-black hover:bg-pink border hairline px-4 py-3 press font-body"
              >
                ▸ See it on your skin
              </Link>
              <Link
                href={smartMatchUrlForDesign(design.prompt, design.sessionId)}
                className="text-[10px] uppercase tracking-[0.25em] text-white/70 hover:text-black hover:bg-pink border hairline px-4 py-3 press font-body"
              >
                ▸ Find your artist
              </Link>
            </div>
          </div>
        </div>
      </div>
      <div className="min-h-[70vh] bg-black">
        <LegacyContent />
      </div>
    </StudioShell>
  );
}

export default function StudioPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <StudioContent />
    </Suspense>
  );
}
