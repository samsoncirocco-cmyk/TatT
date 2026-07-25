import { auth } from './firebase';
import { useAuthStore } from '@/store/useAuthStore';

export async function getApiAuthHeaders(): Promise<Record<string, string>> {
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
