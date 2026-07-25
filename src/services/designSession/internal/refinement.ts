/**
 * The single refinement round (ADR-0013): one question derived from the
 * pick, one template-based prompt adjustment from the answer. No LLM —
 * the poles already carry the vocabulary, we just lean into or away from
 * the picked variation's dominant pole.
 */
import type { DesignSession, Variation } from '../types';

/**
 * Question adjective per pole — "Too <adj>, or not <adj> enough?".
 * Keyed by pole (not axis) because the question probes the pole the user
 * actually picked, e.g. bold → "Too bold, or not bold enough?".
 */
const POLE_QUESTION_ADJECTIVE: Record<string, string> = {
  bold: 'bold',
  fine: 'delicate',
  color: 'colorful',
  blackwork: 'stark',
  literal: 'literal',
  abstract: 'abstract',
  minimal: 'minimal',
  ornate: 'ornate',
};

/** How to push toward / pull back from each pole in the regen prompt. */
const POLE_TUNING: Record<string, { intensify: string; soften: string }> = {
  bold: {
    intensify: 'even bolder, heavier confident linework',
    soften: 'slightly lighter linework, keeping the bold intent without overwhelming',
  },
  fine: {
    intensify: 'even finer, more delicate single-needle detail',
    soften: 'slightly sturdier lines while keeping the delicate feel',
  },
  color: {
    intensify: 'richer, more saturated color throughout',
    soften: 'a quieter, more muted palette',
  },
  blackwork: {
    intensify: 'deeper solid blacks, higher contrast',
    soften: 'softer greywash contrast in place of heavy solids',
  },
  literal: {
    intensify: 'an even more faithful, immediately recognizable rendering',
    soften: 'a touch more stylized interpretation',
  },
  abstract: {
    intensify: 'further abstracted, more purely symbolic forms',
    soften: 'slightly more recognizable forms',
  },
  minimal: {
    intensify: 'pared back further, fewer elements and more breathing room',
    soften: 'a little more supporting detail around the focal element',
  },
  ornate: {
    intensify: 'denser, more intricate ornamentation',
    soften: 'lightened ornamentation with more breathing room',
  },
};

/** The compositional-mode (or unreadable-axes) refinement question. */
export const PERMANENCE_QUESTION =
  "Does this feel permanent to you — like something you'd still want in ten years?";

interface DominantPole {
  axis: string;
  pole: string;
  adjective: string;
}

/**
 * The picked variation's dominant pole. AxisSelection.axes is already
 * ordered by the Council's visual-consequence priority (ADR-0012), so the
 * first axis readable off the pick is the dominant one.
 */
function dominantPole(
  session: Pick<DesignSession, 'axisSelection'>,
  picked: Variation
): DominantPole | null {
  if (session.axisSelection.mode !== 'questionnaire') return null;
  for (const axis of session.axisSelection.axes) {
    const pole = picked.axisPosition[axis];
    if (pole && POLE_QUESTION_ADJECTIVE[pole]) {
      return { axis, pole, adjective: POLE_QUESTION_ADJECTIVE[pole] };
    }
  }
  return null;
}

/**
 * The ONE refinement question (ADR-0013). Questionnaire mode probes the
 * dominant axis of the pick; compositional mode (or a pick whose axis
 * position isn't readable) asks the permanence question instead.
 */
export function deriveRefinementQuestion(
  session: Pick<DesignSession, 'axisSelection'>,
  picked: Variation
): string {
  const dominant = dominantPole(session, picked);
  if (!dominant) return PERMANENCE_QUESTION;
  return `Too ${dominant.adjective}, or not ${dominant.adjective} enough?`;
}

// "not <x> enough" / "more" / comparatives → push harder into the pole.
const INTENSIFY_SIGNALS = /not\s+(\w+\s+)?\w+\s+enough|\bmore\b|\bstronger\b|\bbolder\b|\bpush\b/i;
// "too <x>" / "less" / "tone it down" → pull back from the pole.
const SOFTEN_SIGNALS = /\btoo\b|\bless\b|\bsofter\b|tone\s+(it\s+)?down|dial(ed)?\s+(it\s+)?(back|down)/i;
// Permanence doubt — the ten-years question answered with hesitation.
const DOUBT_SIGNALS = /\bno\b|\bnot\b|\bunsure\b|\bdon'?t\b|\bdoubt\b|\bmaybe\b/i;

/**
 * Template-based prompt adjustment from the refinement answer. Appends a
 * pole-specific modifier to the picked variation's prompt; never rewrites
 * what the user already chose.
 */
export function adjustPromptForAnswer(
  session: Pick<DesignSession, 'axisSelection'>,
  picked: Variation,
  answer: string
): string {
  const dominant = dominantPole(session, picked);
  let modifier: string;

  if (dominant) {
    const tuning = POLE_TUNING[dominant.pole];
    if (INTENSIFY_SIGNALS.test(answer)) modifier = tuning.intensify;
    else if (SOFTEN_SIGNALS.test(answer)) modifier = tuning.soften;
    else modifier = 'a cleaner, more considered execution of the same treatment';
  } else {
    modifier = DOUBT_SIGNALS.test(answer)
      ? 'a timeless, classic treatment designed to age gracefully over decades'
      : 'a refined, cleaner execution of the same composition';
  }

  return `${picked.prompt} Refinement: ${modifier}.`;
}
