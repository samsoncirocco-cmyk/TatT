/**
 * Human names for the reveal's four cuts, derived from each variation's
 * axis position.
 *
 * Same law as revealNarration (ADR-0012 / TAT-47 defect 8): the axis
 * machinery is an audit artifact, not chat copy. A cut is never labeled
 * "bold-fine: bold" — it's "the bold one". Every string here is designed;
 * anything unrecognized falls back to a plain cut number rather than
 * leaking a raw internal value.
 */
import type { Variation } from '@/services/designSession/types';

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
  // Ensemble briefs get their own four cuts (a close crop of four characters
  // is one cropped face), so each needs a designed name here too — otherwise
  // a whole cast reveal falls back to "cut one … cut four".
  'ensemble emblem': { name: 'the emblem', caption: 'the whole cast, dead center' },
  'battle scene': { name: 'the clash', caption: 'everyone in it, mid-fight' },
  'stacked tiers': { name: 'the totem', caption: 'stacked top to bottom' },
  'flowing procession': { name: 'the procession', caption: 'strung along the flow' },
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
