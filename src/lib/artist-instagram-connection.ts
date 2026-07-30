/**
 * Server-only persistence for artist-authorized Instagram connections.
 *
 * Access tokens are encrypted in Firestore. The encryption key is derived from
 * the app secret with domain separation, so the existing Instagram app
 * configuration is sufficient and plaintext tokens never enter Neo4j.
 */
import { createHash } from "crypto";
import { ensureAdminApp } from "./firebase-admin";
import { decryptSecret, encryptSecret } from "./token-crypto";
import {
  refreshLongLivedInstagramToken,
  type InstagramProfile,
} from "./artist-instagram";

const COLLECTION = "artist_instagram_connections";
const REFRESH_EARLY_MS = 7 * 24 * 60 * 60 * 1000;

type StoredInstagramConnection = {
  artistId: string;
  instagramUserId: string;
  username: string;
  accountType: string | null;
  accessTokenCipher: string;
  expiresAt: string;
  connectedAt: string;
  refreshedAt: string;
  revokedAt?: string;
};

export type InstagramConnectionSummary = Omit<
  StoredInstagramConnection,
  "accessTokenCipher"
>;

async function firestore() {
  if (!ensureAdminApp()) return null;
  const { getFirestore } = await import("firebase-admin/firestore");
  return getFirestore();
}

function encryptionKey(): Buffer | null {
  const secret = process.env.INSTAGRAM_APP_SECRET;
  if (!secret) return null;
  return createHash("sha256")
    .update("tatt:instagram-token:v1\0")
    .update(secret)
    .digest();
}

function summary(doc: StoredInstagramConnection): InstagramConnectionSummary {
  return {
    artistId: doc.artistId,
    instagramUserId: doc.instagramUserId,
    username: doc.username,
    accountType: doc.accountType,
    expiresAt: doc.expiresAt,
    connectedAt: doc.connectedAt,
    refreshedAt: doc.refreshedAt,
    ...(doc.revokedAt ? { revokedAt: doc.revokedAt } : {}),
  };
}

export async function saveInstagramConnection(input: {
  artistId: string;
  profile: InstagramProfile;
  accessToken: string;
  expiresInSeconds: number;
  nowMs?: number;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const db = await firestore();
  const key = encryptionKey();
  if (!db || !key) return { ok: false, reason: "not_configured" };
  const nowMs = input.nowMs ?? Date.now();
  const connectedAt = new Date(nowMs).toISOString();
  const doc: StoredInstagramConnection = {
    artistId: input.artistId,
    instagramUserId: input.profile.userId,
    username: input.profile.username,
    accountType: input.profile.accountType,
    accessTokenCipher: encryptSecret(input.accessToken, key),
    expiresAt: new Date(nowMs + input.expiresInSeconds * 1000).toISOString(),
    connectedAt,
    refreshedAt: connectedAt,
  };
  try {
    await db.collection(COLLECTION).doc(input.artistId).set(doc);
    return { ok: true };
  } catch (err) {
    console.error("[instagram] connection save failed:", err);
    return { ok: false, reason: "write_failed" };
  }
}

export async function getInstagramConnection(
  artistId: string,
): Promise<InstagramConnectionSummary | null> {
  try {
    const db = await firestore();
    if (!db) return null;
    const snap = await db.collection(COLLECTION).doc(artistId).get();
    if (!snap.exists) return null;
    const doc = snap.data() as StoredInstagramConnection;
    if (doc.revokedAt || !doc.accessTokenCipher) return null;
    return summary(doc);
  } catch {
    return null;
  }
}

export async function getInstagramAccessToken(
  artistId: string,
  nowMs: number = Date.now(),
): Promise<{ ok: true; accessToken: string } | { ok: false; reason: string }> {
  const db = await firestore();
  const key = encryptionKey();
  if (!db || !key) return { ok: false, reason: "not_configured" };
  const ref = db.collection(COLLECTION).doc(artistId);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, reason: "not_connected" };
  const doc = snap.data() as StoredInstagramConnection;
  if (doc.revokedAt || !doc.accessTokenCipher) {
    return { ok: false, reason: "not_connected" };
  }
  let accessToken: string;
  try {
    accessToken = decryptSecret(doc.accessTokenCipher, key);
  } catch {
    return { ok: false, reason: "credential_unreadable" };
  }
  if (Date.parse(doc.expiresAt) - nowMs > REFRESH_EARLY_MS) {
    return { ok: true, accessToken };
  }
  const refreshed = await refreshLongLivedInstagramToken({ accessToken });
  if (!refreshed.ok) return refreshed;
  await ref.update({
    accessTokenCipher: encryptSecret(refreshed.accessToken, key),
    expiresAt: new Date(nowMs + refreshed.expiresInSeconds * 1000).toISOString(),
    refreshedAt: new Date(nowMs).toISOString(),
  });
  return { ok: true, accessToken: refreshed.accessToken };
}

export async function disconnectInstagramConnection(
  artistId: string,
): Promise<boolean> {
  try {
    const db = await firestore();
    if (!db) return false;
    const { FieldValue } = await import("firebase-admin/firestore");
    await db
      .collection(COLLECTION)
      .doc(artistId)
      .set(
        {
          revokedAt: new Date().toISOString(),
          accessTokenCipher: FieldValue.delete(),
        },
        { merge: true },
      );
    return true;
  } catch (err) {
    console.error("[instagram] disconnect failed:", err);
    return false;
  }
}
