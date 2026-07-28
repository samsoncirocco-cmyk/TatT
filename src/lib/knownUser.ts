/**
 * Device-level "has signed in here before" flag (issue #101).
 *
 * Set whenever Firebase reports an authenticated user; never unset (sign-out
 * still means this device belongs to someone with an account). Used only to
 * pick which door the auth gate shows first: unknown device → /signup,
 * known device → /login. Absence of the flag is the best-effort default —
 * cleared storage or incognito just means the visitor sees signup first,
 * which is the correct guess for someone we can't recognize.
 */

const KEY = 'tatt:known-user';

export function markKnownUser(): void {
  try {
    window.localStorage.setItem(KEY, '1');
  } catch {
    // Storage unavailable (private mode quota, disabled) — fine, guest default.
  }
}

export function isKnownUser(): boolean {
  try {
    return window.localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * The auth door for this device — /login for a known device, /signup for an
 * unknown one — with an optional post-auth destination. Client-side only
 * (reads localStorage): call it from effects or hydration-gated render paths,
 * never during server render.
 */
export function authDoorHref(redirectTo?: string): string {
  const door = isKnownUser() ? '/login' : '/signup';
  return redirectTo ? `${door}?redirect=${encodeURIComponent(redirectTo)}` : door;
}
