// Shared contract for the conversational intake (ADR-0019–0022). The
// conversation engine, designSession integration, API routes, and chat UI all
// build against these types — treat this file as frozen; changing it is a
// cross-module contract change, not a local edit.

import type { IntakeRecord } from '../intake/types';

/** One message in the intake conversation. */
export interface ConversationMessage {
  role: 'bot' | 'user';
  text: string;
}

/**
 * Where the conversation stands after a turn (ADR-0020, ADR-0021).
 * 'chatting'  — keep talking.
 * 'proposal'  — bot played back what it heard and asked to generate (turn ~6
 *               by judgment, forced by turn 12 once placement is known — the
 *               forced proposal never fires without a placement; the bot asks
 *               for it directly instead, ADR-0021 amendment).
 * 'handoff'   — turn-20 warm handoff to artists with free consultations;
 *               never framed as a limit.
 */
export type ConversationStage = 'chatting' | 'proposal' | 'handoff';

/**
 * Per-turn audit record — logged from day one so proposal timing can be
 * tuned against real transcripts. Confidence is the engine's readiness
 * score for firing the proposal, not a model logprob.
 */
export interface TurnLog {
  /** 1-based user-turn number. */
  turn: number;
  /** 0–1 readiness score for the intake record as of this turn. */
  confidence: number;
  /** IntakeRecord fields still considered missing/weak. */
  missingFields: string[];
  /** Which cadence rule decided this turn's stage. */
  firedRule:
    | 'judgment'
    | 'turn12-force-proposal'
    | 'turn12-ask-placement'
    | 'turn20-handoff'
    | 'none';
  /** Model that served the turn (per-session pinned; fallback noted). */
  model: string;
}

/** POST /api/v1/design-session/converse */
export interface ConverseRequest {
  /** Omit to start a new conversation (bot sends the opener). */
  sessionId?: string;
  /** Omit on the opening call. */
  message?: string;
}

export interface ConverseResponse {
  sessionId: string;
  reply: string;
  stage: ConversationStage;
  /** Present when stage is 'proposal': the one-line playback. */
  playback?: string;
  /** Present when stage is 'handoff': URL for the warm handoff CTA. */
  handoffUrl?: string;
  turn: number;
}

/**
 * POST /api/v1/design-session/[id]/confirm — the user's yes to the proposal
 * (ADR-0020). Fires generation via the existing reveal pipeline; responds
 * with the revealed DesignSession. A 'no'/correction is just another
 * converse message, not this endpoint.
 */
export interface ConfirmRequest {
  /** Reserved; no fields today. */
  _?: never;
}

/** The engine's per-turn result, consumed by the designSession integration. */
export interface ConversationTurnResult {
  reply: string;
  stage: ConversationStage;
  playback?: string;
  /** Best-so-far structured record; complete enough to generate once stage is 'proposal'. */
  record: Partial<IntakeRecord>;
  turnLog: TurnLog;
}
