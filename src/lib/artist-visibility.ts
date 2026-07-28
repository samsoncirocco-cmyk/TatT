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

/** The shared predicate for roster, profile, homepage, and match reads. */
export const PUBLIC_ARTIST_CLAUSE =
  `(${NOT_REMOVED_CLAUSE}) AND (${NOT_STALE_CLAUSE}) AND (${LOOKS_BOOKABLE_CLAUSE})`;
