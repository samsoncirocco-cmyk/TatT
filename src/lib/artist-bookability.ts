/**
 * The ADR-0043 two-tier gate: which scraped profiles may take a deposit.
 *
 * A scraped profile is BOOKABLE only with real tattoo evidence AND a contact
 * channel we have actually reached. Everything else stays visible for browsing
 * and matching but offers "request intro" instead of a deposit button.
 *
 * The default is browse-only, and that direction matters. Absence of a check is
 * not evidence of reachability — an unprobed shop is an unknown one, and taking
 * a deposit against an unknown is exactly the silent 7-day-refund failure
 * ADR-0043 exists to prevent. Every clause below therefore requires a positive
 * signal rather than tolerating a missing one, which is the opposite of the
 * visibility clauses in artist-visibility.ts (those `coalesce` to visible so an
 * un-audited profile is not punished). Visibility forgives missing data;
 * money does not.
 *
 * ## What "contact channel" means here, and why it is narrower than the ADR
 *
 * ADR-0043 names "Instagram, email, or phone". Measured against the live graph
 * on 2026-08-03 (19,634 artists), the reality is:
 *
 *   - email and phone do not exist on :Artist or :Shop at all — not sparse,
 *     absent. No property, no relationship, nowhere.
 *   - `instagram` is non-empty on 100% of artists, which makes it useless as a
 *     discriminator: a test everything passes is not a test. It also cannot be
 *     verified — Instagram serves the same login wall for a handle that does
 *     not exist as for one that does — and nothing in the codebase can deliver
 *     to a handle anyway (notifyArtistOfBooking sends email only).
 *   - the shop website IS present (96.6% of artists nationally) and IS
 *     verifiable over plain HTTP.
 *
 * So the shop website is the channel this gate uses. It is the only one of the
 * three that can be confirmed to work before we take somebody's money. An
 * Instagram handle may well be a fine way for a human to reach an artist; it is
 * just not evidence, and this gate deals only in evidence.
 *
 * `websiteLive` is written by scripts/classify-artist-bookability.mjs.
 */

/**
 * Real tattoo evidence: self-hosted portfolio images or Instagram post
 * permalinks. Deliberately NOT `bio` — every artist in the graph has one, and
 * they are templated ("Tattoo artist at {shop} in {city}, {state}."), so a bio
 * says nothing about whether this person tattoos.
 */
export const HAS_TATTOO_EVIDENCE_CLAUSE =
  "((a.portfolioImages IS :: LIST<ANY> AND size(a.portfolioImages) > 0) OR " +
  "(a.portfolioPermalinks IS :: LIST<ANY> AND size(a.portfolioPermalinks) > 0))";

/**
 * A contact channel confirmed reachable: a shop whose website answered an HTTP
 * request at the last check. `= true` rather than `coalesce(..., true)` — an
 * unprobed shop must not qualify. Also require a non-empty `website`: national
 * shop import can clear the URL without resetting `websiteLive`, and a live
 * flag with no URL is not a contact channel.
 */
export const HAS_REACHABLE_CONTACT_CLAUSE =
  "EXISTS { MATCH (a)-[:WORKS_AT|HAS_SHOP]->(sh:Shop) WHERE sh.websiteLive = true AND trim(coalesce(sh.website,'')) <> '' }";

/**
 * The bookable tier. Compose with PUBLIC_ARTIST_CLAUSE (artist-visibility) —
 * this gate decides deposit-vs-intro, not whether a profile is public at all.
 * A hidden artist is not bookable because they are not listed; that is
 * visibility's job, and duplicating it here would let the two drift.
 */
export const BOOKABLE_TIER_CLAUSE =
  `(${HAS_TATTOO_EVIDENCE_CLAUSE}) AND (${HAS_REACHABLE_CONTACT_CLAUSE})`;

/** Which action a profile surfaces. */
export type BookingTier = "bookable" | "browse-only";

export type BookabilitySubject = {
  portfolioImages?: unknown;
  portfolioPermalinks?: unknown;
  /**
   * Whether any shop this artist works at answered its last website probe.
   * Undefined means never probed, which is browse-only — see the module note.
   */
  shopWebsiteLive?: unknown;
};

const nonEmptyArray = (value: unknown): boolean =>
  Array.isArray(value) && value.length > 0;

/** Pure row-level mirror of {@link HAS_TATTOO_EVIDENCE_CLAUSE}. */
export function hasTattooEvidence(subject: BookabilitySubject): boolean {
  return (
    nonEmptyArray(subject.portfolioImages) ||
    nonEmptyArray(subject.portfolioPermalinks)
  );
}

/** Pure row-level mirror of {@link HAS_REACHABLE_CONTACT_CLAUSE}. */
export function hasReachableContact(subject: BookabilitySubject): boolean {
  return subject.shopWebsiteLive === true;
}

/**
 * The tier for one artist row. Pure, so the roster, the profile page, and the
 * booking route can all ask the same question without another graph round trip.
 */
export function bookingTier(subject: BookabilitySubject): BookingTier {
  return hasTattooEvidence(subject) && hasReachableContact(subject)
    ? "bookable"
    : "browse-only";
}

/** Convenience predicate for the surface that decides deposit vs intro. */
export function isBookable(subject: BookabilitySubject): boolean {
  return bookingTier(subject) === "bookable";
}
