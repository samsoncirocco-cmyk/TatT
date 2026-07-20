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
