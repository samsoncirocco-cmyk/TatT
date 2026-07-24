// Thin fetch client for the design-session API (frozen contract:
// src/services/designSession/types.ts). The UI never talks to intake,
// council, or generation directly — the session routes orchestrate those.

import { getApiAuthHeaders } from '@/lib/client-api-auth';
import type {
  DesignSession,
  StartSessionRequest,
  PickRequest,
  RefineRequest,
} from '@/services/designSession/types';
import type {
  ConverseRequest,
  ConverseResponse,
} from '@/services/designConversation/types';

const BASE_PATH = '/api/v1/design-session';

/**
 * Every conversation provider is down (503 from converse). The flow catches
 * this to degrade seamlessly to the scripted two-question intake (ADR-0019).
 */
export class ConversationUnavailableError extends Error {}

async function postAuthed(path: string, body: unknown): Promise<Response> {
  const authHeaders = await getApiAuthHeaders();
  return fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify(body),
  });
}

async function postJson(path: string, body: unknown): Promise<DesignSession> {
  const res = await postAuthed(path, body);

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // Non-JSON body (e.g. a 500 HTML page) — fall through to status error.
  }

  if (!res.ok) {
    const message =
      (data as { error?: string } | null)?.error ??
      `Design session request failed (${res.status})`;
    throw new Error(message);
  }

  // Tolerate both a bare DesignSession body and a { session } envelope.
  const record = data as ({ session?: DesignSession } & DesignSession) | null;
  if (!record) throw new Error('Design session response was empty');
  return record.session ?? record;
}

/** POST /api/v1/design-session — runs intake → council → generation. */
export function startSession(request: StartSessionRequest): Promise<DesignSession> {
  return postJson(BASE_PATH, request);
}

/** POST /api/v1/design-session/[id]/pick — the pick + most-not-you tap. */
export function submitPick(sessionId: string, request: PickRequest): Promise<DesignSession> {
  return postJson(`${BASE_PATH}/${sessionId}/pick`, request);
}

/** POST /api/v1/design-session/[id]/refine — allowed exactly once (ADR-0013). */
export function submitRefinement(sessionId: string, request: RefineRequest): Promise<DesignSession> {
  return postJson(`${BASE_PATH}/${sessionId}/refine`, request);
}

/**
 * POST /api/v1/design-session/[id]/placement-preview — persist the flattened
 * placement-preview screenshot (PNG data URL) onto the completed session's
 * Brief so it attaches to the booking record.
 */
export function attachPlacementPreview(
  sessionId: string,
  imageData: string
): Promise<DesignSession> {
  return postJson(`${BASE_PATH}/${sessionId}/placement-preview`, { imageData });
}

/**
 * POST /api/v1/design-session/converse — one conversational intake turn
 * (ADR-0019). Omit sessionId and message to open a new conversation. A 503
 * (every provider down) throws ConversationUnavailableError so the UI can
 * fall back to the scripted intake.
 */
export async function converse(request: ConverseRequest): Promise<ConverseResponse> {
  const res = await postAuthed(`${BASE_PATH}/converse`, request);

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // Non-JSON body — fall through to status error.
  }

  const errorMessage = (data as { error?: string } | null)?.error;
  if (res.status === 503) {
    throw new ConversationUnavailableError(errorMessage ?? 'Conversation unavailable');
  }
  if (!res.ok) {
    throw new Error(errorMessage ?? `Design conversation request failed (${res.status})`);
  }
  if (!data) throw new Error('Design conversation response was empty');
  return data as ConverseResponse;
}

/**
 * POST /api/v1/design-session/[id]/confirm — the user's yes to the proposal
 * (ADR-0020). Fires generation and responds with the revealed DesignSession.
 */
export function confirmProposal(sessionId: string): Promise<DesignSession> {
  return postJson(`${BASE_PATH}/${sessionId}/confirm`, {});
}
