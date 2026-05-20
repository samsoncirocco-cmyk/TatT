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
      <div className="aspect-square bg-black border-2 hairline mb-3 flex items-center justify-center overflow-hidden relative">
        <span className="font-display text-white/10 group-hover:text-pink transition-colors text-7xl">
          ✕
        </span>
        <span className="absolute top-1 left-1 text-[9px] uppercase tracking-[0.2em] text-white/40 font-body">
          B-side
        </span>
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-display text-[16px] tracking-wide text-white group-hover:text-pink">
          {label}
        </span>
        <span className="text-[10px] uppercase tracking-[0.18em] text-white/40 tabular-nums">
          {time}
        </span>
      </div>
    </button>
  );
}

function RightSidebarContent() {
  return (
    <div className="p-8 space-y-8">
      <div className="flex items-baseline justify-between border-b-2 hairline pb-4">
        <h3 className="font-display text-[20px] tracking-wide text-white">
          History
        </h3>
        <span className="text-[10px] uppercase tracking-[0.2em] text-pink tabular-nums">
          {ITERATIONS.length}&nbsp;cuts
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
      <div className="flex flex-col min-h-full relative">
        {/* Meta-bar — caps lock punk metadata */}
        <div className="px-6 md:px-12 pt-6 pb-4 border-b hairline">
          <div className="max-w-4xl mx-auto flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-white/50 tabular-nums font-body">
            <span>
              <span className="text-pink">●</span>&nbsp;&nbsp;Step&nbsp;01/04 — Describe
            </span>
            <span>Status:&nbsp;<span className="text-pink">Ready</span></span>
          </div>
        </div>

        {/* Editorial canvas */}
        <div className="flex-1 px-6 md:px-12 py-16 md:py-24 relative">
          <div className="max-w-3xl mx-auto relative">
            {/* Sticker pricetag — one only, top-right corner */}
            <div className="hidden md:block absolute -top-4 right-0 sticker px-3 py-1 z-10">
              <div className="font-display text-[11px] tracking-widest leading-none">
                EXPLICIT
              </div>
              <div className="font-body text-[8px] uppercase tracking-widest leading-none mt-0.5">
                Content
              </div>
            </div>

            {/* THE HEADLINE — Anton, massive, "TATTOO" slashed in pink */}
            <h1 className="rise rise-1 font-display text-white text-balance leading-[0.88] tracking-[0.005em] text-[72px] sm:text-[112px] md:text-[148px]">
              Describe
              <br />
              the&nbsp;
              <span className="slash"><span>tattoo</span></span>
              <span className="text-pink">.</span>
            </h1>

            <p className="rise rise-2 mt-10 max-w-xl text-[15px] leading-[1.55] text-white/70 font-body">
              ONE SENTENCE IS ENOUGH. Mention the subject, the placement on the
              body, the mood you&rsquo;re after.
              {" "}
              <span className="scribble text-pink">Loud is fine.</span>
            </p>

            {/* Input */}
            <div className="rise rise-3 mt-16">
              <label
                htmlFor="prompt"
                className="block text-[10px] uppercase tracking-[0.28em] text-pink mb-4 font-body"
              >
                ▸ Your description
              </label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="A dragon coiled around a katana, left forearm, looks like it was tattooed in 1973."
                rows={3}
                className="w-full bg-black text-white placeholder-white/30 resize-none focus:outline-none text-[20px] md:text-[24px] leading-[1.4] tracking-tight border-2 hairline focus:border-pink p-5 transition-colors font-display"
              />

              <div className="mt-10 flex flex-col sm:flex-row sm:items-stretch sm:justify-between gap-6">
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s.label}
                      onClick={() => appendSuggestion(s.label)}
                      className="text-[10px] uppercase tracking-[0.2em] text-white/70 hover:text-black hover:bg-pink border hairline px-3 py-2 press font-body"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                {/* SIGNATURE MOMENT — emergency-tape CTA. Hot pink rectangle,
                    Anton "GENERATE" crashing through with hard shadow. */}
                <button
                  onClick={handleGenerate}
                  className="tape press inline-flex items-center justify-center px-10 py-5 font-display text-[32px] sm:text-[38px] leading-none tracking-[0.02em] self-start sm:self-auto"
                >
                  GENERATE
                  <span className="ml-3 text-[20px]">▸</span>
                </button>
              </div>
            </div>

            {/* Mobile/tablet history */}
            <div className="xl:hidden rise rise-4 mt-24 pt-10 border-t-2 hairline">
              <div className="flex items-baseline justify-between mb-6">
                <h3 className="font-display text-[20px] tracking-wide text-white">
                  History
                </h3>
                <span className="text-[10px] uppercase tracking-[0.2em] text-pink tabular-nums">
                  {ITERATIONS.length}&nbsp;cuts
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

        {/* Footer — caps lock, pink dot */}
        <div className="border-t hairline px-6 md:px-12 py-4 bg-black">
          <div className="max-w-4xl mx-auto flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-white/50 tabular-nums font-body">
            <span>Model:&nbsp;SDXL&nbsp;Stencil&nbsp;v2</span>
            <span className="hidden md:inline">
              <span className="text-pink">●</span>&nbsp;&nbsp;Ready
            </span>
          </div>
        </div>
      </div>
    </StudioShell>
  );
}
