'use client';

/**
 * Error Boundary for Generate Page
 * Handles errors specifically in the tattoo generation workflow
 */

export default function GenerateError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error('[Generate Error]', error);

  return (
    <div className="halftone grain min-h-screen flex items-center justify-center bg-black px-4 relative overflow-hidden font-body text-white">
      <div className="max-w-2xl w-full z-10">
        <div className="bg-black border-2 border-pink p-8">
          {/* Icon — sticker-style pink square */}
          <div className="w-12 h-12 bg-pink flex items-center justify-center mb-6">
            <svg
              className="w-6 h-6 text-black"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>

          {/* Title */}
          <h1 className="font-display text-[48px] sm:text-[72px] leading-[0.88] tracking-[0.005em] text-white mb-4 uppercase">
            Forge<br/><span className="slash"><span>error</span></span><span className="text-pink">.</span>
          </h1>

          {/* Description */}
          <p className="text-white/70 mb-6 text-[13px] font-body leading-[1.55]">
            Something went wrong while loading the design forge.
            {process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && ' Demo mode should handle this gracefully.'}
            {' '}Try refreshing or return home to start over.
          </p>

          {/* Error details (dev mode only) */}
          {process.env.NODE_ENV === 'development' && error && (
            <div className="mb-6 p-4 bg-black border-2 border-pink">
              <h3 className="text-[10px] font-body text-pink mb-2 uppercase tracking-[0.28em]">
                <span className="text-pink">●</span>&nbsp;&nbsp;Error Details (Dev Mode)
              </h3>
              <pre className="text-[11px] text-white/70 overflow-x-auto whitespace-pre-wrap break-words max-h-40 overflow-y-auto font-body">
                {error.message}
                {error.stack && `\n\n${error.stack}`}
              </pre>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={reset}
              className="tape press px-7 py-4 font-display text-[18px] uppercase tracking-[0.02em] text-black"
            >
              Restart Forge ▸
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="press px-7 py-4 bg-black text-white border-2 hairline-white hover:border-pink hover:text-pink font-display text-[14px] uppercase tracking-[0.22em] transition-colors"
            >
              Return Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
