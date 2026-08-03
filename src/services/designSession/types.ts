// Shared contract for the design-session pipeline (ADR-0012, ADR-0013,
// ADR-0016). The session service, API routes, and reveal UI all build against
// these types — treat this file as frozen; changing it is a cross-module
// contract change, not a local edit.

import type { IntakeRecord, AxisSelection } from '../intake/types';

/**
 * A session's lifecycle. Transitions are one-way (ADR-0013 hard stop):
 * intake → revealed → picked → complete. There is no path back from
 * 'complete' and exactly one refinement round between 'picked' and it.
 */
export type SessionPhase = 'intake' | 'revealed' | 'picked' | 'complete';

/** One of the reveal's four designs (or the single refined regen). */
export interface Variation {
  id: string;
  /** Questionnaire mode: axis → pole (e.g. {"bold-fine":"bold"}). Compositional mode: {composition: "<treatment>"}. */
  axisPosition: Record<string, string>;
  prompt: string;
  negativePrompt?: string;
  imageUrl?: string;
}

/** One post-reveal critique turn and what it produced (ADR-0039). */
export interface CritiqueTurn {
  /** The user's own words, verbatim. */
  message: string;
  /** SketchBot's reply. */
  reply: string;
  /** Variation the critique was read as being about; absent when none resolved. */
  targetId?: string;
  /** The cut this turn produced; absent when the turn spent nothing. */
  cutId?: string;
  at: string;
}

export interface DesignSession {
  id: string;
  phase: SessionPhase;
  intake: IntakeRecord;
  axisSelection: AxisSelection;
  /** Image provider locked for the whole session (ADR-0016). */
  provider: string;
  /** Exactly 4 after reveal. */
  variations: Variation[];
  /**
   * Extra cuts produced by post-reveal critique (ADR-0039). Kept out of
   * `variations` so the reveal stays the four axis-divergent takes the pick
   * signal is read against — but pickable all the same, so a critique that
   * lands can be chosen.
   */
  critiqueCuts?: Variation[];
  /** Post-reveal critique turns, oldest first (ADR-0039). */
  critiqueTurns?: CritiqueTurn[];
  /** Fixes spent in the critique lane — the server-side allowance ledger. */
  fixesUsed?: number;
  /** Variation id the user chose. */
  pickId?: string;
  /** Variation id from the most-not-you tap — the one clean negative signal. */
  mostNotYouId?: string;
  /** The single refinement question derived from the pick's axis position. */
  refinementQuestion?: string;
  refinementAnswer?: string;
  /** The one regen (ADR-0013). Present only in phase 'complete'. */
  refinedVariation?: Variation;
  brief?: Brief;
  createdAt: string;
  updatedAt: string;
}

/**
 * The artist-facing deliverable (see CONTEXT.md "Brief"). Travels with the
 * booking; the artist creates the design — the brief informs it.
 */
export interface Brief {
  placement: string;
  styleTags: string[];
  /** Freeform emotional context, verbatim from intake (ADR-0010). */
  meaning: string;
  references: string[];
  finalImageUrl?: string;
  /**
   * Black line art derived from finalImageUrl — the artist's working file,
   * where finalImageUrl is the customer's approved intent. Product-owned
   * like every other session image, because this is the one asset opened at
   * a consult days later. Absent when stencil derivation is off or its
   * render failed; a session without one is diminished, not broken.
   */
  stencilUrl?: string;
  /**
   * Flattened placement-preview screenshot (design composited onto the
   * user's own photo on the /design canvas). Same durability class as
   * finalImageUrl — a signed/CDN URL, not a permanent asset reference.
   */
  placementPreviewUrl?: string;
  axisSelection: AxisSelection;
  /** Subtle placement concerns flagged for the consult (ADR-0014). */
  placementNotes: string[];
  /** The most-not-you variation's axis position — negative preference context. */
  rejectedAxisPosition?: Record<string, string>;
}

/** POST /api/v1/design-session — start: runs intake → council → generation. */
export interface StartSessionRequest {
  placementAnswer: string;
  meaningAnswer: string;
}

/** POST /api/v1/design-session/[id]/pick */
export interface PickRequest {
  pickId: string;
  mostNotYouId: string;
}

/** POST /api/v1/design-session/[id]/refine — allowed exactly once. */
export interface RefineRequest {
  answer: string;
}

/** POST /api/v1/design-session/[id]/critique — one post-reveal turn (ADR-0039). */
export interface CritiqueRequest {
  message: string;
}

/**
 * What one critique turn hands back. `generated` is what the route meters on
 * — a chatter turn or a refused turn costs nothing and records no spend.
 */
export interface CritiqueResult {
  session: DesignSession;
  /** SketchBot's reply, always present. */
  reply: string;
  /** The cut this turn produced, when it produced one. */
  cut?: Variation;
  /** Fixes left in this session's allowance. */
  fixesRemaining: number;
  /** True once the allowance is spent — the reply is the artist handoff. */
  exhausted: boolean;
  /** True when a paid render actually ran. */
  generated: boolean;
}
