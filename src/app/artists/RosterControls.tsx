"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/** Debounce delay (ms) before a typed search re-queries the live graph. */
export const SEARCH_DEBOUNCE_MS = 300;

/**
 * Search box + style chips for the /artists roster. Filters live in the
 * URL (?q=&style=&page=) so the server component re-queries the graph;
 * changing any filter resets to page 1.
 *
 * The search box debounces (SEARCH_DEBOUNCE_MS) so each keystroke doesn't
 * fire a fresh Neo4j query — it composes with the style/hasPortfolio pills,
 * which still apply instantly.
 */
export default function RosterControls({
  styles,
  q,
  style,
  hasPortfolio,
}: {
  styles: readonly string[];
  q: string;
  style: string;
  hasPortfolio: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [input, setInput] = useState(q);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Queries this component has pushed that haven't come back as `q` yet, in
  // push order. A single "last submitted" value can't tell a stale echo of the
  // user's own submit apart from genuine external navigation; the queue can,
  // because an echo is by definition a value we pushed.
  const pendingRef = useRef<string[]>([]);

  const cancelDebounce = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  };

  /** The query the URL is currently heading toward — our last push, or `q`. */
  const targetQuery = () =>
    pendingRef.current.length
      ? pendingRef.current[pendingRef.current.length - 1]
      : q;

  /** Record a query we are about to push so its echo isn't mistaken for navigation. */
  const pushPending = (value: string) => {
    pendingRef.current.push(value);
  };

  // Keep the box in sync when q changes. Navigations land in push order, so a
  // `q` we queued means every earlier queued push was superseded — drop them
  // all and leave the box alone. A `q` we never queued came from somewhere
  // else (back/forward, a link, a shared URL), so adopt it.
  useEffect(() => {
    const landed = pendingRef.current.indexOf(q);
    if (landed !== -1) {
      pendingRef.current.splice(0, landed + 1);
      return;
    }
    pendingRef.current = [];
    cancelDebounce();
    setInput(q);
  }, [q]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const apply = (next: { q?: string; style?: string; hasPortfolio?: boolean }) => {
    const params = new URLSearchParams(searchParams.toString());
    const nq = next.q ?? q;
    const nstyle = next.style ?? style;
    const nHasPortfolio = next.hasPortfolio ?? hasPortfolio;
    if (nq) params.set("q", nq);
    else params.delete("q");
    if (nstyle && nstyle !== "All") params.set("style", nstyle);
    else params.delete("style");
    if (nHasPortfolio) params.set("hasPortfolio", "1");
    else params.delete("hasPortfolio");
    params.delete("page");
    router.push(`/artists${params.size ? `?${params}` : ""}`);
  };

  const submitSearch = (value: string = input) => {
    cancelDebounce();
    const trimmed = value.trim();
    if (trimmed === targetQuery()) return;
    pushPending(trimmed);
    apply({ q: trimmed });
  };

  const handleChange = (value: string) => {
    setInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => submitSearch(value), SEARCH_DEBOUNCE_MS);
  };

  return (
    <>
      {/* SEARCH */}
      <div className="mt-10">
        <label
          htmlFor="search"
          className="block text-[10px] uppercase tracking-[0.28em] text-pink mb-3 font-body"
        >
          ▸ Search
        </label>
        <input
          id="search"
          type="text"
          value={input}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={() => submitSearch()}
          onKeyDown={(e) => {
            if (e.key === "Enter") submitSearch();
          }}
          placeholder="Name, city, or shop…"
          className="w-full bg-black text-white placeholder-white/30 focus:outline-none text-[20px] md:text-[24px] leading-[1.4] tracking-tight border-2 hairline focus:border-pink p-5 transition-colors font-display"
        />
      </div>

      {/* STICKY FILTER CHIPS */}
      <div className="mt-6 sticky top-0 z-10 -mx-6 md:-mx-12 px-6 md:px-12 py-3 bg-black/90 backdrop-blur-sm border-y hairline">
        <div className="flex items-center gap-3 overflow-x-auto">
          <span className="text-[10px] uppercase tracking-[0.25em] text-pink font-body shrink-0">
            Style
          </span>
          {["All", ...styles].map((s) => {
            const active = style === s || (s === "All" && !style);
            return (
              <button
                key={s}
                onClick={() => apply({ style: s })}
                className={`min-h-[44px] text-[10px] uppercase tracking-[0.2em] border hairline px-3 py-2 press font-body shrink-0 ${
                  active
                    ? "bg-pink text-black border-pink"
                    : "text-white/70 hover:text-black hover:bg-pink"
                }`}
              >
                {s}
              </button>
            );
          })}
          <button
            onClick={() => apply({ hasPortfolio: !hasPortfolio })}
            className={`min-h-[44px] text-[10px] uppercase tracking-[0.2em] border hairline px-3 py-2 press font-body shrink-0 ${
              hasPortfolio
                ? "bg-pink text-black border-pink"
                : "text-white/70 hover:text-black hover:bg-pink"
            }`}
          >
            Has&nbsp;photos
          </button>
          {(style || q || hasPortfolio) && (
            <button
              onClick={() => {
                cancelDebounce();
                setInput("");
                // Clear changes q too, so queue it like any other submit.
                if (targetQuery() !== "") pushPending("");
                apply({ q: "", style: "All", hasPortfolio: false });
              }}
              className="ml-auto min-h-[44px] text-[10px] uppercase tracking-[0.2em] text-white/40 hover:text-pink font-body shrink-0 press"
            >
              Clear&nbsp;✕
            </button>
          )}
        </div>
      </div>
    </>
  );
}
