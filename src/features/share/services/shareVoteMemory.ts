import { isShareVote, type ShareVote } from '@/lib/share-votes';

/**
 * One vote per browser (TAT-52). This is the whole dedupe mechanism, and
 * that is a deliberate posture, not an oversight: friend voting is
 * anonymous — no account, no fingerprint, no cookie soup — so the honest
 * ceiling on dedupe is "this browser remembers it already answered".
 * Clearing storage lets someone vote again; the per-IP rate limit on the
 * vote route is what keeps that from becoming a firehose. A group-chat poll
 * does not need election security.
 *
 * localStorage, keyed per shareId. Every call is wrapped: storage can be
 * absent (SSR) or throw (private browsing, full quota), and a poll must
 * never crash the page it lives on.
 */

const KEY_PREFIX = 'tatt:share-vote:';

export function recordedVote(shareId: string): ShareVote | null {
  try {
    const raw = window.localStorage.getItem(KEY_PREFIX + shareId);
    return isShareVote(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function rememberVote(shareId: string, vote: ShareVote): void {
  try {
    window.localStorage.setItem(KEY_PREFIX + shareId, vote);
  } catch {
    // Nowhere to remember it — the vote still counted server-side; worst
    // case this browser is offered the buttons again.
  }
}
