/**
 * Server-side accessors over the live Neo4j artist graph (10,427 real
 * artists) for the /artists roster + profile pages.
 *
 * Same pattern as /matches (PR #46): server components call these, which
 * hit the driver via executeServerCypherQuery. The dataset never ships
 * to the client — pages pass down only the current page of plain rows.
 *
 * Query-shaping helpers (buildRosterFilter, rosterPageWindow) are pure
 * and unit-tested; the fetchers import the driver path lazily so this
 * module stays importable in tests without touching Neo4j.
 */
import { artistSlug } from "@/lib/artist-slug";

export const ROSTER_PAGE_SIZE = 24;

/** Canonical style vocabulary of the live artist graph (matches /matches). */
export const ROSTER_STYLES = [
  "Traditional",
  "Neo-Traditional",
  "Black & Grey",
  "Blackwork",
  "Fine Line",
  "Realism",
  "Illustrative",
  "Japanese",
  "Watercolor",
  "Geometric",
  "Tribal",
  "Chicano",
  "Anime",
  "Minimalist",
  "Script",
] as const;

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
   *  scripts/host-artist-images.mjs. Empty when the artist has no hosted work. */
  portfolioImages: string[];
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
  /** Only artists with real self-hosted portfolio images (not the stale count). */
  hasPortfolio?: boolean;
};

/**
 * Build the shared WHERE clause + params for roster queries.
 * `styles` must already be collected into scope when the clause runs.
 */
export function buildRosterFilter(filter: RosterFilter): {
  where: string;
  params: { q: string | null; style: string | null; hasPortfolio: boolean };
} {
  const q = filter.q?.trim() || null;
  const style = filter.style?.trim() || null;
  const hasPortfolio = !!filter.hasPortfolio;
  const where = `
    ($q IS NULL
      OR toLower(coalesce(a.name, '')) CONTAINS toLower($q)
      OR toLower(coalesce(a.city, '')) CONTAINS toLower($q)
      OR toLower(coalesce(a.shopName, '')) CONTAINS toLower($q))
    AND ($style IS NULL OR any(s IN styles WHERE toLower(s) = toLower($style)))
    AND (NOT $hasPortfolio OR (a.portfolioImages IS NOT NULL AND size(a.portfolioImages) > 0))`;
  return { where, params: { q, style, hasPortfolio } };
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

function toRosterArtist(record: any): RosterArtist {
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
    portfolioImages: Array.isArray(record.portfolioImages) ? record.portfolioImages : [],
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
      a.portfolioImages AS portfolioImages
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

/** Single artist by graph id (`artist_*`); null when absent or graph is down. */
export async function getRosterArtistById(id: string): Promise<RosterArtist | null> {
  const query = `
    MATCH (a:Artist {id: $id})
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
      a.portfolioImages AS portfolioImages
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
