"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import StudioShell from "@/components/studio/StudioShell";
import SlashHeadline from "@/components/punk/SlashHeadline";
import TapeCTA from "@/components/punk/TapeCTA";
import OutputCard from "@/components/punk/OutputCard";
import { useDesigns, useUser, hasEverAuthed } from "@/lib/tattStorage";
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

const ITERATIONS = [
  { id: 1, label: "Prompt Draft", time: "Ready" },
  { id: 2, label: "Stencil Pass", time: "Next" },
  { id: 3, label: "Artist Handoff", time: "Final" },
];

function IterationRow({ label, time }: { label: string; time: string }) {
  return (
    <button className="w-full text-left group press">
      <div className="aspect-square bg-black border-2 hairline mb-3 flex items-center justify-center overflow-hidden relative">
        <span className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_1px_1px,#ff1f6b_1px,transparent_1.5px)] bg-[length:10px_10px]" />
        <span className="font-display text-white/10 group-hover:text-pink transition-colors text-7xl relative">
          {"//"}
        </span>
        <span className="absolute top-2 left-2 text-[9px] uppercase tracking-[0.2em] text-pink font-body">
          Queue
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
          Pipeline
        </h3>
        <span className="text-[10px] uppercase tracking-[0.2em] text-pink tabular-nums">
          {ITERATIONS.length}&nbsp;steps
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

function StencilPageInner() {
  const [prompt, setPrompt] = useState("");
  const [cuts, setCuts] = useState<string[]>([]);
  const [cutting, setCutting] = useState(false);
  const [selected, setSelected] = useState(0);
  const [savedCuts, setSavedCuts] = useState<Record<number, boolean>>({});
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
      const authPage = hasEverAuthed() ? "login" : "signup";
      router.push(`/${authPage}?redirect=/generate/stencil`);
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
      setCuts(images.slice(0, 4));
      setSelected(0);
      setSavedCuts({});
      void recordGeneration();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setCutting(false);
    }
  }, [prompt, cutting, user, router]);

  const handleSaveCut = (i: number) => {
    if (savedCuts[i]) return;
    addDesign(prompt.trim(), { image: cuts[i] });
    setSavedCuts((s) => ({ ...s, [i]: true }));
  };

  return (
    <StudioShell rightSidebar={<RightSidebarContent />}>
      <div className="flex flex-col min-h-full relative">
        {/* Meta-bar — caps lock punk metadata */}
        <div className="px-6 md:px-12 pt-6 pb-4 border-b hairline">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 text-[10px] uppercase tracking-[0.25em] text-white/50 tabular-nums font-body">
            <span>
              <span className="text-pink">●</span>&nbsp;&nbsp;Stencil&nbsp;Forge — Pop&nbsp;Punk&nbsp;Mode
            </span>
            <TapeCTA href="/generate" variant="ghost" size="sm" arrow={false}>
              Back to Forge
            </TapeCTA>
          </div>
        </div>

        <div className="flex-1 px-6 md:px-12 py-12 md:py-16 relative">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-8 xl:gap-10 items-start">
            <section className="relative border-2 hairline bg-black p-6 sm:p-8 md:p-10 overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-2 bg-pink" />
              <div className="hidden md:block absolute top-7 right-7 sticker px-3 py-1 z-10">
                <div className="font-display text-[11px] tracking-widest leading-none">
                  LOUD
                </div>
                <div className="font-body text-[8px] uppercase tracking-widest leading-none mt-0.5">
                  Lines
                </div>
              </div>

              <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_280px] gap-10">
                <div>
                  <SlashHeadline
                    before={<>Make the<br />stencil</>}
                    slashed="hit"
                    sizeClassName="text-[52px] sm:text-[72px] md:text-[92px] leading-[0.86]"
                    className="rise rise-1 text-balance"
                  />

                  <p className="rise rise-2 mt-8 max-w-2xl text-[14px] sm:text-[15px] leading-[1.6] text-white/70 font-body">
                    Describe the tattoo like you would to an artist. We keep the page
                    in the same hot-pink, black, tape-and-sticker system as the rest of
                    the Forge.{" "}
                    <span className="scribble text-pink">No sterile form screen.</span>
                  </p>

                  <div className="rise rise-3 mt-10">
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
                      placeholder="Roxas keyblade crossed with Cloud's buster sword, blackwork stencil, hot pink sticker accents, outer forearm."
                      rows={5}
                      className="w-full bg-black text-white placeholder-white/25 resize-none focus:outline-none text-[19px] md:text-[22px] leading-[1.45] tracking-tight border-2 hairline focus:border-pink p-5 transition-colors font-display"
                    />

                    <div className="mt-6 flex flex-wrap gap-2">
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
                  </div>
                </div>

                <div className="rise rise-4 border-2 hairline bg-black p-4">
                  <div className="aspect-[4/5] border-2 hairline-white bg-black relative overflow-hidden">
                    <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_1px_1px,#ff1f6b_1px,transparent_1.5px)] bg-[length:12px_12px]" />
                    <div className="absolute inset-6 border-2 border-pink/60 rotate-[-4deg]" />
                    <div className="absolute inset-10 border-2 border-white/30 rotate-[5deg]" />
                    <div className="absolute left-8 right-8 top-1/2 h-5 bg-pink rotate-[-8deg]" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="font-display text-[88px] leading-none text-white mix-blend-screen">
                        TATT
                      </span>
                    </div>
                    <span className="absolute left-3 top-3 text-[9px] uppercase tracking-[0.25em] text-pink font-body">
                      Preview
                    </span>
                    <span className="absolute right-3 bottom-3 text-[9px] uppercase tracking-[0.25em] text-white/50 font-body">
                      Stencil
                    </span>
                  </div>
                  <p className="mt-4 text-[10px] uppercase tracking-[0.22em] leading-[1.6] text-white/45 font-body">
                    Hit generate and four cuts land below. Save the one that
                    bites to your designs, or iterate until it does.
                  </p>
                </div>
              </div>

              <div className="rise rise-5 mt-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 border-t-2 hairline pt-6">
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
                    href={`/${hasEverAuthed() ? "login" : "signup"}?redirect=/generate/stencil`}
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
                            label: savedCuts[i] ? "Saved" : "Save",
                            onClick: () => handleSaveCut(i),
                            accent: true,
                            disabled: !!savedCuts[i],
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

            <aside className="border-2 hairline bg-black p-6">
              <div className="flex items-baseline justify-between border-b-2 hairline pb-4">
                <h3 className="font-display text-[22px] tracking-wide text-white">
                  Checklist
                </h3>
                <span className="text-[10px] uppercase tracking-[0.2em] text-pink">
                  Live
                </span>
              </div>
              <div className="mt-6 space-y-4">
                {[
                  ["Subject", "What is the tattoo?"],
                  ["Placement", "Where does it go?"],
                  ["Mood", "Clean, loud, soft, brutal, romantic."],
                  ["Constraint", "Stencil, flash, artist handoff, coverup."],
                ].map(([title, body], i) => (
                  <div key={title} className="grid grid-cols-[42px_1fr] gap-4 border-b hairline-soft pb-4 last:border-b-0">
                    <span className="font-display text-[28px] leading-none text-pink tabular-nums">
                      0{i + 1}
                    </span>
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.22em] text-white font-body">
                        {title}
                      </div>
                      <p className="mt-1 text-[12px] leading-[1.5] text-white/50 font-body">
                        {body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </aside>

            {/* Mobile/tablet history */}
            <div className="xl:hidden rise rise-4 mt-4 pt-8 border-t-2 hairline lg:col-span-2">
              <div className="flex items-baseline justify-between mb-6">
                <h3 className="font-display text-[20px] tracking-wide text-white">
                  Pipeline
                </h3>
                <span className="text-[10px] uppercase tracking-[0.2em] text-pink tabular-nums">
                  {ITERATIONS.length}&nbsp;steps
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

export default function StencilPage() {
  // useSearchParams requires a Suspense boundary in the app router.
  // Fallback returns the same shell without the URL-driven prompt prefill.
  return (
    <Suspense fallback={<StencilPageInner />}>
      <StencilPageInner />
    </Suspense>
  );
}
