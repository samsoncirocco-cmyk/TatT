/**
 * Artist style-tag vocabulary + bio extraction, shared by the enrichment pair:
 *
 *   scripts/harvest-ig-styles.mjs  — reads Instagram bios, emits a style artifact
 *   scripts/link-artist-styles.mjs — MERGEs that artifact into the Neo4j graph
 *
 * Why this vocabulary matters: `/api/v1/match/semantic` treats style as a HARD
 * FILTER, not a ranking signal (src/features/match-pulse/services/neo4jService.ts —
 * `any(style IN $styles WHERE any(s IN styles WHERE toLower(s) = toLower(style)))`).
 * An artist without a matching style is excluded outright, so a WRONG tag surfaces
 * the wrong artist and a MISSING tag hides the right one. Precision beats recall.
 *
 * CANONICAL_STYLE_NAMES is the same list as CANONICAL_STYLES in
 * src/lib/design-style-signal.ts — the strings the UI sends verbatim as
 * style_preferences. scripts/lib/artist-styles.test.mjs asserts set-equality so the
 * two cannot silently drift.
 *
 * STYLE_PATTERNS is a faithful port of STYLE_PATTERNS in
 * ~/tatt-scraper/execution/enrich_artists.py, kept regex-for-regex identical so the
 * hand-measured precision of that lane carries over. Everything here is pure — no
 * I/O, no network — so it is directly unit-testable.
 */

/**
 * Canonical style vocabulary of the live artist graph. Mirrors CANONICAL_STYLES
 * in src/lib/design-style-signal.ts (locked by test, do not edit one alone).
 */
export const CANONICAL_STYLE_NAMES = [
  'Traditional',
  'Neo-Traditional',
  'Black & Grey',
  'Blackwork',
  'Fine Line',
  'Realism',
  'Illustrative',
  'Japanese',
  'Watercolor',
  'Geometric',
  'Tribal',
  'Chicano',
  'Anime',
  'Minimalist',
  'Script',
];

/**
 * Bio → style rules, ported one-for-one from enrich_artists.py STYLE_PATTERNS.
 * Ordered so the output is deterministic regardless of Object key iteration.
 */
export const STYLE_PATTERNS = [
  { style: 'Traditional', pattern: /\b(?:american\s+)?traditional\b(?!\s*chinese)/i },
  { style: 'Neo-Traditional', pattern: /\bneo[\s-]?traditional\b/i },
  { style: 'Black & Grey', pattern: /\bblack\s*(?:&|and|\+|n)\s*gr[ae]y\b/i },
  { style: 'Blackwork', pattern: /\bblack[\s-]?work\b/i },
  { style: 'Fine Line', pattern: /\bfine[\s-]?line\b/i },
  { style: 'Realism', pattern: /\b(?:photo[\s-]?)?realis(?:m|tic)\b/i },
  { style: 'Illustrative', pattern: /\billustrat(?:ive|ion)\b/i },
  { style: 'Japanese', pattern: /\b(?:japanese|irezumi)\b/i },
  { style: 'Watercolor', pattern: /\bwater[\s-]?colou?r\b/i },
  { style: 'Geometric', pattern: /\bgeometr(?:ic|y)\b/i },
  { style: 'Tribal', pattern: /\btribal\b/i },
  { style: 'Chicano', pattern: /\bchicano\b/i },
  { style: 'Anime', pattern: /\b(?:anime|manga)\b/i },
  { style: 'Minimalist', pattern: /\bminimalis(?:t|m)\b/i },
  { style: 'Script', pattern: /\b(?:script|lettering|calligraphy)\s*(?:tattoo|work|style)?\b/i },
];

const NEO_TRADITIONAL = STYLE_PATTERNS.find((r) => r.style === 'Neo-Traditional').pattern;
const TRADITIONAL = STYLE_PATTERNS.find((r) => r.style === 'Traditional').pattern;

/**
 * Extract canonical styles from one free-text bio, with the evidence that
 * produced each tag so a human can spot-check the artifact without re-running.
 *
 * Returns [{ style, match, index }] in STYLE_PATTERNS order; [] when nothing fires.
 */
export function extractStyleEvidence(bio) {
  if (typeof bio !== 'string' || bio.trim() === '') return [];

  const hits = [];
  for (const { style, pattern } of STYLE_PATTERNS) {
    const m = pattern.exec(bio);
    if (m) hits.push({ style, match: m[0], index: m.index });
  }

  // De-conflict: "neo-traditional" text also satisfies the Traditional pattern.
  // Drop Traditional unless it is supported by evidence OUTSIDE the neo- phrase.
  const hasBoth = hits.some((h) => h.style === 'Traditional') && hits.some((h) => h.style === 'Neo-Traditional');
  if (hasBoth) {
    const stripped = bio.replace(new RegExp(NEO_TRADITIONAL.source, 'gi'), ' ');
    const residual = TRADITIONAL.exec(stripped);
    if (!residual) return hits.filter((h) => h.style !== 'Traditional');
    // Re-anchor the surviving Traditional evidence to the residual match so the
    // stored evidence points at text that actually justifies the tag.
    return hits.map((h) => (h.style === 'Traditional' ? { ...h, match: residual[0], index: null } : h));
  }

  return hits;
}

// ─── Precision guard ───────────────────────────────────────────────────────
//
// STYLE_PATTERNS above is deliberately left byte-identical to the Python
// original so its hand-measured precision transfers. The guard below is a
// SEPARATE, opt-outable layer that drops matches whose surrounding text
// disqualifies them. It only ever removes tags, never adds them.
//
// Both rules were found by auditing the full 2026-07-20 IG bio corpus, not
// invented defensively — see docs/audits/2026-07-25-enrichment-gate-review.md.

/** How far back to look for a negation cue before a style match. */
const NEGATION_WINDOW = 40;

/**
 * Words that flip a style claim into a disclaimer, when nothing but ordinary
 * prose separates the cue from the style word.
 *
 * Two deliberate narrownesses, both learned from the corpus:
 *  - Word cues only. A bare ❌/🚫 is used as a bullet at least as often as a
 *    negation ("❌Geometric / Ornamental / Neo-Trad" is a style LIST).
 *  - The run between cue and match may only contain plain word characters.
 *    Any emoji, bullet or punctuation ends the disclaimer, so
 *    "❌NO DMS❌🌸SOFT TRAD🌸🍥ANIME🍥" keeps its Anime tag.
 */
const NEGATION_CUE = /\b(?:no|not|don'?t|doesn'?t|won'?t|never)\b[A-Za-z0-9 '’\-,/&]*$/i;

/**
 * Proper nouns that contain a style word but name a shop or a clothing brand.
 * "Tribal Rites" alone accounts for 6 of the 19 Tribal tags in the corpus.
 */
const PROPER_NOUN_COLLISIONS = [
  { style: 'Tribal', pattern: /\btribal\s+rites\b/i },   // tattoo shop (CO)
  { style: 'Tribal', pattern: /\btribal\s+gear\b/i },    // clothing brand
  { style: 'Tribal', pattern: /\btribal\s+member\b/i },  // tribal enrollment, not a style
];

/**
 * Drop style evidence the surrounding bio text disqualifies. Returns
 * { kept, rejected } so the harvester can report exactly what it removed —
 * a guard nobody can audit is worse than no guard.
 */
export function rejectSpuriousEvidence(bio, evidence) {
  const kept = [];
  const rejected = [];

  for (const hit of evidence) {
    const collision = PROPER_NOUN_COLLISIONS.find(
      (c) => c.style === hit.style && c.pattern.test(bio),
    );
    if (collision) {
      // Only reject when EVERY occurrence of the style word is inside the
      // collision phrase — "Polynesian tribal at Tribal Rites" is a real claim.
      const scrubbed = bio.replace(new RegExp(collision.pattern.source, 'gi'), ' ');
      const rule = STYLE_PATTERNS.find((r) => r.style === hit.style);
      if (!rule.pattern.test(scrubbed)) {
        rejected.push({ ...hit, reason: 'proper-noun-collision' });
        continue;
      }
    }

    if (typeof hit.index === 'number') {
      const before = bio.slice(Math.max(0, hit.index - NEGATION_WINDOW), hit.index);
      if (NEGATION_CUE.test(before)) {
        rejected.push({ ...hit, reason: 'negated' });
        continue;
      }
    }

    kept.push(hit);
  }

  return { kept, rejected };
}

/** Convenience wrapper: just the style names, in STYLE_PATTERNS order. */
export function stylesFromBio(bio) {
  return extractStyleEvidence(bio).map((h) => h.style);
}

/**
 * Artist ids are interpolated into nothing (always bound as parameters), but a
 * junk id is still a data-quality signal worth rejecting at the door. Matches
 * the scraper's `artist_<handle>` shape and host-artist-images.mjs's rule.
 */
export function isSafeArtistId(artistId) {
  return typeof artistId === 'string' && /^[A-Za-z0-9_.-]+$/.test(artistId) && artistId.length <= 200;
}

/** Set of canonical names, lowercased, for cheap membership checks. */
const CANONICAL_LOWER = new Set(CANONICAL_STYLE_NAMES.map((s) => s.toLowerCase()));

/**
 * Validate + normalize one { artistId, styles } row from a style artifact.
 * Drops unknown style names (the graph filter is exact-name, so an off-vocabulary
 * tag is dead weight at best) and de-duplicates. Returns null when unusable.
 */
export function normalizeStyleRecord(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const artistId = raw.artistId;
  if (!isSafeArtistId(artistId)) return null;

  const seen = new Set();
  const styles = [];
  for (const s of Array.isArray(raw.styles) ? raw.styles : []) {
    if (typeof s !== 'string') continue;
    if (!CANONICAL_LOWER.has(s.toLowerCase())) continue;
    // Canonicalize casing so MERGE never creates a case-variant Style node.
    const canonical = CANONICAL_STYLE_NAMES.find((c) => c.toLowerCase() === s.toLowerCase());
    if (seen.has(canonical)) continue;
    seen.add(canonical);
    styles.push(canonical);
  }
  if (styles.length === 0) return null;

  return { artistId, styles };
}

/** Flatten normalized records into the (artistId, style) pairs the graph stores. */
export function toStylePairs(records) {
  const pairs = [];
  for (const rec of records) {
    for (const style of rec.styles) pairs.push({ artistId: rec.artistId, style });
  }
  return pairs;
}
