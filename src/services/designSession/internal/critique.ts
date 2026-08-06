/**
 * The post-reveal critique lane (ADR-0039).
 *
 * Pure functions only — which cut a critique is about, whether it is a fix
 * request at all, and what the re-cut prompt becomes. Deterministic on
 * purpose, exactly like `./refinement.ts` and
 * `designConversation/internal/intent.ts`: a fixed vocabulary is cheap,
 * testable, and cannot hallucinate a fix in front of a paid render.
 *
 * The orchestrator owns everything stateful — the allowance ledger, the
 * pinned-model regen, persistence.
 */
import {
  ALL_CUT_NAMES,
  cutIdentity,
  messageNamesCut,
  sessionCutIdentities,
} from '../cutIdentity';
import type { DesignSession, Variation } from '../types';

/* ── Which cut ───────────────────────────────────────────────────────────── */

/** "the third one", "#2", "cut two", "number 4", "the 1st". */
const ORDINAL_WORDS: Record<string, number> = {
  first: 1,
  '1st': 1,
  one: 1,
  second: 2,
  '2nd': 2,
  two: 2,
  third: 3,
  '3rd': 3,
  three: 3,
  fourth: 4,
  '4th': 4,
  four: 4,
};

// The `#` alternative carries no leading \b — `#` is not a word character, so
// a shared \b would never match "#2".
const ORDINAL_PATTERN = new RegExp(
  `(?:\\bthe\\s+|\\bcut\\s+|\\bdesign\\s+|\\bnumber\\s+|\\bno\\.?\\s*|#\\s*)(${Object.keys(ORDINAL_WORDS).join('|')}|[1-4])\\b`,
  'i'
);

/** Pole words a user can name a cut by — "the blackwork one", "the bold one". */
const POLE_WORD: Record<string, RegExp> = {
  bold: /\bbold\b/i,
  fine: /\bfine([- ]?line)?\b|\bdelicate\b/i,
  color: /\bcolou?r(ful|ed)?\b/i,
  blackwork: /\bblack ?work\b|\bblack (and|&|n) gr[ae]y\b/i,
  literal: /\bliteral\b|\brealistic\b/i,
  abstract: /\babstract\b/i,
  minimal: /\bminimal(ist)?\b/i,
  ornate: /\bornate\b|\bintricate\b/i,
};

/**
 * Every cut the session can be talking about: every round's cuts in render
 * order, then any cuts critique already produced.
 */
export function allCuts(session: Pick<DesignSession, 'variations' | 'critiqueCuts'>): Variation[] {
  return [...session.variations, ...(session.critiqueCuts ?? [])];
}

/**
 * What a critique turn is about.
 *
 * `missed` exists because the old `Variation | undefined` could not tell two
 * very different situations apart, and that conflation is what cost a customer
 * a render in session 0f6234e9:
 *
 * - They typed "the totem" — a cut name this product genuinely uses, and one
 *   the grid had shown them. Nothing resolved it, so the resolver fell through
 *   to its "most recent cut" default, re-cut *the run*, and announced it by
 *   name. Confident, wrong, and paid for.
 * - They typed "make it bigger" — naming no cut at all. Falling through to the
 *   cut they are visibly working on is not a guess there; it is the context of
 *   the conversation, and taking it away would make the lane tedious.
 *
 * So: named a cut and it did not resolve to exactly one → `missed`, ask.
 * Named no cut → the context fallbacks still apply. Only `none` (no reference
 * and no context) reaches the original "which one am i fixing?" line.
 */
export type CritiqueTarget =
  | { kind: 'cut'; variation: Variation }
  | { kind: 'missed' }
  | { kind: 'none' };

/**
 * Which cut this critique is about, in falling order of confidence:
 *   1. an ordinal naming one of the session's cuts ("the third one")
 *   2. the designed name the grid showed under the cut ("the totem")
 *   3. a pole word only one reveal cut carries ("the blackwork one")
 *   4. the most recent cut critique produced — the user is still fixing it
 *   5. the session's pick, once one exists
 *
 * 1–3 are the allowlist, and they are exact matches on normalized text: no
 * stemming, no edit distance, no semantics. A reference that misses is not
 * retried more loosely — it is handed back as a question, because the cheapest
 * possible outcome of an unresolved name is asking, and the most expensive is
 * rendering the wrong design.
 */
export function resolveCritiqueTarget(
  session: Pick<DesignSession, 'variations' | 'critiqueCuts' | 'pickId'>,
  message: string
): CritiqueTarget {
  const text = (message || '').trim();

  // An ordinal is an unambiguous reference. Out of range is still a reference —
  // "the fourth one" against a two-cut round is a miss to ask about, never a
  // reason to fall through to something they did not name.
  const ordinal = text.match(ORDINAL_PATTERN);
  if (ordinal) {
    const token = ordinal[1].toLowerCase();
    const index = (ORDINAL_WORDS[token] ?? Number(token)) - 1;
    if (index >= 0 && index < session.variations.length) {
      return { kind: 'cut', variation: session.variations[index] };
    }
    return { kind: 'missed' };
  }

  // The names the customer was actually shown, matched against the same table
  // the grid rendered from. Two cuts sharing a name is a miss, not a coin flip.
  const named = sessionCutIdentities(session).filter(({ identity }) =>
    messageNamesCut(text, identity.name)
  );
  if (named.length === 1) return { kind: 'cut', variation: named[0].variation };
  if (named.length > 1) return { kind: 'missed' };

  // A pole word is a weaker signal than a name, and deliberately treated as
  // one. Exactly one carrier resolves it. Two carriers is a real ambiguity —
  // "the bold one" means nothing when both cuts are bold — so ask. But ZERO
  // carriers is usually not a reference at all: "too colorful" against a
  // blackwork round is a critique of the piece, not a cut nobody rendered, and
  // treating it as a miss would interrogate people for describing their
  // complaint.
  for (const [pole, pattern] of Object.entries(POLE_WORD)) {
    if (!pattern.test(text)) continue;
    const carrying = session.variations.filter((variation) =>
      Object.values(variation.axisPosition).includes(pole)
    );
    if (carrying.length === 1) return { kind: 'cut', variation: carrying[0] };
    if (carrying.length > 1) return { kind: 'missed' };
  }

  // A designed name from the wider vocabulary that this session never showed —
  // "the totem" on a round that has no stacked-tiers cut. The customer is
  // pointing at something; we just do not have it. Ask.
  if (ALL_CUT_NAMES.some((name) => messageNamesCut(text, name))) {
    return { kind: 'missed' };
  }

  // Named nothing. Context is legitimate from here down.
  const critiqueCuts = session.critiqueCuts ?? [];
  if (critiqueCuts.length > 0) {
    return { kind: 'cut', variation: critiqueCuts[critiqueCuts.length - 1] };
  }

  if (session.pickId) {
    const picked = allCuts(session).find((variation) => variation.id === session.pickId);
    if (picked) return { kind: 'cut', variation: picked };
  }

  return { kind: 'none' };
}

/**
 * How a cut is named back to the user — the same designed string the grid put
 * under it, so "re-cut the totem" can only ever mean the cut the customer was
 * looking at when they typed "the totem".
 *
 * Speaking a different vocabulary than we resolve is what made the original
 * failure unreadable: the reply said a name the resolver had no concept of.
 */
export function cutLabel(
  session: Pick<DesignSession, 'variations'>,
  variation: Variation
): string {
  const index = session.variations.findIndex((candidate) => candidate.id === variation.id);
  if (index < 0) return 'that last one';
  return cutIdentity(variation, index).name;
}

/* ── Is it a fix request? ────────────────────────────────────────────────── */

/**
 * The non-actionable set, deliberately tight. Everything else is a fix
 * request: someone who typed a sentence at a design they dislike meant it,
 * and an over-eager classifier that shrugs at "riku's missing" is exactly the
 * failure this lane exists to end (ADR-0039).
 */
const CHATTER_PATTERN =
  /^\s*(?:ok(?:ay)?|k|cool|nice|sick|sweet|great|love (?:it|these|them)|like (?:it|these|them)|(?:i )?love (?:it|these|them)|yes+|yeah+|yep|yup|sure|thanks?|thank you|ty|thx|hi|hey|hello|yo|lol|haha|wow|damn|perfect|amazing|beautiful|dope|fire)\b[\s!.,…]*$/i;

export function isFixRequest(message: string): boolean {
  const text = (message || '').trim();
  if (!text) return false;
  return !CHATTER_PATTERN.test(text);
}

/* ── What the re-cut prompt becomes ──────────────────────────────────────── */

/**
 * Recognized critique cues → a concrete directive the image model can act on.
 * The user's own words are always carried through verbatim as well (ADR-0010)
 * — this table only adds the technical translation of a common complaint,
 * never replaces what they said.
 */
const CRITIQUE_CUES: readonly { pattern: RegExp; directive: string }[] = [
  {
    pattern: /\btoo (busy|cluttered|crowded|much going on)\b|\bbusy\b.*\bcluttered\b|\bdeclutter\b/i,
    directive:
      'noticeably fewer elements, generous negative space, and one unambiguous focal subject',
  },
  {
    pattern: /\btoo (empty|plain|sparse|simple|bare)\b|\bneeds more\b|\bmore detail\b/i,
    directive: 'more supporting detail and texture around the focal subject',
  },
  {
    pattern: /\b(less colou?r|too colou?rful|too much colou?r|tone down the colou?r)\b/i,
    directive: 'a quieter, more muted palette with far less saturation',
  },
  {
    pattern: /\b(more colou?r|not colou?rful enough|needs colou?r)\b/i,
    directive: 'richer, more saturated color throughout',
  },
  {
    pattern: /\b(bigger|larger|scale up|blow up|too small)\b/i,
    directive: 'the elements they called out scaled up and made the clear focal point',
  },
  {
    pattern: /\b(smaller|scale down|too big|too large)\b/i,
    directive: 'the elements they called out scaled down so the composition breathes',
  },
  {
    pattern: /\b(missing|left out|forgot|where'?s|add|include|isn'?t (?:in )?there|not (?:in )?there)\b/i,
    directive:
      'every element and character they named present, clearly readable, and correctly proportioned',
  },
  {
    pattern: /\b(too dark|too heavy|too harsh|too aggressive)\b/i,
    directive: 'a lighter touch — softer contrast and less visual weight',
  },
];

/**
 * The re-cut prompt: the target cut's prompt, then the user's critique
 * verbatim, then the technical directive when a cue matched. Never rewrites
 * what they already chose — a critique adds, it does not replace.
 */
export function adjustPromptForCritique(target: Variation, message: string): string {
  const words = (message || '').trim().replace(/\s+/g, ' ');
  const cue = CRITIQUE_CUES.find((candidate) => candidate.pattern.test(words));
  const directive = cue ? ` Apply this as: ${cue.directive}.` : '';
  return `${target.prompt} Requested change: "${words}".${directive}`;
}
