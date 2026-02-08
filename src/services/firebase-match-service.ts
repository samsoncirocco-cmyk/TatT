/**
 * Firebase Realtime Database - Match Pulse Service
 * 
 * Handles real-time artist match updates for TatT Pro's Match Pulse feature.
 * Provides <100ms sync latency for live artist suggestions as users design.
 * 
 * Works in both browser (client-side) and Node.js (server-side) environments.
 * Falls back to mock data when Firebase is unavailable (demo mode).
 */

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

let firebaseInitialized = false;
let clientDatabase: any = null;
let adminDatabase: any = null;

// Try to initialize Firebase (non-throwing)
async function tryInitializeFirebase() {
  if (firebaseInitialized) return true;
  if (DEMO_MODE) {
    console.log('[Firebase] Running in demo mode - using mock data');
    return false;
  }

  try {
    // Check for required config
    const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || process.env.FIREBASE_DATABASE_URL;
    if (!databaseURL) {
      console.warn('[Firebase] No database URL configured - using mock data');
      return false;
    }

    // Client-side initialization
    if (isBrowser) {
      const { getDatabase, ref } = await import('firebase/database');
      const { initializeApp } = await import('firebase/app');

      const firebaseConfig = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        databaseURL,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.GCP_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      };

      const app = initializeApp(firebaseConfig);
      clientDatabase = getDatabase(app);
      firebaseInitialized = true;
      console.log('[Firebase] Client initialized successfully');
      return true;
    }

    firebaseInitialized = true;
    return true;
  } catch (error: any) {
    console.warn('[Firebase] Initialization failed, using mock data:', error.message);
    return false;
  }
}

/**
 * Subscribe to real-time match updates (client-side)
 * Falls back to mock data if Firebase unavailable
 * 
 * @param userId - User ID
 * @param callback - Called when matches update: callback(matchData)
 * @returns Unsubscribe function
 */
export async function subscribeToMatches(userId: string, callback: (data: any) => void): Promise<() => void> {
  const initialized = await tryInitializeFirebase();

  if (!initialized || !clientDatabase) {
    console.log('[Firebase] Using mock match data for user:', userId);
    
    // Simulate real-time updates with mock data
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

  try {
    const { ref, onValue, off } = await import('firebase/database');
    const matchRef = ref(clientDatabase, `matches/${userId}/current`);

    onValue(matchRef, (snapshot) => {
      const data = snapshot.val();
      callback(data);
    }, (error) => {
      console.error('[Firebase] Subscription error:', error);
      // Fall back to mock data on error
      callback({
        designId: 'mock-design-fallback',
        updatedAt: Date.now(),
        artists: MOCK_ARTISTS,
      });
    });

    console.log(`[Firebase] Subscribed to matches for user: ${userId}`);

    return () => {
      off(matchRef);
      console.log(`[Firebase] Unsubscribed from matches for user: ${userId}`);
    };
  } catch (error: any) {
    console.error('[Firebase] Subscribe error, using mock data:', error.message);
    callback({
      designId: 'mock-design-error',
      updatedAt: Date.now(),
      artists: MOCK_ARTISTS,
    });
    return () => {};
  }
}

/**
 * Update match data (server-side)
 * Returns mock success in demo mode
 * 
 * @param userId - User ID
 * @param matchData - Match data object
 * @returns True if update successful
 */
export async function updateMatches(userId: string, matchData: any): Promise<boolean> {
  if (DEMO_MODE) {
    console.log('[Firebase] Mock update matches for user:', userId);
    return true;
  }

  const initialized = await tryInitializeFirebase();
  
  if (!initialized) {
    console.warn('[Firebase] Not initialized, skipping update');
    return false;
  }

  try {
    const { ref, set } = await import('firebase/database');
    const db = clientDatabase; // In demo app, we only use client database

    if (!db) {
      console.warn('[Firebase] Database not available');
      return false;
    }

    const matchRef = ref(db, `matches/${userId}/current`);

    const dataToWrite = {
      designId: matchData.designId,
      updatedAt: Date.now(),
      artists: matchData.artists || []
    };

    await set(matchRef, dataToWrite);

    console.log(`[Firebase] Updated matches for user: ${userId}`);
    return true;

  } catch (error: any) {
    console.error('[Firebase] Update failed:', error.message);
    return false;
  }
}

/**
 * Get current matches (one-time read)
 * Returns mock data if Firebase unavailable
 * 
 * @param userId - User ID
 * @returns Match data or mock data
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

  const initialized = await tryInitializeFirebase();

  if (!initialized || !clientDatabase) {
    console.log('[Firebase] Returning mock matches (not initialized)');
    return {
      designId: 'mock-design-fallback',
      updatedAt: Date.now(),
      artists: MOCK_ARTISTS,
    };
  }

  try {
    const { ref, get } = await import('firebase/database');
    const matchRef = ref(clientDatabase, `matches/${userId}/current`);
    const snapshot = await get(matchRef);

    return snapshot.val() || {
      designId: 'empty',
      updatedAt: Date.now(),
      artists: MOCK_ARTISTS,
    };

  } catch (error: any) {
    console.error('[Firebase] Get matches failed, using mock data:', error.message);
    return {
      designId: 'mock-design-error',
      updatedAt: Date.now(),
      artists: MOCK_ARTISTS,
    };
  }
}

/**
 * Clear matches for a user
 * 
 * @param userId - User ID
 * @returns True if cleared successfully
 */
export async function clearMatches(userId: string): Promise<boolean> {
  if (DEMO_MODE) {
    console.log('[Firebase] Mock clear matches for user:', userId);
    return true;
  }

  const initialized = await tryInitializeFirebase();

  if (!initialized || !clientDatabase) {
    return false;
  }

  try {
    const { ref, set } = await import('firebase/database');
    const matchRef = ref(clientDatabase, `matches/${userId}/current`);
    await set(matchRef, null);

    console.log(`[Firebase] Cleared matches for user: ${userId}`);
    return true;

  } catch (error: any) {
    console.error('[Firebase] Clear matches failed:', error.message);
    return false;
  }
}

/**
 * Health check for Firebase connection
 * Always returns healthy in demo mode
 * 
 * @returns Health status
 */
export async function checkFirebaseHealth(): Promise<any> {
  if (DEMO_MODE) {
    return {
      healthy: true,
      mode: 'demo',
      message: 'Running in demo mode with mock data'
    };
  }

  const initialized = await tryInitializeFirebase();

  if (!initialized || !clientDatabase) {
    return {
      healthy: false,
      error: 'Database not initialized - check Firebase configuration'
    };
  }

  try {
    const { ref, set, get } = await import('firebase/database');
    const testRef = ref(clientDatabase, 'health_check');
    await set(testRef, { timestamp: Date.now() });
    const snapshot = await get(testRef);
    await set(testRef, null);

    return {
      healthy: true,
      connected: snapshot.exists(),
      database: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || process.env.FIREBASE_DATABASE_URL
    };

  } catch (error: any) {
    return {
      healthy: false,
      error: error.message
    };
  }
}

const firebaseService = {
  subscribeToMatches,
  updateMatches,
  getMatches,
  clearMatches,
  checkFirebaseHealth
};

export default firebaseService;
