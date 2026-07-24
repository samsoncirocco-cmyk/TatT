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

const BASE_PATH = '/api/v1/design-session';

async function postJson(path: string, body: unknown): Promise<DesignSession> {
  const authHeaders = await getApiAuthHeaders();
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify(body),
  });

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
