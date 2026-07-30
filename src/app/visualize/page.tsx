'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Smartphone, ArrowLeft, Sparkles, AlertTriangle, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { ARMirror, type ARMirrorDesign } from '@/features/ar';
import { checkArSupport } from '@/services/ar/arService';
import { useDesigns } from '@/lib/tattStorage';
import { smartMatchUrlForDesign } from '@/lib/design-style-signal';

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
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background p-6">
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-[-10%] top-[-20%] h-[60%] w-[60%] animate-pulse-glow rounded-full bg-ducks-yellow/10 mix-blend-screen blur-[120px]" />
        <div
          className="absolute bottom-[-10%] right-[-10%] h-[50%] w-[50%] animate-pulse-glow rounded-full bg-ducks-green/15 mix-blend-screen blur-[100px]"
          style={{ animationDelay: '1s' }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="z-10 w-full max-w-2xl space-y-8 text-center"
      >
        <div className="flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-ducks-yellow/20 bg-ducks-yellow/10">
            <Smartphone size={36} className="text-ducks-yellow" />
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="font-display text-5xl font-black tracking-tighter text-white md:text-6xl">
            AR Mirror
          </h1>
          <p className="mx-auto max-w-xl text-xl font-light text-gray-400">
            Point your camera at your skin and place a design on it. You position it
            yourself — nothing is auto-detected, and what you see is what gets saved.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 text-left sm:grid-cols-3">
          {[
            { label: 'Live camera', desc: 'Your design composited onto the real feed' },
            { label: 'You place it', desc: 'Drag, scale and rotate — no guessing' },
            {
              label: 'Snap it, send it',
              desc: 'Still or 3-sec clip, straight to the group chat — let them argue',
            },
          ].map((f) => (
            <div key={f.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="mb-1 font-mono text-xs uppercase tracking-widest text-ducks-yellow">
                {f.label}
              </p>
              <p className="text-sm text-gray-400">{f.desc}</p>
            </div>
          ))}
        </div>

        {support && !support.supported && (
          <div className="flex items-start gap-3 rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-4 text-left">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-yellow-400" />
            <p className="text-sm text-gray-300">{support.message}</p>
          </div>
        )}

        {support?.supported && hydrated && arDesigns.length === 0 && (
          <p className="text-sm text-gray-500">
            You have no generated designs yet — the mirror needs one to place.
          </p>
        )}

        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          {support?.supported && (
            <button
              onClick={() => setLive(true)}
              disabled={!hydrated || arDesigns.length === 0}
              className="flex items-center gap-2 rounded-xl bg-ducks-green px-6 py-3 font-medium text-white transition-all hover:bg-ducks-green/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Smartphone size={18} />
              Open AR Mirror
            </button>
          )}
          {/* The funnel's next step — seen it on your skin, now find the hands
              that can put it there. Carries the ds/style thread when present. */}
          <Link
            href={findArtistHref}
            className="flex items-center gap-2 rounded-xl border border-ducks-yellow/40 bg-ducks-yellow/10 px-6 py-3 font-medium text-ducks-yellow transition-all hover:bg-ducks-yellow/20"
          >
            <Users size={18} />
            Find your artist
          </Link>
          <Link
            href="/generate"
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-6 py-3 font-medium text-white backdrop-blur-md transition-all hover:bg-white/20"
          >
            <Sparkles size={18} />
            Design Studio
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-6 py-3 font-medium text-white backdrop-blur-md transition-all hover:bg-white/20"
          >
            <ArrowLeft size={18} />
            Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

export default function VisualizePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <VisualizeContent />
    </Suspense>
  );
}
