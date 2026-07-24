// Public entry point of the design-session module (ADR-0012, ADR-0013,
// ADR-0016). Everything under internal/ is implementation detail — import
// only from here.
//
// The design session is the reveal + refinement round: intake → four
// axis-divergent renders on one pinned provider → pick + most-not-you tap
// → one refinement question → one regen → the artist Brief. The phase
// machine is one-way (intake → revealed → picked → complete) with a hard
// stop after the single refinement — persistence, provider pinning, question
// derivation, and placement cautions are all private.
import {
  startSession as runStart,
  recordPick as runPick,
  refine as runRefine,
  getSession as loadById,
} from './internal/orchestrator';
import {
  converse as runConverse,
  confirmProposal as runConfirm,
} from './internal/conversation';
// The public boundary strips internal session state (pinned generation
// route, conversation transcript/TurnLogs) — every function returning a
// session projects it through toDesignSession before it leaves the module,
// so API routes can serialize returns as-is without shipping internals to
// the browser. Internal callers keep the full StoredSession.
import { toDesignSession } from './internal/store';
import type {
  DesignSession,
  StartSessionRequest,
  PickRequest,
  RefineRequest,
} from './types';
import type { ConverseRequest, ConverseResponse } from '../designConversation/types';

export { DesignSessionError } from './internal/orchestrator';
export type { DesignSessionErrorCode } from './internal/orchestrator';
export type {
  DesignSession,
  SessionPhase,
  Variation,
  Brief,
  StartSessionRequest,
  PickRequest,
  RefineRequest,
} from './types';
export type {
  ConverseRequest,
  ConverseResponse,
  ConversationStage,
} from '../designConversation/types';

/**
 * Start a design session from the two intake answers: extraction →
 * Council structured enhancement → four variation renders on ONE image
 * provider resolved once and pinned for the whole session (ADR-0016).
 * Returns the persisted session in phase 'revealed'.
 */
export async function startSession(request: StartSessionRequest): Promise<DesignSession> {
  return toDesignSession(await runStart(request));
}

/**
 * Record the user's pick and most-not-you tap (two distinct variation
 * ids), derive the single refinement question from the picked variation's
 * axis position, and advance to phase 'picked'. Throws DesignSessionError
 * on an unknown session, a wrong phase, or invalid variation ids.
 */
export async function recordPick(sessionId: string, request: PickRequest): Promise<DesignSession> {
  return toDesignSession(await runPick(sessionId, request));
}

/**
 * The one refinement round (ADR-0013 hard stop): adjust the picked
 * prompt from the answer, regenerate a single image on the session's
 * pinned provider, assemble the artist Brief, and close the session at
 * phase 'complete'. Exactly once — any later call throws a
 * DesignSessionError, never a second regen.
 */
export async function refine(sessionId: string, request: RefineRequest): Promise<DesignSession> {
  return toDesignSession(await runRefine(sessionId, request));
}

/** Fetch a session by id. Throws DesignSessionError (SESSION_NOT_FOUND) when absent. */
export async function getSession(sessionId: string): Promise<DesignSession> {
  return toDesignSession(await loadById(sessionId));
}

/**
 * One turn of the conversational intake (ADR-0019–0022). Without a
 * sessionId, creates a session at phase 'intake' and returns the bot's
 * opener; with one, runs the user's message through the conversation
 * engine on the session's pinned conversation model. Transcript, partial
 * record, and per-turn TurnLogs are persisted on the session every turn.
 * Throws DesignSessionError CONVERSATION_UNAVAILABLE (503) when every
 * conversation provider is down — callers downgrade to the scripted
 * startSession flow (ADR-0019 degraded mode).
 */
export async function converse(request: ConverseRequest): Promise<ConverseResponse> {
  return runConverse(request);
}

/**
 * The user's yes to the proposal (ADR-0020): requires phase 'intake' with
 * the conversation at stage 'proposal', then fires the existing reveal
 * pipeline (council → pinned route → four renders) over the record the
 * conversation extracted, moving the session to phase 'revealed'. Throws
 * DesignSessionError INVALID_PHASE before the proposal or after the reveal.
 */
export async function confirmProposal(sessionId: string): Promise<DesignSession> {
  return toDesignSession(await runConfirm(sessionId));
}
