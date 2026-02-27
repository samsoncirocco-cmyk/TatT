import type { IDesignStorage } from './IDesignStorage';
import { LocalStorageAdapter } from './LocalStorageAdapter';
import { FirestoreAdapter } from './FirestoreAdapter';
import { getFirestore } from 'firebase/firestore';
import { app as firebaseApp } from '../../lib/firebase-client';

type MinimalUser = { uid: string } | null;

let cached: { userId: string | null; adapter: IDesignStorage } | null = null;

function createFirestoreAdapter(): IDesignStorage {
  // firebaseApp is only initialized in the browser; guard to avoid SSR surprises.
  if (!firebaseApp) {
    throw new Error('[StorageFactory] Firebase app not initialized (client only)');
  }
  const db = getFirestore(firebaseApp);
  return new FirestoreAdapter(db);
}

export function createStorageAdapter(user: MinimalUser): IDesignStorage {
  const uid = user?.uid || null;

  if (cached && cached.userId === uid) {
    return cached.adapter;
  }

  let adapter: IDesignStorage;
  if (!uid) {
    adapter = new LocalStorageAdapter();
  } else {
    try {
      adapter = createFirestoreAdapter();
    } catch (err) {
      console.warn('[StorageFactory] Falling back to LocalStorageAdapter:', err);
      adapter = new LocalStorageAdapter();
    }
  }

  cached = { userId: uid, adapter };
  return adapter;
}

export function setCurrentUser(user: MinimalUser): void {
  // Force cache refresh on auth state changes.
  cached = null;
  createStorageAdapter(user);
}

export function getStorageAdapter(): IDesignStorage {
  if (cached) return cached.adapter;
  cached = { userId: null, adapter: new LocalStorageAdapter() };
  return cached.adapter;
}
