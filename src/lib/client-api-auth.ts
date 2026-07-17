import { auth } from './firebase';

/** Thrown by getApiAuthHeaders when there is no signed-in Firebase user. */
export class SignInRequiredError extends Error {
  constructor() {
    super('Sign in to continue.');
    this.name = 'SignInRequiredError';
  }
}

/**
 * Redirect to /login, preserving the current path so the user lands back
 * where they were after signing in. Centralized here so every AUTH_REQUIRED/
 * SignInRequiredError call site redirects the same way instead of each
 * component reinventing it (or forgetting it and just showing a toast).
 */
export function redirectToSignIn(): void {
  if (typeof window === 'undefined') return;
  const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.href = `/login?returnTo=${returnTo}`;
}

export async function getApiAuthHeaders(): Promise<Record<string, string>> {
  const user = auth?.currentUser;
  if (!user) {
    // Redirect here (not just throw) because most call sites use a raw
    // fetch() rather than fetchWithAbort, so they never see the 401 path
    // that would otherwise trigger the redirect — without this, they'd
    // catch a generic error and show a misleading "network error" message.
    redirectToSignIn();
    throw new SignInRequiredError();
  }

  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}
