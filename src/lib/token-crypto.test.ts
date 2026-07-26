import { describe, it, expect } from "vitest";
import { randomBytes } from "crypto";
import {
  encryptSecret,
  decryptSecret,
  parseEncryptionKey,
  TOKEN_CIPHER_VERSION,
} from "./token-crypto";

const KEY = randomBytes(32);
const KEY_B64 = KEY.toString("base64");

describe("encryption key parsing", () => {
  it("accepts a 32-byte base64 key", () => {
    expect(parseEncryptionKey(KEY_B64)).toEqual(KEY);
  });

  it("refuses a key of the wrong length rather than padding it", () => {
    // A short key silently accepted is a weak cipher nobody notices for a year.
    expect(() => parseEncryptionKey(randomBytes(16).toString("base64"))).toThrow(
      /32 bytes/,
    );
  });

  it("refuses an empty key", () => {
    expect(() => parseEncryptionKey("")).toThrow();
  });
});

describe("refresh-token encryption", () => {
  it("round-trips a token", () => {
    const secret = "1//0abcdefgHIJKLMNOP-refresh-token";
    expect(decryptSecret(encryptSecret(secret, KEY), KEY)).toBe(secret);
  });

  it("never stores the plaintext in the ciphertext envelope", () => {
    const secret = "1//0abcdefgHIJKLMNOP-refresh-token";
    expect(encryptSecret(secret, KEY)).not.toContain(secret);
  });

  it("produces a different envelope every time (fresh IV)", () => {
    // A reused IV in GCM is catastrophic, and identical ciphertexts would also
    // leak that two artists connected the same account.
    const a = encryptSecret("same", KEY);
    const b = encryptSecret("same", KEY);
    expect(a).not.toBe(b);
    expect(decryptSecret(a, KEY)).toBe(decryptSecret(b, KEY));
  });

  it("stamps a version so the format can be rotated later", () => {
    expect(encryptSecret("x", KEY).startsWith(`${TOKEN_CIPHER_VERSION}.`)).toBe(true);
  });

  it("refuses to decrypt a tampered ciphertext", () => {
    // GCM is authenticated: someone with database write access cannot swap in
    // their own token, or flip bits, without the decrypt failing loudly.
    const envelope = encryptSecret("secret-token", KEY);
    const parts = envelope.split(".");
    const ct = Buffer.from(parts[3], "base64");
    ct[0] ^= 0xff;
    parts[3] = ct.toString("base64");
    expect(() => decryptSecret(parts.join("."), KEY)).toThrow();
  });

  it("refuses to decrypt with the wrong key", () => {
    expect(() => decryptSecret(encryptSecret("x", KEY), randomBytes(32))).toThrow();
  });

  it("refuses a malformed envelope instead of returning junk", () => {
    expect(() => decryptSecret("not-an-envelope", KEY)).toThrow();
    expect(() => decryptSecret("v1.a.b", KEY)).toThrow();
  });

  it("refuses an unknown cipher version", () => {
    const envelope = encryptSecret("x", KEY).split(".");
    envelope[0] = "v99";
    expect(() => decryptSecret(envelope.join("."), KEY)).toThrow(/version/i);
  });
});
