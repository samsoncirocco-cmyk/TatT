"use client";

import { useState } from "react";
import Link from "next/link";
import { useUser } from "@/lib/tattStorage";
import { createShare, isNoLinkCode, ShareRequestError } from "../services/shareApi";

/**
 * "Share" — the only way a user creates a share link.
 *
 * Takes a list of cuts rather than one, because both callers are really the
 * same action on a different-sized selection: /designs/[id] shares the one
 * design it is about, and the Forge shares whichever of the four cuts the
 * user ticked. Either way it mints ONE link holding the whole set — a share
 * is an artifact you send a friend, so N picks must not mean N links.
 *
 * The share endpoint is Firebase-auth gated, so a signed-out visitor gets a
 * sign-in route instead of a button that would fail on press.
 *
 * The one rule this component exists to hold: a link is rendered only when
 * the API actually returned one. The route answers 503 with no shareId when
 * it cannot persist, and createShare rejects on any response without a
 * usable link — so the "shared" branch below is unreachable without a real,
 * openable URL.
 *
 * Punk system: hairline ghost button (each host page's one tape CTA is
 * something else), Space Mono system labels in caps, pink accent, no radii,
 * no toast (the design system has no toast pattern — the panel is inline
 * and stays put).
 */

type ShareOutcome =
  | { phase: "sharing" }
  | { phase: "shared"; url: string }
  | { phase: "failed"; message: string; noLink: boolean };

/**
 * An outcome always belongs to the selection it came from. Keeping the two
 * together is what stops a link minted for one set from sitting on screen
 * describing another — see `outcome` below. `null` is idle.
 */
type ShareState = { key: string; outcome: ShareOutcome } | null;

const BUTTON_CLASS =
  "text-[10px] uppercase tracking-[0.25em] border-2 hairline px-4 py-4 press font-body inline-flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-white/70";

export default function ShareDesignAction({
  imageUrls,
  prompt,
  redirectTo,
  emptyHint = "No cut on this design yet — nothing to share.",
  className = "",
}: {
  /**
   * The cuts to share, cover first. Empty means there is nothing to share —
   * a placeholder design, or a Forge selection the user has not made yet.
   */
  imageUrls: string[];
  prompt: string;
  /** Where to come back to after signing in. */
  redirectTo: string;
  /** Why the button is disabled when `imageUrls` is empty. */
  emptyHint?: string;
  className?: string;
}) {
  const { user, hydrated } = useUser();
  const [state, setState] = useState<ShareState>(null);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const signedOut = hydrated && !user;
  const count = imageUrls.length;
  /** Identity of the current selection. */
  const selectionKey = imageUrls.join(" ");

  /**
   * What to show. Change the selection and a link minted for the old one no
   * longer describes what is ticked, so it stops being shown: a link that
   * claims to hold a set nobody selected is the same class of lie as a link
   * that was never created. Derived rather than reset, which also means
   * undoing a change brings the still-valid link back.
   */
  const outcome = state && state.key === selectionKey ? state.outcome : null;

  const share = async () => {
    if (count === 0 || outcome?.phase === "sharing") return;
    const key = selectionKey;
    setState({ key, outcome: { phase: "sharing" } });
    setCopied(false);
    setCopyFailed(false);
    try {
      const { shareUrl } = await createShare({ imageUrls, prompt });
      setState({ key, outcome: { phase: "shared", url: shareUrl } });
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Sharing is temporarily unavailable.";
      const noLink = e instanceof ShareRequestError && isNoLinkCode(e.code);
      setState({ key, outcome: { phase: "failed", message, noLink } });
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
          disabled={count === 0 || outcome?.phase === "sharing"}
          title={count === 0 ? emptyHint : undefined}
          className={`${BUTTON_CLASS} text-white/70 hover:text-black hover:bg-pink`}
        >
          {outcome?.phase === "sharing"
            ? "Minting link…"
            : outcome?.phase === "failed"
              ? "▸ Try share again"
              : count > 1
                ? `▸ Share ${count} cuts`
                : "▸ Share this cut"}
        </button>
      )}

      {count === 0 && !signedOut && (
        <p className="mt-3 text-[10px] uppercase tracking-[0.2em] text-white/40 font-body">
          {emptyHint}
        </p>
      )}

      {outcome?.phase === "sharing" && (
        <p
          className="mt-3 text-[10px] uppercase tracking-[0.22em] text-pink font-body"
          role="status"
        >
          ● Minting a durable link…
        </p>
      )}

      {outcome?.phase === "shared" && (
        <div className="mt-4 border-2 hairline p-4" role="status">
          <div className="text-[10px] uppercase tracking-[0.28em] text-pink mb-3 font-body">
            ▸ Share link{count > 1 ? ` · ${count} cuts` : ""}
          </div>
          <div className="flex items-stretch border hairline-white">
            <input
              readOnly
              value={outcome.url}
              aria-label="Share link"
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 min-w-0 bg-black text-white/80 font-body text-[11px] px-3 py-3 focus:outline-none focus:text-white"
            />
            <button
              type="button"
              onClick={() => copy(outcome.url)}
              className="border-l hairline-white px-4 text-[10px] uppercase tracking-[0.2em] font-body text-white/70 hover:text-black hover:bg-pink press shrink-0"
            >
              {copied ? "Copied ✓" : "Copy"}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] uppercase tracking-[0.2em] font-body">
            <a
              href={outcome.url}
              target="_blank"
              rel="noreferrer"
              className="text-white/60 hover:text-pink"
            >
              ▸ Open link
            </a>
            <span className="text-white/40">
              {count > 1
                ? `Anyone with the link can see all ${count} cuts`
                : "Anyone with the link can see this cut"}
            </span>
          </div>
          {copyFailed && (
            <p className="mt-3 text-[10px] uppercase tracking-[0.2em] text-pink font-body">
              Copy blocked by the browser — select the link above instead.
            </p>
          )}
        </div>
      )}

      {outcome?.phase === "failed" && (
        <div
          className="mt-4 border-2 border-pink p-4 text-[10px] uppercase tracking-[0.22em] leading-[1.7] text-pink font-body"
          role="alert"
        >
          {outcome.message}
          {outcome.noLink && (
            <span className="block text-white/50">
              No link was created — there is nothing to copy yet.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
