import { NOT_REMOVED_CLAUSE } from "@/lib/takedown";

/**
 * Public artist reads exclude profiles with repeated confirmed dead/private
 * refreshes. `coalesce` keeps every existing node visible until the refresh
 * workflow has explicit evidence; absence of a new field is not staleness.
 *
 * This is suppression, not deletion. A later confirmed-active refresh clears
 * `a.stale` and the artist becomes publishable again.
 */
export const NOT_STALE_CLAUSE = "coalesce(a.stale, false) = false";

/** Unknown/legacy verdicts remain visible; only an explicit rejection hides. */
export const LOOKS_BOOKABLE_CLAUSE = "coalesce(a.looksBookable, true) = true";

/**
 * A small, evidence-backed stopgap for known non-artists incorrectly imported
 * as artists. Keep this exact match only: independent shops deserve review,
 * not a name-based guess.
 *
 * Each entry was observed on the public /artists roster on 2026-08-03. The
 * refresh workflow remains the durable way to mark a profile
 * `looksBookable: false`; this merely prevents known bad legacy rows from
 * eroding customer trust while that review catches up.
 */
export const KNOWN_NON_ARTIST_NAMES = [
  "orangetheory",
  "panerabread",
  "thedrybar",
  "visionworks eyewear",
  "keep up to date with the shop",
  "join the email list",
  "our address:",
  "apprentice",
  "ad tools",
  "htc studios tempe campus",
] as const;

const KNOWN_NON_ARTIST_VALUES = KNOWN_NON_ARTIST_NAMES.map(
  (name) => `'${name}'`,
).join(", ");

/** Explicitly known bad rows never belong in public discovery. */
export const NOT_KNOWN_NON_ARTIST_CLAUSE = `NOT toLower(trim(coalesce(a.name, ''))) IN [${KNOWN_NON_ARTIST_VALUES}]`;

/** The shared predicate for roster, profile, homepage, and match reads. */
export const PUBLIC_ARTIST_CLAUSE = `(${NOT_REMOVED_CLAUSE}) AND (${NOT_STALE_CLAUSE}) AND (${LOOKS_BOOKABLE_CLAUSE}) AND (${NOT_KNOWN_NON_ARTIST_CLAUSE})`;
