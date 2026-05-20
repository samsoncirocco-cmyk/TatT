"use client";

import { useState } from "react";
import StudioShell from "@/components/studio/StudioShell";

const SUGGESTIONS = [
  { label: "Traditional Japanese", n: "I" },
  { label: "Fineline Floral", n: "II" },
  { label: "Geometric Minimal", n: "III" },
  { label: "Dark Surrealism", n: "IV" },
];

const ITERATIONS = [
  { id: 1, no: "Nº 03", label: "Coiled Serpent", time: "2 min", tilt: "-rotate-2" },
  { id: 2, no: "Nº 02", label: "Crane in Mist", time: "5 min", tilt: "rotate-1" },
  { id: 3, no: "Nº 01", label: "First Pass", time: "8 min", tilt: "-rotate-1" },
];

function FlashCard({
  no,
  label,
  time,
  tilt,
}: {
  no: string;
  label: string;
  time: string;
  tilt: string;
}) {
  return (
    <div
      className={`shrink-0 w-48 xl:w-full bg-bone border-2 border-ink shadow-ink ${tilt} hover:rotate-0 transition-transform duration-300`}
    >
      {/* Faux-printed flash plate */}
      <div className="aspect-square bg-bone-dark border-b-2 border-ink relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, rgba(20,17,15,0.18) 0 1px, transparent 1px 6px), repeating-linear-gradient(-45deg, rgba(110,26,26,0.12) 0 1px, transparent 1px 8px)",
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center font-display text-5xl text-oxblood/80">
          {no}
        </div>
      </div>
      <div className="p-3 flex items-center justify-between font-mono text-[10px] uppercase">
        <div>
          <div className="font-body italic text-sm tracking-tight normal-case text-ink leading-none">
            {label}
          </div>
          <div className="text-ink-soft/60 mt-1">{time} ago</div>
        </div>
        <button
          aria-label="Reuse"
          className="w-7 h-7 border-2 border-ink bg-bone hover:bg-riso-cyan transition flex items-center justify-center shadow-ink-sm"
        >
          <span className="material-symbols-outlined text-sm">refresh</span>
        </button>
      </div>
    </div>
  );
}

function RightSidebarContent() {
  return (
    <div className="p-5 space-y-5 relative">
      <div className="absolute top-0 right-4 -rotate-12 font-display text-oxblood/30 text-5xl leading-none select-none pointer-events-none">
        FLASH
      </div>
      <div className="flex items-end justify-between pt-2">
        <h3 className="font-display text-2xl leading-none">The Wall</h3>
        <span className="font-mono text-[10px] uppercase tracking-widest bg-ink text-bone px-1.5 py-0.5">
          {ITERATIONS.length} sheets
        </span>
      </div>
      <div className="double-rule" />
      <div className="space-y-6 pt-2">
        {ITERATIONS.map(({ id, ...it }) => (
          <FlashCard key={id} {...it} />
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
        {/* Progress header — looks like a ticket stub */}
        <div className="px-4 md:px-8 pt-5 pb-4 border-b-2 border-ink bg-bone-dark/30 relative">
          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] mb-3">
            <span className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-oxblood stamp-blink" />
              Stage I · The Drawing
            </span>
            <span className="text-ink-soft">Ticket 0001 / IV</span>
          </div>
          <div className="flex gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-2 flex-1 border-2 border-ink ${
                  i === 0 ? "bg-oxblood" : "bg-bone"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Main canvas area */}
        <div className="flex-1 px-4 md:px-10 py-10 md:py-14 relative">
          {/* Decorative corner brand */}
          <div className="hidden md:block absolute top-6 right-8 font-mono text-[10px] uppercase tracking-[0.3em] text-ink-soft/60 -rotate-90 origin-top-right">
            Hand-Drawn · Machine-Helped · 1 of 1
          </div>

          <div className="max-w-4xl mx-auto space-y-10">
            {/* Headline — the wheat-pasted flash sheet headline */}
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-3 font-mono text-[10px] uppercase tracking-[0.35em]">
                <span className="h-px w-10 sm:w-20 bg-ink" />
                <span>Today's Session</span>
                <span className="h-px w-10 sm:w-20 bg-ink" />
              </div>

              <h1 className="font-display leading-[0.85] tracking-tight text-5xl sm:text-7xl md:text-8xl">
                <span className="block">Tell us what</span>
                <span className="flash-banner text-bone relative inline-block px-3 py-1 ink-bleed">
                  bleeds
                </span>
                <span className="block italic font-body text-3xl sm:text-5xl md:text-6xl mt-3">
                  &amp; we&rsquo;ll draw it.
                </span>
              </h1>

              <p className="font-body italic text-base sm:text-lg text-ink-soft max-w-xl mx-auto">
                One sentence. Be specific. Mention the body part, the mood, the
                era you stole it from.
              </p>
            </div>

            {/* Ornamental divider */}
            <div className="flex items-center gap-4 max-w-md mx-auto">
              <div className="flex-1 ornamental-rule" />
              <span className="font-display text-2xl leading-none text-oxblood">
                &#x2766;
              </span>
              <div className="flex-1 ornamental-rule" />
            </div>

            {/* Prompt panel — looks like a typewriter form on cardstock */}
            <div className="bg-bone border-2 border-ink shadow-ink-lg relative">
              {/* Top label tab */}
              <div className="absolute -top-3 left-4 bg-ink text-bone font-mono text-[10px] uppercase tracking-[0.3em] px-2 py-1">
                Form &mdash; Subject of the Tattoo
              </div>
              <div className="absolute -top-3 right-4 hidden sm:block bg-riso-cyan border-2 border-ink font-mono text-[10px] uppercase tracking-[0.3em] px-2 py-0.5 -rotate-3">
                Carbon Copy
              </div>

              <div className="p-5 md:p-7 pt-6 md:pt-8">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. a dragon coiled around a katana, traditional Japanese ink, left forearm, looks like it was tattooed in 1973…"
                  rows={4}
                  className="w-full bg-transparent text-ink placeholder-ink-soft/40 resize-none focus:outline-none font-body italic text-lg md:text-xl leading-snug border-b-2 border-dotted border-ink-soft/40 pb-3"
                />

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-5">
                  <div className="flex items-center gap-2">
                    {[
                      { icon: "image", label: "Reference" },
                      { icon: "palette", label: "Palette" },
                      { icon: "history", label: "History" },
                    ].map(({ icon, label }) => (
                      <button
                        key={icon}
                        aria-label={label}
                        title={label}
                        className="w-10 h-10 border-2 border-ink bg-bone hover:bg-ink hover:text-bone transition flex items-center justify-center shadow-ink-sm"
                      >
                        <span className="material-symbols-outlined text-base">
                          {icon}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="flex-1 hidden sm:block font-mono text-[10px] uppercase tracking-[0.25em] text-ink-soft/60 text-right">
                    Signed &amp; dated by the machine ↘
                  </div>

                  <button
                    onClick={handleGenerate}
                    className="group bg-oxblood text-bone font-display text-2xl tracking-wide px-6 py-3 border-2 border-ink shadow-ink hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-ink-sm active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all flex items-center justify-center gap-3"
                  >
                    <span className="material-symbols-outlined">bolt</span>
                    Ink It
                  </button>
                </div>
              </div>
            </div>

            {/* Suggestion chips — like flash sheet plate numbers */}
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-soft mb-4 text-center">
                or pick a plate from the wall &mdash;
              </div>
              <div className="flex flex-wrap gap-3 justify-center">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={s.label}
                    onClick={() => appendSuggestion(s.label)}
                    className={`group inline-flex items-center gap-3 bg-bone border-2 border-ink px-4 py-2 shadow-ink-sm hover:bg-ink hover:text-bone hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all ${
                      i % 2 === 0 ? "-rotate-1" : "rotate-1"
                    }`}
                  >
                    <span className="font-display text-xl leading-none text-oxblood group-hover:text-riso-cyan">
                      {s.n}
                    </span>
                    <span className="font-body italic text-base">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile/tablet iterations strip */}
            <div className="xl:hidden pt-4">
              <div className="flex items-end justify-between mb-4">
                <h3 className="font-display text-3xl leading-none">The Wall</h3>
                <span className="font-mono text-[10px] uppercase tracking-widest bg-ink text-bone px-1.5 py-0.5">
                  {ITERATIONS.length} sheets
                </span>
              </div>
              <div className="double-rule mb-5" />
              <div className="flex gap-6 overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0">
                {ITERATIONS.map((it) => (
                  <FlashCard key={it.id} {...it} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom status bar — parlor receipt footer */}
        <div className="border-t-2 border-ink bg-ink text-bone px-4 md:px-8 py-2 font-mono text-[10px] md:text-xs uppercase tracking-[0.25em] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-riso-cyan stamp-blink" />
            <span>Needle Down · Awaiting Subject</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-bone/70">
            <span>Plate: SDXL-Stencil-v2</span>
            <span>Pressure: 42%</span>
            <span className="text-riso-orange">No Refunds</span>
          </div>
          <div className="md:hidden text-bone/60">Ready</div>
        </div>
      </div>
    </StudioShell>
  );
}
