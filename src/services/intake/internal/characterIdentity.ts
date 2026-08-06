import {
  referenceSeriesIn,
  referenceSeriesMentioned,
} from '@/config/referenceSeriesAliases';
import type { CharacterIdentity } from '../types';

function normalize(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('en-US')
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function containsPhrase(source: string, phrase: string): boolean {
  return ` ${source} `.includes(` ${phrase} `);
}

function spokenNameAppears(source: string, name: string): boolean {
  const normalizedName = normalize(name);
  if (containsPhrase(source, normalizedName)) return true;
  const comma = name.match(/^\s*([^,]+),\s*(.+)\s*$/);
  return Boolean(
    comma && containsPhrase(source, normalize(`${comma[2]} ${comma[1]}`))
  );
}

function sameCharacterName(left: string, right: string): boolean {
  const a = normalize(left);
  const b = normalize(right);
  if (a === b) return true;
  const aParts = a.split(' ');
  const bParts = b.split(' ');
  return (
    (aParts.length === 1 && bParts.includes(a)) ||
    (bParts.length === 1 && aParts.includes(b))
  );
}

/**
 * Damerau-Levenshtein distance, capped at 1 — we only ever ask "is this one
 * keystroke away?", so the full matrix is wasted work.
 *
 * Returns true for equal strings, one substitution, one insertion, one
 * deletion, or one transposition of adjacent characters ("boswer"/"bowser").
 */
function withinOneEdit(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;

  if (a.length === b.length) {
    const diffs: number[] = [];
    for (let i = 0; i < a.length; i += 1) {
      if (a[i] !== b[i]) diffs.push(i);
      if (diffs.length > 2) return false;
    }
    if (diffs.length === 1) return true;
    // Exactly two differing positions are a transposition only when adjacent
    // and swapped.
    if (diffs.length === 2 && diffs[1] === diffs[0] + 1) {
      return a[diffs[0]] === b[diffs[1]] && a[diffs[1]] === b[diffs[0]];
    }
    return false;
  }

  const [shorter, longer] = a.length < b.length ? [a, b] : [b, a];
  let i = 0;
  let j = 0;
  let skipped = false;
  while (i < shorter.length && j < longer.length) {
    if (shorter[i] === longer[j]) {
      i += 1;
      j += 1;
      continue;
    }
    if (skipped) return false;
    skipped = true;
    j += 1;
  }
  return true;
}

/**
 * Shortest name — and shortest transcript token — a typo may be rescued
 * across. Both ends are gated, which is the union of the two boundaries
 * review drew: a 3-4 letter name at distance 1 is a coin flip between
 * "misspelled" and "a different person" ("Ken"/"Ren", "Rex"/"Rey"), and the
 * guard's whole job is to not guess there.
 */
const NEAR_MISS_MIN_LENGTH = 5;

/**
 * Second-pass rescue for claims exact grounding would delete over a typo.
 *
 * ## Why this exists
 *
 * A customer typed "a kingdom hearts sleeve with roxas and sora fight link
 * from zelda and **boswer** from mario". The extractor did the correct thing
 * and returned "Bowser" — and exact grounding, which requires the claimed name
 * to appear literally in the transcript, deleted him. The customer was read
 * back a two-character cast for a four-character tattoo, and nothing in the
 * sentence revealed that anyone had been dropped.
 *
 * ## Why it does not reopen the hallucination hole
 *
 * The guard's job is blocking INVENTION, and this pass cannot invent: it never
 * produces a name, it only rescues a name the extractor already claimed, and
 * only against a token the customer already typed. The bounds are deliberately
 * tight:
 *
 * - Distance 1 under Damerau-Levenshtein — one keystroke, which is what a typo
 *   is. Never 2: two edits is where real swaps start looking as cheap as
 *   typos.
 * - BOTH the claimed name and the transcript token must be at least
 *   {@link NEAR_MISS_MIN_LENGTH} characters. Short names have too many real
 *   neighbours — "Ken" and "Ren" are both real characters at distance 1, and
 *   rescuing one into the other invents a swap rather than fixing a typo.
 * - Same first letter, even inside the distance budget. Typos overwhelmingly
 *   preserve the initial; real name swaps often do not ("Mario"/"Wario" is
 *   distance 1 on a long-enough name and dies here).
 * - The token must not already be grounding a kept identity, so one typed word
 *   can never be evidence for two different people.
 *
 * Scope matters as much as the bounds: this matches the extractor's OWN
 * claimed name against transcript tokens. It never sweeps the transcript
 * asking "does anything here look like a character" — that is a different and
 * far riskier operation, and it is how you would invent Wario from a sentence
 * that only says Mario.
 *
 * A name with no transcript token within those bounds still dies, which is the
 * behaviour the guard was written for.
 */
function rescueNearMisses(
  dropped: readonly { name: string; series: string }[],
  sourceText: string,
  claimedTokens: ReadonlySet<string>
): CharacterIdentity[] {
  const tokens = normalize(sourceText)
    .split(' ')
    .filter((token) => token.length >= NEAR_MISS_MIN_LENGTH);
  const spokenFor = new Set(claimedTokens);

  return dropped.flatMap((candidate) => {
    const name = normalize(candidate.name);
    // Multi-word names are grounded phrase-wise; a typo rescue on one word of
    // a full name is a different (and much looser) question than this pass is
    // bounded for.
    if (!name || name.includes(' ')) return [];
    if (name.length < NEAR_MISS_MIN_LENGTH) return [];
    const match = tokens.find(
      (token) =>
        !spokenFor.has(token) && token[0] === name[0] && withinOneEdit(token, name)
    );
    if (!match) return [];
    spokenFor.add(match);
    return [{ name: candidate.name, series: candidate.series }];
  });
}

/**
 * Accept provider identity claims the customer grounded.
 *
 * ## Grounding verifies claims; it does not take hostages
 *
 * The two halves of an identity are verified independently and fail
 * independently. An unverifiable SERIES used to delete the whole identity —
 * so "Link / The Legend of Zelda" vanished from a transcript that says
 * "zelda", because the alias table this checks against is a hand-maintained
 * list that happened to contain no games. That is our gap, not evidence the
 * customer never named the person.
 *
 * So an unverified series is dropped to `''` and the character is kept.
 * Callers render a name-only identity as a name — never as "Link — " and
 * never by inventing a franchise to fill the hole.
 *
 * The NAME half still gates the identity, because a name nobody said is the
 * invention this guard exists to stop. It is checked exactly first, then once
 * more through {@link rescueNearMisses} for the typo case.
 */
export function groundedCharacterIdentities(
  value: unknown,
  sourceText: string
): CharacterIdentity[] {
  if (!Array.isArray(value)) return [];
  const normalizedSource = normalize(sourceText);

  const claimed = value.flatMap((candidate) => {
    if (!candidate || typeof candidate !== 'object') return [];
    const nameValue = (candidate as { name?: unknown }).name;
    const seriesValue = (candidate as { series?: unknown }).series;
    const name = typeof nameValue === 'string' ? nameValue.trim() : '';
    const series = typeof seriesValue === 'string' ? seriesValue.trim() : '';
    if (!name) return [];
    // An unverifiable series costs the series, never the person.
    return [{ name, series: referenceSeriesMentioned(sourceText, series) ? series : '' }];
  });

  // Downgrading an unverified series must not resurrect a claim the customer
  // actively contradicted. A provider hedging one name across two franchises
  // ("Sora / Kingdom Hearts" and "Sora / No Game No Life" for a customer who
  // said Kingdom Hearts) is a disambiguation, not a coverage gap: the verified
  // pairing wins outright and the name-only twin is dropped rather than kept
  // as a second, sourceless person.
  const verifiedNames = new Set(
    claimed.filter((candidate) => candidate.series).map((candidate) => normalize(candidate.name))
  );
  const survivingClaims = claimed.filter(
    (candidate) => candidate.series || !verifiedNames.has(normalize(candidate.name))
  );

  const kept: CharacterIdentity[] = [];
  const dropped: { name: string; series: string }[] = [];
  for (const candidate of survivingClaims) {
    if (spokenNameAppears(normalizedSource, candidate.name)) kept.push(candidate);
    else dropped.push(candidate);
  }

  return [
    ...kept,
    ...rescueNearMisses(
      dropped,
      sourceText,
      new Set(kept.map((identity) => normalize(identity.name)))
    ),
  ];
}

/**
 * A single explicitly named source can legitimately re-contextualize a
 * character who also appears elsewhere (for example Cloud in Kingdom
 * Hearts), so a grounded provider pair wins there. In a crossover, catalog
 * evidence corrects any provider-swapped source while preserving cast order.
 */
export function mergeCharacterIdentities(
  provider: readonly CharacterIdentity[],
  detected: readonly CharacterIdentity[],
  sourceText = ''
): CharacterIdentity[] {
  // A name-only identity contributes NO series, so it must not be counted as
  // one. Letting `''` into this set made a single unverifiable franchise look
  // like a second source, flipped `isCrossover`, and then the crossover branch
  // deleted the very character the name-only downgrade had just saved — the
  // original bug, one layer further down.
  const explicitlyNamedSeries = new Set(
    [
      ...referenceSeriesIn(sourceText).map(normalize),
      ...provider.map((identity) => normalize(identity.series)),
      ...detected
        .filter((identity) => referenceSeriesMentioned(sourceText, identity.series))
        .map((identity) => normalize(identity.series)),
    ].filter(Boolean)
  );
  const isCrossover = explicitlyNamedSeries.size > 1;
  const providerWithCorroboratedSources = provider.flatMap((identity) => {
    if (!isCrossover) return [identity];
    // Crossover correction fixes a source the provider may have swapped. A
    // name-only identity has no source to correct and no source to get wrong,
    // so it is carried through rather than requiring catalog corroboration it
    // can never have — the catalog not knowing someone is why it is name-only.
    if (!identity.series) return [identity];
    const corroborated = detected.find((candidate) =>
      sameCharacterName(candidate.name, identity.name)
    );
    return corroborated ? [corroborated] : [];
  });
  // A name-only identity is missing information, not asserting its absence.
  // Where the catalog knows the same character's source, take it — the whole
  // point of the downgrade is that we could not verify the franchise, and the
  // catalog verifying it is exactly the evidence that was missing.
  const providerWithBestKnownSources = providerWithCorroboratedSources.map((identity) => {
    if (identity.series) return identity;
    const known = detected.find(
      (candidate) => candidate.series && sameCharacterName(candidate.name, identity.name)
    );
    return known ? { name: identity.name, series: known.series } : identity;
  });

  return [
    ...providerWithBestKnownSources,
    ...detected.filter((identity) =>
      !providerWithCorroboratedSources.some((candidate) =>
        sameCharacterName(candidate.name, identity.name)
      )
    ),
  ].filter((identity, index, all) =>
    all.findIndex((candidate) =>
      sameCharacterName(candidate.name, identity.name) &&
      normalize(candidate.series) === normalize(identity.series)
    ) === index
  );
}
