import { auth } from './firebase';

export async function getApiAuthHeaders(): Promise<Record<string, string>> {
  const user = auth?.currentUser;
  if (!user) {
    throw new Error('Sign in to continue.');
  }

  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}
