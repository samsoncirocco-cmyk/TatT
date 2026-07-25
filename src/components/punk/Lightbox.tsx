"use client";

import { useCallback, useEffect } from "react";

/**
 * Fullscreen image viewer for generation output ("view a design large").
 * Hard-edged per DESIGN_SYSTEM.md: no radii, hairline borders, Anton/Space
 * Mono only, pink accents on black. Closes on backdrop click, ✕, or Escape;
 * optional prev/next paging (on-screen + arrow keys) for cut batches.
 */
type Props = {
  src: string;
  alt: string;
  /** Footer caption, e.g. "Cut 02 · 1024²". */
  caption?: string;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
};

export default function Lightbox({
  src,
  alt,
  caption,
  onClose,
  onPrev,
  onNext,
}: Props) {
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev?.();
      if (e.key === "ArrowRight") onNext?.();
    },
    [onClose, onPrev, onNext]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [handleKey]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className="relative max-w-[min(92vw,92vh)] w-full border-2 border-pink bg-black"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b-2 hairline px-3.5 py-2.5">
          <span className="text-[10px] uppercase tracking-[0.25em] text-white/70 font-body tabular-nums">
            {caption ?? alt}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close large view"
            className="press font-display text-[16px] leading-none text-white hover:text-pink px-1"
          >
            ✕
          </button>
        </div>

        <div className="bg-bone">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} className="w-full h-auto max-h-[78vh] object-contain" />
        </div>

        {(onPrev || onNext) && (
          <div className="flex items-center justify-between border-t-2 hairline px-3.5 py-2.5 text-[10px] uppercase tracking-[0.2em] font-body">
            <button
              type="button"
              onClick={onPrev}
              disabled={!onPrev}
              aria-label="Previous cut"
              className="press text-white/60 hover:text-pink disabled:opacity-30"
            >
              ◂ Prev
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={!onNext}
              aria-label="Next cut"
              className="press text-white/60 hover:text-pink disabled:opacity-30"
            >
              Next ▸
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
