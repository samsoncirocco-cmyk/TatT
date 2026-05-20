"use client";

import Link from "next/link";
import StudioShell from "@/components/studio/StudioShell";
import { useDesigns, type TattDesign } from "@/lib/tattStorage";

function formatEdited(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;
  const days = Math.round(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.round(days / 7)} week${days < 14 ? "" : "s"} ago`;
  return `${Math.round(days / 30)} mo ago`;
}

function deriveTitle(d: TattDesign): string {
  if (d.title) return d.title;
  const words = d.prompt.split(/[\s,]+/).filter(Boolean).slice(0, 3);
  return words.length ? words.join(" ") : "Untitled cut";
}

export default function DesignsPage() {
  const { designs, hydrated, removeDesign } = useDesigns();
  const count = designs.length;
  const showEmpty = hydrated && count === 0;

  return (
    <StudioShell>
      <div className="px-6 md:px-12 pt-6 pb-4 border-b hairline">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-white/50 tabular-nums font-body">
          <span>
            <span className="text-pink">●</span>&nbsp;&nbsp;My&nbsp;Designs
          </span>
          <span>
            Saved:&nbsp;<span className="text-pink">{hydrated ? count : "—"}</span>
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

          {showEmpty ? (
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
          ) : (
            <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {designs.map((d) => (
                <div key={d.id} className="group press relative">
                  <Link href="/generate/stencil" className="block">
                    <div
                      className={`aspect-square ${d.color} border-2 hairline relative overflow-hidden`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50 mix-blend-multiply" />
                      <span className="absolute top-2 left-2 text-[9px] uppercase tracking-[0.2em] text-white/70 font-body">
                        v1
                      </span>
                    </div>
                  </Link>
                  <div className="mt-3 flex items-baseline justify-between gap-3">
                    <span className="font-display text-[18px] tracking-wide text-white group-hover:text-pink">
                      {deriveTitle(d)}
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.18em] text-white/40 tabular-nums font-body">
                      {formatEdited(d.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-white/40 font-body leading-[1.4] line-clamp-2">
                    {d.prompt}
                  </p>
                  <button
                    onClick={() => {
                      if (confirm("Delete this design?")) removeDesign(d.id);
                    }}
                    aria-label={`Delete ${deriveTitle(d)}`}
                    className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center bg-black/80 border hairline text-white/60 hover:text-pink hover:bg-black opacity-0 group-hover:opacity-100 transition-opacity press font-display text-[18px] leading-none"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </StudioShell>
  );
}
