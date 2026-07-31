/**
 * Design → artist style signal.
 *
 * Maps free-text forge descriptors (the stencil prompt + suggestion chips
 * like "Pop-punk flash" / "Heavy black linework") onto the canonical style
 * vocabulary of the live artist graph, and (de)serializes that signal
 * through query strings: the forge links to /artists?style=…, and the
 * legacy /matches?styles=…&from=design deep link is parsed here so its
 * redirect can map it onto the directory's filter (ADR-0029).
 *
 * Shared by the Stencil Forge (producer) and the /artists directory /
 * /matches redirect (consumers) so all sides agree on the vocabulary.
 */

// The canonical style vocabulary now comes from style-vocabulary.ts, which
// derives it from data/style-ontology.json + data/graph-style-vocabulary.json
// rather than repeating it here. Re-exported so the many existing importers
// of this module keep working.
import {
  CANONICAL_STYLES,
  canonicalStyleForTag,
  resolveCanonicalStyle,
  type CanonicalStyle,
} from "./style-vocabulary";

export { CANONICAL_STYLES, resolveCanonicalStyle, type CanonicalStyle };

/** Max styles carried in a design signal — more than 3 stops being a signal. */
const MAX_SIGNAL_STYLES = 3;

// Ordered keyword rules. First match wins per style; more specific styles
// (Neo-Traditional) are listed before their substrings (Traditional), and
// the Traditional pattern explicitly refuses a "neo-" prefix.
//
// Every `style` here must be a matchable canonical style — a rule for a style
// the graph cannot answer with would send users to an empty result page.
// style-vocabulary.test.ts asserts that against the real vocabulary files.
const STYLE_RULES: Array<{ style: CanonicalStyle; pattern: RegExp }> = [
  { style: "Neo-Traditional", pattern: /neo[\s-]?traditional/ },
  {
    style: "Traditional",
    pattern: /\b(?<!neo[\s-])traditional\b|old[\s-]?school|americana|\bflash\b|pop[\s-]?punk/,
  },
  { style: "Black & Grey", pattern: /black\s*(?:&|and|n)\s*gr[ae]y/ },
  {
    style: "Blackwork",
    pattern: /blackwork|black\s?work|heavy black|bold black|linework|dotwork|dark art/,
  },
  { style: "Fine Line", pattern: /fine[\s-]?line|single[\s-]?needle|micro[\s-]?tattoo/ },
  { style: "Realism", pattern: /realis(?:m|tic)|photo[\s-]?real|portrait/ },
  { style: "Illustrative", pattern: /illustrat|sketch[\s-]?style|etching|woodcut/ },
  { style: "Japanese", pattern: /japanese|irezumi|tebori|ukiyo/ },
  { style: "Watercolor", pattern: /water[\s-]?colou?r|paint[\s-]?splash/ },
  { style: "Geometric", pattern: /geometr|sacred geometry|mandala/ },
  { style: "Tribal", pattern: /tribal|polynesian|maori|samoan/ },
  { style: "Chicano", pattern: /chicano|payasa|lowrider/ },
  { style: "Anime", pattern: /anime|manga/ },
  { style: "New School", pattern: /new[\s-]?school|cartoon/ },
  { style: "Ornamental", pattern: /ornamental|filigree|baroque|adorn/ },
];

/**
 * Extract canonical graph styles from free-text design descriptors
 * (the forge prompt, suggestion chip labels, etc.). Returns at most
 * MAX_SIGNAL_STYLES styles in rule order; empty array when nothing maps.
 */
export function stylesFromDescriptors(descriptors: string[]): CanonicalStyle[] {
  const text = descriptors.join(" ").toLowerCase();
  if (!text.trim()) return [];
  const hits: CanonicalStyle[] = [];
  for (const { style, pattern } of STYLE_RULES) {
    if (hits.length >= MAX_SIGNAL_STYLES) break;
    if (pattern.test(text)) hits.push(style);
  }
  return hits;
}

/**
 * Parse the ?styles= query param into validated canonical styles.
 * Unknown names are dropped (case-insensitively matched), duplicates
 * removed, capped at MAX_SIGNAL_STYLES. Never throws on garbage input.
 */
export function parseStylesParam(param: string | null | undefined): CanonicalStyle[] {
  if (!param) return [];
  const seen = new Set<CanonicalStyle>();
  for (const raw of param.split(",")) {
    // resolveCanonicalStyle also accepts ontology ids, aliases and the graph's
    // own spellings, so a link built by any other surface still lands.
    const style = resolveCanonicalStyle(raw);
    if (style && !seen.has(style)) {
      seen.add(style);
      if (seen.size >= MAX_SIGNAL_STYLES) break;
    }
  }
  return [...seen];
}

// ---------------------------------------------------------------------------
// Design bot → match flow
// ---------------------------------------------------------------------------
// The hand-written ONTOLOGY_TO_CANONICAL_STYLE bridge that used to live here
// is gone. Both sides now read
// data/style-ontology.json: the design bot emits tag ids, and
// canonicalStyleForTag resolves each one — following the ontology's own
// `parent` roll-up for sub-styles — to a style the graph can actually answer
// with. One vocabulary, no second mapping to keep in step.

/**
 * Map a brief's ontology style tags (IntakeRecord.styleTags / Brief.styleTags)
 * onto canonical graph styles for /api/v1/match/semantic. Deduped,
 * order-preserving, capped at MAX_SIGNAL_STYLES like every other signal in
 * this module. Tags the graph has no artists for are dropped with a logged
 * note — no fuzzy guessing (ADR-0011).
 */
export function canonicalStylesFromOntologyTags(tags: string[]): CanonicalStyle[] {
  const mapped: CanonicalStyle[] = [];
  const dropped: string[] = [];
  for (const tag of tags) {
    const style = canonicalStyleForTag(tag);
    if (!style) {
      dropped.push(tag);
      continue;
    }
    if (!mapped.includes(style)) mapped.push(style);
  }
  if (dropped.length > 0) {
    console.info(
      `[design-style-signal] Dropped ontology tags with no canonical match style: ${dropped.join(", ")}`,
    );
  }
  return mapped.slice(0, MAX_SIGNAL_STYLES);
}

/**
 * Build the /artists directory URL carrying a design's style signal.
 * The directory filters on a single style, so the strongest extracted
 * style (first in rule order) wins; Blackwork is the honest fallback when
 * the prompt itself names no style (the retired Forge always generated
 * blackwork stencils, and that default carried over).
 *
 * Directory-filter plumbing without a live consumer since the Forge page
 * retired into /design (ADR-0028): its "Find artists for this design" CTA
 * was the one call site. Kept (with its tests) for the reveal-side
 * find-artists handoff; the /matches redirect stub still depends on this
 * module's parseStylesParam, so the module itself is load-bearing.
 */
export function artistsUrlForDesign(prompt: string): string {
  const styles = stylesFromDescriptors([prompt]);
  const style: CanonicalStyle = styles[0] ?? "Blackwork";
  return `/artists?${new URLSearchParams({ style }).toString()}`;
}

/**
 * Build the /smart-match URL carrying whatever design context exists —
 * the funnel's "Find your artist" handoff (ADR-0028/0029).
 *
 * A design-session id wins outright: the session brief carries richer
 * signal (placement, meaning, ontology tags) than anything derivable from
 * the prompt, and /smart-match?ds=… loads it and auto-runs. Without a
 * session, the prompt's extracted styles ride as ?styles=… to pre-select
 * the match pills; a prompt that names no style hands off clean.
 */
export function smartMatchUrlForDesign(prompt: string, designSessionId?: string): string {
  if (designSessionId) {
    return `/smart-match?ds=${encodeURIComponent(designSessionId)}`;
  }
  const styles = stylesFromDescriptors([prompt]);
  if (styles.length === 0) return "/smart-match";
  return `/smart-match?${new URLSearchParams({ styles: styles.join(",") }).toString()}`;
}

/**
 * Build the /visualize URL carrying a design into the AR mirror — the
 * funnel's "See it on your skin" handoff (ADR-0028).
 *
 * `design` preselects the cut in the mirror's tray; `ds` keeps the
 * design-session thread so the mirror's own "Find your artist" exit still
 * hands off the brief. Either may be absent — a walk-in gets the full
 * mirror either way.
 */
export function visualizeUrlForDesign(
  designId?: string | null,
  designSessionId?: string | null,
): string {
  const params = new URLSearchParams();
  if (designId) params.set("design", designId);
  if (designSessionId) params.set("ds", designSessionId);
  const query = params.toString();
  return query ? `/visualize?${query}` : "/visualize";
}

/**
 * Build the /studio URL carrying a design into the refinery.
 *
 * ADR-0038: the Studio is entered from a picked design, never from cold, so
 * this is the only shape of Studio link the funnel should produce. The
 * design session id is not carried — the Studio reads it back off the saved
 * design record, which is the same source of truth every other surface uses.
 */
export function studioUrlForDesign(designId: string): string {
  return `/studio?${new URLSearchParams({ design: designId }).toString()}`;
}
