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
    <div className="min-h-screen flex items-center justify-center bg-black px-4 relative overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-purple-500/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-pink-500/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="max-w-2xl w-full z-10">
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl">
          {/* Icon */}
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center mb-6">
            <svg
              className="w-8 h-8 text-white"
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
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 mb-3">
            Forge Error
          </h1>

          {/* Description */}
          <p className="text-white/70 mb-6 text-lg">
            Something went wrong while loading the design forge.
            {process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && ' Demo mode should handle this gracefully.'}
            {' '}Try refreshing or return home to start over.
          </p>

          {/* Error details (dev mode only) */}
          {process.env.NODE_ENV === 'development' && error && (
            <div className="mb-6 p-4 bg-pink-500/10 border border-pink-500/30 rounded-xl">
              <h3 className="text-sm font-bold text-pink-400 mb-2 uppercase tracking-wider">
                Error Details (Dev Mode)
              </h3>
              <pre className="text-xs text-pink-300 overflow-x-auto whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                {error.message}
                {error.stack && `\n\n${error.stack}`}
              </pre>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={reset}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105"
            >
              Restart Forge
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="px-6 py-3 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-all backdrop-blur-sm"
            >
              Return Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
