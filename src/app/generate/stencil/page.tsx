"use client";

import { useState } from "react";
import StudioShell from "@/components/studio/StudioShell";

const SUGGESTIONS = [
  { label: "Traditional Japanese" },
  { label: "Fineline Floral" },
  { label: "Geometric Minimal" },
  { label: "Dark Surrealism" },
];

const ITERATIONS = [
  { id: 1, label: "Coiled Serpent", time: "2 min" },
  { id: 2, label: "Crane in Mist", time: "5 min" },
  { id: 3, label: "First Pass", time: "8 min" },
];

function IterationRow({ label, time }: { label: string; time: string }) {
  return (
    <button className="w-full text-left group press">
      <div className="aspect-square bg-bone-dark border hairline mb-3 flex items-center justify-center overflow-hidden">
        <span
          className="font-display text-ink/15 group-hover:text-oxblood/40 transition-colors"
          style={{ fontSize: "5rem", fontVariationSettings: '"wght" 700, "opsz" 144' }}
        >
          ·
        </span>
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <span
          className="text-[15px] tracking-[-0.01em]"
          style={{ fontVariationSettings: '"wght" 500, "opsz" 24' }}
        >
          {label}
        </span>
        <span className="text-[12px] text-ink-soft tabular-nums">{time}</span>
      </div>
    </button>
  );
}

function RightSidebarContent() {
  return (
    <div className="p-8 space-y-8">
      <div className="flex items-baseline justify-between">
        <h3
          className="font-display text-[15px] tracking-[-0.01em]"
          style={{ fontVariationSettings: '"wght" 600, "opsz" 24' }}
        >
          History
        </h3>
        <span className="text-[12px] text-ink-soft tabular-nums">
          {ITERATIONS.length}
        </span>
      </div>
      <div className="space-y-7">
        {ITERATIONS.map(({ id, ...it }) => (
          <IterationRow key={id} {...it} />
        ))}
      </div>
    </div>
  );
}

export default function StencilPage() {
  const [prompt, setPrompt] = useState("");

  const appendSuggestion = (s: string) => {
    setPrompt((p) => (p.trim() ? `${p.trim()}, ${s}` : s));
  };

  const handleGenerate = () => {
    console.log("TODO: call /api/v1/generate", { prompt });
  };

  return (
    <StudioShell rightSidebar={<RightSidebarContent />}>
      <div className="flex flex-col min-h-full">
        {/* Quiet meta-bar: step, status. Honest labels, no theater. */}
        <div className="px-6 md:px-12 pt-8 pb-6 border-b hairline">
          <div className="max-w-4xl mx-auto flex items-baseline justify-between text-[12px] text-ink-soft tabular-nums">
            <span>Step 1 of 4 — Describe</span>
            <span>Status: Ready</span>
          </div>
        </div>

        {/* Editorial canvas */}
        <div className="flex-1 px-6 md:px-12 py-20 md:py-32">
          <div className="max-w-3xl mx-auto">
            {/* The headline moment. No ornaments, no rules, no banners. */}
            <h1
              className="font-display rise rise-1 text-balance tracking-[-0.035em] leading-[0.95] text-[64px] sm:text-[96px] md:text-[128px]"
              style={{ fontVariationSettings: '"wght" 400, "opsz" 144, "SOFT" 10' }}
            >
              Describe the
              <br />
              <span
                className="italic text-oxblood"
                style={{ fontVariationSettings: '"wght" 400, "opsz" 144, "SOFT" 40' }}
              >
                tattoo
              </span>
              .
            </h1>

            <p
              className="rise rise-2 mt-10 max-w-xl text-[19px] md:text-[20px] leading-[1.55] text-ink-soft text-pretty"
              style={{ fontVariationSettings: '"wght" 400, "opsz" 24' }}
            >
              One sentence is enough. Mention the subject, the placement on the
              body, and the mood you&rsquo;re after.
            </p>

            {/* Input — a single line beneath the prose. No card, no border-stack, no tab. */}
            <div className="rise rise-3 mt-20">
              <label htmlFor="prompt" className="block text-[12px] text-ink-soft mb-4">
                Your description
              </label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="A dragon coiled around a katana, left forearm, looks like it was tattooed in 1973."
                rows={3}
                className="w-full bg-transparent text-ink placeholder-ink-soft/45 resize-none focus:outline-none text-[22px] md:text-[26px] leading-[1.45] tracking-[-0.01em] border-b hairline focus:border-ink pb-4 transition-colors"
                style={{ fontVariationSettings: '"wght" 400, "opsz" 36' }}
              />

              <div className="mt-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div className="flex flex-wrap gap-x-6 gap-y-3">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s.label}
                      onClick={() => appendSuggestion(s.label)}
                      className="text-[14px] text-ink-soft hover:text-ink underline decoration-transparent hover:decoration-current underline-offset-4 transition-colors press"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleGenerate}
                  className="press inline-flex items-center justify-center bg-ink text-bone px-7 py-3.5 text-[15px] tracking-[-0.01em] hover:bg-oxblood self-start sm:self-auto"
                  style={{ fontVariationSettings: '"wght" 500, "opsz" 20' }}
                >
                  Generate
                </button>
              </div>
            </div>

            {/* Mobile/tablet history — replaces the rotated flash strip */}
            <div className="xl:hidden rise rise-4 mt-28 pt-12 border-t hairline">
              <div className="flex items-baseline justify-between mb-8">
                <h3
                  className="font-display text-[15px] tracking-[-0.01em]"
                  style={{ fontVariationSettings: '"wght" 600, "opsz" 24' }}
                >
                  History
                </h3>
                <span className="text-[12px] text-ink-soft tabular-nums">
                  {ITERATIONS.length}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                {ITERATIONS.map(({ id, ...it }) => (
                  <IterationRow key={id} {...it} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quiet footer — honest metadata, no carnival. */}
        <div className="border-t hairline px-6 md:px-12 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between text-[12px] text-ink-soft tabular-nums">
            <span>Model: SDXL Stencil v2</span>
            <span className="hidden md:inline">Ready</span>
          </div>
        </div>
      </div>
    </StudioShell>
  );
}
