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
import type {
  ConversationMessage,
  ConversationStage,
  TurnLog,
} from '../../designConversation/types';
import type { IntakeRecord } from '../../intake/types';
import type { StoredReference } from './references';

/**
 * INTERNAL state of a conversational intake (ADR-0019–0022), stored on the
 * session while it sits in phase 'intake'. The transcript and per-turn
 * TurnLogs are the ADR-0022 day-one logs — the raw material of the taste
 * graph — so they live on the persisted session, never in memory only.
 */
export interface ConversationState {
  /** Full ordered transcript, bot and user messages alike. */
  transcript: ConversationMessage[];
  /** User turns consumed so far (the ADR-0021 cadence counter). */
  turnCount: number;
  /** Best-so-far structured record, filled as a side effect of the chat. */
  record: Partial<IntakeRecord>;
  /** One audit log per engine turn (ADR-0022). */
  turnLogs: TurnLog[];
  /** Where the conversation stands (ADR-0020, ADR-0021). */
  stage: ConversationStage;
  /**
   * Conversation model pinned on the first turn and passed back to the
   * engine every turn after (precedent: pinnedModelId for image renders).
   */
  model?: string;
  /** The one-line playback, present once the stage reached 'proposal'. */
  playback?: string;
  /**
   * Analyzed reference images attached to this session (TAT-50). Kept
   * separately from `record` because the engine overwrites the record
   * wholesale every turn — the integration layer re-merges these signals
   * after each turn and at confirm.
   */
  references?: StoredReference[];
}

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
  /**
   * Present only on sessions started through the conversational intake;
   * absent on legacy scripted sessions (the ADR-0019 degraded mode). Stays
   * on the session after the reveal — the logs travel with it (ADR-0022).
   */
  conversation?: ConversationState;
}

export interface SessionStore {
  get(id: string): Promise<StoredSession | null>;
  save(session: StoredSession): Promise<void>;
}

/**
 * Project a stored session down to the frozen public DesignSession contract.
 * Every public return of the designSession service passes through this, so
 * internal state — the pinned generation route (ADR-0016) and the
 * conversation transcript/TurnLogs (ADR-0022) — never leaves the server.
 * Whitelist, never blacklist: only the frozen contract's fields are copied,
 * so a new internal field is private by default.
 */
export function toDesignSession(session: StoredSession): DesignSession {
  const {
    id,
    phase,
    intake,
    axisSelection,
    provider,
    downgraded,
    downgradeReason,
    variations,
    critiqueCuts,
    critiqueTurns,
    fixesUsed,
    pickId,
    mostNotYouId,
    refinementQuestion,
    refinementAnswer,
    refinedVariation,
    brief,
    createdAt,
    updatedAt,
  } = session;
  return {
    id,
    phase,
    intake,
    axisSelection,
    provider,
    // A downgrade is user-facing by design (ADR-0048): the reveal copy and
    // the credit release both read it, so it crosses the boundary. Spread so
    // undowngraded sessions stay free of the fields entirely.
    ...(downgraded ? { downgraded, downgradeReason } : {}),
    variations,
    // Post-reveal re-cuts and their turns are the user's own material
    // (ADR-0039) — unlike TurnLogs, they render, so they cross the boundary.
    critiqueCuts,
    critiqueTurns,
    fixesUsed,
    pickId,
    mostNotYouId,
    refinementQuestion,
    refinementAnswer,
    refinedVariation,
    brief,
    createdAt,
    updatedAt,
  };
}

// ─── In-memory store ───────────────────────────────────────────────────

// Only relied on when Firestore is NOT active (demo mode, creds-less dev,
// tests) — environments where a single long-lived process is guaranteed.
//
// Held on globalThis, NOT in module scope: every design-session route is its
// own Next.js entry point and bundles its own instance of this module, so a
// module-scoped Map is per-ROUTE, not per-process. A session written by
// /converse was then invisible to /[id]/confirm, and tapping "show me" at
// the proposal answered "Session not found" — the reveal was unreachable in
// demo mode and in creds-less dev.
const GLOBAL_KEY = '__tattDesignSessions';
const globalStore = globalThis as typeof globalThis & {
  [GLOBAL_KEY]?: Map<string, StoredSession>;
};
const sessions: Map<string, StoredSession> = (globalStore[GLOBAL_KEY] ??= new Map());

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
