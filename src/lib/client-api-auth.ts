import { useAuthStore } from '@/store/useAuthStore';

export async function getApiAuthHeaders(): Promise<Record<string, string>> {
  // Lazy import: this helper is called on user actions (API requests), never
  // during render, and its static './firebase' edge was what kept
  // firebase/auth (~34 KB gz) in the First Load JS of every route that
  // renders a component wired to it (/pricing, /bookings, /designs, ...).
  const { auth } = await import('./firebase');
  // currentUser is null until Firebase finishes restoring the session —
  // typing immediately on page load raced that and threw a spurious
  // "Sign in to continue." at signed-in users. Wait for auth to settle
  // before deciding the user actually isn't signed in.
  if (auth && !auth.currentUser) {
    await auth.authStateReady();
  }

  const user = auth?.currentUser;
  if (!user) {
    useAuthStore.getState().promptSignIn();
    throw new Error('Sign in to continue.');
  }

  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}
