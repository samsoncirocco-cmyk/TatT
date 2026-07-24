/**
 * Session persistence seam. The orchestrator only ever talks to the
 * SessionStore interface; which backing store runs is resolved per call
 * (serverless-safe — nothing relies on module state surviving between
 * requests when Firestore is active).
 *
 * Two implementations:
 *  - in-memory  — demo mode, local dev without Firebase creds, and tests
 *  - Firestore  — production, following the repo's existing conventions
 *    (ensureAdminApp bootstrap + dynamic firebase-admin/firestore import,
 *    as in src/app/api/v1/book/route.ts)
 */
import { ensureAdminApp } from '@/lib/firebase-admin';
import type { DesignSession } from '../types';
import type { AspectRatio } from '../../generation';

/**
 * What we persist: the public DesignSession plus the pinned generation
 * route. ADR-0016 locks one provider per session — the frozen contract
 * carries the provider name, and we additionally pin the exact model id
 * resolved at session start so the refinement regen reuses it verbatim
 * instead of re-routing (routing config could change mid-session).
 */
export interface StoredSession extends DesignSession {
  /** Model id resolved once at startSession — the regen must reuse it exactly (ADR-0016). */
  pinnedModelId: string;
  /** Aspect ratio resolved alongside the model, kept for the regen. */
  pinnedAspectRatio?: AspectRatio;
}

export interface SessionStore {
  get(id: string): Promise<StoredSession | null>;
  save(session: StoredSession): Promise<void>;
}

// ─── In-memory store ───────────────────────────────────────────────────

// Module state is only relied on when Firestore is NOT active (demo mode,
// creds-less dev, tests) — exactly the environments where a single
// long-lived process is guaranteed.
const sessions = new Map<string, StoredSession>();

export const memorySessionStore: SessionStore = {
  async get(id) {
    const session = sessions.get(id);
    return session ? structuredClone(session) : null;
  },
  async save(session) {
    sessions.set(session.id, structuredClone(session));
  },
};

/** Test hook: reset the in-memory store between cases. */
export function clearMemorySessions(): void {
  sessions.clear();
}

// ─── Firestore store ───────────────────────────────────────────────────

const COLLECTION = 'design_sessions';

export const firestoreSessionStore: SessionStore = {
  async get(id) {
    const { getFirestore } = await import('firebase-admin/firestore');
    const snap = await getFirestore().collection(COLLECTION).doc(id).get();
    return snap.exists ? (snap.data() as StoredSession) : null;
  },
  async save(session) {
    const { getFirestore } = await import('firebase-admin/firestore');
    // Firestore rejects any document containing an `undefined` field
    // (optional imageUrl/pickId/etc.) — same gotcha the booking write in
    // src/app/api/v1/book/route.ts guards against. A JSON round-trip
    // drops undefined values at every depth.
    const doc = JSON.parse(JSON.stringify(session)) as Record<string, unknown>;
    await getFirestore().collection(COLLECTION).doc(session.id).set(doc);
  },
};

// ─── Store selection ───────────────────────────────────────────────────

/**
 * Pick the backing store, matching the repo's env conventions: demo mode
 * (NEXT_PUBLIC_DEMO_MODE) always runs in-memory; otherwise Firestore when
 * Firebase Admin credentials are wired, in-memory as the creds-less dev
 * fallback. Resolved per call, never cached across requests.
 */
export function resolveSessionStore(): SessionStore {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') return memorySessionStore;
  if (ensureAdminApp()) return firestoreSessionStore;
  return memorySessionStore;
}
