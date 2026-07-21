/**
 * Maps Firebase Auth error codes to human-readable, punk-copy messages so
 * login/signup never surface raw strings like
 * "Firebase: Error (auth/invalid-credential)." to users.
 */

function extractFirebaseErrorCode(err: unknown): string | undefined {
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code?: unknown }).code;
    if (typeof code === "string") return code;
  }
  return undefined;
}

export function mapFirebaseAuthError(err: unknown): string {
  switch (extractFirebaseErrorCode(err)) {
    case "auth/invalid-credential":
      return 'Wrong email or password. Signed up with Google? Use "Continue with Google" instead.';
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Wrong email or password.";
    case "auth/email-already-in-use":
      return "An account with this email already exists — try logging in.";
    case "auth/unauthorized-domain":
      return "Sign-in isn't enabled for this domain yet.";
    case "auth/popup-blocked":
    case "auth/popup-closed-by-user":
      return "Google sign-in popup was blocked or closed — try again.";
    default:
      return "Something went wrong signing you in.";
  }
}
