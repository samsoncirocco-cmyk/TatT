/**
 * In-voice lines for reference-image moments (TAT-50), shared by both
 * channels so SMS and web never drift apart on how SketchBot talks about
 * photos. Same register as the persona (consultant; refusals are judgment
 * calls or honest capacity, never "limit reached") — and the bot NEVER
 * silently ingests an image: every analyzed photo gets an acknowledgment
 * that names what was seen.
 */

import type { ReferenceAnalysis } from '../types';

/** Ack that names what was seen — the "never silently ingests" promise. */
export function referenceAckText(analysis: ReferenceAnalysis): string {
  return `Got your photo — I'm seeing ${analysis.summary}.`;
}

/**
 * The ONE most useful follow-up after a reference lands: characters
 * recognized means the real fork is cast-vs-style; otherwise it's whether
 * the style should steer the piece.
 */
export function referenceFollowUpText(analysis: ReferenceAnalysis): string {
  return analysis.characters.length > 0
    ? 'Want the characters themselves in the piece, or just that style?'
    : 'Want me to fold that style into your piece?';
}

/** The analyzer could not produce a reading — honest, and asks for words. */
export const REFERENCE_UNREADABLE_TEXT =
  "I couldn't quite make that image out — tell me what's in it and I'll work from your words.";

/** Vision skipped on an exhausted budget — honest capacity, never silence. */
export const REFERENCE_BUDGET_TEXT =
  "I can't study photos right now — describe what you're seeing and we'll keep moving.";

/** More images arrived than the per-message cap — polite, not a wall. */
export function referenceOverflowText(analyzedCount: number): string {
  return `I stuck with the first ${analyzedCount === 1 ? 'photo' : String(analyzedCount) + ' photos'} — send the others one at a time if they matter.`;
}
