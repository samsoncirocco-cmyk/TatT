/**
 * Conversational intake integration (ADR-0019–0022).
 *
 * Wires the conversation engine ('@/services/designConversation', consumed
 * only via its public entry) into the design session. The engine is
 * stateless — this module owns everything it doesn't: persistence of the
 * transcript, turn count, partial record, and per-turn TurnLogs (the
 * ADR-0022 day-one logs live on the stored session), per-session
 * conversation-model pinning (TurnLog.model passed back as pinnedModel,
 * precedent: pinnedModelId), and the ConverseRequest/Response mapping.
 *
 * confirmProposal() is the user's yes to the ADR-0020 proposal — it runs
 * the EXISTING reveal pipeline over the conversation's extracted record via
 * the shared startFromRecord path, moving phase 'intake' → 'revealed'.
 */
import { randomUUID } from 'crypto';
import {
  runTurn,
  opener,
  HANDOFF_URL,
  ConversationUnavailableError,
} from '../../designConversation';
import type {
  ConversationTurnResult,
  ConverseRequest,
  ConverseResponse,
} from '../../designConversation/types';
import type { IntakeRecord } from '../../intake/types';
import { resolveSessionStore } from './store';
import type { StoredSession } from './store';
import { DesignSessionError, loadSession, startFromRecord } from './orchestrator';

/**
 * Placeholder DesignSession fields for a session still in conversational
 * intake: the frozen contract requires them, but they only become real at
 * confirm, when startFromRecord overwrites every one of them.
 */
function newConversationSession(): StoredSession {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    phase: 'intake',
    intake: { placement: '', styleTags: [], meaning: '', references: [], ambiguousAxes: [] },
    axisSelection: {
      mode: 'questionnaire',
      axes: [],
      rationale: 'Pending conversational intake — axis selection happens at confirm.',
    },
    provider: '',
    pinnedModelId: '',
    variations: [],
    conversation: { transcript: [], turnCount: 0, record: {}, turnLogs: [], stage: 'chatting' },
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * The engine promises the record is complete enough to generate once the
 * stage is 'proposal' (frozen contract); the fill-ins below only normalize
 * absent optionals so the reveal pipeline gets a well-formed record.
 */
function completeIntakeRecord(record: Partial<IntakeRecord>): IntakeRecord {
  return {
    placement: record.placement ?? '',
    styleTags: record.styleTags ?? [],
    meaning: record.meaning ?? '',
    references: record.references ?? [],
    ambiguousAxes: record.ambiguousAxes ?? [],
  };
}

/**
 * One conversational turn (ADR-0019). No sessionId starts a new session at
 * phase 'intake' — the deterministic opener, no model call. With one, the
 * user message becomes the next engine turn on the session's pinned
 * conversation model, and everything the engine returns is persisted before
 * responding.
 */
export async function converse(request: ConverseRequest): Promise<ConverseResponse> {
  const store = resolveSessionStore();

  let session: StoredSession;
  if (request.sessionId === undefined) {
    session = newConversationSession();
    if (request.message === undefined) {
      // The opening call: the bot leads with placement and meaning
      // (ADR-0019) — deterministic, free, and never a model turn.
      const reply = opener();
      session.conversation!.transcript = [{ role: 'bot', text: reply }];
      await store.save(session);
      return { sessionId: session.id, reply, stage: 'chatting', turn: 0 };
    }
  } else {
    session = await loadSession(store, request.sessionId);
    if (session.phase !== 'intake' || !session.conversation) {
      throw new DesignSessionError(
        'INVALID_PHASE',
        `Cannot converse while the session is '${session.phase}' — the conversation ends once the reveal fires.`
      );
    }
    if (session.conversation.stage === 'handoff') {
      throw new DesignSessionError(
        'INVALID_PHASE',
        'This conversation closed with a warm handoff to artists — start a new session to design again.'
      );
    }
  }

  const conversation = session.conversation!;
  const message = request.message?.trim() ?? '';
  const userTurn = conversation.turnCount + 1;
  const messages = [...conversation.transcript, { role: 'user' as const, text: message }];

  let result: ConversationTurnResult;
  try {
    result = await runTurn({
      messages,
      userTurn,
      pinnedModel: conversation.model,
    });
  } catch (error) {
    if (error instanceof ConversationUnavailableError) {
      // Typed domain error the route maps to 503 — the UI downgrades to the
      // scripted two-question intake (ADR-0019 degraded mode).
      throw new DesignSessionError(
        'CONVERSATION_UNAVAILABLE',
        'Every conversation provider is unavailable — fall back to the scripted intake.'
      );
    }
    throw error;
  }

  // Persist everything: transcript + TurnLogs are the ADR-0022 day-one logs.
  conversation.transcript = [...messages, { role: 'bot', text: result.reply }];
  conversation.turnCount = userTurn;
  conversation.record = result.record;
  conversation.turnLogs = [...conversation.turnLogs, result.turnLog];
  conversation.stage = result.stage;
  if (result.playback !== undefined) conversation.playback = result.playback;
  // Per-session model pinning: pass back TurnLog.model as the next turn's
  // pinnedModel (the engine's provider chain tries it first).
  conversation.model = result.turnLog.model;
  session.updatedAt = new Date().toISOString();
  await store.save(session);

  const response: ConverseResponse = {
    sessionId: session.id,
    reply: result.reply,
    stage: result.stage,
    turn: userTurn,
  };
  if (result.stage === 'proposal' && result.playback !== undefined) {
    response.playback = result.playback;
  }
  if (result.stage === 'handoff') {
    // Warm handoff CTA (ADR-0021) — the engine owns the destination.
    response.handoffUrl = HANDOFF_URL;
  }
  return response;
}

/**
 * The user's yes to the proposal (ADR-0020): requires phase 'intake' with
 * stage 'proposal' reached, then runs the existing reveal pipeline over the
 * conversation's extracted record — the session moves to phase 'revealed'
 * in place, keeping its id and conversation logs.
 */
export async function confirmProposal(sessionId: string): Promise<StoredSession> {
  const store = resolveSessionStore();
  const session = await loadSession(store, sessionId);

  if (session.phase !== 'intake' || !session.conversation) {
    throw new DesignSessionError(
      'INVALID_PHASE',
      `Cannot confirm while the session is '${session.phase}' — confirmation fires the reveal exactly once.`
    );
  }
  if (session.conversation.stage !== 'proposal') {
    throw new DesignSessionError(
      'INVALID_PHASE',
      'The conversation has not reached its proposal yet — generation fires on announce + confirm (ADR-0020), never before.'
    );
  }

  return startFromRecord(completeIntakeRecord(session.conversation.record), session);
}
