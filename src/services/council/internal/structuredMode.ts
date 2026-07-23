/**
 * Council structured-input mode (ADR-0015).
 *
 * Accepts the intake record (closed style tags + placement + freeform
 * meaning) and emits four axis-divergent prompt sets. With structured input
 * the Council's job shifts from interpretation to axis differentiation
 * (ADR-0012), so construction is fully template-based and works offline —
 * no LLM/provider call is made. The classic `enhance()` path and its
 * provider fallbacks are untouched.
 */

import type { IntakeRecord, AxisSelection, VariationAxis } from '../../intake/types';
import { VARIATION_AXIS_POOL } from '../../intake/types';
import { getAspectRatioGuidance, getBaseNegativePrompt, validatePromptLength } from './councilService';
import { COUNCIL_SKILL_PACK } from '../../../config/councilSkillPack';

export interface StructuredVariation {
  /** Which quadrant this variation occupies (questionnaire mode) or which compositional treatment it uses. */
  axisPosition: Record<string, string> | { composition: string };
  prompts: { simple?: string; detailed?: string; ultra?: string };
  negativePrompt?: string;
}

export interface StructuredEnhanceResult {
  /** Always exactly four variations (ADR-0012). */
  variations: StructuredVariation[];
  axisSelection: AxisSelection;
  metadata?: Record<string, unknown>;
}

export interface StructuredEnhanceOptions {
  /** The Council's discussion-update callback — the bot's narration channel (ADR-0015). */
  onDiscussionUpdate?: (update: unknown) => void;
}

/*
 * Axis priority (ADR-0012): when intake leaves more than two axes ambiguous
 * we pick the two most consequential for VISUAL divergence at reveal scale
 * (four thumbnails side by side):
 *
 *   1. color-blackwork  — color presence/absence changes the entire read at
 *                         any distance; the most divergent single dimension.
 *   2. literal-abstract — changes WHAT the design is, not just how it is
 *                         rendered; second-largest gap between quadrants.
 *   3. bold-fine        — line weight shifts visual weight and aging but the
 *                         subject and palette still read the same.
 *   4. minimal-ornate   — detail density is the subtlest difference at
 *                         thumbnail scale.
 */
const AXIS_PRIORITY: readonly VariationAxis[] = [
  'color-blackwork',
  'literal-abstract',
  'bold-fine',
  'minimal-ornate',
];

interface PoleSpec {
  /** Short phrase for the simple prompt tier. */
  phrase: string;
  /** Expanded treatment for the detailed/ultra tiers. */
  detail: string;
  /** What this pole must NOT drift into — appended to the negative prompt. */
  negative: string;
}

const AXIS_POLES: Record<VariationAxis, [pole: string, pole: string]> = {
  'bold-fine': ['bold', 'fine'],
  'color-blackwork': ['color', 'blackwork'],
  'literal-abstract': ['literal', 'abstract'],
  'minimal-ornate': ['minimal', 'ornate'],
};

const POLES: Record<string, PoleSpec> = {
  bold: {
    phrase: 'bold heavy linework',
    detail: 'thick confident outlines, strong visual weight, statements lines that will age solidly',
    negative: 'thin faint lines, wispy delicate linework',
  },
  fine: {
    phrase: 'fine-line work',
    detail: 'delicate thin single-needle strokes, light airy linework, precise subtle detail',
    negative: 'thick heavy outlines, chunky bold linework',
  },
  color: {
    phrase: 'vibrant full-color palette',
    detail: 'saturated hues with painterly color blending and deliberate color story',
    negative: 'monochrome, black and grey only, desaturated',
  },
  blackwork: {
    phrase: 'pure blackwork',
    detail: 'black ink only, high-contrast solid blacks, stippled and hatched shading',
    negative: 'color ink, saturated hues, rainbow palette',
  },
  literal: {
    phrase: 'literal representational depiction',
    detail: 'immediately recognizable subject rendered faithfully and realistically',
    negative: 'abstract shapes, unrecognizable symbolic forms',
  },
  abstract: {
    phrase: 'abstract interpretation',
    detail: 'suggestive shapes and symbolic forms that evoke the subject rather than depict it',
    negative: 'photorealism, literal figurative depiction',
  },
  minimal: {
    phrase: 'minimal composition',
    detail: 'restrained detail, a single clear focal element, generous breathing room',
    negative: 'clutter, dense ornamentation, busy background',
  },
  ornate: {
    phrase: 'ornate richly detailed composition',
    detail: 'decorative embellishments, dense intricate texture, layered filigree detail',
    negative: 'empty sparse composition, plain undetailed areas',
  },
};

/** Compositional-mode treatments: style locks, the four slots vary pose/framing/negative space (ADR-0012). */
const COMPOSITIONAL_TREATMENTS: { composition: string; phrase: string; detail: string }[] = [
  {
    composition: 'centered emblem',
    phrase: 'centered emblematic composition',
    detail: 'symmetrical framing, subject presented head-on as a self-contained emblem',
  },
  {
    composition: 'dynamic flow',
    phrase: 'dynamic flowing composition',
    detail: 'subject in motion along a diagonal axis, following the body contour',
  },
  {
    composition: 'negative space',
    phrase: 'open negative-space composition',
    detail: 'small off-center subject with generous untouched skin as part of the design',
  },
  {
    composition: 'close crop',
    phrase: 'tightly cropped close-up framing',
    detail: 'subject filling the canvas with edges deliberately breaking the frame',
  },
];

/** Keep the freeform meaning bounded so embedded prose can't blow the token budget. */
function truncateWords(text: string, maxWords: number): string {
  const words = (text || '').trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return words.join(' ');
  return `${words.slice(0, maxWords).join(' ')}…`;
}

/** Drop a prompt tier rather than ship one that fails the shared length validation. */
function keepIfValid(prompt: string): string | undefined {
  return validatePromptLength(prompt).valid ? prompt : undefined;
}

/**
 * Pick which axes the reveal diverges along (ADR-0012). Selection is logged,
 * never silent: the returned rationale is emitted through the discussion
 * callback and included in the result.
 */
export function selectAxes(record: IntakeRecord): AxisSelection {
  // Dedupe while walking priority order so the output is deterministic.
  const ambiguous = AXIS_PRIORITY.filter(axis => record.ambiguousAxes.includes(axis));

  if (ambiguous.length === 0) {
    const styleDesc = record.styleTags.length > 0 ? record.styleTags.join(', ') : 'the resolved style';
    return {
      mode: 'compositional',
      axes: [],
      rationale:
        `Compositional mode: intake resolved every variation axis, so style locks to ${styleDesc} ` +
        'and the four slots vary pose, framing, and negative space instead — the reveal shifts from ' +
        'questionnaire to confidence proof (ADR-0012).',
    };
  }

  if (ambiguous.length === 1) {
    // The AxisSelection contract requires exactly 2 axes in questionnaire
    // mode, so pad with the highest-priority axis not already covered.
    // Burning a slot pair on a padded axis is acknowledged noise (ADR-0012),
    // but it beats showing duplicate quadrants; the rationale says so.
    const pad = AXIS_PRIORITY.find(axis => axis !== ambiguous[0]) as VariationAxis;
    return {
      mode: 'questionnaire',
      axes: [ambiguous[0], pad],
      rationale:
        `Questionnaire mode: intake left only ${ambiguous[0]} unresolved; padded with ` +
        `${pad} (next most visually consequential) so all four reveal slots stay distinct.`,
    };
  }

  const [first, second, ...dropped] = ambiguous;
  const rationale =
    dropped.length === 0
      ? `Questionnaire mode: intake left ${first} and ${second} unresolved; the reveal varies both ` +
        'so the user\'s pick answers them without being asked.'
      : `Questionnaire mode: intake left ${ambiguous.join(', ')} unresolved; chose ${first} and ` +
        `${second} as the two most consequential for visual divergence ` +
        `(priority: ${AXIS_PRIORITY.join(' > ')}); ${dropped.join(', ')} deferred to refinement.`;

  return { mode: 'questionnaire', axes: [first, second], rationale };
}

interface PromptContext {
  styleDesc: string;
  placement: string;
  meaningShort: string;
  aspectGuidance: string;
  flowToken: string;
}

function buildContext(record: IntakeRecord): PromptContext {
  const placement = record.placement || 'forearm';
  const anatomicalFlow = COUNCIL_SKILL_PACK.anatomicalFlow as Record<string, string>;
  return {
    styleDesc: record.styleTags.length > 0 ? record.styleTags.join(', ') : 'tattoo',
    placement,
    meaningShort: truncateWords(record.meaning, 60),
    aspectGuidance: getAspectRatioGuidance(placement),
    flowToken: anatomicalFlow[placement.toLowerCase().trim()] || 'body-part appropriate flow',
  };
}

/** The subject/mood clause every variation shares — meaning informs phrasing, verbatim-ish. */
function subjectClause(ctx: PromptContext): string {
  return ctx.meaningShort ? `expressing "${ctx.meaningShort}"` : 'as a personal design';
}

function buildQuadrantVariation(
  axes: VariationAxis[],
  poles: string[],
  ctx: PromptContext
): StructuredVariation {
  const axisPosition: Record<string, string> = {};
  axes.forEach((axis, i) => {
    axisPosition[axis] = poles[i];
  });

  const specs = poles.map(pole => POLES[pole]);
  const phrases = specs.map(spec => spec.phrase).join(', ');
  const details = specs.map(spec => spec.detail).join('; ');

  const simple = `A ${ctx.styleDesc} style tattoo on the ${ctx.placement} ${subjectClause(ctx)}, rendered with ${phrases}.`;
  const detailed =
    `${simple} Treatment: ${details}. Composition follows ${ctx.aspectGuidance}.`;
  const ultra =
    `${detailed} Anatomical flow: ${ctx.flowToken}. ` +
    'Clean readable forms with deliberate focal hierarchy, designed to sit naturally on the body ' +
    'and remain legible as it ages — suitable for professional tattooing.';

  const negativePrompt = [getBaseNegativePrompt(), ...specs.map(spec => spec.negative)].join(', ');

  return {
    axisPosition,
    prompts: { simple: keepIfValid(simple), detailed: keepIfValid(detailed), ultra: keepIfValid(ultra) },
    negativePrompt,
  };
}

function buildCompositionalVariation(
  treatment: (typeof COMPOSITIONAL_TREATMENTS)[number],
  ctx: PromptContext
): StructuredVariation {
  const simple = `A ${ctx.styleDesc} style tattoo on the ${ctx.placement} ${subjectClause(ctx)}, in a ${treatment.phrase}.`;
  const detailed =
    `${simple} Treatment: ${treatment.detail}. Composition follows ${ctx.aspectGuidance}.`;
  const ultra =
    `${detailed} Anatomical flow: ${ctx.flowToken}. ` +
    'Faithful to the locked style across all variations; only pose, framing, and negative space ' +
    'differ. Clean readable forms suitable for professional tattooing.';

  return {
    axisPosition: { composition: treatment.composition },
    prompts: { simple: keepIfValid(simple), detailed: keepIfValid(detailed), ultra: keepIfValid(ultra) },
    negativePrompt: getBaseNegativePrompt(),
  };
}

/**
 * Structured-input enhancement (ADR-0015): four axis-divergent variations
 * from an intake record. Pure template construction — never calls a provider.
 */
export async function enhanceStructured(
  record: IntakeRecord,
  opts: StructuredEnhanceOptions = {}
): Promise<StructuredEnhanceResult> {
  const axisSelection = selectAxes(record);

  // Selection is logged, never silent (ADR-0012): narrate through the
  // Council's discussion-update channel (ADR-0015).
  opts.onDiscussionUpdate?.({ type: 'axis-selection', ...axisSelection });

  const ctx = buildContext(record);

  let variations: StructuredVariation[];
  if (axisSelection.mode === 'questionnaire') {
    const [axisA, axisB] = axisSelection.axes;
    const [a0, a1] = AXIS_POLES[axisA];
    const [b0, b1] = AXIS_POLES[axisB];
    variations = [
      buildQuadrantVariation([axisA, axisB], [a0, b0], ctx),
      buildQuadrantVariation([axisA, axisB], [a0, b1], ctx),
      buildQuadrantVariation([axisA, axisB], [a1, b0], ctx),
      buildQuadrantVariation([axisA, axisB], [a1, b1], ctx),
    ];
  } else {
    variations = COMPOSITIONAL_TREATMENTS.map(treatment =>
      buildCompositionalVariation(treatment, ctx)
    );
  }

  return {
    variations,
    axisSelection,
    metadata: {
      placement: record.placement,
      styleTags: record.styleTags,
      references: record.references,
      axisPool: VARIATION_AXIS_POOL,
      generatedAt: new Date().toISOString(),
      provider: 'template',
    },
  };
}
