"use client";

import { useState } from "react";
import Link from "next/link";
import StudioShell from "@/components/studio/StudioShell";
import SlashHeadline from "@/components/punk/SlashHeadline";
import { useDesigns, type TattDesign } from "@/lib/tattStorage";
import { ManageBillingButton } from "@/components/billing/BillingButtons";

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
  const { designs, hydrated, removeDesign, removeDesigns } = useDesigns();
  const count = designs.length;
  const showEmpty = hydrated && count === 0;

  // Multi-select delete — pruning a whole batch of cuts without one
  // confirm dialog per tile. Quick single delete (the ✕) still works
  // outside of select mode.
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    const n = selectedIds.size;
    if (!confirm(`Delete ${n} design${n === 1 ? "" : "s"}? This can't be undone.`)) return;
    removeDesigns(Array.from(selectedIds));
    exitSelectMode();
  };

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
            <SlashHeadline
              before="Your"
              slashed="cuts"
              sizeClassName="text-[48px] md:text-[88px] leading-[0.88]"
            />
            <div className="flex items-center gap-3">
              {!showEmpty && (
                selectMode ? (
                  <>
                    <button
                      onClick={handleDeleteSelected}
                      disabled={selectedIds.size === 0}
                      className="border-2 hairline press inline-flex items-center justify-center px-6 py-3 font-display text-[20px] leading-none tracking-[0.02em] text-white hover:text-black hover:bg-pink hover:border-pink disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-white disabled:hover:border-white/20 disabled:cursor-not-allowed"
                    >
                      Delete selected ({selectedIds.size})
                    </button>
                    <button
                      onClick={exitSelectMode}
                      className="border-2 hairline press inline-flex items-center justify-center px-6 py-3 font-display text-[20px] leading-none tracking-[0.02em] text-white/70 hover:text-white"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setSelectMode(true)}
                    className="border-2 hairline press inline-flex items-center justify-center px-6 py-3 font-display text-[20px] leading-none tracking-[0.02em] text-white hover:text-black hover:bg-pink hover:border-pink"
                  >
                    Select
                  </button>
                )
              )}
              {/* Artist SaaS billing. /dashboard redirects here, so this is the
                  real dashboard home. Gated (disabled) until the artist's Stripe
                  customer id is surfaced client-side — see BillingButtons. */}
              <ManageBillingButton className="border-2 hairline press inline-flex items-center justify-center px-6 py-3 font-display text-[20px] leading-none tracking-[0.02em] text-white hover:text-black hover:bg-pink hover:border-pink disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-white disabled:hover:border-white/20 disabled:cursor-not-allowed">
                Manage Billing
              </ManageBillingButton>
              <Link
                href="/generate/stencil"
                className="tape press inline-flex items-center justify-center px-6 py-3 font-display text-[20px] leading-none tracking-[0.02em]"
              >
                New Design
                <span className="ml-2 text-[14px]">▸</span>
              </Link>
            </div>
          </div>

          {showEmpty ? (
            <div className="mt-20 border-2 hairline py-20 px-6 text-center">
              <div className="font-display text-[72px] sm:text-[90px] leading-none text-pink/25 select-none">
                {"//"}
              </div>
              <div className="mt-6 font-display text-[40px] sm:text-[56px] leading-[0.95] text-white">
                No cuts yet<span className="text-pink">.</span>
              </div>
              <p className="mt-4 text-[12px] uppercase tracking-[0.2em] text-white/50 font-body">
                Describe the ink you want and the Forge cuts four takes.
              </p>
              <Link
                href="/generate/stencil"
                className="mt-10 tape press inline-flex items-center justify-center px-8 py-4 font-display text-[24px] leading-none tracking-[0.02em]"
              >
                Open the Forge
                <span className="ml-3 text-[18px]">▸</span>
              </Link>
            </div>
          ) : (
            <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {designs.map((d) => {
                const isSelected = selectedIds.has(d.id);
                const tile = (
                  <div
                    className={`aspect-square ${d.image ? "bg-bone" : d.color} border-2 hairline relative overflow-hidden ${isSelected ? "outline outline-2 outline-pink" : ""}`}
                  >
                    {d.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={d.image}
                        alt={deriveTitle(d)}
                        className="absolute inset-0 w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50 mix-blend-multiply" />
                    )}
                    <span className="absolute top-2 left-2 text-[9px] uppercase tracking-[0.2em] text-white/70 font-body bg-black/60 px-1.5 py-0.5">
                      v1
                    </span>
                  </div>
                );

                return (
                  <div key={d.id} className="group press relative">
                    {selectMode ? (
                      <button
                        type="button"
                        onClick={() => toggleSelected(d.id)}
                        aria-pressed={isSelected}
                        aria-label={`${isSelected ? "Deselect" : "Select"} ${deriveTitle(d)}`}
                        className="block w-full text-left"
                      >
                        {tile}
                      </button>
                    ) : (
                      <Link href={`/designs/${d.id}`} className="block">
                        {tile}
                      </Link>
                    )}
                    {selectMode && (
                      <span
                        className={`pointer-events-none absolute top-2 right-2 w-6 h-6 flex items-center justify-center border-2 hairline font-display text-[14px] leading-none ${isSelected ? "bg-pink text-black border-pink" : "bg-black/70 text-white/60"}`}
                        aria-hidden="true"
                      >
                        {isSelected ? "✓" : ""}
                      </span>
                    )}
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
                    {!selectMode && (
                      <button
                        onClick={() => {
                          if (confirm("Delete this design?")) removeDesign(d.id);
                        }}
                        aria-label={`Delete ${deriveTitle(d)}`}
                        className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center bg-black/80 border hairline text-white/60 hover:text-pink hover:bg-black opacity-0 group-hover:opacity-100 transition-opacity press font-display text-[18px] leading-none"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </StudioShell>
  );
}
