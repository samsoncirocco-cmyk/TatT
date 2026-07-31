/**
 * SketchBot's lines inside the Studio (ADR-0038, ADR-0035 loud register).
 *
 * Same person as the intake bot in `src/services/designConversation` and the
 * reference-photo lines in `src/services/vision` — lowercase-comfortable,
 * plain, never corporate. Two rules carried over verbatim from those modules:
 * a refusal is a judgment call or honest capacity, never "limit reached"; and
 * nothing happens to the design silently.
 *
 * Kept in one place so the Studio's copy can be reviewed as copy (ADR-0036)
 * instead of being scattered through JSX.
 */

/** The one instruction line on the default surface — gear 1 is this sentence. */
export const REFINERY_OPENER =
  "circle the part that's bugging you, then tell me what's wrong. i'll redraw just that bit.";

/** Said once a region exists and the box is waiting for words. */
export const REGION_READY_LINE = "got it — what's wrong with that bit?";

/** In flight. */
export const WORKING_LINE = 'redrawing that patch — hang on.';

/** The before/after beat: nothing is applied until the user says so. */
export const BEFORE_AFTER_LINE = "that's the before and after. keep it, or put it back?";

export const KEPT_LINE = 'kept it.';
export const REVERTED_LINE = "put it back — no harm done.";

/** A render came back empty or errored. Honest, not alarming. */
export const REFINEMENT_FAILED_LINE =
  "that one didn't come back. try circling a slightly bigger area and say it again.";

/** Nothing to refine — the Studio is entered from a picked design, never cold. */
export const NO_DESIGN_LINE =
  "nothing on the bench yet. pick a design first and i'll meet you back here.";

/**
 * How many fixes are left, in voice rather than as a meter (ADR-0038).
 * Spoken after each fix lands, so the ceiling is never a surprise.
 */
export function fixesLeftLine(remaining: number): string {
  if (remaining <= 0) return ALLOWANCE_SPENT_LINE;
  if (remaining === 1) return "one more fix in this one and i'll hand you over.";
  return `${remaining} more fixes in this one before i hand you over.`;
}

/**
 * The ceiling. Not a paywall, not silence — the true thing to say is that
 * this is what an artist is for, plus a door into booking.
 */
export const ALLOWANCE_SPENT_LINE =
  "you're deep in this one — that's what your artist is for. they'll close the last ten percent on skin better than i can on a screen.";

/** The button next to the ceiling line. */
export const ALLOWANCE_SPENT_CTA = 'find your artist';

/** Global budget gone: honest capacity, said out loud, never a silent failure. */
export const AT_CAPACITY_LINE =
  "i'm at capacity right now and can't run another render. your artist can take it from here.";

/**
 * Gear 3 on a phone. ADR-0038 chose an honest handoff over a cramped
 * imitation — say so, and leave the door for later.
 */
export const FULL_BENCH_MOBILE_LINE =
  'the full bench — layers, blend modes, version history — wants a big screen and a cursor. open the studio on a desktop and it’s all here.';

/** The explicit door into gear 3. Labelled, so nobody stumbles in. */
export const FULL_BENCH_DOOR_LABEL = 'open the full bench';
export const FULL_BENCH_CLOSE_LABEL = 'close the full bench';
