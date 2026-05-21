/**
 * Firebase Realtime Database - Match Pulse Service
 *
 * NOTE: This file replaces two prior duplicates that lived side-by-side:
 *   - src/services/firebase-match-service.ts  (had demo-mode mock fallback)
 *   - src/services/firebase-match-service.js  (newer real-Firebase impl, had createDebouncedMatchUpdate)
 * The merged version below preserves the real-Firebase implementation from the
 * `.js` (client + lazy firebase-admin on server) and re-adds the demo-mode mock
 * data path gated by the `NEXT_PUBLIC_DEMO_MODE` env var (set to the string
 * 'true' to enable mocks without touching Firebase).
 *
 * Handles real-time artist match updates for TatT Pro's Match Pulse feature.
 * Provides <100ms sync latency for live artist suggestions as users design.
 * Works in both browser (client-side) and Node.js (server-side) environments.
 */

import { getDatabase, ref, set, onValue, off, get } from 'firebase/database';
import { initializeApp } from 'firebase/app';

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

// Mock artist data for demo mode
const MOCK_ARTISTS = [
  {
    id: 'artist-1',
    name: 'Luna Martinez',
    style: 'Neo-Traditional',
    location: 'Brooklyn, NY',
    rating: 4.9,
    matchScore: 0.95,
    portfolio: 'https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?w=400',
  },
  {
    id: 'artist-2',
    name: 'Kai Chen',
    style: 'Japanese',
    location: 'San Francisco, CA',
    rating: 4.8,
    matchScore: 0.88,
    portfolio: 'https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=400',
  },
  {
    id: 'artist-3',
    name: 'River Thompson',
    style: 'Blackwork',
    location: 'Portland, OR',
    rating: 4.7,
    matchScore: 0.82,
    portfolio: 'https://images.unsplash.com/photo-1590246814883-57c511e76729?w=400',
  },
];

// Detect environment
const isBrowser = typeof window !== 'undefined';

// Client-side Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || process.env.FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.GCP_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

if (isBrowser && !DEMO_MODE) {
  console.log('[Firebase] Configuration:', {
    authDomain: firebaseConfig.authDomain,
    databaseURL: firebaseConfig.databaseURL,
    projectId: firebaseConfig.projectId,
  });
}

// Initialize Firebase client (skip in demo mode)
let clientApp: any;
let clientDatabase: any;

if (!DEMO_MODE && firebaseConfig.databaseURL) {
  try {
    clientApp = initializeApp(firebaseConfig);
    clientDatabase = getDatabase(clientApp);
    console.log('[Firebase] Client initialized');
  } catch (error: any) {
    console.warn('[Firebase] Client initialization failed:', error.message);
  }
} else if (!DEMO_MODE) {
  console.warn('[Firebase] Skipping client initialization - no database URL configured');
}

// Initialize Firebase Admin (server-side only, lazy)
let adminDatabase: any;
let adminInitPromise: Promise<any> | null = null;

async function ensureAdminDatabase(): Promise<any> {
  if (DEMO_MODE) return null;
  if (isBrowser) return null;
  if (adminDatabase) return adminDatabase;
  if (adminInitPromise) return adminInitPromise;

  adminInitPromise = (async () => {
    try {
      const admin: any = await import('firebase-admin');

      if (!admin.default.apps.length) {
        const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        const dbUrl = process.env.FIREBASE_DATABASE_URL;

        if (!dbUrl) {
          console.warn('[Firebase] Admin skipped - no FIREBASE_DATABASE_URL');
          return null;
        }

        if (credPath) {
          const { readFileSync, existsSync } = await import('fs');

          if (existsSync(credPath)) {
            const serviceAccount = JSON.parse(readFileSync(credPath, 'utf8'));

            admin.default.initializeApp({
              credential: admin.default.credential.cert(serviceAccount),
              databaseURL: dbUrl,
            });

            adminDatabase = admin.default.database();
            console.log('[Firebase] Admin initialized with service account');
            return adminDatabase;
          }

          console.warn('[Firebase] Service account file not found:', credPath);
        }

        admin.default.initializeApp({
          credential: admin.default.credential.applicationDefault(),
          databaseURL: dbUrl,
        });

        adminDatabase = admin.default.database();
        console.log('[Firebase] Admin initialized with default credentials');
        return adminDatabase;
      }

      adminDatabase = admin.default.database();
      return adminDatabase;
    } catch (error: any) {
      console.warn('[Firebase] Admin initialization skipped:', error.message);
      return null;
    } finally {
      adminInitPromise = null;
    }
  })();

  return adminInitPromise;
}

/**
 * Subscribe to real-time match updates (client-side).
 * In demo mode, emits a single mock payload and returns a noop unsubscribe.
 *
 * @param userId - User ID
 * @param callback - Called when matches update: callback(matchData)
 * @returns Unsubscribe function
 */
export function subscribeToMatches(
  userId: string,
  callback: (data: any) => void
): () => void {
  if (DEMO_MODE) {
    console.log('[Firebase] Demo mode - emitting mock matches for user:', userId);
    setTimeout(() => {
      callback({
        designId: 'mock-design-1',
        updatedAt: Date.now(),
        artists: MOCK_ARTISTS,
      });
    }, 1000);
    return () => {
      console.log('[Firebase] Mock unsubscribe');
    };
  }

  if (!clientDatabase) {
    console.warn('[Firebase] Client database not initialized');
    return () => {};
  }

  const matchRef = ref(clientDatabase, `matches/${userId}/current`);

  onValue(
    matchRef,
    (snapshot) => {
      const data = snapshot.val();
      callback(data);
    },
    (error) => {
      console.error('[Firebase] Subscription error:', error);
      callback(null);
    }
  );

  console.log(`[Firebase] Subscribed to matches for user: ${userId}`);

  return () => {
    off(matchRef);
    console.log(`[Firebase] Unsubscribed from matches for user: ${userId}`);
  };
}

/**
 * Update match data (server-side).
 * Returns mock success in demo mode.
 *
 * @param userId - User ID
 * @param matchData - Match data object
 * @returns True if update successful
 */
export async function updateMatches(
  userId: string,
  matchData: { designId?: string; artists?: any[] }
): Promise<boolean> {
  if (DEMO_MODE) {
    console.log('[Firebase] Mock update matches for user:', userId);
    return true;
  }

  const db = adminDatabase || (await ensureAdminDatabase()) || clientDatabase;

  if (!db) {
    throw new Error('[Firebase] Database not initialized');
  }

  try {
    const matchRef = ref(db, `matches/${userId}/current`);

    const dataToWrite = {
      designId: matchData.designId,
      updatedAt: Date.now(),
      artists: matchData.artists || [],
    };

    await set(matchRef, dataToWrite);

    console.log(`[Firebase] Updated matches for user: ${userId}`);
    return true;
  } catch (error: any) {
    console.error('[Firebase] Update failed:', error);
    throw new Error(`Failed to update matches: ${error.message}`);
  }
}

/**
 * Get current matches (one-time read).
 * Returns mock data in demo mode.
 *
 * @param userId - User ID
 * @returns Match data or null
 */
export async function getMatches(userId: string): Promise<any> {
  if (DEMO_MODE) {
    console.log('[Firebase] Returning mock matches for user:', userId);
    return {
      designId: 'mock-design-1',
      updatedAt: Date.now(),
      artists: MOCK_ARTISTS,
    };
  }

  const db = adminDatabase || (await ensureAdminDatabase()) || clientDatabase;

  if (!db) {
    throw new Error('[Firebase] Database not initialized');
  }

  try {
    const matchRef = ref(db, `matches/${userId}/current`);
    const snapshot = await get(matchRef);

    return snapshot.val();
  } catch (error: any) {
    console.error('[Firebase] Get matches failed:', error);
    return null;
  }
}

/**
 * Clear matches for a user.
 *
 * @param userId - User ID
 * @returns True if cleared successfully
 */
export async function clearMatches(userId: string): Promise<boolean> {
  if (DEMO_MODE) {
    console.log('[Firebase] Mock clear matches for user:', userId);
    return true;
  }

  const db = adminDatabase || (await ensureAdminDatabase()) || clientDatabase;

  if (!db) {
    throw new Error('[Firebase] Database not initialized');
  }

  try {
    const matchRef = ref(db, `matches/${userId}/current`);
    await set(matchRef, null);

    console.log(`[Firebase] Cleared matches for user: ${userId}`);
    return true;
  } catch (error: any) {
    console.error('[Firebase] Clear matches failed:', error);
    throw new Error(`Failed to clear matches: ${error.message}`);
  }
}

/**
 * Debounced match update (prevents excessive writes).
 *
 * @param userId - User ID
 * @param debounceMs - Debounce delay in ms (default: 2000)
 * @returns Debounced update function accepting matchData
 */
export function createDebouncedMatchUpdate(
  userId: string,
  debounceMs: number = 2000
): (matchData: { designId?: string; artists?: any[] }) => void {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  return (matchData) => {
    if (timeoutId) clearTimeout(timeoutId);

    timeoutId = setTimeout(async () => {
      try {
        await updateMatches(userId, matchData);
      } catch (error) {
        console.error('[Firebase] Debounced update failed:', error);
      }
    }, debounceMs);
  };
}

/**
 * Health check for Firebase connection.
 * Always returns healthy in demo mode.
 *
 * @returns Health status
 */
export async function checkFirebaseHealth(): Promise<any> {
  if (DEMO_MODE) {
    return {
      healthy: true,
      mode: 'demo',
      message: 'Running in demo mode with mock data',
    };
  }

  const db = adminDatabase || clientDatabase;

  if (!db) {
    return {
      healthy: false,
      error: 'Database not initialized - check Firebase configuration',
    };
  }

  try {
    const testRef = ref(db, 'health_check');
    await set(testRef, { timestamp: Date.now() });
    const snapshot = await get(testRef);
    await set(testRef, null);

    return {
      healthy: true,
      connected: snapshot.exists(),
      database:
        process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || process.env.FIREBASE_DATABASE_URL,
    };
  } catch (error: any) {
    return {
      healthy: false,
      error: error.message,
    };
  }
}

const firebaseService = {
  subscribeToMatches,
  updateMatches,
  getMatches,
  clearMatches,
  createDebouncedMatchUpdate,
  checkFirebaseHealth,
};

export default firebaseService;
