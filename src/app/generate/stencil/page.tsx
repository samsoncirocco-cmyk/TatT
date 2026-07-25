"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import StudioShell from "@/components/studio/StudioShell";
import SlashHeadline from "@/components/punk/SlashHeadline";
import TapeCTA from "@/components/punk/TapeCTA";
import OutputCard from "@/components/punk/OutputCard";
import Lightbox from "@/components/punk/Lightbox";
import { useDesigns, useUser } from "@/lib/tattStorage";
import {
  FREE_TIER_DAILY_CUTS,
  getDailyUsage,
  recordGeneration,
} from "@/lib/cloudSync";
import { generateTattooDesign } from "@/features/generate/services/replicateService";
import { matchesUrlForDesign } from "@/lib/design-style-signal";

const SUGGESTIONS = [
  { label: "Pop-punk flash" },
  { label: "Hot pink accents" },
  { label: "Heavy black linework" },
  { label: "Sticker-sheet layout" },
];

/** The prompt checklist, compressed to a hint row under the input
 *  (ADR-0018) — honest guidance, no panel real estate. */
const PROMPT_HINTS = [
  ["Subject", "what is it?"],
  ["Placement", "where does it go?"],
  ["Mood", "clean, loud, soft, brutal?"],
  ["Constraint", "stencil, flash, coverup?"],
];

function StencilPageInner() {
  const [prompt, setPrompt] = useState("");
  const [cuts, setCuts] = useState<string[]>([]);
  const [cutting, setCutting] = useState(false);
  const [selected, setSelected] = useState(0);
  const [savedCuts, setSavedCuts] = useState<Record<number, boolean>>({});
  const [expanded, setExpanded] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addDesign } = useDesigns();
  const { user, hydrated } = useUser();
  const signedOut = hydrated && !user;

  // Allow deep-linking with a pre-filled prompt: /generate/stencil?prompt=...
  // Used by /designs/[id]'s "Iterate" CTA to pick up where a saved design
  // left off. Only fires once on mount; subsequent user edits stick.
  useEffect(() => {
    const initial = searchParams?.get("prompt");
    if (initial) setPrompt(initial);
    // intentionally not depending on searchParams — we only want the initial
    // hydration, not to clobber user input if the URL changes later.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const appendSuggestion = (s: string) => {
    setPrompt((p) => (p.trim() ? `${p.trim()}, ${s}` : s));
  };

  const handleGenerate = useCallback(async () => {
    const trimmed = prompt.trim();
    if (!trimmed || cutting) return;
    if (!user) {
      router.push("/login?redirect=/generate/stencil");
      return;
    }
    setCutting(true);
    setError(null);
    try {
      const used = await getDailyUsage();
      if (used >= FREE_TIER_DAILY_CUTS) {
        setError(
          `Free tier is ${FREE_TIER_DAILY_CUTS} cuts a day — back tomorrow, or go Pro`,
        );
        return;
      }
      const result = await generateTattooDesign({
        subject: trimmed,
        style: "blackwork",
        bodyPart: "forearm",
        size: "medium",
      });
      const images: string[] = result?.images ?? [];
      if (!images.length) throw new Error("No cuts came back");
      const nextCuts = images.slice(0, 4);
      setCuts(nextCuts);
      setSelected(0);
      // Every generation auto-saves to the library — no manual "Save" step.
      // Each of the four cuts lands as its own design so pruning (single or
      // multi-select delete on /designs) works per-cut.
      nextCuts.forEach((image) => addDesign(trimmed, { image }));
      setSavedCuts(Object.fromEntries(nextCuts.map((_, i) => [i, true])));
      void recordGeneration();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setCutting(false);
    }
  }, [prompt, cutting, user, router, addDesign]);

  return (
    <StudioShell>
      <div className="flex flex-col min-h-full relative">
        {/* Meta-bar — caps lock punk metadata */}
        <div className="px-6 md:px-12 pt-4 pb-3 border-b hairline">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 text-[10px] uppercase tracking-[0.25em] text-white/50 tabular-nums font-body">
            <span>
              <span className="text-pink">●</span>&nbsp;&nbsp;Stencil&nbsp;Forge — Pop&nbsp;Punk&nbsp;Mode
            </span>
            <TapeCTA href="/generate" variant="ghost" size="sm" arrow={false}>
              Open Studio
            </TapeCTA>
          </div>
        </div>

        <div className="flex-1 px-6 md:px-12 py-5 relative">
          <div className="max-w-4xl mx-auto">
            <section className="relative border-2 hairline bg-black p-5 sm:p-6 overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-2 bg-pink" />
              <div className="hidden md:block absolute top-7 right-7 sticker px-3 py-1 z-10">
                <div className="font-display text-[11px] tracking-widest leading-none">
                  LOUD
                </div>
                <div className="font-body text-[8px] uppercase tracking-widest leading-none mt-0.5">
                  Lines
                </div>
              </div>

              {/* Input-first (ADR-0018): headline is one compact line, the
                  textarea + GENERATE stay above the fold at laptop size. */}
              <SlashHeadline
                before="Make the stencil"
                slashed="hit"
                sizeClassName="text-[32px] sm:text-[40px] md:text-[48px] leading-[0.9]"
                className="rise rise-1 text-balance"
              />
              <p className="rise rise-2 mt-2 text-[13px] leading-[1.5] text-white/60 font-body">
                Describe the tattoo like you would to an artist.{" "}
                <span className="scribble text-pink">No sterile form screen.</span>
              </p>

              <div className="rise rise-3 mt-4">
                <label
                  htmlFor="prompt"
                  className="block text-[10px] uppercase tracking-[0.28em] text-pink mb-3 font-body"
                >
                  ▸ Your description
                </label>
                <textarea
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Roxas keyblade crossed with Cloud's buster sword, blackwork stencil, hot pink sticker accents, outer forearm."
                  rows={4}
                  className="w-full bg-black text-white placeholder-white/25 resize-none focus:outline-none text-[19px] md:text-[22px] leading-[1.45] tracking-tight border-2 hairline focus:border-pink p-5 transition-colors font-display"
                />

                <div className="mt-3 flex flex-wrap gap-2">
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

                {/* Checklist → hint row (ADR-0018) */}
                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[10px] uppercase tracking-[0.18em] text-white/40 font-body">
                  {PROMPT_HINTS.map(([title, body], i) => (
                    <span key={title}>
                      <span className="text-pink tabular-nums">0{i + 1}</span>
                      &nbsp;<span className="text-white/70">{title}</span>
                      &nbsp;·&nbsp;{body}
                    </span>
                  ))}
                </div>

                {/* Auto-save is silent but not secret — say so once, here.
                    Its original home was the pre-ADR-0018 preview panel,
                    which no longer exists. */}
                <p className="mt-2 text-[10px] uppercase tracking-[0.22em] leading-[1.6] text-white/45 font-body">
                  Every cut auto-saves to your designs. Prune what
                  doesn&apos;t bite from the library.
                </p>
              </div>

              <div className="rise rise-5 mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t-2 hairline pt-4">
                <div className="text-[10px] uppercase tracking-[0.24em] text-white/45 font-body">
                  Status:&nbsp;
                  <span className="text-pink">
                    {error
                      ? error
                      : cutting
                        ? "Cutting…"
                        : cuts.length
                          ? `${cuts.length} cuts ready`
                          : "Ready"}
                  </span>
                  &nbsp;/&nbsp;Model:&nbsp;SDXL&nbsp;Stencil&nbsp;v2
                </div>
                {signedOut ? (
                  <TapeCTA
                    href="/login?redirect=/generate/stencil"
                    size="lg"
                    className="self-start sm:self-auto"
                  >
                    Sign in to generate
                  </TapeCTA>
                ) : (
                  <TapeCTA
                    onClick={handleGenerate}
                    size="lg"
                    disabled={cutting || !prompt.trim()}
                    arrow={!cutting}
                    className="self-start sm:self-auto"
                  >
                    {cutting ? "Cutting…" : cuts.length ? "Regenerate" : "GENERATE"}
                  </TapeCTA>
                )}
              </div>

              {/* FOUR CUTS — generation output grid */}
              {cuts.length > 0 && (
                <div className="mt-10">
                  <div className="text-[10px] uppercase tracking-[0.28em] text-pink mb-4 font-body">
                    ▸ Four cuts
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {cuts.map((src, i) => (
                      <OutputCard
                        key={`${src}-${i}`}
                        src={src}
                        index={i + 1}
                        selected={selected === i}
                        onSelect={() => setSelected(i)}
                        onExpand={() => setExpanded(i)}
                        badge={
                          savedCuts[i] ? (
                            <span className="text-[9px] uppercase tracking-[0.2em] text-pink font-body bg-black/70 px-2 py-1">
                              ★ Saved
                            </span>
                          ) : undefined
                        }
                        actions={[
                          {
                            label: "Layers",
                            onClick: () => router.push("/generate"),
                          },
                          {
                            label: "Iterate",
                            onClick: handleGenerate,
                            disabled: cutting,
                          },
                        ]}
                      />
                    ))}
                  </div>

                  {expanded !== null && cuts[expanded] && (
                    <Lightbox
                      src={cuts[expanded]}
                      alt={`Generated cut ${expanded + 1} large view`}
                      caption={`Cut ${String(expanded + 1).padStart(2, "0")} · 1024²${
                        selected === expanded ? " · Selected" : ""
                      }`}
                      onClose={() => setExpanded(null)}
                      onPrev={
                        cuts.length > 1
                          ? () => setExpanded((expanded + cuts.length - 1) % cuts.length)
                          : undefined
                      }
                      onNext={
                        cuts.length > 1
                          ? () => setExpanded((expanded + 1) % cuts.length)
                          : undefined
                      }
                    />
                  )}

                  {/* DESIGN → ARTIST SIGNAL — carries the prompt's style
                      descriptors to /matches as canonical graph styles. */}
                  <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-4 border-t-2 hairline pt-6">
                    <TapeCTA href={matchesUrlForDesign(prompt)} size="lg">
                      Find artists for this design
                    </TapeCTA>
                    <span className="text-[10px] uppercase tracking-[0.22em] text-white/45 font-body">
                      Matched by the styles in your description
                    </span>
                  </div>
                </div>
              )}
            </section>
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

export default function StencilPage() {
  // useSearchParams requires a Suspense boundary in the app router.
  // Fallback returns the same shell without the URL-driven prompt prefill.
  return (
    <Suspense fallback={<StencilPageInner />}>
      <StencilPageInner />
    </Suspense>
  );
}
