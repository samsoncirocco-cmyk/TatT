/**
 * Envelope encryption for per-artist OAuth refresh tokens.
 *
 * ── Why this exists ───────────────────────────────────────────────────────
 * A Google refresh token is a live credential: it mints access tokens to a real
 * person's calendar until they revoke it. It is not an identifier like
 * `stripeAccountId`, which is safe at rest in the graph because it authorises
 * nothing on its own. So refresh tokens do not go in Firestore in the clear.
 *
 * ── The pattern, and why not the obvious alternative ──────────────────────
 * The repo already has one place for secrets: GCP Secret Manager, read through
 * `getSecret()`. The tempting move is one secret *per artist*. It does not
 * scale: Secret Manager bills per secret version per month, and the roster is
 * ~10k artists — a five-figure annual bill for storing strings, plus an IAM
 * surface that grows with the roster.
 *
 * Instead there is exactly ONE app-level secret,
 * `CALENDAR_TOKEN_ENCRYPTION_KEY`, held in Secret Manager under the existing
 * pattern. Every artist's refresh token is sealed with it using AES-256-GCM and
 * the ciphertext lives in Firestore. Cost is constant, the blast radius is one
 * key, and rotating that key re-seals the tokens without any artist
 * reconnecting.
 *
 * GCM, not CBC, because it is authenticated: an attacker with Firestore write
 * access cannot substitute their own token or flip bits without `decryptSecret`
 * throwing. Silent corruption here would mean reading a stranger's calendar.
 *
 * The envelope is versioned (`v1.iv.tag.ciphertext`) so the format or the
 * algorithm can change later without a migration flag day.
 *
 * Node's built-in `crypto` — no new dependency.
 */
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

export const TOKEN_CIPHER_VERSION = "v1";

const ALGORITHM = "aes-256-gcm";
/** 96-bit IV: the size GCM is specified for and the only one it is fast at. */
const IV_BYTES = 12;
const KEY_BYTES = 32;

/**
 * Decode the base64 key. A wrong-length key throws rather than being padded or
 * hashed into shape — a quietly weakened cipher is worse than a failed boot,
 * because nothing ever tells you about it.
 */
export function parseEncryptionKey(base64Key: string): Buffer {
  if (!base64Key) {
    throw new Error("CALENDAR_TOKEN_ENCRYPTION_KEY is empty");
  }
  const key = Buffer.from(base64Key, "base64");
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `CALENDAR_TOKEN_ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes, got ${key.length}`,
    );
  }
  return key;
}

/** Seal a secret into a `v1.iv.tag.ciphertext` envelope, all base64. */
export function encryptSecret(plaintext: string, key: Buffer): string {
  // A fresh IV per encryption. Reusing one under GCM breaks the cipher
  // outright, and identical envelopes would also leak that two artists
  // connected the same Google account.
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    TOKEN_CIPHER_VERSION,
    iv.toString("base64"),
    tag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(".");
}

/** Open an envelope. Throws on tampering, wrong key, or an unknown version. */
export function decryptSecret(envelope: string, key: Buffer): string {
  const parts = envelope.split(".");
  if (parts.length !== 4) {
    throw new Error("Malformed encrypted token envelope");
  }
  const [version, ivB64, tagB64, ctB64] = parts;
  if (version !== TOKEN_CIPHER_VERSION) {
    throw new Error(`Unsupported token cipher version: ${version}`);
  }
  const decipher = createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(ivB64, "base64"),
  );
  // Throws on any mismatch — the whole point of choosing an authenticated mode.
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(ctB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
