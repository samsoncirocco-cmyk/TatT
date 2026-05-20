import Link from "next/link";
import StudioShell from "@/components/studio/StudioShell";

const DESIGNS = [
  { id: "1", title: "Coiled Serpent",   versions: 4, edited: "2 hrs ago",  color: "bg-pink" },
  { id: "2", title: "Crane in Mist",    versions: 7, edited: "Yesterday",  color: "bg-bone" },
  { id: "3", title: "Razor Rose",       versions: 2, edited: "3 days ago", color: "bg-cream" },
  { id: "4", title: "Static Skull",     versions: 5, edited: "1 week ago", color: "bg-pink-deep" },
  { id: "5", title: "Bleached Phoenix", versions: 3, edited: "2 weeks ago",color: "bg-white/10" },
  { id: "6", title: "Highway Moth",     versions: 1, edited: "Last month", color: "bg-pink" },
];

const HAS_DESIGNS = true;

export default function DesignsPage() {
  return (
    <StudioShell>
      <div className="px-6 md:px-12 pt-6 pb-4 border-b hairline">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-white/50 tabular-nums font-body">
          <span>
            <span className="text-pink">●</span>&nbsp;&nbsp;My&nbsp;Designs
          </span>
          <span>
            Saved:&nbsp;<span className="text-pink">{DESIGNS.length}</span>
          </span>
        </div>
      </div>

      <div className="px-6 md:px-12 py-16 md:py-20">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between gap-6 flex-wrap">
            <h1 className="font-display text-white text-[48px] md:text-[88px] leading-[0.88] tracking-[0.005em]">
              Your&nbsp;<span className="slash"><span>cuts</span></span>
              <span className="text-pink">.</span>
            </h1>
            <Link
              href="/generate/stencil"
              className="tape press inline-flex items-center justify-center px-6 py-3 font-display text-[20px] leading-none tracking-[0.02em]"
            >
              New Design
              <span className="ml-2 text-[14px]">▸</span>
            </Link>
          </div>

          {HAS_DESIGNS ? (
            <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {DESIGNS.map((d) => (
                <Link
                  key={d.id}
                  href={`/generate/stencil`}
                  className="block group press"
                >
                  <div className={`aspect-square ${d.color} border-2 hairline relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50 mix-blend-multiply" />
                    <span className="absolute top-2 left-2 text-[9px] uppercase tracking-[0.2em] text-white/70 font-body">
                      v{d.versions}
                    </span>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between gap-3">
                    <span className="font-display text-[18px] tracking-wide text-white group-hover:text-pink">
                      {d.title}
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.18em] text-white/40 tabular-nums font-body">
                      {d.edited}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-20 border-2 hairline py-24 px-6 text-center">
              <div className="font-display text-[40px] sm:text-[56px] leading-[0.95] text-white">
                <span className="scribble text-pink">No designs yet.</span>
              </div>
              <p className="mt-4 text-[12px] uppercase tracking-[0.2em] text-white/50 font-body">
                Start forging.
              </p>
              <Link
                href="/generate/stencil"
                className="mt-10 tape press inline-flex items-center justify-center px-8 py-4 font-display text-[24px] leading-none tracking-[0.02em]"
              >
                Start Forging
                <span className="ml-3 text-[18px]">▸</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </StudioShell>
  );
}
