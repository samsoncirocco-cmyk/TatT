"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import StudioShell from "@/components/studio/StudioShell";
import SlashHeadline from "@/components/punk/SlashHeadline";
import { getApiAuthHeaders } from "@/lib/client-api-auth";
import {
  CANONICAL_STYLES,
  canonicalStylesFromOntologyTags,
  parseStylesParam,
} from "@/lib/design-style-signal";
import { useMatchStore } from "@/store/useMatchStore";
import type { DesignSession } from "@/services/designSession/types";

/**
 * Preference form → live semantic match → hands off to /swipe.
 *
 * This is the swipe deck's entry point: pick styles + a location, submit,
 * and the top results from /api/v1/match/semantic land in useMatchStore
 * for /swipe to render as a card deck. No local/fake fallback — the
 * honesty gate (data.query_info?.graphSource !== "live" means "say so,"
 * never dress up demo artists as real matches) lives here.
 *
 * Design-session handoff: arriving as /smart-match?ds=<sessionId> loads the
 * completed session's brief, pre-selects the mapped style pills, enriches the
 * semantic query with the brief's placement + meaning, and auto-runs the
 * search — the user can still edit and re-run. A missing or errored session
 * falls back silently to the blank form. The "ds" param threads onward to
 * /swipe so the booking eventually carries designSessionId.
 *
 * Style-signal handoff: sessionless surfaces (a saved design's detail page,
 * the AR mirror) arrive as /smart-match?styles=<canonical,names> — those
 * pills come pre-selected but nothing auto-runs; the user still owns the
 * search. Garbage style names are dropped by parseStylesParam, never thrown.
 */

type Status = "idle" | "searching" | "error";

function StylePill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`text-[10px] uppercase tracking-[0.2em] border hairline px-3 py-2 press font-body shrink-0 ${
        active ? "bg-pink text-black border-pink" : "text-white/70 hover:text-black hover:bg-pink"
      }`}
    >
      {label}
    </button>
  );
}

export default function SmartMatchClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const designSessionId = searchParams.get("ds");
  const setMatches = useMatchStore((s) => s.setMatches);

  const [styles, setStyles] = useState<string[]>(() =>
    parseStylesParam(searchParams.get("styles"))
  );
  const [locationInput, setLocationInput] = useState("");
  // Placement + meaning lifted from the design brief; folded into the
  // semantic query so the vector search gets real signal, not just pills.
  const [briefContext, setBriefContext] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const toggleStyle = (style: string) => {
    setStyles((prev) =>
      prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]
    );
  };

  const runSearch = useCallback(
    async (opts: { styles: string[]; location: string; briefContext: string }) => {
      setStatus("searching");
      setErrorMsg("");

      try {
        const authHeaders = await getApiAuthHeaders();
        const location = opts.location.trim();

        const res = await fetch("/api/v1/match/semantic", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({
            query:
              [opts.briefContext, ...opts.styles, location].filter(Boolean).join(" ") ||
              "tattoo artist",
            style_preferences: opts.styles,
            location: location || null,
            max_results: 20,
          }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!data.success) throw new Error(data.error || "Matching failed");

        // Honesty gate — never let a demo-artist fallback masquerade as a
        // real match deck.
        if (data.query_info?.graphSource !== "live") {
          setStatus("error");
          setErrorMsg("The live artist graph is unreachable right now — we don't fake matches.");
          return;
        }

        const matches = (data.matches || []).map((m: {
          id: string; name: string; score: number; styles?: string[];
          location?: string; instagram?: string; bio?: string; reasoning?: string;
        }) => ({
          artistId: String(m.id),
          artistName: m.name,
          matchScore: m.score,
          tags: m.styles || [],
          styles: m.styles || [],
          location: m.location,
          instagramUrl: m.instagram,
          bio: m.bio,
          reasoning: m.reasoning,
        }));

        if (matches.length === 0) {
          setStatus("error");
          setErrorMsg("No artists match that combination yet — try fewer styles or a broader location.");
          return;
        }

        setMatches(matches);
        router.push(
          designSessionId ? `/swipe?ds=${encodeURIComponent(designSessionId)}` : "/swipe"
        );
      } catch (err) {
        console.error("[SmartMatch] Search failed:", err);
        setStatus("error");
        setErrorMsg(err instanceof Error ? err.message : "Search failed — try again.");
      }
    },
    [setMatches, router, designSessionId]
  );

  const handleSubmit = useCallback(
    () => runSearch({ styles, location: locationInput, briefContext }),
    [runSearch, styles, locationInput, briefContext]
  );

  // Design-session prefill: fetch the brief, map its ontology tags onto the
  // canonical pills, enrich the query, auto-run. Any failure (missing
  // session, no brief yet, network) falls back silently to the blank form.
  const prefillRan = useRef(false);
  useEffect(() => {
    if (!designSessionId || prefillRan.current) return;
    prefillRan.current = true;
    let cancelled = false;

    (async () => {
      try {
        const authHeaders = await getApiAuthHeaders();
        const res = await fetch(
          `/api/v1/design-session/${encodeURIComponent(designSessionId)}`,
          { headers: authHeaders }
        );
        if (!res.ok) return;
        const data = (await res.json()) as { session?: DesignSession } | null;
        const brief = data?.session?.brief;
        if (!brief || cancelled) return;

        const mappedStyles = canonicalStylesFromOntologyTags(brief.styleTags ?? []);
        const context = [brief.placement, brief.meaning].filter(Boolean).join(" ");
        setStyles(mappedStyles);
        setBriefContext(context);
        await runSearch({ styles: mappedStyles, location: "", briefContext: context });
      } catch (err) {
        // Silent fallback — the blank form still works without the brief.
        console.warn("[SmartMatch] Design-session prefill failed:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [designSessionId, runSearch]);

  return (
    <StudioShell>
      <div className="px-6 md:px-12 pt-6 pb-4 border-b hairline">
        <div className="max-w-3xl mx-auto text-[10px] uppercase tracking-[0.25em] text-white/50 tabular-nums font-body">
          <span className="text-pink">●</span>&nbsp;&nbsp;Step&nbsp;01/02 — Preferences
        </div>
      </div>

      <div className="px-6 md:px-12 py-16 md:py-20">
        <div className="max-w-3xl mx-auto">
          <SlashHeadline
            before="Find your"
            slashed="artist"
            sizeClassName="text-[48px] md:text-[72px] leading-[0.9]"
          />
          <p className="mt-3 text-[14px] text-white/60 font-body max-w-xl leading-[1.55]">
            Pick a few styles and a location. Real artists, ranked live from the graph — swipe through the top matches next.
          </p>

          <div className="mt-10 space-y-6 border-y-2 hairline py-6">
            <div>
              <span className="block text-[10px] uppercase tracking-[0.25em] text-pink font-body mb-3">
                Style
              </span>
              <div className="flex flex-wrap gap-2">
                {CANONICAL_STYLES.map((s) => (
                  <StylePill key={s} label={s} active={styles.includes(s)} onClick={() => toggleStyle(s)} />
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor="smart-match-location"
                className="block text-[10px] uppercase tracking-[0.25em] text-pink font-body mb-3"
              >
                Location (optional)
              </label>
              <input
                id="smart-match-location"
                type="text"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                placeholder="Any city…"
                className="bg-black text-white placeholder-white/30 focus:outline-none text-[10px] uppercase tracking-[0.2em] border hairline focus:border-pink px-3 py-3 font-body w-full max-w-xs"
              />
            </div>
          </div>

          {status === "error" && (
            <div className="mt-8 border-2 hairline p-6 text-center bg-pink/5">
              <p className="text-[12px] uppercase tracking-[0.2em] text-white/60 font-body">
                {errorMsg}
              </p>
            </div>
          )}

          <div className="mt-10">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={status === "searching"}
              className="w-full sm:w-auto text-[10px] uppercase tracking-[0.25em] bg-pink text-black px-8 py-4 press font-body disabled:opacity-50"
            >
              {status === "searching" ? "Matching…" : "Find Artists ▸"}
            </button>
          </div>
        </div>
      </div>
    </StudioShell>
  );
}
