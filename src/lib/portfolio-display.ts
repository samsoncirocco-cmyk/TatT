/**
 * Kill switch for displaying scraped portfolio images (TAT-31 Phase 0).
 *
 * ~62k Instagram photos were scraped and re-hosted on GCS without the
 * artists' consent, and every portfolio surface renders them. Whether that
 * display continues is a counsel decision, not a code decision — so it has
 * to be one switch, not a hunt across render sites.
 *
 * `SHOW_UNCLAIMED_PORTFOLIOS` (server-side env, NOT `NEXT_PUBLIC_`):
 *   - unset / anything but "false"  → current behavior, images shown.
 *   - "false"                       → unclaimed artists' portfolio images
 *                                     are withheld everywhere this helper
 *                                     gates; components fall back to their
 *                                     existing no-image states.
 *
 * Claimed artists' images always pass: claiming the profile is what grants
 * the display license (the land-free model — the artist takes over the
 * profile and their own work rides with it). The claim binding is
 * `claimedByUid` on the `:Artist` node, written by /api/v1/connect/claim.
 *
 * This module must be applied SERVER-SIDE, where the image URLs leave the
 * graph (roster queries, match mappers). In a client bundle the flag reads
 * as unset and the helper passes images through — the gate is only real on
 * the server, which is where every mounted portfolio surface sources data.
 */

export type PortfolioDisplaySubject = {
  portfolioImages?: unknown;
  claimedByUid?: unknown;
  /** Instagram post permalinks (TAT-40), populated onto the :Artist node by a
   *  separate backfill. May be missing entirely — treated as "no permalinks". */
  portfolioPermalinks?: unknown;
};

/** Is displaying unclaimed artists' scraped portfolios enabled? Default: yes. */
export function unclaimedPortfolioDisplayEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.SHOW_UNCLAIMED_PORTFOLIOS !== "false";
}

/**
 * The one gate between an artist's stored portfolio and any render surface.
 *
 * Returns the artist's images unchanged while the switch is on (or for a
 * claimed artist regardless); returns [] for an unclaimed artist when the
 * switch is off. Also normalizes: non-array / non-string junk never leaves.
 */
export function filterPortfolioForDisplay(
  artist: PortfolioDisplaySubject,
  env: Record<string, string | undefined> = process.env,
): string[] {
  const images = Array.isArray(artist.portfolioImages)
    ? artist.portfolioImages.filter((u): u is string => typeof u === "string")
    : [];
  if (unclaimedPortfolioDisplayEnabled(env)) return images;
  return isClaimed(artist) ? images : [];
}

/**
 * Has a real person proved they own this profile (`claimedByUid`)? Exported
 * because the provenance label (ADR-0033) renders on exactly the profiles
 * this returns false for — one definition of "claimed", not two.
 */
export function isClaimed(artist: PortfolioDisplaySubject): boolean {
  return typeof artist.claimedByUid === "string" && artist.claimedByUid.length > 0;
}

/**
 * Instagram embed tier for unclaimed artists (TAT-40).
 *
 * `ENABLE_IG_EMBEDS` (server-side env, NOT `NEXT_PUBLIC_`):
 *   - unset / anything but "true" → no permalinks leave the server; every
 *     surface behaves exactly as before this tier existed.
 *   - "true"                      → unclaimed artists' Instagram permalinks
 *     flow through to render surfaces, where the profile page (and only
 *     the profile page — card grids never mount iframes) renders official
 *     Instagram embeds instead of hosted scraped copies.
 *
 * Default is OFF so shipping this code changes nothing user-visible until
 * the flag is deliberately flipped.
 */
export function igEmbedsEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.ENABLE_IG_EMBEDS === "true";
}

/** Canonical Instagram post/reel/tv permalink, or null for anything else. */
const IG_PERMALINK = /^https?:\/\/(?:www\.)?instagram\.com\/(p|reel|tv)\/([A-Za-z0-9_-]+)\/?/i;

/**
 * The one gate between an artist's stored Instagram permalinks and any
 * render surface (TAT-40, parallel to filterPortfolioForDisplay above).
 *
 * Returns permalinks only when ALL of:
 *   - the embed tier is enabled (`ENABLE_IG_EMBEDS=true`), and
 *   - the artist is UNCLAIMED — a claimed artist's licensed hosted images
 *     are the display; their profile never falls back to embeds.
 *
 * Everything returned is normalized to `https://www.instagram.com/<kind>/<code>/`
 * so junk in the graph can never reach an embed blockquote. Missing/empty
 * `portfolioPermalinks` (the backfill may not have run) degrades to [].
 *
 * Permalinks only — never cached media. Rendering goes through Instagram's
 * official embed.js so the media stays served by Meta (the legal point of
 * this tier; see docs/legal/artist-data-counsel-notes.md).
 */
export function filterPermalinksForDisplay(
  artist: PortfolioDisplaySubject,
  env: Record<string, string | undefined> = process.env,
): string[] {
  if (!igEmbedsEnabled(env) || isClaimed(artist)) return [];
  if (!Array.isArray(artist.portfolioPermalinks)) return [];
  const out: string[] = [];
  for (const raw of artist.portfolioPermalinks) {
    if (typeof raw !== "string") continue;
    const m = IG_PERMALINK.exec(raw.trim());
    if (!m) continue;
    const canonical = `https://www.instagram.com/${m[1].toLowerCase()}/${m[2]}/`;
    if (!out.includes(canonical)) out.push(canonical);
  }
  return out;
}
