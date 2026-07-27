'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Smartphone, ArrowLeft, Sparkles, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { ARMirror, type ARMirrorDesign } from '@/features/ar';
import { checkArSupport } from '@/services/ar/arService';
import { useDesigns } from '@/lib/tattStorage';

/**
 * Live AR preview entry point.
 *
 * Only offers the camera when the browser can actually open one — an
 * unsupported device is told so here rather than after tapping into a dead
 * viewport.
 */
export default function VisualizePage() {
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

  if (live) {
    return <ARMirror designs={arDesigns} onExit={() => setLive(false)} />;
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
            { label: 'Save the view', desc: 'Export exactly what you see on screen' },
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
