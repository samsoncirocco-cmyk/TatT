/**
 * Server-side accessors over the live Neo4j artist graph (10,427 real
 * artists) for the /artists roster + profile pages.
 *
 * Server components call these, which hit the driver via
 * executeServerCypherQuery (pattern introduced with the retired /matches
 * page, PR #46). The dataset never ships to the client — pages pass down
 * only the current page of plain rows.
 *
 * Query-shaping helpers (buildRosterFilter, rosterPageWindow) are pure
 * and unit-tested; the fetchers import the driver path lazily so this
 * module stays importable in tests without touching Neo4j.
 */
import { artistSlug } from "@/lib/artist-slug";
import { PUBLIC_ARTIST_CLAUSE } from "@/lib/artist-visibility";
import {
  IG_PERMALINK_CYPHER,
  filterPermalinksForDisplay,
  filterPortfolioForDisplay,
  igEmbedsEnabled,
  unclaimedPortfolioDisplayEnabled,
} from "@/lib/portfolio-display";
import { CANONICAL_STYLES, styleMatchVariants } from "@/lib/style-vocabulary";

export const ROSTER_PAGE_SIZE = 24;

/**
 * Roster filter chips. This used to be a copy-paste of CANONICAL_STYLES and
 * had drifted into the same dead filters (/artists?style=Script matched
 * nothing). It is the one vocabulary now — see src/lib/style-vocabulary.
 */
export const ROSTER_STYLES = CANONICAL_STYLES;

export type RosterArtist = {
  id: string;
  slug: string;
  name: string;
  shopName: string | null;
  city: string | null;
  state: string | null;
  location: string;
  styles: string[];
  instagram: string | null;
  rating: number | null;
  reviewCount: number | null;
  /** Self-hosted portfolio image URLs (public GCS), written by
   *  scripts/host-artist-images.mjs. Empty when the artist has no hosted work
   *  — or when the SHOW_UNCLAIMED_PORTFOLIOS kill switch withholds them for
   *  an unclaimed artist (src/lib/portfolio-display). */
  portfolioImages: string[];
  /** Instagram post permalinks for the embed tier (TAT-40). Non-empty only
   *  when ENABLE_IG_EMBEDS=true AND the artist is unclaimed
   *  (filterPermalinksForDisplay). Rendered as official Instagram embeds on
   *  the profile page ONLY — card grids never mount iframes. */
  portfolioPermalinks: string[];
};

export type RosterPage = {
  artists: RosterArtist[];
  total: number;
  page: number;
  pageCount: number;
};

export type RosterFilter = {
  /** Free-text search over name / city / shop (case-insensitive). */
  q?: string;
  /** Exact style name (case-insensitive) from ROSTER_STYLES. */
  style?: string;
  /** Only artists whose profile would actually display portfolio work under
   *  the current display policy (src/lib/portfolio-display) — never raw
   *  scraped rows the kill switch withholds. */
  hasPortfolio?: boolean;
};

/**
 * Build the shared WHERE clause + params for roster queries.
 * `styles` must already be collected into scope when the clause runs.
 */
export function buildRosterFilter(
  filter: RosterFilter,
  env: Record<string, string | undefined> = process.env,
): {
  where: string;
  params: {
    q: string | null;
    styleVariants: string[];
    hasPortfolio: boolean;
    igPermalinkPattern: string;
  };
} {
  const q = filter.q?.trim() || null;
  const style = filter.style?.trim() || null;
  const hasPortfolio = !!filter.hasPortfolio;
  // Every spelling the graph may store this style under. An unrecognized
  // style yields an empty list, and `size(...) > 0 AND ...` then matches
  // nothing — a filter nobody can satisfy must return nothing, not everyone.
  const styleVariants = style ? styleMatchVariants(style) : [];
  // What hasPortfolio means must track what the display policy will actually
  // render (src/lib/portfolio-display), or a filtered roster fills with
  // image-less cards. Same env-driven policy, expressed in Cypher:
  //   - kill switch on (default): stored images count, claimed or not;
  //   - kill switch off: unclaimed artists' scraped images are withheld, so
  //     only claimed artists' images count — plus, once the embed tier is on,
  //     an unclaimed artist with at least one canonical IG permalink (the
  //     shape filterPermalinksForDisplay would keep).
  const hasImages = "(a.portfolioImages IS NOT NULL AND size(a.portfolioImages) > 0)";
  const isClaimed = "(a.claimedByUid IS NOT NULL AND a.claimedByUid <> '')";
  const hasEmbeddablePermalink =
    "any(p IN coalesce(a.portfolioPermalinks, []) WHERE trim(toString(p)) =~ $igPermalinkPattern)";
  const displaysPortfolio = unclaimedPortfolioDisplayEnabled(env)
    ? hasImages
    : igEmbedsEnabled(env)
      ? `((${isClaimed} AND ${hasImages}) OR (NOT ${isClaimed} AND ${hasEmbeddablePermalink}))`
      : `(${isClaimed} AND ${hasImages})`;
  // Leads the clause and is not conditional on any filter: an artist who asked
  // to be removed must be absent from every roster read, not merely from the
  // unfiltered one. See docs/adr/0025.
  const where = `
    ${PUBLIC_ARTIST_CLAUSE}
    AND ($q IS NULL
      OR toLower(coalesce(a.name, '')) CONTAINS toLower($q)
      OR toLower(coalesce(a.city, '')) CONTAINS toLower($q)
      OR toLower(coalesce(a.shopName, '')) CONTAINS toLower($q))
    AND (${style === null ? "true" : "size($styleVariants) > 0 AND any(s IN styles WHERE toLower(s) IN $styleVariants)"})
    AND (NOT $hasPortfolio OR ${displaysPortfolio})`;
  return {
    where,
    params: { q, styleVariants, hasPortfolio, igPermalinkPattern: IG_PERMALINK_CYPHER },
  };
}

/** Clamp a raw page value to [1, ∞) and derive the Cypher skip window. */
export function rosterPageWindow(
  rawPage: unknown,
  pageSize: number = ROSTER_PAGE_SIZE,
): { page: number; skip: number; limit: number } {
  const n = Number(rawPage);
  const page = Number.isFinite(n) && n >= 1 ? Math.trunc(n) : 1;
  return { page, skip: (page - 1) * pageSize, limit: pageSize };
}

/**
 * Map one graph record onto a RosterArtist. Exported for tests (pure, like
 * buildRosterFilter): this is the seam where the SHOW_UNCLAIMED_PORTFOLIOS
 * kill switch is applied, and mocking the driver around Promise.all is
 * flakier than testing the mapper directly.
 */
export function toRosterArtist(record: any): RosterArtist {
  const id = String(record.id);
  const name = record.name ?? "";
  return {
    id,
    slug: artistSlug(name, id),
    name,
    shopName: record.shopName ?? null,
    city: record.city ?? null,
    state: record.state ?? null,
    location:
      [record.city, record.state].filter(Boolean).join(", ") || "Location unknown",
    styles: record.styles ?? [],
    instagram: record.instagram ?? null,
    rating: record.rating ?? null,
    reviewCount: record.reviewCount ?? null,
    // The kill-switch gate (TAT-31): scraped images are withheld here, at the
    // one seam every roster surface reads through, when the switch is off and
    // the artist has not claimed the profile.
    portfolioImages: filterPortfolioForDisplay(record),
    // The embed tier (TAT-40): permalinks pass only for unclaimed artists
    // and only while ENABLE_IG_EMBEDS=true — [] otherwise, so this field is
    // inert until the flag is deliberately flipped.
    portfolioPermalinks: filterPermalinksForDisplay(record),
  };
}

async function runServerQuery(query: string, params: Record<string, any>) {
  const { executeServerCypherQuery } = await import(
    "@/features/match-pulse/services/neo4jService"
  );
  return executeServerCypherQuery(query, params);
}

/**
 * One page of the roster, ordered by review volume (shop-level) then
 * name for deterministic pagination.
 */
export async function browseArtists(
  filter: RosterFilter,
  rawPage?: unknown,
): Promise<RosterPage> {
  const { where, params } = buildRosterFilter(filter);
  const { page, skip, limit } = rosterPageWindow(rawPage);

  const countQuery = `
    MATCH (a:Artist)
    OPTIONAL MATCH (a)-[:SPECIALIZES_IN]->(st:Style)
    WITH a, collect(DISTINCT st.name) AS styles
    WHERE ${where}
    RETURN count(a) AS total
  `;

  const pageQuery = `
    MATCH (a:Artist)
    OPTIONAL MATCH (a)-[:SPECIALIZES_IN]->(st:Style)
    WITH a, collect(DISTINCT st.name) AS styles
    WHERE ${where}
    RETURN
      a.id AS id,
      a.name AS name,
      a.shopName AS shopName,
      a.city AS city,
      a.state AS state,
      styles AS styles,
      a.instagram AS instagram,
      a.rating AS rating,
      a.reviewCount AS reviewCount,
      a.portfolioImages AS portfolioImages,
      a.portfolioPermalinks AS portfolioPermalinks,
      a.claimedByUid AS claimedByUid
    ORDER BY coalesce(a.reviewCount, 0) DESC, a.name ASC, a.id ASC
    SKIP toInteger($skip) LIMIT toInteger($limit)
  `;

  const [countRecords, pageRecords] = await Promise.all([
    runServerQuery(countQuery, params),
    runServerQuery(pageQuery, { ...params, skip, limit }),
  ]);

  const total = countRecords[0]?.total ?? 0;
  return {
    artists: pageRecords.map(toRosterArtist),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / ROSTER_PAGE_SIZE)),
  };
}

/**
 * Single artist by graph id (`artist_*`); null when absent or graph is down.
 *
 * A taken-down artist reads as absent — this backs the public profile page and
 * /book, so it must not resolve for someone who asked to be removed.
 */
export async function getRosterArtistById(id: string): Promise<RosterArtist | null> {
  const query = `
    MATCH (a:Artist {id: $id})
    WHERE ${PUBLIC_ARTIST_CLAUSE}
    OPTIONAL MATCH (a)-[:SPECIALIZES_IN]->(st:Style)
    WITH a, collect(DISTINCT st.name) AS styles
    RETURN
      a.id AS id,
      a.name AS name,
      a.shopName AS shopName,
      a.city AS city,
      a.state AS state,
      styles AS styles,
      a.instagram AS instagram,
      a.rating AS rating,
      a.reviewCount AS reviewCount,
      a.portfolioImages AS portfolioImages,
      a.portfolioPermalinks AS portfolioPermalinks,
      a.claimedByUid AS claimedByUid
    LIMIT 1
  `;
  const records = await runServerQuery(query, { id });
  return records.length ? toRosterArtist(records[0]) : null;
}

/** Normalize an instagram handle ("@foo", url, "foo/") to a profile URL. */
export function instagramUrl(handle: string | null | undefined): string | null {
  if (!handle) return null;
  const clean = handle
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/^@/, "")
    .replace(/\/.*$/, "");
  return clean ? `https://instagram.com/${clean}` : null;
}
