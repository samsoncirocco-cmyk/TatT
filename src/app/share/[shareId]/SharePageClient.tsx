'use client';

import { useState } from 'react';
import Link from 'next/link';
import SlashHeadline from '@/components/punk/SlashHeadline';
import StickerPricetag from '@/components/punk/StickerPricetag';
import TapeCTA from '@/components/punk/TapeCTA';

/**
 * The page a share link opens — the first thing a stranger ever sees of TatT.
 *
 * Two things happened here at once, on purpose:
 *
 * 1. A share can now hold several cuts, not one. The Forge lets a user select
 *    any subset of the four cuts it just made and mint ONE link for the set,
 *    so this page leads with a cover cut and offers the rest as a strip.
 *    Shares minted before that carry only `imageUrl`, so the list is derived
 *    rather than assumed — an old link renders exactly as it always did.
 *
 * 2. It was off-system: purple CTAs, `text-gray-*`, `rounded-2xl`, a 🎨 emoji
 *    wordmark, Twitter-blue, gradients and Framer fades — none of which exist
 *    in the punk system. Rebuilt in the system's own vocabulary: pitch black,
 *    one pink accent, Anton over Space Mono, hairline borders, no radii, the
 *    `snap` entrance instead of fades, and one tape CTA for the whole screen.
 */

interface SharedDesign {
  shareId: string;
  /** Cover cut. Also the Open Graph image. */
  imageUrl: string;
  /** Every cut in the share, cover first. Absent on pre-multi-cut shares. */
  imageUrls?: string[];
  prompt: string;
  style?: string;
  bodyPart?: string;
  sharedAt: string;
  views: number;
}

export function SharePageClient({ design }: { design: SharedDesign }) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [active, setActive] = useState(0);

  // Never trust `imageUrls` to be there — links minted before multi-cut
  // sharing have only the cover, and they must keep working forever.
  const cuts =
    design.imageUrls?.filter((u) => typeof u === 'string' && u.length > 0) ?? [];
  const images = cuts.length > 0 ? cuts : design.imageUrl ? [design.imageUrl] : [];
  const shown = images[active] ?? design.imageUrl;

  const shareUrl =
    typeof window !== 'undefined'
      ? window.location.href
      : `https://tatt-app.vercel.app/share/${design.shareId}`;

  const copyLink = async () => {
    setCopyFailed(false);
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // A silent no-op reads exactly like a successful copy. Say so.
      setCopyFailed(true);
    }
  };

  const shareOnX = () => {
    const text = encodeURIComponent(
      `${images.length > 1 ? `${images.length} cuts` : 'My next tattoo'}, designed with TatT.\n\n"${design.prompt}"\n\n`
    );
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(shareUrl)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  return (
    <div className="halftone grain min-h-screen bg-black text-white font-body flex flex-col">
      <header className="relative z-20 border-b-2 hairline bg-black">
        <div className="max-w-5xl mx-auto px-6 md:px-12 py-4 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center">
            <span className="font-display text-white text-3xl leading-none tracking-[0.01em] glitch">
              TA<span className="text-pink">TT</span>
            </span>
          </Link>
          <Link
            href="/generate/stencil"
            className="text-[10px] uppercase tracking-[0.25em] text-white/70 hover:text-pink press font-body"
          >
            Make your own
          </Link>
        </div>
      </header>

      <div className="px-6 md:px-12 pt-6 pb-4 border-b hairline">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4 text-[10px] uppercase tracking-[0.25em] text-white/50 tabular-nums font-body">
          <span>
            <span className="text-pink">●</span>&nbsp;&nbsp;Shared&nbsp;
            {images.length > 1 ? `${images.length} cuts` : 'cut'}
          </span>
          <span>
            Views:&nbsp;<span className="text-pink">{design.views.toLocaleString()}</span>
          </span>
        </div>
      </div>

      <div className="flex-1 px-6 md:px-12 py-12 md:py-16">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-start">
          {/* canvas */}
          <div className="md:col-span-7 rise rise-1">
            <div className="aspect-square bg-bone border-2 hairline relative overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={shown}
                alt={design.prompt}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <StickerPricetag
                className="absolute top-3 right-3 z-10"
                primary={
                  images.length > 1
                    ? `${String(active + 1).padStart(2, '0')}/${String(images.length).padStart(2, '0')}`
                    : 'INK'
                }
                secondary="Cut"
              />
            </div>

            {/* The rest of the set. Only a multi-cut share has one. */}
            {images.length > 1 && (
              <div className="mt-4">
                <div className="text-[10px] uppercase tracking-[0.28em] text-pink mb-3 font-body">
                  ▸ All {images.length} cuts
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {images.map((src, i) => (
                    <button
                      key={`${src}-${i}`}
                      type="button"
                      onClick={() => setActive(i)}
                      aria-pressed={active === i}
                      aria-label={`View cut ${i + 1} of ${images.length}`}
                      className={`aspect-square bg-bone border-2 overflow-hidden press focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-pink ${
                        active === i ? 'border-pink' : 'hairline'
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt={`Cut ${i + 1} of ${images.length}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* sidebar */}
          <div className="md:col-span-5 rise rise-2">
            <SlashHeadline
              before="Someone's next"
              slashed="tattoo"
              sizeClassName="text-[40px] sm:text-[56px] leading-[0.88]"
            />

            {(design.style || design.bodyPart) && (
              <div className="mt-6 flex flex-wrap gap-2">
                {design.style && (
                  <span className="text-[10px] uppercase tracking-[0.2em] text-white/70 border hairline px-3 py-2 font-body">
                    {design.style}
                  </span>
                )}
                {design.bodyPart && (
                  <span className="text-[10px] uppercase tracking-[0.2em] text-white/70 border hairline px-3 py-2 font-body">
                    {design.bodyPart}
                  </span>
                )}
              </div>
            )}

            <div className="mt-8">
              <div className="text-[10px] uppercase tracking-[0.28em] text-pink mb-3 font-body">
                ▸ Prompt
              </div>
              <p className="text-[15px] text-white/80 font-body leading-[1.55] border-2 hairline p-5 whitespace-pre-wrap">
                {design.prompt}
              </p>
            </div>

            <div className="mt-8">
              <div className="text-[10px] uppercase tracking-[0.28em] text-pink mb-3 font-body">
                ▸ Pass it on
              </div>
              <div className="flex items-stretch border hairline-white">
                <input
                  readOnly
                  value={shareUrl}
                  aria-label="Share link"
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 min-w-0 bg-black text-white/80 font-body text-[11px] px-3 py-3 focus:outline-none focus:text-white"
                />
                <button
                  type="button"
                  onClick={copyLink}
                  className="border-l hairline-white px-4 text-[10px] uppercase tracking-[0.2em] font-body text-white/70 hover:text-black hover:bg-pink press shrink-0"
                >
                  {copied ? 'Copied ✓' : 'Copy'}
                </button>
              </div>
              {copyFailed && (
                <p className="mt-3 text-[10px] uppercase tracking-[0.2em] text-pink font-body">
                  Copy blocked by the browser — select the link above instead.
                </p>
              )}
              <button
                type="button"
                onClick={shareOnX}
                className="mt-3 text-[10px] uppercase tracking-[0.25em] text-white/70 hover:text-black hover:bg-pink border-2 hairline px-4 py-3 press font-body inline-flex items-center justify-center"
              >
                ▸ Share on X
              </button>
            </div>

            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              <TapeCTA href="/generate/stencil" size="sm">
                Make your own
              </TapeCTA>
              <Link
                href="/artists"
                className="text-[10px] uppercase tracking-[0.25em] text-white/70 hover:text-black hover:bg-pink border-2 hairline px-4 py-4 press font-body inline-flex items-center justify-center"
              >
                ▸ Find an artist to ink it
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t hairline px-6 md:px-12 py-4 bg-black">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-white/50 tabular-nums font-body">
          <span>
            Cuts:&nbsp;<span className="text-pink">
              {String(images.length).padStart(2, '0')}
            </span>
          </span>
          <span>
            <span className="text-pink">●</span>&nbsp;&nbsp;Made&nbsp;with&nbsp;TatT
          </span>
        </div>
      </div>
    </div>
  );
}
