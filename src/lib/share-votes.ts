/**
 * The vote vocabulary for shared designs (TAT-52) — the three answers a
 * friend can give to "should I get this?".
 *
 * Lives in its own module, NOT in shared-design-store.ts, because the store
 * imports firebase-admin and therefore can never be pulled into a client
 * bundle. The share page's vote buttons and the vote API route must agree on
 * these strings, so they both import from here.
 */

/** Stored keys — Firestore field names, so snake_case and dot-free. */
export const VOTE_OPTIONS = ['get_it', 'sleep_on_it', 'absolutely_not'] as const;

export type ShareVote = (typeof VOTE_OPTIONS)[number];

/** A complete tally: every option present, zero when nobody picked it. */
export type ShareVoteTally = Record<ShareVote, number>;

export function isShareVote(value: unknown): value is ShareVote {
  return typeof value === 'string' && (VOTE_OPTIONS as readonly string[]).includes(value);
}

/**
 * Normalise a stored (possibly partial, possibly absent) vote map into a
 * complete tally. Shares minted before voting existed have no `votes` field
 * at all, and a Firestore doc only grows a key the first time that option is
 * picked — every reader goes through here rather than trusting the shape.
 */
export function normalizeVoteTally(votes?: Partial<Record<string, unknown>> | null): ShareVoteTally {
  const tally = {} as ShareVoteTally;
  for (const option of VOTE_OPTIONS) {
    const n = votes?.[option];
    tally[option] = typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  }
  return tally;
}

/** Total ballots cast. */
export function totalVotes(tally: ShareVoteTally): number {
  return VOTE_OPTIONS.reduce((sum, option) => sum + tally[option], 0);
}
