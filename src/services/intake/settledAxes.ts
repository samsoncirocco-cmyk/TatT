/**
 * Which ladder axes the brief already settled (ADR-0049).
 *
 * A round spreads the next rung of the ROUND_AXIS_LADDER, but a rung the
 * intake already resolved must never be spread: a customer whose brief
 * committed to blackwork would pay a real credit for a round whose color cut
 * says "vibrant full-color" against a brief that front-loads "zero color".
 * This module derives the settled set from the intake record so round-one
 * axis selection (council) and later-round ladder progression (design
 * session) skip the same rungs — one derivation, never two. It lives beside
 * the IntakeRecord contract because settledness is a property of the record,
 * and it stays pure and dependency-free so the reveal UI can compute the
 * same skip its server did.
 *
 * Deliberately conservative: an axis is settled only when the record carries
 * EXPLICIT evidence of a committed pole (closed ontology tags, a named
 * subject) AND the intake did not list the axis as ambiguous. A wrongly
 * skipped rung silently removes a refinement option the customer was owed —
 * the opposite failure — so vibes never settle anything.
 */
import type { IntakeRecord, VariationAxis } from './types';

/*
 * Palette resolution. Style tags decide whether a session is monochrome or
 * color; the council's prompt construction and the round ladder both hang
 * off this single decision, which is why it lives here rather than in
 * either consumer.
 */
const MONOCHROME_TAGS = new Set([
  'blackwork',
  'black-and-grey',
  'fine-line',
  'geometric',
  'dotwork',
]);

const COLOR_TAGS = new Set(['color', 'neo-traditional', 'watercolor', 'new-school']);

export type Palette = 'color' | 'monochrome' | 'unresolved';

/**
 * Color wins a tag conflict ("fine-line color"): naming color is an explicit
 * commitment, while the monochrome tags are often just line-style shorthand.
 */
export function resolvePalette(styleTags: readonly string[]): Palette {
  if (styleTags.some(tag => COLOR_TAGS.has(tag))) return 'color';
  if (styleTags.some(tag => MONOCHROME_TAGS.has(tag))) return 'monochrome';
  return 'unresolved';
}

/** The only ontology tag that commits a pole of bold-fine (there is no 'bold' tag). */
const FINE_TAGS = new Set(['fine-line']);

/** Tags that commit literal-abstract to a pole outright. */
const LITERAL_TAGS = new Set(['realism', 'portrait']);
const ABSTRACT_TAGS = new Set(['abstract', 'surrealism']);

/** Tags that commit minimal-ornate to a pole outright. */
const MINIMAL_TAGS = new Set(['minimalist']);
const ORNATE_TAGS = new Set(['ornamental']);

/**
 * The ladder axes this brief has committed one pole of, so a round must
 * never spread them (ADR-0049). Two conditions, both required:
 *
 *   1. Explicit pole evidence on the record — a resolved palette, a
 *      pole-committing closed style tag, or (for literal-abstract) a named
 *      subject: the IP rule resolves a named character to literal at
 *      extraction, because a recognizable depiction is the point.
 *   2. The axis is NOT in `ambiguousAxes`. The intake owns that list —
 *      an axis it left open (or deliberately reopened, as the conversation
 *      does when the customer asks to SEE both poles) stays spreadable no
 *      matter what the tags suggest. This is also what keeps line-style
 *      shorthand ("fine-line" reads monochrome to resolvePalette) from
 *      swallowing a palette question the customer never answered.
 *
 * An explicitly requested axis (IntakeRecord.requestedAxis) is the caller's
 * concern, not this one's: round-one selection lets the request win over a
 * settled skip, because asking to see the split is stronger, later evidence
 * than the tags that settled it.
 */
export function settledAxes(record: IntakeRecord): VariationAxis[] {
  const tags = record.styleTags;
  const settled = new Set<VariationAxis>();

  if (resolvePalette(tags) !== 'unresolved') settled.add('color-blackwork');
  if (tags.some(tag => FINE_TAGS.has(tag))) settled.add('bold-fine');
  if (
    (record.subject ?? '').trim() ||
    tags.some(tag => LITERAL_TAGS.has(tag) || ABSTRACT_TAGS.has(tag))
  ) {
    settled.add('literal-abstract');
  }
  if (tags.some(tag => MINIMAL_TAGS.has(tag) || ORNATE_TAGS.has(tag))) {
    settled.add('minimal-ornate');
  }

  return [...settled].filter(axis => !record.ambiguousAxes.includes(axis));
}
