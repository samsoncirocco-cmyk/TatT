/**
 * Deterministic user-intent detection for the conversation engine
 * (ADR-0012, ADR-0020, ADR-0023).
 *
 * Three intents the engine must never leave to model judgment, because a
 * live session showed the model mishandling all three in a row:
 *
 * - "can i see both versions color and blackwork" → the bot said "I can't
 *   show you mock-ups". A request to see both poles of a variation axis IS
 *   a proposal trigger: the reveal spreads that axis deliberately
 *   (ADR-0012), it is never a capability the bot lacks.
 * - "which do suggest" → the bot said "I'm not here to suggest styles".
 *   Per ADR-0023 a direct ask gets a direct recommendation.
 * - "i like it!" after the bot pitched a concept → the accepted pitch never
 *   entered the brief. A bare affirmation adopts the preceding bot message
 *   as intake material.
 */

import type { VariationAxis } from '@/services/intake';

interface AxisRequestRule {
  axis: VariationAxis;
  poleA: RegExp;
  poleB: RegExp;
  /** How the poles are spoken back to the user in the spread proposal. */
  labels: [string, string];
}

const AXIS_REQUEST_RULES: readonly AxisRequestRule[] = [
  {
    axis: 'color-blackwork',
    poleA: /\bcolou?r(s|ed|ful)?\b/i,
    poleB: /\bblack ?work\b|\bblack (and|&|n) gr[ae]y\b|\bblack ink\b|\bmonochrome\b/i,
    labels: ['full color', 'blackwork'],
  },
  {
    axis: 'bold-fine',
    poleA: /\bbold(er)?\b|\bheavy\b/i,
    poleB: /\bfine([- ]?line)?\b|\bdelicate\b|\bthin\b/i,
    labels: ['bold', 'fine-line'],
  },
  {
    axis: 'literal-abstract',
    poleA: /\bliteral\b|\brealistic\b/i,
    poleB: /\babstract\b/i,
    labels: ['literal', 'abstract'],
  },
  {
    axis: 'minimal-ornate',
    poleA: /\bminimal(ist)?\b|\bsimple\b/i,
    poleB: /\bornate\b|\bintricate\b|\bdetailed\b/i,
    labels: ['minimal', 'ornate'],
  },
];

/** "both", "two versions", "compare", "side by side", … */
const BOTH_CUE = /\b(both|either|versions?|options?|side by side|compare[d]?)\b/i;

/** A verb that asks to be shown something. */
const SEE_CUE = /\b(see|show|view|look at|try|give|generate|make|render)\b/i;

/**
 * "blackwork, not color" is a choice, not a request for both — a message
 * that rejects one pole never triggers the spread.
 */
const NEGATION_CUE = /\b(not|instead of|rather than|over|without|no)\b/i;

export interface AxisRequest {
  axis: VariationAxis;
  labels: [string, string];
}

/**
 * Does this user message ask to SEE both poles of a variation axis?
 * Detection requires both poles named plus a see/both cue, and no negation
 * — "can i see both versions color and blackwork" matches; "blackwork, not
 * color" does not.
 */
export function detectAxisRequest(message: string): AxisRequest | undefined {
  const text = (message || '').trim();
  if (!text) return undefined;
  if (NEGATION_CUE.test(text)) return undefined;
  if (!BOTH_CUE.test(text) && !SEE_CUE.test(text)) return undefined;

  const rule = AXIS_REQUEST_RULES.find(
    (candidate) => candidate.poleA.test(text) && candidate.poleB.test(text)
  );
  return rule ? { axis: rule.axis, labels: rule.labels } : undefined;
}

const SUGGESTION_CUE =
  /\b(suggest(ion)?s?|recommend(ation)?s?)\b|\bwhat would you (do|pick|choose|go with)\b|\byou (pick|choose|decide)\b|\bup to you\b|\bdealer'?s choice\b/i;

const STYLE_TOPIC_CUE = /\b(style|colou?r|black ?work|black (and|&) gr[ae]y|ink|palette|line ?work)\b/i;

/**
 * Does this user message delegate an open style/palette call to the bot?
 * Short messages ("which do suggest") count on the cue alone; longer ones
 * must actually be about style, so "any suggestions for the background?"
 * never hijacks the palette slot.
 */
export function isSuggestionRequest(message: string): boolean {
  const text = (message || '').trim();
  if (!text || !SUGGESTION_CUE.test(text)) return false;
  const words = text.split(/\s+/).filter(Boolean).length;
  return words <= 6 || STYLE_TOPIC_CUE.test(text);
}

/**
 * The visible fast lane's canonical phrase ("skip the questions — just
 * draw", the TAT-48 chip) plus the close natural variants of the same ask.
 * Deliberately tight: "draw" alone is tattoo vocabulary, not an intent.
 */
const DRAW_REQUEST_PATTERN =
  /\b(just draw( it| them)?|draw it already|skip the questions?|stop asking( questions)?|just (generate|make|render)( it| them| the designs?)?)\b/i;

/**
 * Does this user message ask to skip the remaining questions and generate
 * now? When the record is already generation-sufficient this IS a proposal
 * trigger (TAT-48 visible fast lane, ADR-0028 readiness) — the announce
 * beat still runs so ADR-0020's consent is never skipped.
 */
export function isDrawRequest(message: string): boolean {
  return DRAW_REQUEST_PATTERN.test((message || '').trim());
}

/* ──────────────────────────────────────────────────────────────────────────
 * Evocation reference (TAT-51). A meaning that points at a person, creator,
 * franchise, or fandom ("my love for toriyama", "for my grandmother", "us
 * against the world with my brother") carries no drawable yet — the
 * evocation follow-up mines it for one. These patterns extract WHO the
 * meaning points at so the question can name them in-voice.
 * ────────────────────────────────────────────────────────────────────────── */

const RELATION_WORDS =
  'mom|mother|dad|father|grandma|grandmother|grandpa|grandfather|nana|papa|' +
  'brother|sister|son|daughter|wife|husband|partner|fianc[eé]e?|' +
  'best friend|friend|uncle|aunt|cousin|dog|cat';

const EVOCATION_PATTERNS: readonly { pattern: RegExp; yours: boolean }[] = [
  // "my love for toriyama", "my love of studio ghibli"
  { pattern: /\bmy love (?:for|of) ([^,.;!?]{2,40})/i, yours: false },
  // "for my grandmother", "with my brother", "in memory of my dad", …
  {
    pattern: new RegExp(
      `\\b(?:for|about|with|honou?ring|remembering|missing|in memory of|after) my (${RELATION_WORDS})\\b`,
      'i'
    ),
    yours: true,
  },
  // "tribute to toriyama", "obsessed with dragon ball", "fan of ghibli"
  { pattern: /\b(?:tribute to|inspired by|obsessed with|fan of|love letter to) ([^,.;!?]{2,40})/i, yours: false },
];

/**
 * Who the stated meaning points at, phrased for the evocation question
 * ("toriyama", "your grandmother"), or undefined when the meaning doesn't
 * reference a person/creator/franchise. Deliberately conservative: a miss
 * costs one generic follow-up; a false fire spends the session's single
 * evocation question on the wrong thing.
 */
export function evocationRefOf(meaning: string): string | undefined {
  const text = (meaning || '').trim();
  if (!text) return undefined;
  for (const { pattern, yours } of EVOCATION_PATTERNS) {
    const match = text.match(pattern);
    if (!match) continue;
    // Trim the capture to the referenced entity: cut at connectives.
    const ref = match[1].split(/\s+(?:and|&|because|since)\s+/i)[0].trim();
    if (ref.length < 2) continue;
    return yours ? `your ${ref.toLowerCase()}` : ref;
  }
  return undefined;
}

/**
 * A pure-looks answer to the meaning question ("it just goes hard", "it
 * just looks sick", "no deeper meaning") — a complete answer (TAT-51). The
 * whole message must be the aesthetic statement, so "it should look sick
 * and mean rebirth" never closes the meaning slot.
 */
const AESTHETIC_ANSWER_PATTERN =
  /^\s*(?:honestly |tbh |lol )?(?:it|this|that)?\s*(?:just)?\s*(?:looks?|goes)\s+(?:sick|hard|cool|clean|dope|fire|good|great|badass|amazing)\b[\s!.…]*$|^\s*(?:no|not really any|there'?s no)\s+(?:deep(?:er)? )?meaning\b[^?]*$|^\s*(?:just|pure(?:ly)?)\s+(?:the )?(?:aesthetics?|looks?|vibes?)\b[\s!.…]*$/i;

export function isAestheticAnswer(message: string): boolean {
  return AESTHETIC_ANSWER_PATTERN.test(message || '');
}

const AFFIRMATION_PATTERN =
  /^\s*(i (really |kinda |actually )?(like|love) (it|that|this|them|both|those)|love (it|that|this)|yes+|yeah+|yep|yup|sure|perfect|exactly|absolutely|that works|sounds (good|great|perfect|amazing)|do (it|that)|let'?s (do|go with) (it|that|those)|(i'?m|im) (in|down|sold)|go (for|with) (it|that))\b[\s!.…]*$/i;

/**
 * Is this user message a bare acceptance of whatever the bot just said?
 * Whole-message match only — "i like it!" yes, "i like dragons" no. Used to
 * fold an accepted bot pitch into the subject/moment scan, so a concept the
 * bot proposed and the user adopted actually reaches the brief.
 */
export function isAffirmation(message: string): boolean {
  return AFFIRMATION_PATTERN.test(message || '');
}
