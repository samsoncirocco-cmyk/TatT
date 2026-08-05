/**
 * Persistence for per-artist Google Calendar connections (firebase-admin only —
 * never import from a client component).
 *
 * One document per artist at `artist_calendar_connections/{artistId}`, which
 * `firestore.rules` denies to every client. It holds:
 *   - non-secret metadata: which calendar, which scopes, when connected/revoked
 *   - `refreshTokenCipher`: the refresh token sealed by `token-crypto.ts`
 *
 * The plaintext refresh token exists only inside this module, only for the
 * moment it takes to mint an access token. Nothing above this file ever
 * receives it — `getCalendarConnection` returns a summary type that has no
 * field for one, so a caller cannot leak what it cannot hold.
 *
 * Every function fails soft. A missing document, unconfigured admin creds, a
 * missing encryption key and a Firestore outage all resolve to "no usable
 * connection", which `resolveBookingMode` turns into the request model. There
 * is no path here that throws into a page render.
 */
import { envBool, envString } from "@/config/envSchema";
import { ensureAdminApp } from "./firebase-admin";
import { decryptSecret, encryptSecret, parseEncryptionKey } from "./token-crypto";
import {
  fetchFreeBusy,
  refreshAccessToken,
  revokeToken,
  type CalendarFailureReason,
  type FreeBusyResult,
} from "./artist-calendar";
import type { CalendarConnectionSummary } from "./booking-mode";

const COLLECTION = "artist_calendar_connections";

/**
 * The app-level key. One secret for the whole roster — see token-crypto.
 *
 * Read from the environment, which is how every other secret in this repo is
 * consumed: GCP Secret Manager injects them at deploy time (the startup health
 * check calls this "Secret Manager secrets injected") and `.env.local` supplies
 * them in dev. `src/lib/secret-manager.ts` looks like the alternative but its
 * `@google-cloud/secret-manager` dependency is not installed and nothing
 * imports it, so using it here would break the build.
 */
const KEY_ENV_NAME = "CALENDAR_TOKEN_ENCRYPTION_KEY";

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/**
 * The deployment's Google OAuth client, or null when this deployment has none.
 * Null is a normal state (local dev, preview deploys) and degrades every artist
 * to the request model rather than breaking a page.
 */
export function googleOAuthConfig(baseUrl?: string): GoogleOAuthConfig | null {
  const clientId = envString("GOOGLE_OAUTH_CLIENT_ID");
  const clientSecret = envString("GOOGLE_OAUTH_CLIENT_SECRET");
  if (!clientId || !clientSecret) return null;
  const origin = (
    baseUrl ??
    envString("NEXT_PUBLIC_APP_URL") ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
  return {
    clientId,
    clientSecret,
    redirectUri: `${origin}/api/v1/artist/calendar/callback`,
  };
}

/** Whether calendar write-back is switched on for this deployment. */
export function calendarWritesEnabled(): boolean {
  return envBool("GOOGLE_CALENDAR_WRITE_ENABLED");
}

async function encryptionKey(): Promise<Buffer | null> {
  try {
    return parseEncryptionKey(envString(KEY_ENV_NAME) ?? "");
  } catch (err) {
    // No key means we cannot read or write any token. Loud in the log, silent
    // to the client — they simply get the request model.
    console.warn(
      "[calendar] encryption key unavailable — calendar connections disabled:",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

async function firestore() {
  if (!ensureAdminApp()) return null;
  const { getFirestore } = await import("firebase-admin/firestore");
  return getFirestore();
}

type StoredConnection = {
  artistId: string;
  calendarId: string;
  refreshTokenCipher: string;
  scopes: string[];
  connectedAt: string;
  writeEnabled: boolean;
  writeCalendarId?: string;
  revokedAt?: string;
};

/**
 * The artist's connection, minus anything secret. Returns null when there is
 * none, when it was revoked, or when we could not look.
 */
export async function getCalendarConnection(
  artistId: string,
): Promise<CalendarConnectionSummary | null> {
  try {
    const db = await firestore();
    if (!db) return null;
    const snap = await db.collection(COLLECTION).doc(artistId).get();
    if (!snap.exists) return null;
    const doc = snap.data() as StoredConnection;
    return {
      artistId,
      calendarId: doc.calendarId,
      connectedAt: doc.connectedAt,
      scopes: doc.scopes ?? [],
      writeEnabled: Boolean(doc.writeEnabled),
      ...(doc.revokedAt ? { revokedAt: doc.revokedAt } : {}),
      ...(doc.writeCalendarId ? { writeCalendarId: doc.writeCalendarId } : {}),
    };
  } catch (err) {
    console.warn(
      `[calendar] connection read failed for ${artistId} — treating as unconnected:`,
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

/**
 * Store a freshly granted connection, sealing the refresh token on the way in.
 * Overwrites any previous connection for this artist, including a revoked one —
 * reconnecting is how an artist recovers from revocation.
 */
export async function saveCalendarConnection(input: {
  artistId: string;
  calendarId: string;
  refreshToken: string;
  scopes: string[];
  writeEnabled: boolean;
  writeCalendarId?: string;
  nowMs?: number;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const db = await firestore();
  if (!db) return { ok: false, reason: "storage_unavailable" };
  const key = await encryptionKey();
  if (!key) return { ok: false, reason: "encryption_unavailable" };

  const doc: StoredConnection = {
    artistId: input.artistId,
    calendarId: input.calendarId,
    refreshTokenCipher: encryptSecret(input.refreshToken, key),
    scopes: input.scopes,
    connectedAt: new Date(input.nowMs ?? Date.now()).toISOString(),
    writeEnabled: input.writeEnabled,
    ...(input.writeCalendarId ? { writeCalendarId: input.writeCalendarId } : {}),
  };
  try {
    // `set` without merge so a reconnect cannot inherit a stale `revokedAt`.
    await db.collection(COLLECTION).doc(input.artistId).set(doc);
    return { ok: true };
  } catch (err) {
    console.error(
      `[calendar] failed to save connection for ${input.artistId}:`,
      err instanceof Error ? err.message : err,
    );
    return { ok: false, reason: "write_failed" };
  }
}

/**
 * Disconnect. Tells Google to revoke the grant, then removes the ciphertext and
 * stamps `revokedAt`.
 *
 * The local record is cleared even when Google is unreachable. An artist who
 * clicks disconnect must end up disconnected: leaving them "connected" because
 * a third party timed out would be the platform refusing to let go. The token
 * we can no longer use is deleted either way, and the residual grant in their
 * Google account is revocable by them directly.
 */
export async function revokeCalendarConnection(
  artistId: string,
): Promise<{ ok: boolean; revokedAtGoogle: boolean }> {
  const db = await firestore();
  if (!db) return { ok: false, revokedAtGoogle: false };

  let revokedAtGoogle = false;
  try {
    const snap = await db.collection(COLLECTION).doc(artistId).get();
    const doc = snap.exists ? (snap.data() as StoredConnection) : null;
    const key = doc?.refreshTokenCipher ? await encryptionKey() : null;
    if (doc?.refreshTokenCipher && key) {
      try {
        revokedAtGoogle = await revokeToken({
          token: decryptSecret(doc.refreshTokenCipher, key),
        });
      } catch {
        // Undecryptable token — nothing to revoke upstream, still disconnect.
        revokedAtGoogle = false;
      }
    }
    const { FieldValue } = await import("firebase-admin/firestore");
    await db
      .collection(COLLECTION)
      .doc(artistId)
      .set(
        {
          revokedAt: new Date().toISOString(),
          // The credential goes, the audit trail stays.
          refreshTokenCipher: FieldValue.delete(),
        },
        { merge: true },
      );
    return { ok: true, revokedAtGoogle };
  } catch (err) {
    console.error(
      `[calendar] disconnect failed for ${artistId}:`,
      err instanceof Error ? err.message : err,
    );
    return { ok: false, revokedAtGoogle };
  }
}

type AccessTokenLookup =
  | { ok: true; accessToken: string; calendarId: string }
  | { ok: false; reason: CalendarFailureReason };

/**
 * Mint a short-lived access token for one artist. The only place the plaintext
 * refresh token is ever materialised.
 */
async function getArtistAccessToken(artistId: string): Promise<AccessTokenLookup> {
  const config = googleOAuthConfig();
  if (!config) return { ok: false, reason: "not_configured" };

  const db = await firestore();
  if (!db) return { ok: false, reason: "unreachable" };

  let doc: StoredConnection | null = null;
  try {
    const snap = await db.collection(COLLECTION).doc(artistId).get();
    doc = snap.exists ? (snap.data() as StoredConnection) : null;
  } catch {
    return { ok: false, reason: "unreachable" };
  }
  if (!doc || doc.revokedAt || !doc.refreshTokenCipher) {
    return { ok: false, reason: "not_connected" };
  }

  const key = await encryptionKey();
  if (!key) return { ok: false, reason: "not_configured" };

  let refreshToken: string;
  try {
    refreshToken = decryptSecret(doc.refreshTokenCipher, key);
  } catch (err) {
    // Tampered or sealed under a rotated key. Never guess — make the artist
    // reconnect rather than reading a calendar we cannot prove is theirs.
    console.error(
      `[calendar] refresh token for ${artistId} failed to decrypt:`,
      err instanceof Error ? err.message : err,
    );
    return { ok: false, reason: "unauthorized" };
  }

  const refreshed = await refreshAccessToken({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    refreshToken,
  });
  if (!refreshed.ok) return { ok: false, reason: refreshed.reason };
  return { ok: true, accessToken: refreshed.accessToken, calendarId: doc.calendarId };
}

/**
 * When is this artist busy? The composed read `resolveBookingMode` consumes.
 * Every failure is classified rather than thrown, because every failure means
 * the same thing to the client: the request model.
 */
export async function readArtistBusy(input: {
  artistId: string;
  timeMinMs: number;
  timeMaxMs: number;
  nowMs?: number;
}): Promise<FreeBusyResult> {
  const token = await getArtistAccessToken(input.artistId);
  if (!token.ok) return { ok: false, reason: token.reason };
  return fetchFreeBusy({
    accessToken: token.accessToken,
    calendarId: token.calendarId,
    timeMinMs: input.timeMinMs,
    timeMaxMs: input.timeMaxMs,
    nowMs: input.nowMs,
  });
}
