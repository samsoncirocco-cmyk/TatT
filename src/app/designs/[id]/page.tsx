"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import StudioShell from "@/components/studio/StudioShell";
import { useDesigns, type TattDesign } from "@/lib/tattStorage";

function formatCreated(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function deriveTitle(d: TattDesign): string {
  if (d.title) return d.title;
  const words = d.prompt.split(/[\s,]+/).filter(Boolean).slice(0, 3);
  return words.length ? words.join(" ") : "Untitled cut";
}

export default function DesignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { designs, hydrated, removeDesign } = useDesigns();

  const design = designs.find((d) => d.id === id);

  if (!hydrated) {
    return (
      <StudioShell>
        <div className="px-6 md:px-12 py-16">
          <div className="max-w-5xl mx-auto">
            <div className="h-[64px] bg-white/5 border-2 hairline max-w-md" />
            <div className="mt-12 aspect-square max-w-2xl bg-white/5 border-2 hairline" />
          </div>
        </div>
      </StudioShell>
    );
  }

  if (!design) {
    return (
      <StudioShell>
        <div className="px-6 md:px-12 pt-6 pb-4 border-b hairline">
          <div className="max-w-5xl mx-auto flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-white/50 tabular-nums font-body">
            <Link href="/designs" className="hover:text-pink">
              ←&nbsp;Designs
            </Link>
            <span>
              Status:&nbsp;<span className="text-pink">Missing</span>
            </span>
          </div>
        </div>
        <div className="px-6 md:px-12 py-16 md:py-24">
          <div className="max-w-5xl mx-auto">
            <h1 className="font-display text-white leading-[0.88] text-[56px] sm:text-[88px] md:text-[112px] tracking-[0.005em]">
              Design&nbsp;<span className="slash"><span>gone</span></span>
              <span className="text-pink">.</span>
            </h1>
            <p className="mt-10 max-w-xl text-[15px] leading-[1.55] text-white/70 font-body">
              No design with id <span className="text-pink">{id}</span> in your
              library.{" "}
              <span className="scribble text-pink">Deleted, or never was.</span>
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-5">
              <Link
                href="/designs"
                className="tape press inline-flex items-center justify-center px-10 py-5 font-display text-[32px] sm:text-[38px] leading-none tracking-[0.02em]"
              >
                Back to Designs
                <span className="ml-3 text-[20px]">▸</span>
              </Link>
              <Link
                href="/generate/stencil"
                className="text-[10px] uppercase tracking-[0.25em] text-white/60 hover:text-pink border hairline px-4 py-3 press font-body"
              >
                ▸ Start a new one
              </Link>
            </div>
          </div>
        </div>
      </StudioShell>
    );
  }

  const handleDelete = () => {
    if (confirm("Delete this design?")) {
      removeDesign(design.id);
      router.push("/designs");
    }
  };

  const title = deriveTitle(design);

  return (
    <StudioShell>
      <div className="px-6 md:px-12 pt-6 pb-4 border-b hairline">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-white/50 tabular-nums font-body">
          <Link href="/designs" className="hover:text-pink">
            ←&nbsp;Designs
          </Link>
          <span>
            ID:&nbsp;<span className="text-pink">{design.id.slice(0, 8)}</span>
          </span>
        </div>
      </div>

      <div className="px-6 md:px-12 py-12 md:py-16">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-start">
          {/* canvas */}
          <div className="md:col-span-7">
            <div
              className={`aspect-square ${design.color} border-2 hairline relative overflow-hidden`}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50 mix-blend-multiply" />
              <div className="absolute top-3 right-3 sticker px-3 py-1 z-10">
                <div className="font-display text-[11px] tracking-widest leading-none">
                  v1
                </div>
                <div className="font-body text-[8px] uppercase tracking-widest leading-none mt-0.5">
                  Placeholder
                </div>
              </div>
              <span className="absolute bottom-3 left-3 text-[9px] uppercase tracking-[0.2em] text-white/70 font-body tabular-nums">
                #{design.id.slice(0, 6)}
              </span>
            </div>
          </div>

          {/* sidebar */}
          <div className="md:col-span-5">
            <h1 className="font-display text-white text-[40px] sm:text-[56px] leading-[0.88] tracking-[0.005em]">
              {title}
              <span className="text-pink">.</span>
            </h1>

            <div className="mt-6 text-[10px] uppercase tracking-[0.25em] text-white/50 font-body tabular-nums">
              Saved&nbsp;<span className="text-pink">{formatCreated(design.createdAt)}</span>
            </div>

            <div className="mt-10">
              <div className="text-[10px] uppercase tracking-[0.28em] text-pink mb-3 font-body">
                ▸ Prompt
              </div>
              <p className="text-[15px] text-white/80 font-body leading-[1.55] border-2 hairline p-5 whitespace-pre-wrap">
                {design.prompt}
              </p>
            </div>

            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              <Link
                href={`/generate/stencil?prompt=${encodeURIComponent(design.prompt)}`}
                className="tape press inline-flex items-center justify-center px-6 py-4 font-display text-[20px] sm:text-[24px] leading-none tracking-[0.02em]"
              >
                Iterate
                <span className="ml-3 text-[16px]">▸</span>
              </Link>
              <Link
                href="/matches"
                className="text-[10px] uppercase tracking-[0.25em] text-white/70 hover:text-black hover:bg-pink border-2 hairline px-4 py-4 press font-body inline-flex items-center justify-center"
              >
                ▸ Find an artist
              </Link>
              <button
                onClick={handleDelete}
                className="text-[10px] uppercase tracking-[0.25em] text-pink hover:bg-pink hover:text-black border-2 hairline border-pink px-4 py-4 press font-body inline-flex items-center justify-center"
              >
                ✕ Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t hairline px-6 md:px-12 py-4 bg-black">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-white/50 tabular-nums font-body">
          <span>Versions:&nbsp;<span className="text-pink">01</span></span>
          <span>
            <span className="text-pink">●</span>&nbsp;&nbsp;Local
          </span>
        </div>
      </div>
    </StudioShell>
  );
}
