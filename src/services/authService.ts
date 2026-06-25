import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  type User,
  type Unsubscribe,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

const googleProvider = new GoogleAuthProvider();

function requireAuth() {
  if (!auth) throw new Error('Firebase is not configured. Set NEXT_PUBLIC_FIREBASE_API_KEY to enable auth.');
  return auth;
}

export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(requireAuth(), googleProvider);
  return result.user;
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const result = await signInWithEmailAndPassword(requireAuth(), email, password);
  return result.user;
}

export async function signUpWithEmail(email: string, password: string): Promise<User> {
  const result = await createUserWithEmailAndPassword(requireAuth(), email, password);
  return result.user;
}

export async function signOut(): Promise<void> {
  if (!auth) return;
  await firebaseSignOut(auth);
}

export function getCurrentUser(): User | null {
  return auth?.currentUser ?? null;
}

export function onAuthStateChanged(callback: (user: User | null) => void): Unsubscribe {
  if (!auth) {
    // No Firebase — immediately signal "no user" and return a no-op unsubscriber
    callback(null);
    return () => {};
  }
  return firebaseOnAuthStateChanged(auth, callback);
}
