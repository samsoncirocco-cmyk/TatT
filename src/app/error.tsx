"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Root Error Boundary — punk styled.
 *
 * Caught errors render here for any page under app/ that doesn't define
 * its own error.tsx. Logs to console + offers Retry (reset) and Home
 * exits.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[App Error]", error);
  }, [error]);

  return (
    <div className="halftone grain min-h-screen text-white font-body bg-black flex flex-col">
      <div className="px-6 md:px-12 pt-6 pb-4 border-b hairline">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-white/50 tabular-nums font-body">
          <span>
            <span className="text-pink">●</span>&nbsp;&nbsp;Error
          </span>
          <span>
            Status:&nbsp;<span className="text-pink">Crashed</span>
          </span>
        </div>
      </div>

      <div className="flex-1 flex items-center px-6 md:px-12 py-16 md:py-24">
        <div className="max-w-4xl mx-auto w-full">
          <h1 className="font-display text-white leading-[0.88] text-[64px] sm:text-[96px] md:text-[128px] tracking-[0.005em]">
            Something&nbsp;<span className="slash"><span>broke</span></span>
            <span className="text-pink">.</span>
          </h1>

          <p className="mt-10 max-w-xl text-[15px] leading-[1.55] text-white/70 font-body">
            The page hit a wall on the way to render.{" "}
            <span className="scribble text-pink">Not your fault.</span>{" "}
            Hit retry, or bounce home and start fresh.
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
            <button
              onClick={reset}
              className="tape press inline-flex items-center justify-center px-10 py-5 font-display text-[32px] sm:text-[38px] leading-none tracking-[0.02em]"
            >
              Try Again
              <span className="ml-3 text-[20px]">▸</span>
            </button>
            <Link
              href="/"
              className="text-[10px] uppercase tracking-[0.25em] text-white/60 hover:text-pink border hairline px-4 py-3 press font-body"
            >
              ▸ Go Home
            </Link>
          </div>
        </div>
      </div>

      <div className="border-t hairline px-6 md:px-12 py-4 bg-black">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-white/50 tabular-nums font-body">
          <span>Code:&nbsp;<span className="text-pink">5xx</span></span>
          <span>
            <span className="text-pink">●</span>&nbsp;&nbsp;TatT
          </span>
        </div>
      </div>
    </div>
  );
}
