/**
 * Phone-profile persistence for the SMS channel (TAT-49).
 *
 * Same seam shape as designSession/internal/store.ts: an interface, an
 * in-memory implementation (demo mode, creds-less dev, tests) held on
 * globalThis, and a Firestore implementation for production.
 *
 * The reveal counter is the load-bearing part: `tryConsumeReveal` is the
 * atomic reserve that makes the per-phone daily cap a hard mathematical
 * bound, not a read-modify-write race. It runs in a Firestore transaction
 * (single-threaded in the memory store) and consumes BEFORE generation
 * fires; `releaseReveal` refunds the slot only when generation failed.
 */
import { ensureAdminApp } from '@/lib/firebase-admin';
import type { SmsProfile } from '../types';

const COLLECTION = 'sms_profiles';

/** UTC calendar date — the reveal cap's day boundary. */
export function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export function newProfile(phone: string): SmsProfile {
  const now = new Date().toISOString();
  return {
    phone,
    uid: null,
    optedOut: false,
    activeSessionId: null,
    lastStage: null,
    totalReveals: 0,
    dailyReveals: { date: utcToday(), count: 0 },
    sessionIds: [],
    createdAt: now,
    updatedAt: now,
  };
}

export interface ProfileStore {
  get(phone: string): Promise<SmsProfile | null>;
  save(profile: SmsProfile): Promise<void>;
  /**
   * Atomically reserve one reveal for today. Returns false without
   * consuming anything once today's count has reached `dailyCap` — the
   * caller refuses in-voice. On success today's count AND totalReveals are
   * already incremented when this resolves.
   */
  tryConsumeReveal(phone: string, dailyCap: number): Promise<boolean>;
  /** Refund a reserved reveal after a failed generation (floor 0). */
  releaseReveal(phone: string): Promise<void>;
}

function rolledDaily(profile: SmsProfile): { date: string; count: number } {
  const today = utcToday();
  return profile.dailyReveals.date === today
    ? profile.dailyReveals
    : { date: today, count: 0 };
}

// ─── In-memory store ───────────────────────────────────────────────────
// globalThis, not module scope — same per-route-bundle gotcha documented in
// designSession/internal/store.ts.

const GLOBAL_KEY = '__tattSmsProfiles';
const globalStore = globalThis as typeof globalThis & {
  [GLOBAL_KEY]?: Map<string, SmsProfile>;
};
const profiles: Map<string, SmsProfile> = (globalStore[GLOBAL_KEY] ??= new Map());

export const memoryProfileStore: ProfileStore = {
  async get(phone) {
    const profile = profiles.get(phone);
    return profile ? structuredClone(profile) : null;
  },
  async save(profile) {
    profiles.set(profile.phone, structuredClone(profile));
  },
  async tryConsumeReveal(phone, dailyCap) {
    const profile = profiles.get(phone) ?? newProfile(phone);
    const daily = rolledDaily(profile);
    if (daily.count >= dailyCap) return false;
    profile.dailyReveals = { date: daily.date, count: daily.count + 1 };
    profile.totalReveals += 1;
    profile.updatedAt = new Date().toISOString();
    profiles.set(phone, profile);
    return true;
  },
  async releaseReveal(phone) {
    const profile = profiles.get(phone);
    if (!profile) return;
    const daily = rolledDaily(profile);
    profile.dailyReveals = { date: daily.date, count: Math.max(0, daily.count - 1) };
    profile.totalReveals = Math.max(0, profile.totalReveals - 1);
    profile.updatedAt = new Date().toISOString();
    profiles.set(phone, profile);
  },
};

/** Test hook: reset the in-memory store between cases. */
export function clearMemoryProfiles(): void {
  profiles.clear();
}

// ─── Firestore store ───────────────────────────────────────────────────

export const firestoreProfileStore: ProfileStore = {
  async get(phone) {
    const { getFirestore } = await import('firebase-admin/firestore');
    const snap = await getFirestore().collection(COLLECTION).doc(phone).get();
    return snap.exists ? (snap.data() as SmsProfile) : null;
  },
  async save(profile) {
    const { getFirestore } = await import('firebase-admin/firestore');
    // JSON round-trip drops undefined at every depth (Firestore rejects it)
    // — same guard as the design-session store.
    const doc = JSON.parse(JSON.stringify(profile)) as Record<string, unknown>;
    await getFirestore().collection(COLLECTION).doc(profile.phone).set(doc);
  },
  async tryConsumeReveal(phone, dailyCap) {
    const { getFirestore } = await import('firebase-admin/firestore');
    const db = getFirestore();
    const ref = db.collection(COLLECTION).doc(phone);
    // Transaction, not increment(): the cap check and the consume must be
    // one atomic step or two concurrent webhooks could both pass the check.
    return db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const profile = snap.exists ? (snap.data() as SmsProfile) : newProfile(phone);
      const daily = rolledDaily(profile);
      if (daily.count >= dailyCap) return false;
      tx.set(
        ref,
        {
          ...JSON.parse(JSON.stringify(profile)),
          dailyReveals: { date: daily.date, count: daily.count + 1 },
          totalReveals: profile.totalReveals + 1,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      return true;
    });
  },
  async releaseReveal(phone) {
    const { getFirestore } = await import('firebase-admin/firestore');
    const db = getFirestore();
    const ref = db.collection(COLLECTION).doc(phone);
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return;
      const profile = snap.data() as SmsProfile;
      const daily = rolledDaily(profile);
      tx.set(
        ref,
        {
          dailyReveals: { date: daily.date, count: Math.max(0, daily.count - 1) },
          totalReveals: Math.max(0, profile.totalReveals - 1),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    });
  },
};

// ─── Store selection ───────────────────────────────────────────────────

/** Same env conventions as resolveSessionStore: demo → memory, creds → Firestore. */
export function resolveProfileStore(): ProfileStore {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') return memoryProfileStore;
  if (ensureAdminApp()) return firestoreProfileStore;
  return memoryProfileStore;
}
