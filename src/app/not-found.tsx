import Link from "next/link";

/**
 * Global 404 — punk-styled. Lives at app root so it catches any
 * unmatched route across the app, including nested segments that
 * don't define their own not-found.tsx.
 */
export default function NotFound() {
  return (
    <div className="halftone grain min-h-screen text-white font-body bg-black flex flex-col">
      <div className="px-6 md:px-12 pt-6 pb-4 border-b hairline">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-white/50 tabular-nums font-body">
          <span>
            <span className="text-pink">●</span>&nbsp;&nbsp;Error&nbsp;404
          </span>
          <span>
            Status:&nbsp;<span className="text-pink">Lost</span>
          </span>
        </div>
      </div>

      <div className="flex-1 flex items-center px-6 md:px-12 py-16 md:py-24">
        <div className="max-w-4xl mx-auto w-full">
          {/* sharpie arrow drawn off to the side, pointing into the headline */}
          <div className="relative inline-block">
            <svg
              aria-hidden="true"
              viewBox="0 0 120 80"
              className="absolute -left-24 top-6 hidden md:block text-pink"
              width="120"
              height="80"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 50 C 25 40, 50 55, 80 35" />
              <path d="M70 28 L 82 34 L 76 46" />
            </svg>
            <h1 className="font-display text-white leading-[0.88] text-[72px] sm:text-[112px] md:text-[148px] tracking-[0.005em]">
              Dead&nbsp;<span className="slash"><span>end</span></span>
              <span className="text-pink">.</span>
            </h1>
          </div>

          <p className="mt-10 max-w-xl text-[15px] leading-[1.55] text-white/70 font-body">
            That route doesn&apos;t exist. Either the link rotted, or you typed
            something the app never knew about.{" "}
            <span className="scribble text-pink">Happens.</span>
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-5">
            <Link
              href="/"
              className="tape press inline-flex items-center justify-center px-10 py-5 font-display text-[32px] sm:text-[38px] leading-none tracking-[0.02em]"
            >
              Go Home
              <span className="ml-3 text-[20px]">▸</span>
            </Link>
            <Link
              href="/generate/stencil"
              className="text-[10px] uppercase tracking-[0.25em] text-white/60 hover:text-pink border hairline px-4 py-3 press font-body"
            >
              ▸ Start a design instead
            </Link>
          </div>
        </div>
      </div>

      <div className="border-t hairline px-6 md:px-12 py-4 bg-black">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-white/50 tabular-nums font-body">
          <span>Code:&nbsp;<span className="text-pink">404</span></span>
          <span>
            <span className="text-pink">●</span>&nbsp;&nbsp;TatT
          </span>
        </div>
      </div>
    </div>
  );
}
