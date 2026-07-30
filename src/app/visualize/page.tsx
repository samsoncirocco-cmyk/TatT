'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import StudioShell from '@/components/studio/StudioShell';
import SlashHeadline from '@/components/punk/SlashHeadline';
import TapeCTA from '@/components/punk/TapeCTA';
import { ARMirror, type ARMirrorDesign } from '@/features/ar';
import { checkArSupport } from '@/services/ar/arService';
import { useDesigns } from '@/lib/tattStorage';
import { smartMatchUrlForDesign } from '@/lib/design-style-signal';

const FEATURES = [
  { label: 'Live camera', desc: 'Your design composited onto the real feed.' },
  { label: 'You place it', desc: 'Drag, scale and rotate — no guessing.' },
  {
    label: 'Snap it, send it',
    desc: 'Still or 3-sec clip, straight to the group chat — let them argue.',
  },
];

/**
 * Live AR preview entry point.
 *
 * Only offers the camera when the browser can actually open one — an
 * unsupported device is told so here rather than after tapping into a dead
 * viewport.
 *
 * Funnel seams (ADR-0028): ?design=<id> preselects that saved design in the
 * mirror's tray, ?ds=<designSessionId> keeps the design-session thread so the
 * "Find your artist" exit lands on /smart-match with the brief intact. Neither
 * param is required — walk-ins still get the full mirror.
 */
function VisualizeContent() {
  const searchParams = useSearchParams();
  const designParam = searchParams.get('design');
  const designSessionId = searchParams.get('ds') ?? undefined;

  const [live, setLive] = useState(false);
  const [support, setSupport] = useState<{ supported: boolean; message: string } | null>(null);
  const { designs, hydrated } = useDesigns();

  // Capability is a browser fact, so it can only be checked after mount.
  useEffect(() => {
    const result = checkArSupport();
    setSupport({ supported: result.supported, message: result.message });
  }, []);

  const arDesigns: ARMirrorDesign[] = designs
    .filter((d) => Boolean(d.image))
    .map((d) => ({ id: d.id, image: d.image as string, title: d.title ?? d.prompt }));

  // The design carried in from /design or /designs — used for tray
  // preselection and, absent a session id, the style signal forward.
  const carriedDesign = designParam ? designs.find((d) => d.id === designParam) : undefined;
  const findArtistHref = smartMatchUrlForDesign(
    carriedDesign?.prompt ?? '',
    designSessionId ?? carriedDesign?.sessionId,
  );

  if (live) {
    return (
      <ARMirror
        designs={arDesigns}
        initialSelectedId={carriedDesign?.id}
        findArtistHref={findArtistHref}
        onExit={() => setLive(false)}
      />
    );
  }

  return (
    <StudioShell>
      <div className="px-6 md:px-12 pt-6 pb-4 border-b hairline">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-white/50 tabular-nums font-body">
          <span>
            <span className="text-pink">●</span>&nbsp;&nbsp;AR&nbsp;Mirror
          </span>
          <span>
            Designs&nbsp;ready:&nbsp;
            <span className="text-pink">{hydrated ? arDesigns.length : '—'}</span>
          </span>
        </div>
      </div>

      <div className="px-6 md:px-12 py-16 md:py-24">
        <div className="max-w-5xl mx-auto">
          <SlashHeadline
            before={<>See it on<br />your</>}
            slashed="skin"
            size="display"
            className="rise rise-1 text-balance"
          />
          <p className="rise rise-2 mt-8 max-w-xl text-[15px] leading-[1.55] text-white/70 font-body">
            Point your camera at your skin and place a design on it. You
            position it yourself —{' '}
            <span className="scribble text-pink">nothing is auto-detected</span>, and
            what you see is what gets saved.
          </p>

          <div className="rise rise-3 mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.label} className="border-2 hairline bg-white/[0.03] p-5">
                <p className="text-[10px] uppercase tracking-[0.25em] text-pink font-body">
                  <span className="text-pink">▸</span>&nbsp;{f.label}
                </p>
                <p className="mt-3 text-[13px] text-white/70 font-body leading-[1.55]">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>

          {support && !support.supported && (
            <div className="mt-10 border-2 border-pink p-4 text-[11px] text-pink font-body uppercase tracking-[0.18em]">
              {support.message}
            </div>
          )}

          {support?.supported && hydrated && arDesigns.length === 0 && (
            <p className="mt-10 text-[12px] uppercase tracking-[0.2em] text-white/50 font-body">
              No generated designs yet — the mirror needs one to place.
            </p>
          )}

          <div className="mt-12 flex flex-wrap items-center gap-5">
            {support?.supported && (
              <TapeCTA
                onClick={() => setLive(true)}
                disabled={!hydrated || arDesigns.length === 0}
                size="lg"
              >
                Open the mirror
              </TapeCTA>
            )}
            {/* The funnel's next step — seen it on your skin, now find the hands
                that can put it there. Carries the ds/style thread when present. */}
            <TapeCTA href={findArtistHref} variant="ghost" size="sm">
              Find your artist
            </TapeCTA>
            <TapeCTA href="/design" variant="ghost" size="sm">
              Start a design
            </TapeCTA>
          </div>
        </div>
      </div>
    </StudioShell>
  );
}

export default function VisualizePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <VisualizeContent />
    </Suspense>
  );
}
