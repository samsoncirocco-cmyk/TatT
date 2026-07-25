/**
 * Design → artist style signal.
 *
 * Maps free-text forge descriptors (the stencil prompt + suggestion chips
 * like "Pop-punk flash" / "Heavy black linework") onto the canonical style
 * vocabulary of the live artist graph, and (de)serializes that signal
 * through the /matches?styles=…&from=design query string.
 *
 * Shared by the Stencil Forge (producer) and MatchesClient (consumer) so
 * both sides agree on the vocabulary.
 */

// Canonical style vocabulary of the live artist graph. Keep in sync with
// the Neo4j style names — these strings are sent verbatim as
// style_preferences to /api/v1/match/semantic.
export const CANONICAL_STYLES = [
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

export type CanonicalStyle = (typeof CANONICAL_STYLES)[number];

/** Max styles carried in a design signal — more than 3 stops being a signal. */
const MAX_SIGNAL_STYLES = 3;

// Ordered keyword rules. First match wins per style; more specific styles
// (Neo-Traditional) are listed before their substrings (Traditional), and
// the Traditional pattern explicitly refuses a "neo-" prefix.
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
  { style: "Minimalist", pattern: /minimal/ },
  { style: "Script", pattern: /script|lettering|calligraph|typograph/ },
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
  const byLower = new Map<string, CanonicalStyle>(
    CANONICAL_STYLES.map((s) => [s.toLowerCase(), s]),
  );
  const seen = new Set<CanonicalStyle>();
  for (const raw of param.split(",")) {
    const style = byLower.get(raw.trim().toLowerCase());
    if (style && !seen.has(style)) {
      seen.add(style);
      if (seen.size >= MAX_SIGNAL_STYLES) break;
    }
  }
  return [...seen];
}

// ---------------------------------------------------------------------------
// Ontology bridge (design bot → match flow)
// ---------------------------------------------------------------------------
// TODO(match-ontology): temporary bridge. The design bot speaks style-ontology
// ids (data/style-ontology.json, ADR-0010) while matching still speaks the
// live artist graph's canonical style names. Delete this mapping once the
// match pipeline adopts the ontology as its own controlled vocabulary.

/**
 * Explicit ontology-id → canonical-style mapping. Every entry is a curated
 * human decision — no fuzzy matching (ADR-0010: matching runs on a controlled
 * vocabulary). Sub-styles collapse into their graph parent the same way the
 * STYLE_RULES keywords above already do (dotwork → Blackwork, irezumi →
 * Japanese, manga → Anime, lettering → Script, portrait → Realism).
 */
export const ONTOLOGY_TO_CANONICAL_STYLE: Readonly<Record<string, CanonicalStyle>> = {
  americana: "Traditional",
  anime: "Anime",
  "black-and-grey": "Black & Grey",
  blackwork: "Blackwork",
  chicano: "Chicano",
  dotwork: "Blackwork",
  "fine-line": "Fine Line",
  geometric: "Geometric",
  illustrative: "Illustrative",
  irezumi: "Japanese",
  japanese: "Japanese",
  lettering: "Script",
  manga: "Anime",
  minimalist: "Minimalist",
  "neo-traditional": "Neo-Traditional",
  portrait: "Realism",
  realism: "Realism",
  traditional: "Traditional",
  tribal: "Tribal",
  watercolor: "Watercolor",
};

/**
 * Ontology ids deliberately left unmapped — the live graph has no canonical
 * style for them (palette descriptors, or styles the roster doesn't carry).
 * Kept as an explicit list so ontology growth fails a test instead of
 * silently dropping a new tag; dropping is a decision here, never a guess.
 */
export const UNMAPPED_ONTOLOGY_TAGS: readonly string[] = [
  "abstract",
  "biomechanical",
  "color",
  "new-school",
  "ornamental",
  "surrealism",
];

/**
 * Map a brief's ontology style tags (IntakeRecord.styleTags / Brief.styleTags)
 * onto canonical graph styles for /api/v1/match/semantic. Deduped,
 * order-preserving, capped at MAX_SIGNAL_STYLES like every other signal in
 * this module. Unmappable tags are dropped with a logged note — no fuzzy
 * guessing.
 */
export function canonicalStylesFromOntologyTags(tags: string[]): CanonicalStyle[] {
  const mapped: CanonicalStyle[] = [];
  const dropped: string[] = [];
  for (const tag of tags) {
    const style = ONTOLOGY_TO_CANONICAL_STYLE[tag];
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
 * Build the /matches URL carrying a design's style signal.
 * The forge always cuts blackwork stencils (see generateTattooDesign's
 * style: "blackwork"), so Blackwork is the honest fallback when the
 * prompt itself names no style.
 */
export function matchesUrlForDesign(prompt: string): string {
  const styles = stylesFromDescriptors([prompt]);
  const effective = styles.length ? styles : (["Blackwork"] as CanonicalStyle[]);
  const params = new URLSearchParams({
    styles: effective.join(","),
    from: "design",
  });
  return `/matches?${params.toString()}`;
}
