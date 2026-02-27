/**
 * Firebase Client SDK Initialization
 *
 * Initializes Firebase client SDK with browserLocalPersistence for auth.
 * Works alongside existing firebase-match-service.ts (Realtime Database).
 *
 * This module provides:
 * - Firebase app instance
 * - Firebase Auth instance with persistent sessions
 */

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, type Auth } from 'firebase/auth';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const isBrowser = typeof window !== 'undefined';

// Initialize Firebase client only in the browser.
// This file may be imported during server builds/prerender; keep it side-effect free on the server.
let app: FirebaseApp | null = null;
let auth: Auth | null = null;

if (isBrowser) {
  if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
    console.warn('[Firebase Client] Missing required environment variables. Auth will not work.');
  } else {
    // The getApps() check prevents duplicate initialization errors.
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
      console.log('[Firebase Client] Initialized new app instance');
    } else {
      app = getApps()[0];
      console.log('[Firebase Client] Using existing app instance');
    }

    auth = getAuth(app);

    // Set persistence to LOCAL (survives browser tab close and refresh).
    setPersistence(auth, browserLocalPersistence)
      .then(() => {
        console.log('[Firebase Client] Auth persistence set to LOCAL (survives tab close)');
      })
      .catch((error) => {
        console.error('[Firebase Client] Failed to set auth persistence:', error);
      });
  }
}

export { app, auth };
