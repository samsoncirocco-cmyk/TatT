"use client";

/**
 * cloudSync — Firestore mirror for the tattStorage lists.
 *
 * localStorage stays the synchronous source the UI reads (SSR-safe,
 * works signed-out). When a user is signed in, each list is mirrored
 * to Firestore at users/{uid}/preferences/{sync-*} — a path the
 * deployed security rules already allow owner-only — so designs,
 * favorites, and bookings follow the account across devices.
 *
 * Sync model (v1, deliberately simple):
 *  - On sign-in: union-merge local + remote once (anonymous work is
 *    adopted into the account), push the merge both ways.
 *  - After that: last-write-wins per list. Local writes push the whole
 *    array (debounced); remote snapshots replace local. Deletions
 *    propagate; the one-time union can resurrect an item deleted
 *    elsewhere at the moment of sign-in — acceptable for lists this
 *    small.
 *  - Every Firestore call is fire-and-forget with catch: if rules,
 *    network, or config disagree, the app silently stays local-only.
 */

import type { Firestore, Unsubscribe } from "firebase/firestore";

type Items = unknown[];
type ReadLocal = (key: string) => Items;
type WriteLocal = (key: string, items: Items) => void;

/** localStorage key → Firestore doc id under users/{uid}/preferences */
const SYNC_DOCS: Record<string, string> = {
  "tatt:designs": "sync-designs",
  "tatt:favorites": "sync-favorites",
  "tatt:bookings": "sync-bookings",
};

const WRITE_DEBOUNCE_MS = 800;

let activeUid: string | null = null;
let db: Firestore | null = null;
let snapshotUnsubs: Unsubscribe[] = [];
const writeTimers = new Map<string, ReturnType<typeof setTimeout>>();
// Echo guard: JSON of the last payload we applied from remote (skip
// pushing it back) or pushed to remote (skip re-applying the snapshot).
const lastSynced = new Map<string, string>();

function hasId(v: unknown): v is { id: string; createdAt?: number } {
  return typeof v === "object" && v !== null && "id" in v;
}

/** Union two lists: strings by value, objects by id (newer createdAt
 *  wins), newest-first for object lists. */
function mergeLists(local: Items, remote: Items): Items {
  if (local.length === 0) return remote;
  if (remote.length === 0) return local;

  if (typeof local[0] === "string" || typeof remote[0] === "string") {
    return [...new Set([...(local as string[]), ...(remote as string[])])];
  }

  const byId = new Map<string, { id: string; createdAt?: number }>();
  for (const item of [...remote, ...local]) {
    if (!hasId(item)) continue;
    const existing = byId.get(item.id);
    if (!existing || (item.createdAt ?? 0) >= (existing.createdAt ?? 0)) {
      byId.set(item.id, item);
    }
  }
  return [...byId.values()].sort(
    (a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0),
  );
}

async function getDb(): Promise<Firestore | null> {
  if (db) return db;
  try {
    const [{ getFirestore }, { app }] = await Promise.all([
      import("firebase/firestore"),
      import("@/lib/firebase"),
    ]);
    if (!app) return null;
    db = getFirestore(app);
    return db;
  } catch {
    return null;
  }
}

/**
 * Begin mirroring for a signed-in user. Safe to call repeatedly (every
 * onAuthStateChanged fire) — no-op when already syncing this uid.
 */
export async function startCloudSync(
  uid: string,
  readLocal: ReadLocal,
  writeLocal: WriteLocal,
): Promise<void> {
  if (activeUid === uid) return;
  stopCloudSync();
  activeUid = uid;

  const database = await getDb();
  if (!database || activeUid !== uid) return;

  try {
    const { doc, getDoc, setDoc, onSnapshot } = await import(
      "firebase/firestore"
    );

    for (const [localKey, docId] of Object.entries(SYNC_DOCS)) {
      const ref = doc(database, "users", uid, "preferences", docId);

      // One-time union merge of anonymous local work with the account.
      try {
        const snap = await getDoc(ref);
        if (activeUid !== uid) return;
        const remote: Items = (snap.data()?.items as Items) ?? [];
        const merged = mergeLists(readLocal(localKey), remote);
        const json = JSON.stringify(merged);
        lastSynced.set(localKey, json);
        writeLocal(localKey, merged);
        await setDoc(ref, { items: merged, updatedAt: Date.now() });
      } catch {
        /* offline / rules mismatch — stay local-only for this list */
      }

      // Live remote → local.
      const unsub = onSnapshot(
        ref,
        (snap) => {
          if (activeUid !== uid || !snap.exists()) return;
          const items: Items = (snap.data()?.items as Items) ?? [];
          const json = JSON.stringify(items);
          if (lastSynced.get(localKey) === json) return; // our own write
          lastSynced.set(localKey, json);
          writeLocal(localKey, items);
        },
        () => {
          /* snapshot stream failed — local-only until next sign-in */
        },
      );
      snapshotUnsubs.push(unsub);
    }
  } catch {
    /* firestore module unavailable — local-only */
  }
}

export function stopCloudSync(): void {
  activeUid = null;
  for (const unsub of snapshotUnsubs) unsub();
  snapshotUnsubs = [];
  for (const t of writeTimers.values()) clearTimeout(t);
  writeTimers.clear();
  lastSynced.clear();
}

/**
 * Called by tattStorage on every local list write. Debounced push of
 * the whole array to Firestore. No-op when signed out.
 */
export function queueCloudWrite(localKey: string, items: Items): void {
  const docId = SYNC_DOCS[localKey];
  if (!docId || !activeUid) return;
  const uid = activeUid;

  const json = JSON.stringify(items);
  if (lastSynced.get(localKey) === json) return; // remote-applied echo

  const existing = writeTimers.get(localKey);
  if (existing) clearTimeout(existing);
  writeTimers.set(
    localKey,
    setTimeout(async () => {
      writeTimers.delete(localKey);
      if (activeUid !== uid) return;
      const database = await getDb();
      if (!database) return;
      try {
        const { doc, setDoc } = await import("firebase/firestore");
        lastSynced.set(localKey, json);
        await setDoc(doc(database, "users", uid, "preferences", docId), {
          items,
          updatedAt: Date.now(),
        });
      } catch {
        /* fire-and-forget — local copy is still authoritative for UX */
      }
    }, WRITE_DEBOUNCE_MS),
  );
}

// ─── Free-tier daily generation quota ──────────────────────────────────
//
// Client-enforced (server still has IP rate limits + the global budget
// cap). Stored at users/{uid}/preferences/sync-usage as {date, count}.

export const FREE_TIER_DAILY_CUTS = 10;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getDailyUsage(): Promise<number> {
  if (!activeUid) return 0;
  const database = await getDb();
  if (!database) return 0;
  try {
    const { doc, getDoc } = await import("firebase/firestore");
    const snap = await getDoc(
      doc(database, "users", activeUid, "preferences", "sync-usage"),
    );
    const data = snap.data();
    if (!data || data.date !== todayKey()) return 0;
    return typeof data.count === "number" ? data.count : 0;
  } catch {
    return 0; // fail-open: quota is friction, not a security boundary
  }
}

export async function recordGeneration(): Promise<void> {
  if (!activeUid) return;
  const database = await getDb();
  if (!database) return;
  try {
    const { doc, getDoc, setDoc } = await import("firebase/firestore");
    const ref = doc(database, "users", activeUid, "preferences", "sync-usage");
    const snap = await getDoc(ref);
    const data = snap.data();
    const count =
      data && data.date === todayKey() && typeof data.count === "number"
        ? data.count + 1
        : 1;
    await setDoc(ref, { date: todayKey(), count });
  } catch {
    /* non-fatal */
  }
}
