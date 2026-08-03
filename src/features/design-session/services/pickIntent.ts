/**
 * Deterministic ordinal gate for the revealed state — the pick equivalent of
 * isConfirmationIntent. Given a reply to "which one?", it answers WHICH cut
 * the texter named, or nothing when the message doesn't clearly name one.
 *
 * Lives beside confirmationIntent, and for the same reason: the SMS channel
 * and the web reveal must agree on what counts as naming a cut. A drifted
 * copy is a real bug class — a phrase that picks on one channel and argues
 * on the other.
 *
 * Deliberately conservative. Every ambiguity resolves to "I didn't catch a
 * number", because the caller's fallback is to ask again — which costs one
 * SMS — while a wrong reading picks the wrong tattoo, or writes a preference
 * the texter never expressed into the artist's Brief.
 */

/** Words that mean the message is rejecting cuts, not naming one. */
const NEGATION =
  /\b(no|nope|not|none|neither|nah|never|anything but|other than|except|besides|hate|dislike)\b/;

/**
 * Bare number words that safely mean a cut. "one" is EXCLUDED on purpose:
 * every web cut name ends in it ("the bold, full-color one", "that one",
 * "this one"), so a bare "one" is far more often a pronoun than cut 1. It
 * still parses with an explicit qualifier — see QUALIFIED below.
 */
const BARE_WORD: Record<string, number> = {
  two: 2,
  three: 3,
  four: 4,
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
};

/**
 * "cut one", "number 1", "#1", "option two" — a qualifier makes "one" safe.
 * Note "no." as in "no. 3" is deliberately absent: NEGATION matches "no"
 * first, so the alternation could never fire, and "no 3" reads as a
 * rejection far more often than as an abbreviation for number.
 */
const QUALIFIED = /\b(?:cut|number|num|option|pick|take)\s*#?\s*(one|two|three|four|[1-9])\b/g;

/** Bare digits: "3", "#3". Not part of a larger number ("35", "2024"). */
const BARE_DIGIT = /(?:^|[^\p{L}\p{N}])#?([1-9])(?![\p{N}])/gu;

const WORD_TO_DIGIT: Record<string, number> = { one: 1, two: 2, three: 3, four: 4 };

function normalize(message: string): string {
  return message
    .toLowerCase()
    .replace(/[^\p{L}\p{N}'#\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Every distinct cut number named in the message, in first-appearance order.
 *
 * Returns [] when the message names none, names one out of range, or reads
 * as a rejection ("not 3", "anything but the second"). Callers treat any
 * result whose length !== 1 as "ask again" — see the SMS adapter.
 *
 * @param cutCount how many cuts were delivered; "last" resolves to it and
 *                 anything above it is out of range.
 */
export function parsePickOrdinals(message: string, cutCount: number): number[] {
  const normalized = normalize(message);
  if (!normalized || cutCount < 1) return [];

  // A rejection names a cut without picking it. Asking again is correct;
  // reading "not 3" as a pick of 3 is the worst failure this gate can have.
  if (NEGATION.test(normalized)) return [];

  const found: number[] = [];
  const add = (value: number) => {
    if (value >= 1 && value <= cutCount && !found.includes(value)) found.push(value);
  };

  // "the last one" — the only positional word that depends on cutCount.
  if (/\b(last|final)\b/.test(normalized)) add(cutCount);

  for (const match of normalized.matchAll(QUALIFIED)) {
    const token = match[1];
    add(WORD_TO_DIGIT[token] ?? Number(token));
  }

  for (const [word, value] of Object.entries(BARE_WORD)) {
    if (new RegExp(`\\b${word}\\b`).test(normalized)) add(value);
  }

  for (const match of normalized.matchAll(BARE_DIGIT)) {
    add(Number(match[1]));
  }

  return found.sort((a, b) => a - b);
}

/**
 * The single cut this message names, or null when it names none or several.
 * The narrow form callers want: one number or ask again.
 */
export function parsePickIntent(message: string, cutCount: number): number | null {
  const ordinals = parsePickOrdinals(message, cutCount);
  return ordinals.length === 1 ? ordinals[0] : null;
}

/** Words that carry no instruction — politeness and grammar around a choice. */
const PICK_FILLER =
  /\b(?:the|a|an|one|ones|cut|cuts|design|number|num|option|pick|picking|take|taking|go|going|going with|with|want|wanted|choose|choosing|lock|locking|in|that|this|it|is|am|ill|lets|for|me|my|i|id|please|pls|plz|thanks|thank|you|ty|thx|yeah|yep|def|definitely|probably|think|like|love)\b/g;

/** Ordinal tokens themselves, removed before judging what is left over. */
const PICK_ORDINAL_TOKENS =
  /\b(?:first|second|third|fourth|1st|2nd|3rd|4th|two|three|four|last|final)\b/g;

/**
 * True when the message is a CHOICE and nothing more — "3", "the third one",
 * "I'll take cut 2" — as opposed to an instruction that happens to mention a
 * cut, like "make 2 bolder".
 *
 * SMS needs this and the web does not: on the web a pick is a click and a
 * critique is typing, so the two can never be confused. Over SMS both are
 * text, and `isFixRequest` deliberately treats almost everything as a fix —
 * so a bare "2" meant as a pick would otherwise spend a render re-cutting
 * cut 2 against the instruction "2".
 *
 * Conservative by construction: anything with words left over after the
 * choice is removed is treated as an instruction, because re-cutting when
 * someone meant to choose wastes money, and asking again costs one SMS.
 */
export function isBarePickReference(message: string, cutCount: number): boolean {
  if (parsePickIntent(message, cutCount) === null) return false;
  const residue = normalize(message)
    // Contractions collapse first ("i'll" → "ill"), so the filler list can
    // stay plain words instead of carrying every apostrophe variant.
    .replace(/'/g, '')
    .replace(PICK_ORDINAL_TOKENS, ' ')
    .replace(/#?\d+/g, ' ')
    .replace(PICK_FILLER, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
  return residue.length === 0;
}
