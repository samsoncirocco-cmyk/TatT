/**
 * Durable store for shared design links (issue #64).
 *
 * A share link is a promise made to a stranger: the friend who opens it
 * must see the design. The previous implementation kept shares in a
 * module-level `Map`, which on Vercel dies at every deploy AND is invisible
 * to every other serverless instance — a link minted by instance A 404s on
 * instance B immediately. Firestore is this repo's system of record
 * (booking_requests, design_sessions), so shares live there too.
 *
 * Store selection mirrors src/services/designSession/internal/store.ts:
 * demo mode runs in-memory (single process, no credentials), Firestore runs
 * whenever Firebase Admin credentials are wired. There is deliberately NO
 * silent in-memory fallback outside demo mode — `resolveSharedDesignStore()`
 * returns null and the routes answer 503, because handing a user a link that
 * cannot be read is exactly the bug this module exists to fix.
 *
 * EXPIRY: shares do not expire. Durability is the whole point of the fix; an
 * auto-expiring link is a dead link on a slower clock. The documents are tiny
 * (one JSON object per share) so storage is a non-issue, and `sharedAt` is
 * recorded should a retention policy ever be wanted — it can be added later
 * as a Firestore TTL without touching this code or the URL shape.
 */
import { ensureAdminApp } from '@/lib/firebase-admin';

const COLLECTION = 'shared_designs';

/** Hard cap on cuts in one share — the Forge produces four; the ceiling is
 *  there so a malformed client cannot write an unbounded document. */
export const MAX_SHARE_IMAGES = 12;

/** A share as persisted. `uid` is server-side metadata and never returned. */
export interface SharedDesign {
  shareId: string;
  /**
   * The cover cut. Stays its own field because Open Graph takes exactly one
   * image, and because shares minted before multi-cut sharing existed have
   * only this. Always equal to `imageUrls[0]` on shares written since.
   */
  imageUrl: string;
  /** Every cut in the share, cover first. Absent on pre-multi-cut shares. */
  imageUrls?: string[];
  prompt: string;
  style?: string;
  bodyPart?: string;
  /** Owner uid — recorded for provenance; never echoed to visitors. */
  uid?: string | null;
  generatedAt?: string;
  sharedAt: string;
  shareUrl: string;
  views: number;
}

/** The subset of a share a public visitor may see. */
export type PublicSharedDesign = Omit<SharedDesign, 'uid'>;

export interface SharedDesignStore {
  save(design: SharedDesign): Promise<void>;
  /**
   * Fetch a share and count the view in one call. Returns null when the id
   * is unknown. The view count is best-effort: a failed increment must never
   * stop a visitor from seeing the design.
   */
  getAndCountView(shareId: string): Promise<SharedDesign | null>;
}

/**
 * Project a stored share down to what a visitor may see. Whitelist, never
 * blacklist (same convention as toDesignSession) — a field added to
 * SharedDesign is private until it is listed here.
 */
export function toPublicShare(design: SharedDesign): PublicSharedDesign {
  const { shareId, imageUrl, prompt, style, bodyPart, generatedAt, sharedAt, shareUrl, views } =
    design;
  return {
    shareId,
    imageUrl,
    imageUrls: shareImages(design),
    prompt,
    style,
    bodyPart,
    generatedAt,
    sharedAt,
    shareUrl,
    views,
  };
}

/**
 * The cuts in a share, always as a non-empty list. Shares minted before
 * multi-cut sharing carry only `imageUrl`, so every reader goes through here
 * rather than reaching for `imageUrls` and finding undefined.
 */
export function shareImages(design: Pick<SharedDesign, 'imageUrl' | 'imageUrls'>): string[] {
  const many = design.imageUrls?.filter((u) => typeof u === 'string' && u.length > 0) ?? [];
  if (many.length > 0) return many;
  return design.imageUrl ? [design.imageUrl] : [];
}

/** Body returned when no durable store is available. */
export const SHARE_STORE_UNAVAILABLE = {
  success: false,
  error: 'Sharing is temporarily unavailable.',
  code: 'SHARE_STORE_UNAVAILABLE',
} as const;

// ─── In-memory store ───────────────────────────────────────────────────

// Only ever reached in demo mode and tests — environments where a single
// long-lived process is guaranteed.
//
// A single process is not a single module instance, though: Next bundles each
// route handler separately and re-evaluates modules on hot reload, so a plain
// module-scoped Map left the POST that writes a share and the GET that reads
// it holding different maps — every demo-mode link 404'd. Hang the map off
// globalThis so all bundles and reloads share one.
const globalStore = globalThis as typeof globalThis & {
  __tattSharedDesigns?: Map<string, SharedDesign>;
};
const shares = (globalStore.__tattSharedDesigns ??= new Map<string, SharedDesign>());

export const memorySharedDesignStore: SharedDesignStore = {
  async save(design) {
    shares.set(design.shareId, structuredClone(design));
  },
  async getAndCountView(shareId) {
    const design = shares.get(shareId);
    if (!design) return null;
    design.views = (design.views ?? 0) + 1;
    return structuredClone(design);
  },
};

/** Test hook: reset the in-memory store between cases. */
export function clearMemoryShares(): void {
  shares.clear();
}

// ─── Firestore store ───────────────────────────────────────────────────

export const firestoreSharedDesignStore: SharedDesignStore = {
  async save(design) {
    const { getFirestore } = await import('firebase-admin/firestore');
    // Firestore rejects any document containing an `undefined` field
    // (optional style/bodyPart) — same gotcha the booking write guards
    // against. A JSON round-trip drops undefined values at every depth.
    const doc = JSON.parse(JSON.stringify(design)) as Record<string, unknown>;
    await getFirestore().collection(COLLECTION).doc(design.shareId).set(doc);
  },
  async getAndCountView(shareId) {
    const { getFirestore, FieldValue } = await import('firebase-admin/firestore');
    const ref = getFirestore().collection(COLLECTION).doc(shareId);
    const snap = await ref.get();
    if (!snap.exists) return null;
    const design = snap.data() as SharedDesign;

    // Atomic so concurrent visitors don't clobber each other's count.
    // Best-effort: a failed counter must never hide the design.
    try {
      await ref.update({ views: FieldValue.increment(1) });
    } catch (err) {
      console.warn(
        `[share] view count increment failed for ${shareId}:`,
        err instanceof Error ? err.message : err
      );
    }

    return { ...design, views: (design.views ?? 0) + 1 };
  },
};

// ─── Store selection ───────────────────────────────────────────────────

/**
 * Pick the backing store. Demo mode (NEXT_PUBLIC_DEMO_MODE) runs in-memory;
 * otherwise Firestore when Firebase Admin credentials are wired.
 *
 * Returns null when neither applies. Callers MUST fail loudly on null (503)
 * rather than fall back to memory: a share written to one instance's Map is
 * unreadable everywhere else, which looks like success and behaves like data
 * loss. Resolved per call, never cached across requests.
 */
export function resolveSharedDesignStore(): SharedDesignStore | null {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') return memorySharedDesignStore;
  if (ensureAdminApp()) return firestoreSharedDesignStore;
  return null;
}
