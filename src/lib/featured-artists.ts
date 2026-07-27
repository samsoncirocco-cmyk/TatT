/**
 * The homepage "Featured artists" grid, gated on takedown suppression.
 *
 * ## Why this module exists
 *
 * `src/data/featured-artists.json` is a committed snapshot produced by
 * `scripts/pick-featured-artists.mjs`. It was read straight into the homepage,
 * and **no database filter reached it** — so a completed takedown left the
 * removed artist on the most prominent surface of the site until somebody
 * remembered to re-run a script and redeploy. ADR 0025 flagged this as a known
 * gap and the executor prints a warning about it; a warning is not a mechanism.
 *
 * ## Why the curated file is kept rather than replaced with a live query
 *
 * The four cards are an *editorial* choice — one artist per state, ordered by
 * review volume, hand-checkable before it ships. Deriving them live would make
 * the homepage's most visible section depend on Neo4j being up at request time,
 * and would let a data refresh silently swap who TatT promotes. Curation stays.
 *
 * What changes is that the curated list is now a **candidate** list. Every
 * render asks the graph which of those candidates may still be published, and
 * anyone the graph does not vouch for is dropped.
 *
 * ## Fail closed
 *
 * The gate returns *permission to publish*, never *permission to suppress*. A
 * Neo4j outage yields an empty allow-list, so the grid empties rather than
 * republishing someone who asked to be removed. This mirrors the ingest gate in
 * `scripts/lib/takedown-tombstone.mjs` and ADR 0025 §4 — losing four cards is
 * far cheaper than breaking a removal promise, and the section degrades to the
 * "Browse artists" link that already sits beside it.
 *
 * This is why the check is a single query. Two queries (visible-artists, then
 * tombstones) would fail *open* on the second: `executeServerCypherQuery`
 * swallows errors and returns `[]`, and an empty tombstone list reads as
 * "nobody is tombstoned". Everything the gate needs is asked for at once, so an
 * error can only ever shrink the result.
 *
 * ## What disqualifies an artist
 *
 * - `a.removedAt` is set — a scope=all takedown was executed.
 * - Any `:TakedownTombstone` matches their id or Instagram handle, **including
 *   a scope=images one**. The grid is promotion, not a listing: someone who
 *   asked us to stop using their photographs should not be TatT's shop window,
 *   even if they were content to remain in the roster.
 * - They are no longer in the graph at all.
 *
 * A *pending* takedown request deliberately does **not** disqualify anyone. The
 * request route is public and unauthenticated by design (ADR 0025 §6), so
 * honouring unactioned requests here would let any stranger knock any artist
 * off the homepage. Only removals a human has actually executed count.
 */
import featuredData from "@/data/featured-artists.json";
import { tombstoneKeysFor } from "@/lib/takedown";

export type FeaturedArtist = {
  id: string;
  name: string;
  city: string;
  state: string;
  styles: string[];
  instagram: string;
  rating: number;
  reviewCount: number;
};

/** The editorial snapshot. Candidates only — never rendered unfiltered. */
export const CURATED_FEATURED: FeaturedArtist[] = featuredData.artists as FeaturedArtist[];

/**
 * The identifiers the graph must be asked about for one candidate.
 *
 * Reuses `tombstoneKeysFor` so the keys checked here are exactly the keys the
 * executor writes — if the two ever drift, the gate silently stops matching,
 * which is the failure this shares a function to prevent.
 */
export function candidateKeys(artist: FeaturedArtist): { id: string; keys: string[] } {
  return {
    id: artist.id,
    keys: tombstoneKeysFor({ artistId: artist.id, instagram: artist.instagram }).map((k) => k.key),
  };
}

/**
 * Keep only the candidates the graph explicitly vouched for, in curated order.
 *
 * Pure, so the fail-closed behaviour is testable without a driver: an empty or
 * partial `allowedIds` can only ever remove cards.
 */
export function retainPublishable(
  candidates: readonly FeaturedArtist[],
  allowedIds: Iterable<string>,
): FeaturedArtist[] {
  const allowed = new Set(allowedIds);
  return candidates.filter((a) => allowed.has(a.id));
}

/**
 * Ask the graph which candidates are still publishable.
 *
 * Returns ids, not artists — the rendered content stays the reviewed snapshot,
 * and the graph's only power over the homepage is to take a card away.
 */
export const PUBLISHABLE_FEATURED_CYPHER = `
  UNWIND $candidates AS c
  MATCH (a:Artist {id: c.id})
  WHERE a.removedAt IS NULL
    AND coalesce(a.stale, false) = false
    AND coalesce(a.looksBookable, true) = true
  OPTIONAL MATCH (t:TakedownTombstone)
  WHERE t.key IN c.keys
  WITH a, count(t) AS tombstones
  WHERE tombstones = 0
  RETURN a.id AS id
`;

async function runServerQuery(query: string, params: Record<string, unknown>) {
  const { executeServerCypherQuery } = await import(
    "@/features/match-pulse/services/neo4jService"
  );
  return executeServerCypherQuery(query, params);
}

/**
 * The homepage grid: curated candidates minus anyone the graph suppresses.
 *
 * May legitimately return fewer than four artists, or none. Callers must render
 * that honestly rather than backfilling — a short grid is the correct output
 * when someone has been removed.
 */
export async function getFeaturedArtists(
  candidates: readonly FeaturedArtist[] = CURATED_FEATURED,
): Promise<FeaturedArtist[]> {
  if (!candidates.length) return [];

  const records = await runServerQuery(PUBLISHABLE_FEATURED_CYPHER, {
    candidates: candidates.map(candidateKeys),
  });

  const allowedIds = records
    .map((r: { id?: unknown }) => (typeof r?.id === "string" ? r.id : null))
    .filter((id): id is string => Boolean(id));

  return retainPublishable(candidates, allowedIds);
}
