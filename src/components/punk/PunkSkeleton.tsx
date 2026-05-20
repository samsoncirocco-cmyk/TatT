/**
 * Punk loading skeleton — halftone bg, "[ LOADING ]" Space Mono label,
 * shimmering hairline blocks. Server-renderable (no client hooks).
 *
 * Used by app-router loading.tsx files. Variant controls the block layout
 * shown under the status bar.
 */
type Props = {
  label?: string;
  variant?: "grid" | "list" | "form" | "hero";
};

export default function PunkSkeleton({
  label = "Loading",
  variant = "grid",
}: Props) {
  return (
    <div className="halftone grain min-h-screen text-white font-body bg-black flex flex-col">
      <div className="px-6 md:px-12 pt-6 pb-4 border-b hairline">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-white/50 tabular-nums font-body">
          <span>
            <span className="text-pink animate-pulse">●</span>
            &nbsp;&nbsp;[&nbsp;{label.toUpperCase()}&nbsp;]
          </span>
          <span>
            Status:&nbsp;<span className="text-pink">Drawing</span>
          </span>
        </div>
      </div>

      <div className="px-6 md:px-12 py-16 md:py-20 flex-1">
        <div className="max-w-6xl mx-auto">
          {/* skeleton headline */}
          <div className="h-[64px] md:h-[88px] bg-white/5 border-2 hairline max-w-md" />
          <div className="mt-6 h-[14px] bg-white/5 border hairline max-w-sm" />

          {variant === "grid" && (
            <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <div
                    className="aspect-[3/4] bg-white/5 border-2 hairline"
                    style={{ animationDelay: `${i * 60}ms` }}
                  />
                  <div className="h-[20px] bg-white/5 border hairline w-3/4" />
                  <div className="h-[10px] bg-white/5 border hairline-soft w-1/2" />
                </div>
              ))}
            </div>
          )}

          {variant === "list" && (
            <div className="mt-12 space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[64px] bg-white/5 border-2 hairline"
                />
              ))}
            </div>
          )}

          {variant === "form" && (
            <div className="mt-12 max-w-md space-y-6">
              <div className="h-[14px] bg-white/5 border hairline w-24" />
              <div className="h-[60px] bg-white/5 border-2 hairline" />
              <div className="h-[14px] bg-white/5 border hairline w-24" />
              <div className="h-[60px] bg-white/5 border-2 hairline" />
              <div className="h-[60px] bg-pink/30 border-2 hairline" />
            </div>
          )}

          {variant === "hero" && (
            <div className="mt-12 grid grid-cols-1 md:grid-cols-12 gap-8">
              <div className="md:col-span-5 aspect-[3/4] bg-white/5 border-2 hairline" />
              <div className="md:col-span-7 space-y-5">
                <div className="h-[80px] bg-white/5 border-2 hairline w-3/4" />
                <div className="h-[14px] bg-white/5 border hairline w-1/2" />
                <div className="h-[14px] bg-white/5 border hairline-soft w-full" />
                <div className="h-[14px] bg-white/5 border hairline-soft w-5/6" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
