import { auth } from './firebase';
import { useAuthStore } from '@/store/useAuthStore';

export async function getApiAuthHeaders(): Promise<Record<string, string>> {
  const user = auth?.currentUser;
  if (!user) {
    useAuthStore.getState().promptSignIn();
    throw new Error('Sign in to continue.');
  }

  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}
