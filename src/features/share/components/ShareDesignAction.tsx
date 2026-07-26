"use client";

import { useState } from "react";
import Link from "next/link";
import { useUser } from "@/lib/tattStorage";
import { createShare, isNoLinkCode, ShareRequestError } from "../services/shareApi";

/**
 * "Share this cut" — the only way a user creates a share link.
 *
 * Lives on /designs/[id] (the design's canonical single view). The share
 * endpoint is Firebase-auth gated, so a signed-out visitor gets a sign-in
 * route instead of a button that would fail on press.
 *
 * The one rule this component exists to hold: a link is rendered only when
 * the API actually returned one. The route answers 503 with no shareId when
 * it cannot persist, and createShare rejects on any response without a
 * usable link — so the "shared" branch below is unreachable without a real,
 * openable URL.
 *
 * Punk system: hairline ghost button (the page's one tape CTA is "Iterate"),
 * Space Mono system labels in caps, pink accent, no radii, no toast (the
 * design system has no toast pattern — the panel is inline and stays put).
 */

type ShareState =
  | { phase: "idle" }
  | { phase: "sharing" }
  | { phase: "shared"; url: string }
  | { phase: "failed"; message: string; noLink: boolean };

const BUTTON_CLASS =
  "text-[10px] uppercase tracking-[0.25em] border-2 hairline px-4 py-4 press font-body inline-flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-white/70";

export default function ShareDesignAction({
  imageUrl,
  prompt,
  redirectTo,
  className = "",
}: {
  /** The generated cut. Absent on placeholder designs — nothing to share. */
  imageUrl?: string;
  prompt: string;
  /** Where to come back to after signing in. */
  redirectTo: string;
  className?: string;
}) {
  const { user, hydrated } = useUser();
  const [state, setState] = useState<ShareState>({ phase: "idle" });
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const signedOut = hydrated && !user;

  const share = async () => {
    if (!imageUrl || state.phase === "sharing") return;
    setState({ phase: "sharing" });
    setCopied(false);
    setCopyFailed(false);
    try {
      const { shareUrl } = await createShare({ imageUrl, prompt });
      setState({ phase: "shared", url: shareUrl });
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Sharing is temporarily unavailable.";
      const noLink = e instanceof ShareRequestError && isNoLinkCode(e.code);
      setState({ phase: "failed", message, noLink });
    }
  };

  const copy = async (url: string) => {
    setCopyFailed(false);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard is blocked (insecure context, denied permission). Say so —
      // a silent no-op reads exactly like a successful copy.
      setCopyFailed(true);
    }
  };

  return (
    <div className={className}>
      {signedOut ? (
        <Link
          href={`/login?redirect=${encodeURIComponent(redirectTo)}`}
          className={`${BUTTON_CLASS} text-white/70 hover:text-black hover:bg-pink`}
        >
          ▸ Sign in to share
        </Link>
      ) : (
        <button
          type="button"
          onClick={share}
          disabled={!imageUrl || state.phase === "sharing"}
          title={!imageUrl ? "This design has no cut to share yet" : undefined}
          className={`${BUTTON_CLASS} text-white/70 hover:text-black hover:bg-pink`}
        >
          {state.phase === "sharing"
            ? "Minting link…"
            : state.phase === "failed"
              ? "▸ Try share again"
              : "▸ Share this cut"}
        </button>
      )}

      {!imageUrl && !signedOut && (
        <p className="mt-3 text-[10px] uppercase tracking-[0.2em] text-white/40 font-body">
          No cut on this design yet — nothing to share.
        </p>
      )}

      {state.phase === "sharing" && (
        <p
          className="mt-3 text-[10px] uppercase tracking-[0.22em] text-pink font-body"
          role="status"
        >
          ● Minting a durable link…
        </p>
      )}

      {state.phase === "shared" && (
        <div className="mt-4 border-2 hairline p-4" role="status">
          <div className="text-[10px] uppercase tracking-[0.28em] text-pink mb-3 font-body">
            ▸ Share link
          </div>
          <div className="flex items-stretch border hairline-white">
            <input
              readOnly
              value={state.url}
              aria-label="Share link"
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 min-w-0 bg-black text-white/80 font-body text-[11px] px-3 py-3 focus:outline-none focus:text-white"
            />
            <button
              type="button"
              onClick={() => copy(state.url)}
              className="border-l hairline-white px-4 text-[10px] uppercase tracking-[0.2em] font-body text-white/70 hover:text-black hover:bg-pink press shrink-0"
            >
              {copied ? "Copied ✓" : "Copy"}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] uppercase tracking-[0.2em] font-body">
            <a
              href={state.url}
              target="_blank"
              rel="noreferrer"
              className="text-white/60 hover:text-pink"
            >
              ▸ Open link
            </a>
            <span className="text-white/40">Anyone with the link can see this cut</span>
          </div>
          {copyFailed && (
            <p className="mt-3 text-[10px] uppercase tracking-[0.2em] text-pink font-body">
              Copy blocked by the browser — select the link above instead.
            </p>
          )}
        </div>
      )}

      {state.phase === "failed" && (
        <div
          className="mt-4 border-2 border-pink p-4 text-[10px] uppercase tracking-[0.22em] leading-[1.7] text-pink font-body"
          role="alert"
        >
          {state.message}
          {state.noLink && (
            <span className="block text-white/50">
              No link was created — there is nothing to copy yet.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
