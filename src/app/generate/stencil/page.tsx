"use client";

import { useState } from "react";
import StudioShell from "@/components/studio/StudioShell";

const SUGGESTIONS = [
  "Traditional Japanese",
  "Fineline Floral",
  "Geometric Minimal",
  "Dark Surrealism",
];

const ITERATIONS = [
  { id: 1, label: "Iteration 03", time: "2m ago", swatch: "from-emerald-700 to-emerald-950" },
  { id: 2, label: "Iteration 02", time: "5m ago", swatch: "from-lime-700 to-emerald-950" },
  { id: 3, label: "Iteration 01", time: "8m ago", swatch: "from-green-800 to-black" },
];

function IterationCard({ label, time, swatch }: { label: string; time: string; swatch: string }) {
  return (
    <div className="shrink-0 w-48 xl:w-full glass-panel rounded-lg overflow-hidden hover:border-border-primary transition">
      <div className={`aspect-square bg-gradient-to-br ${swatch} stencil-grid`} />
      <div className="p-3 flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold">{label}</div>
          <div className="text-[10px] text-white/40">{time}</div>
        </div>
        <button
          aria-label="Reuse"
          className="w-7 h-7 rounded border border-border-subtle flex items-center justify-center hover:border-border-primary"
        >
          <span className="material-symbols-outlined text-sm text-primary">refresh</span>
        </button>
      </div>
    </div>
  );
}

function RightSidebarContent() {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs uppercase tracking-widest text-white/50">Recent Iterations</h3>
        <span className="text-[10px] text-primary">{ITERATIONS.length}</span>
      </div>
      <div className="space-y-3">
        {ITERATIONS.map(({ id, ...it }) => (
          <IterationCard key={id} {...it} />
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
        {/* Progress header */}
        <div className="px-4 md:px-8 pt-6 pb-4 border-b border-border-subtle">
          <div className="flex items-center justify-between text-xs uppercase tracking-widest mb-3">
            <span className="text-primary">Stage 1: AI Stencil Generation</span>
            <span className="text-white/50">1 of 4</span>
          </div>
          <div className="h-1 w-full bg-studio-elevated rounded overflow-hidden">
            <div className="h-full w-1/4 bg-primary glow-primary" />
          </div>
        </div>

        {/* Main canvas area */}
        <div className="flex-1 px-4 md:px-8 py-8 md:py-12 stencil-grid">
          <div className="max-w-4xl mx-auto space-y-8">
            <h1 className="text-2xl md:text-4xl lg:text-6xl font-extrabold tracking-tighter text-center">
              CREATE YOUR <span className="text-primary">STENCIL</span>
            </h1>

            {/* Prompt panel */}
            <div className="glass-panel rounded-xl p-4 md:p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 flex flex-col gap-3">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe your design... e.g. a dragon coiled around a katana, traditional Japanese ink style"
                    rows={4}
                    className="w-full bg-transparent text-white placeholder-white/30 resize-none focus:outline-none text-sm md:text-base"
                  />
                  <div className="flex items-center gap-2 pt-2 border-t border-border-subtle">
                    <button
                      onClick={() => console.log("TODO: image")}
                      aria-label="Upload image"
                      className="w-9 h-9 rounded border border-border-subtle flex items-center justify-center hover:border-border-primary transition"
                    >
                      <span className="material-symbols-outlined text-base">image</span>
                    </button>
                    <button
                      onClick={() => console.log("TODO: palette")}
                      aria-label="Palette"
                      className="w-9 h-9 rounded border border-border-subtle flex items-center justify-center hover:border-border-primary transition"
                    >
                      <span className="material-symbols-outlined text-base">palette</span>
                    </button>
                    <button
                      onClick={() => console.log("TODO: history")}
                      aria-label="History"
                      className="w-9 h-9 rounded border border-border-subtle flex items-center justify-center hover:border-border-primary transition"
                    >
                      <span className="material-symbols-outlined text-base">history</span>
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleGenerate}
                  className="md:w-48 bg-primary text-studio-bg font-bold uppercase tracking-wider py-3 md:py-0 px-4 rounded-lg glow-primary hover:brightness-110 transition flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">bolt</span>
                  Generate Stencil
                </button>
              </div>
            </div>

            {/* Suggestion chips */}
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => appendSuggestion(s)}
                  className="px-3 py-1.5 text-xs md:text-sm rounded border border-border-subtle text-white/70 hover:text-primary hover:border-border-primary transition"
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Mobile/tablet iterations strip (hidden on xl where sidebar shows) */}
            <div className="xl:hidden">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs uppercase tracking-widest text-white/50">Recent Iterations</h3>
                <span className="text-[10px] text-primary">{ITERATIONS.length}</span>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
                {ITERATIONS.map((it) => (
                  <IterationCard key={it.id} {...it} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom status bar */}
        <div className="border-t border-border-subtle bg-studio-panel/60 backdrop-blur-md px-4 md:px-8 py-2 text-[10px] md:text-xs font-mono uppercase tracking-widest flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary glow-primary animate-pulse" />
            <span className="text-primary">Neural Link: Active</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-white/50">
            <span>Model: SDXL-Stencil-v2</span>
            <span>GPU: 42%</span>
          </div>
          <div className="md:hidden text-white/40">Ready</div>
        </div>
      </div>
    </StudioShell>
  );
}
