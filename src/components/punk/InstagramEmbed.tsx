"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Official Instagram post embed (TAT-40, Instagram tier of the TAT-31
 * copyright remediation).
 *
 * Renders Meta's documented blockquote + embed.js pattern from a bare
 * permalink — no API call, no token, and critically NO cached media: the
 * photo is served by Instagram inside Instagram's own iframe, which is the
 * entire legal point of this tier. Never copy, proxy, or cache anything the
 * embed loads.
 *
 * Loading is lazy: embed.js (loaded once per page, shared by every instance)
 * is only fetched when the embed scrolls near the viewport, so a profile
 * with several embeds costs nothing off-screen.
 *
 * Failure state: if embed.js can't load or never processes the blockquote
 * (blocked network, deleted/private post rejected at process time), the
 * component renders `fallback` — the caller's existing no-image state —
 * never a dead blockquote. Until JS runs, the blockquote's anchor is a plain
 * link to the post, so SSR output is honest too. (A post deleted after
 * processing renders Instagram's own "not available" card inside the iframe;
 * that is outside our observability and is Instagram's UI, not a broken box.)
 */

const EMBED_JS_SRC = "https://www.instagram.com/embed.js";

/** How long after kickoff we wait for embed.js to upgrade the blockquote. */
const PROCESS_TIMEOUT_MS = 12_000;

/** Same canonical shape the server-side policy emits (portfolio-display). */
const IG_PERMALINK = /^https:\/\/www\.instagram\.com\/(p|reel|tv)\/[A-Za-z0-9_-]+\/$/;

declare global {
  interface Window {
    instgrm?: { Embeds?: { process?: () => void } };
  }
}

/** One in-flight/settled script load per page, shared by all instances. */
let embedScriptLoad: Promise<void> | null = null;

function loadEmbedScript(): Promise<void> {
  if (!embedScriptLoad) {
    embedScriptLoad = new Promise<void>((resolvePromise, rejectPromise) => {
      if (window.instgrm?.Embeds) {
        resolvePromise();
        return;
      }
      const script = document.createElement("script");
      script.src = EMBED_JS_SRC;
      script.async = true;
      script.onload = () => resolvePromise();
      script.onerror = () => {
        // Allow a later instance to retry rather than pinning the failure.
        embedScriptLoad = null;
        rejectPromise(new Error("instagram embed.js failed to load"));
      };
      document.body.appendChild(script);
    });
  }
  return embedScriptLoad;
}

type Props = {
  /** Canonical post permalink, e.g. https://www.instagram.com/p/Abc123/ */
  permalink: string;
  /** Rendered instead of the embed when it can't process — the caller's
   *  existing no-image state. Defaults to nothing. */
  fallback?: React.ReactNode;
  className?: string;
};

type Phase = "waiting" | "loading" | "embedded" | "failed";

export default function InstagramEmbed({ permalink, fallback = null, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("waiting");

  // Defense in depth: the server-side policy only emits canonical permalinks,
  // but never build an embed from anything else regardless.
  const valid = IG_PERMALINK.test(permalink);

  // Phase 1 — wait until the embed is near the viewport before paying for
  // embed.js. No IntersectionObserver (old browser) ⇒ load immediately.
  useEffect(() => {
    if (!valid || phase !== "waiting") return;
    const node = containerRef.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setPhase("loading");
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setPhase("loading");
          observer.disconnect();
        }
      },
      { rootMargin: "600px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [valid, phase]);

  // Phase 2 — load embed.js, ask it to process, and confirm the blockquote
  // actually upgraded (embed.js marks it instagram-media-rendered and mounts
  // an iframe). No upgrade within the window ⇒ the caller's fallback.
  useEffect(() => {
    if (!valid || phase !== "loading") return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let poll: ReturnType<typeof setInterval> | undefined;

    const settle = (next: Phase) => {
      if (cancelled) return;
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (poll) clearInterval(poll);
      setPhase(next);
    };

    loadEmbedScript()
      .then(() => {
        if (cancelled) return;
        window.instgrm?.Embeds?.process?.();
        poll = setInterval(() => {
          const node = containerRef.current;
          if (!node) return;
          const upgraded =
            node.querySelector("iframe") !== null ||
            node.querySelector("blockquote.instagram-media-rendered") !== null;
          if (upgraded) settle("embedded");
        }, 250);
        timer = setTimeout(() => settle("failed"), PROCESS_TIMEOUT_MS);
      })
      .catch(() => settle("failed"));

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (poll) clearInterval(poll);
    };
  }, [valid, phase]);

  if (!valid || phase === "failed") return <>{fallback}</>;

  return (
    <div ref={containerRef} className={className} data-testid="instagram-embed">
      <blockquote
        className="instagram-media"
        data-instgrm-permalink={permalink}
        data-instgrm-version="14"
        style={{ background: "#000", border: 0, margin: 0, padding: 0, width: "100%" }}
      >
        {/* Pre-processing / no-JS content: an honest link to the post. */}
        <a
          href={permalink}
          target="_blank"
          rel="noopener noreferrer"
          className="block px-4 py-6 text-center text-[10px] uppercase tracking-[0.22em] font-body text-white/60 hover:text-pink"
        >
          View this post on Instagram&nbsp;▸
        </a>
      </blockquote>
    </div>
  );
}
