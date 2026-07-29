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
