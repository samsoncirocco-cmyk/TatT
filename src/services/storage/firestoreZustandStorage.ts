import type { StateStorage } from 'zustand/middleware';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { app as firebaseApp } from '../../lib/firebase-client';

export function createFirestoreZustandStorage(userId: string, designId: string): StateStorage {
  if (typeof window === 'undefined') {
    throw new Error('[ForgeStore] Firestore storage must run in the browser');
  }
  if (!firebaseApp) {
    throw new Error('[ForgeStore] Firebase app not initialized');
  }

  const db = getFirestore(firebaseApp);
  const ref = doc(db, `users/${userId}/designs/${designId}`);

  let debounceTimer: number | null = null;
  let pendingValue: string | null = null;

  const flush = async () => {
    const value = pendingValue;
    pendingValue = null;
    debounceTimer = null;
    if (value == null) return;

    try {
      await setDoc(
        ref,
        { storeState: JSON.parse(value), updatedAt: new Date() },
        { merge: true }
      );
    } catch (err) {
      console.error('[ForgeStore] Failed to persist storeState to Firestore:', err);
    }
  };

  return {
    getItem: async (_name: string) => {
      try {
        const snap = await getDoc(ref);
        if (!snap.exists()) return null;
        const data = snap.data() as any;
        if (!data?.storeState) return null;
        return JSON.stringify(data.storeState);
      } catch (err) {
        console.error('[ForgeStore] Failed to load storeState from Firestore:', err);
        return null;
      }
    },
    setItem: async (_name: string, value: string) => {
      pendingValue = value;
      if (debounceTimer != null) {
        window.clearTimeout(debounceTimer);
      }
      debounceTimer = window.setTimeout(() => {
        void flush();
      }, 1000);
    },
    removeItem: async (_name: string) => {
      try {
        await setDoc(ref, { storeState: null, updatedAt: new Date() }, { merge: true });
      } catch (err) {
        console.error('[ForgeStore] Failed to remove storeState from Firestore:', err);
      }
    },
  };
}
