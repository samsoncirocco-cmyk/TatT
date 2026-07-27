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
  const claimed =
    typeof artist.claimedByUid === "string" && artist.claimedByUid.length > 0;
  return claimed ? images : [];
}
