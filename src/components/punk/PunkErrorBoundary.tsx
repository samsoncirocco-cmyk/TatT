"use client";

import Link from "next/link";
import { useEffect } from "react";
import TapeCTA from "@/components/punk/TapeCTA";

/**
 * Shared error boundary for app-router error.tsx files.
 *
 * Per-route error.tsx files import this and pass their own label /
 * description so the error feels scoped ("Roster broke" vs "Bookings
 * broke") rather than the generic root fallback.
 *
 * Mirrors the layout of src/app/error.tsx so route-specific errors
 * stay visually consistent with the global fallback.
 */
type Props = {
  error: Error & { digest?: string };
  reset: () => void;
  label: string;             // status bar tag, e.g. "Roster"
  headline?: string;         // slashed word in the headline; defaults to "broke"
  description?: string;      // sentence shown above the CTAs
  backHref?: string;         // ghost CTA target; defaults to "/"
  backLabel?: string;        // ghost CTA label; defaults to "Go Home"
};

export default function PunkErrorBoundary({
  error,
  reset,
  label,
  headline = "broke",
  description,
  backHref = "/",
  backLabel = "Go Home",
}: Props) {
  useEffect(() => {
    console.error(`[${label} Error]`, error);
  }, [error, label]);

  const body =
    description ??
    "Something hit a wall while loading this view. Retry, or take the side exit.";

  return (
    <div className="halftone grain min-h-screen text-white font-body bg-black flex flex-col">
      <div className="px-6 md:px-12 pt-6 pb-4 border-b hairline">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-white/50 tabular-nums font-body">
          <span>
            <span className="text-pink">●</span>&nbsp;&nbsp;{label}&nbsp;—&nbsp;Error
          </span>
          <span>
            Status:&nbsp;<span className="text-pink">Crashed</span>
          </span>
        </div>
      </div>

      <div className="flex-1 flex items-center px-6 md:px-12 py-16 md:py-24">
        <div className="max-w-4xl mx-auto w-full">
          <h1 className="font-display text-white leading-[0.88] text-[56px] sm:text-[88px] md:text-[112px] tracking-[0.005em]">
            {label}&nbsp;<span className="slash"><span>{headline}</span></span>
            <span className="text-pink">.</span>
          </h1>

          <p className="mt-10 max-w-xl text-[15px] leading-[1.55] text-white/70 font-body">
            {body}{" "}
            <span className="scribble text-pink">Not your fault.</span>
          </p>

          {process.env.NODE_ENV === "development" && error?.message && (
            <div className="mt-10 border-2 hairline p-5 max-w-3xl">
              <div className="text-[10px] uppercase tracking-[0.28em] text-pink font-body mb-3">
                ▸ Dev mode — error
              </div>
              <pre className="text-[12px] text-white/70 font-body leading-[1.55] whitespace-pre-wrap break-words max-h-60 overflow-auto">
                {error.message}
                {error.stack ? `\n\n${error.stack}` : ""}
              </pre>
              {error.digest && (
                <div className="mt-3 text-[10px] uppercase tracking-[0.25em] text-white/40 font-body tabular-nums">
                  Digest:&nbsp;<span className="text-pink">{error.digest}</span>
                </div>
              )}
            </div>
          )}

          <div className="mt-10 flex flex-wrap items-center gap-5">
            <TapeCTA onClick={reset} size="lg">Try Again</TapeCTA>
            <Link
              href={backHref}
              className="text-[10px] uppercase tracking-[0.25em] text-white/60 hover:text-pink border hairline px-4 py-3 press font-body"
            >
              ▸ {backLabel}
            </Link>
          </div>
        </div>
      </div>

      <div className="border-t hairline px-6 md:px-12 py-4 bg-black">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-white/50 tabular-nums font-body">
          <span>Scope:&nbsp;<span className="text-pink">{label}</span></span>
          <span>
            <span className="text-pink">●</span>&nbsp;&nbsp;TatT
          </span>
        </div>
      </div>
    </div>
  );
}
