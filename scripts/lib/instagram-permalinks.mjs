/**
 * instagram-permalinks.mjs — pure helpers for recovering Instagram post
 * permalinks from data already on disk (TAT-40, feeds the oEmbed embed tier
 * of the TAT-31 copyright remediation).
 *
 * NO network I/O and NO scraping happens here. The scraper's archived Apify
 * profiles (~/tatt-scraper/data/enrichment/instagram/apify-profiles/*.json)
 * retain the original cdninstagram source URLs, and roughly half carry an
 * `ig_cache_key` query param: a base64-encoded numeric media ID. Instagram
 * shortcodes are that same media ID re-encoded in a base64url alphabet, so
 * the canonical post URL (https://www.instagram.com/p/<shortcode>/) is
 * mechanically derivable — a decode, not a scrape.
 *
 * Alignment: scripts/host-artist-images.mjs uploaded images[n] (after its
 * normalizeRecord URL filter) to GCS object artists/<artistId>/<n>.<ext>.
 * Failed downloads were skipped WITHOUT renumbering, so the index embedded
 * in a hosted URL's filename — not its position in a.portfolioImages — is
 * the join key back to the archive's images[] array.
 *
 * Caveats (inherited from the Phase 0 inventory, PR #218):
 *  - ~50.7% of archived source URLs carry no ig_cache_key; those images get
 *    an empty-string permalink slot (Neo4j arrays cannot hold nulls).
 *  - A carousel-child media ID yields a child shortcode; Instagram 302s it
 *    to the parent post, which is fine for oEmbed/linking purposes.
 *  - Instagram does not cleanly 404 junk shortcodes, so derived permalinks
 *    are validated on a sample via the oEmbed endpoint, and the embed tier
 *    keeps a runtime fallback for the residue of bad ones.
 */

/** Base64url alphabet Instagram uses for shortcodes. */
const SHORTCODE_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/**
 * Decode an `ig_cache_key` query-param value to the numeric media ID string.
 * Shape observed in the archive: `<base64(mediaId)>.<cache-suffix>`, e.g.
 * "MzQ4MDIwMzY5OTgwMjQ1NTI4OQ==.3-ccb7-5" → "3480203699802455289".
 * Some variants base64-encode "<mediaId>_<userId>"; the media ID is the part
 * before the underscore. Returns null for anything that does not decode to a
 * positive integer.
 */
export function mediaIdFromIgCacheKey(igCacheKey) {
  if (typeof igCacheKey !== 'string' || igCacheKey.length === 0) return null;
  const b64 = igCacheKey.split('.')[0];
  let decoded;
  try {
    decoded = Buffer.from(b64, 'base64').toString('utf8');
  } catch {
    return null;
  }
  const mediaId = decoded.split('_')[0];
  if (!/^[0-9]+$/.test(mediaId)) return null;
  // Reject zero (and the empty string is already excluded by the regex).
  if (BigInt(mediaId) === 0n) return null;
  return mediaId;
}

/**
 * Re-encode a numeric media ID as an Instagram shortcode (base64url,
 * most-significant digit first). "3480203699802455289" → "DBLQnE1phBZ"-style
 * 11-char codes for modern posts. Returns null for invalid input.
 */
export function shortcodeFromMediaId(mediaId) {
  if (typeof mediaId !== 'string' || !/^[0-9]+$/.test(mediaId)) return null;
  let n = BigInt(mediaId);
  if (n <= 0n) return null;
  let shortcode = '';
  while (n > 0n) {
    shortcode = SHORTCODE_ALPHABET[Number(n % 64n)] + shortcode;
    n /= 64n;
  }
  return shortcode;
}

/** Canonical post URL for a shortcode. */
export function permalinkFromShortcode(shortcode) {
  if (typeof shortcode !== 'string' || !/^[A-Za-z0-9_-]+$/.test(shortcode)) return null;
  return `https://www.instagram.com/p/${shortcode}/`;
}

/**
 * Extract the ig_cache_key param from a cdninstagram source URL.
 * Returns null when absent or the URL is unparseable.
 */
export function igCacheKeyFromUrl(sourceUrl) {
  if (typeof sourceUrl !== 'string') return null;
  let parsed;
  try {
    parsed = new URL(sourceUrl);
  } catch {
    return null;
  }
  return parsed.searchParams.get('ig_cache_key');
}

/** Source URL → permalink, or null when no ig_cache_key survives the chain. */
export function permalinkFromSourceUrl(sourceUrl) {
  const key = igCacheKeyFromUrl(sourceUrl);
  if (!key) return null;
  const shortcode = shortcodeFromMediaId(mediaIdFromIgCacheKey(key));
  return shortcode ? permalinkFromShortcode(shortcode) : null;
}

/**
 * Replicate host-artist-images.mjs normalizeRecord's URL filter: the uploader
 * indexed into the FILTERED images array, so derivation must filter the same
 * way before archive index n means the same thing on both sides.
 */
export function filterSourceImages(images) {
  return Array.isArray(images)
    ? images.filter((u) => typeof u === 'string' && /^https?:\/\//i.test(u))
    : [];
}

/**
 * Archive index n embedded in a hosted portfolio URL
 * (https://storage.googleapis.com/<bucket>/artists/<artistId>/<n>.<ext>).
 * Returns null for URLs that are not hosted portfolio objects.
 */
export function hostedIndexFromUrl(hostedUrl) {
  if (typeof hostedUrl !== 'string') return null;
  let parsed;
  try {
    parsed = new URL(hostedUrl);
  } catch {
    return null;
  }
  const match = parsed.pathname.match(/\/artists\/[A-Za-z0-9_-]+\/([0-9]+)\.(?:jpg|webp|png)$/);
  return match ? Number(match[1]) : null;
}

/**
 * Build the portfolioPermalinks array for one artist: aligned index-for-index
 * with portfolioImages, empty string where no permalink was recovered (Neo4j
 * arrays cannot contain nulls).
 *
 * @param {string[]} portfolioImages  hosted GCS URLs from the :Artist node
 * @param {(string|null)[]} archivePermalinks  permalink (or null) per
 *        FILTERED archive image index, from derivePermalinksForImages
 */
export function alignPermalinks(portfolioImages, archivePermalinks) {
  if (!Array.isArray(portfolioImages)) return [];
  const byIndex = Array.isArray(archivePermalinks) ? archivePermalinks : [];
  return portfolioImages.map((hostedUrl) => {
    const n = hostedIndexFromUrl(hostedUrl);
    return (n !== null && byIndex[n]) || '';
  });
}

/** Permalink (or null) per filtered archive image index. */
export function derivePermalinksForImages(images) {
  return filterSourceImages(images).map((u) => permalinkFromSourceUrl(u));
}
