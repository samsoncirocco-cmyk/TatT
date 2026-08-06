/**
 * The one table of human names for a round's cuts (ADR-0049: two cuts a round).
 *
 * ## Why this is not in `features/design-session` any more
 *
 * These strings used to live in `features/design-session/services/revealCutNames.ts`
 * — inside the browser feature that renders the grid. Two things went wrong with
 * that address.
 *
 * The visible one: the customer reads "the totem" under a cut, types "the
 * totem", and `resolveCritiqueTarget` — which had never heard of this table —
 * matched nothing, fell through to its default, and re-cut a different design
 * while announcing it by name. Wrong image, real money, spoken with confidence.
 * The names the customer is shown and the names the server can resolve have to
 * come from the same place, and that place cannot be the browser.
 *
 * The quiet one: `services/sketchbotSms/internal/adapter.ts` was already
 * importing the client module from the server to name cuts over SMS. The
 * dependency ran backwards; nobody noticed because the module happens to be
 * pure.
 *
 * So the table lives here, beside the session types it describes. It imports
 * nothing at runtime — only a `type` — so the reveal grid can still import it
 * into the browser bundle without dragging the service graph along.
 *
 * ## The law this module keeps (ADR-0012 / TAT-47 defect 8)
 *
 * The axis machinery is an audit artifact, not chat copy. A cut is never
 * labeled "bold-fine: bold" — it is "the bold one". Every string here is
 * designed, and anything unrecognized falls back to a plain cut number rather
 * than leaking a raw internal value.
 */
import type { DesignSession, Variation } from './types';

export interface CutIdentity {
  /** The cut's human name — "the bold, full-color one". */
  name: string;
  /** One in-voice line under the name; empty on the generic fallback. */
  caption: string;
}

/** How each axis pole reads as part of a cut's name. */
const POLE_NAME: Record<string, string> = {
  bold: 'bold',
  fine: 'fine-line',
  color: 'full-color',
  blackwork: 'blackwork',
  literal: 'literal',
  abstract: 'abstract',
  minimal: 'minimal',
  ornate: 'ornate',
};

/** One caption fragment per pole; fragments join with an em dash. */
const POLE_CAPTION: Record<string, string> = {
  bold: 'heavy lines, built to last',
  fine: 'single-needle delicate',
  color: 'ink with a pulse',
  blackwork: 'black only, all contrast',
  literal: 'says it straight',
  abstract: 'the feeling, not the picture',
  minimal: 'one idea, room to breathe',
  ornate: 'detail stacked on detail',
};

/** Compositional mode: style is locked, so the cuts are personalities of framing. */
const COMPOSITION_IDENTITY: Record<string, CutIdentity> = {
  'centered emblem': { name: 'the emblem', caption: 'dead center, head-on' },
  'dynamic flow': { name: 'the mover', caption: 'built to sweep with the body' },
  'negative space': { name: 'the breather', caption: 'small mark, big air' },
  'close crop': { name: 'the close-up', caption: 'in tight, on purpose' },
  // Ensemble briefs get their own cuts (a close crop of four characters
  // is one cropped face), so each needs a designed name here too — otherwise
  // a whole cast reveal falls back to "cut one … cut four".
  'ensemble emblem': { name: 'the emblem', caption: 'the whole cast, dead center' },
  'battle scene': { name: 'the clash', caption: 'everyone in it, mid-fight' },
  'stacked tiers': { name: 'the totem', caption: 'stacked top to bottom' },
  'flowing procession': { name: 'the procession', caption: 'strung along the flow' },
  // A sleeve swaps out the cuts that argue with a limb-length run.
  'vertical story': { name: 'the story', caption: 'top to bottom, in order' },
  'connected transitions': { name: 'the run', caption: 'one piece, no seams' },
  'focal hierarchy': { name: 'the anchor', caption: 'one hero, the rest follow' },
};

const ORDINAL = ['one', 'two', 'three', 'four'];

/** Fallback when a position holds values we don't recognize — a plain number, never the raw value. */
function fallback(index: number): CutIdentity {
  return { name: `cut ${ORDINAL[index] ?? index + 1}`, caption: '' };
}

/**
 * Derive the human name + caption for one reveal cut.
 *
 * @param index the cut's slot in the grid (0-3), used only for the fallback name.
 */
export function cutIdentity(variation: Variation, index: number): CutIdentity {
  const position = variation.axisPosition ?? {};

  // Compositional mode: axisPosition is {composition: "<treatment>"}.
  if (typeof position.composition === 'string') {
    return COMPOSITION_IDENTITY[position.composition] ?? fallback(index);
  }

  const poles = Object.values(position);
  if (poles.length === 0) return fallback(index);

  const names: string[] = [];
  const captions: string[] = [];
  for (const pole of poles) {
    const name = POLE_NAME[pole];
    // One unknown pole poisons the whole name — a half-designed label that
    // splices in a raw value is exactly the leak this module exists to stop.
    if (!name) return fallback(index);
    names.push(name);
    captions.push(POLE_CAPTION[pole]);
  }

  return {
    name: `the ${names.join(', ')} one`,
    caption: captions.join(' — '),
  };
}

/* ── Resolving a name the customer typed ─────────────────────────────────── */

/**
 * Every designed name this product can ever put under a cut.
 *
 * Used to tell "named a cut we don't have" from "named no cut at all" — the
 * distinction the critique lane has to make before it spends a render. A name
 * that exists in the vocabulary but not in *this* session is a miss worth
 * asking about; a message with no cut reference in it at all is not.
 */
export const ALL_CUT_NAMES: readonly string[] = Object.freeze(
  Array.from(
    new Set([
      ...Object.values(COMPOSITION_IDENTITY).map((identity) => identity.name),
      ...ORDINAL.map((word) => `cut ${word}`),
    ])
  )
);

/**
 * Lowercase, strip punctuation, collapse whitespace.
 *
 * Normalization is the *only* liberty taken with the customer's text. Matching
 * stays exact on the normalized form — no stemming, no edit distance, no
 * synonyms. Fuzzy-matching display names is how "the totem" became a re-cut of
 * "the run"; widening the net would narrow that failure, not close it.
 */
export function normalizeCutName(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Does `message` contain `name` as a whole phrase?
 *
 * Whole-phrase, so "the run" does not match inside "the running man", and the
 * leading article is optional because people drop it ("totem, but bigger").
 */
export function messageNamesCut(message: string, name: string): boolean {
  const haystack = normalizeCutName(message);
  const needle = normalizeCutName(name);
  if (!haystack || !needle) return false;

  const bare = needle.replace(/^the\s+/, '');
  return [needle, bare].some((phrase) => {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?:^|\\s)${escaped}(?:$|\\s)`).test(haystack);
  });
}

/**
 * The named cuts of a session, in grid order, paired with their variation.
 *
 * Built from the same `cutIdentity` the grid renders with, so the allowlist a
 * critique is matched against is by construction the set of names the customer
 * was actually shown.
 */
export function sessionCutIdentities(
  session: Pick<DesignSession, 'variations'>
): { variation: Variation; identity: CutIdentity }[] {
  return session.variations.map((variation, index) => ({
    variation,
    identity: cutIdentity(variation, index),
  }));
}
