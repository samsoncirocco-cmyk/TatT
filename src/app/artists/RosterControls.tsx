"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Search box + style chips for the /artists roster. Filters live in the
 * URL (?q=&style=&page=) so the server component re-queries the graph;
 * changing any filter resets to page 1.
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

  const submitSearch = () => {
    const trimmed = input.trim();
    if (trimmed !== q) apply({ q: trimmed });
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
          onChange={(e) => setInput(e.target.value)}
          onBlur={submitSearch}
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
                className={`text-[10px] uppercase tracking-[0.2em] border hairline px-3 py-2 press font-body shrink-0 ${
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
            className={`text-[10px] uppercase tracking-[0.2em] border hairline px-3 py-2 press font-body shrink-0 ${
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
                setInput("");
                apply({ q: "", style: "All", hasPortfolio: false });
              }}
              className="ml-auto text-[10px] uppercase tracking-[0.2em] text-white/40 hover:text-pink font-body shrink-0 press"
            >
              Clear&nbsp;✕
            </button>
          )}
        </div>
      </div>
    </>
  );
}
