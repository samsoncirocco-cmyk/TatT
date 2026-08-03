/**
 * Customer-facing shorthand for source works. This is identity data, not
 * prompt prose: all intake lanes use the same aliases when grounding a
 * character-to-series binding.
 */
export const REFERENCE_SERIES_ALIASES: Readonly<Record<string, readonly string[]>> = {
  'hunter x hunter': ['hxh', 'hunterxhunter'],
  'yu yu hakusho': ['yyh', 'yuyu hakusho', 'yuyu'],
  'my hero academia': ['mha', 'bnha', 'boku no hero'],
  'jujutsu kaisen': ['jjk'],
  'dragon ball': ['dbz', 'dragon ball z', 'dragonball'],
  'attack on titan': ['aot', 'snk', 'shingeki no kyojin'],
  'demon slayer': ['kny', 'kimetsu no yaiba'],
  'one piece': ['op'],
  'fullmetal alchemist': ['fma', 'fmab'],
  'chainsaw man': ['csm'],
  'kingdom hearts': ['kh'],
  'final fantasy vii': ['ff7', 'final fantasy 7'],
  'no game no life': ['ngnl'],
};

export function normalizeReferenceText(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('en-US')
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function containsWords(source: string, phrase: string): boolean {
  return ` ${source} `.includes(` ${phrase} `);
}

/** True only when the canonical source title or an explicit alias was said. */
export function referenceSeriesMentioned(text: string, series: string): boolean {
  const source = normalizeReferenceText(text);
  const canonical = normalizeReferenceText(series);
  if (containsWords(source, canonical)) return true;
  return (REFERENCE_SERIES_ALIASES[canonical] ?? []).some((alias) =>
    containsWords(source, normalizeReferenceText(alias))
  );
}

/** Canonical sources explicitly named through this shared alias vocabulary. */
export function referenceSeriesIn(text: string): string[] {
  const known = Object.keys(REFERENCE_SERIES_ALIASES).filter((series) =>
    referenceSeriesMentioned(text, series)
  );
  const fromPhrases = [...text.matchAll(
    /\bfrom\s+(.+?)(?=\s+(?:and|with|versus|vs\.?)\s+[\p{L}\p{M}\p{N}]+\s+from\b|[,.;!?]|$)/giu
  )]
    .map((match) => normalizeReferenceText(match[1]))
    .filter((phrase) =>
      Boolean(phrase) &&
      phrase.split(' ').length <= 4 &&
      !known.some((series) => referenceSeriesMentioned(phrase, series))
    );
  return [...new Set([...known, ...fromPhrases])];
}
