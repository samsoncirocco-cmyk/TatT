// Shared contract for the design-bot pipeline (ADR-0009, ADR-0010, ADR-0012).
// Both the intake extraction service and the Council's structured-input mode
// build against these types — treat this file as frozen; changing it is a
// cross-module contract change, not a local edit.

/** One dimension of deliberate divergence across a reveal's four designs (ADR-0012). */
export type VariationAxis =
  | 'bold-fine'
  | 'color-blackwork'
  | 'literal-abstract'
  | 'minimal-ornate';

export const VARIATION_AXIS_POOL: readonly VariationAxis[] = [
  'bold-fine',
  'color-blackwork',
  'literal-abstract',
  'minimal-ornate',
];

/**
 * The structured record a design session's intake produces (ADR-0009).
 * Style tags are closed to the style ontology; meaning stays freeform
 * prose for the artist brief (ADR-0010).
 */
export interface IntakeRecord {
  /** Body placement — a hard generation constraint, never inferred loosely. */
  placement: string;
  /** Closed style tags; every entry must exist in the style ontology. Empty = style unresolved. */
  styleTags: string[];
  /** Freeform emotional/meaning context, preserved verbatim as prose for the artist brief. */
  meaning: string;
  /**
   * Concrete visual subject when the user named a specific character,
   * franchise, person, or thing — e.g. "Izuku Midoriya (Deku) from My Hero
   * Academia, One For All lightning around his fist". Generation prompts
   * depict this by name instead of paraphrasing the meaning. Absent when
   * the request has no nameable subject.
   */
  subject?: string;
  /** Reference imagery the user mentioned, if any. */
  references: string[];
  /** Axes the intake left ambiguous — drives variation-axis selection (ADR-0012). */
  ambiguousAxes: VariationAxis[];
}

/**
 * The Council's auditable record of which axes a reveal diverges along and
 * why. Axis selection is logged, never silent (ADR-0012).
 */
export interface AxisSelection {
  /** 'questionnaire' varies 2 axes; 'compositional' locks style, varies composition (resolved intake). */
  mode: 'questionnaire' | 'compositional';
  /** Exactly 2 axes in questionnaire mode; empty in compositional mode. */
  axes: VariationAxis[];
  /** Plain-language reason these axes were chosen (or why style locked). */
  rationale: string;
}
