import { describe, expect, it } from "vitest";
import { mapFirebaseAuthError } from "./authErrors";

describe("mapFirebaseAuthError", () => {
  it("maps invalid-credential to a wrong-password message with a Google nudge", () => {
    const msg = mapFirebaseAuthError({ code: "auth/invalid-credential" });
    expect(msg).toMatch(/Wrong email or password/);
    expect(msg).toMatch(/Continue with Google/);
  });

  it.each(["auth/wrong-password", "auth/user-not-found"])(
    "maps %s to a plain wrong-password message with no raw code",
    (code) => {
      const msg = mapFirebaseAuthError({ code });
      expect(msg).toBe("Wrong email or password.");
    },
  );

  it("maps email-already-in-use to a login nudge", () => {
    expect(mapFirebaseAuthError({ code: "auth/email-already-in-use" })).toBe(
      "An account with this email already exists — try logging in.",
    );
  });

  it("maps unauthorized-domain", () => {
    expect(mapFirebaseAuthError({ code: "auth/unauthorized-domain" })).toBe(
      "Sign-in isn't enabled for this domain yet.",
    );
  });

  it.each(["auth/popup-blocked", "auth/popup-closed-by-user"])(
    "maps %s to a popup-retry message",
    (code) => {
      const msg = mapFirebaseAuthError({ code });
      expect(msg).toBe(
        "Google sign-in popup was blocked or closed — try again.",
      );
    },
  );

  it("falls back to a generic message for unknown codes", () => {
    expect(mapFirebaseAuthError({ code: "auth/some-new-code" })).toBe(
      "Something went wrong signing you in.",
    );
  });

  it("never leaks the raw Firebase error string for unrecognized errors", () => {
    const rawFirebaseError = new Error(
      "Firebase: Error (auth/network-request-failed).",
    );
    const msg = mapFirebaseAuthError(rawFirebaseError);
    expect(msg).not.toMatch(/Firebase: Error/);
    expect(msg).toBe("Something went wrong signing you in.");
  });

  it("handles non-object, non-Error input without throwing", () => {
    expect(mapFirebaseAuthError(undefined)).toBe(
      "Something went wrong signing you in.",
    );
    expect(mapFirebaseAuthError("plain string")).toBe(
      "Something went wrong signing you in.",
    );
  });
});
