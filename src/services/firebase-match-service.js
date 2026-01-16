/**
 * Firebase Realtime Database - Match Pulse Service
 * 
 * Handles real-time artist match updates for TatT Pro's Match Pulse feature.
 * Provides <100ms sync latency for live artist suggestions as users design.
 * 
 * Works in both browser (client-side) and Node.js (server-side) environments.
 */

import { getDatabase, ref, set, onValue, off, get } from 'firebase/database';
import { initializeApp } from 'firebase/app';

// Detect environment
const isBrowser = typeof window !== 'undefined';

// Get environment variables
function getEnv(key) {
    const nextKey = `NEXT_PUBLIC_${key.replace(/^VITE_/, '')}`;
    if (isBrowser) {
        return process.env[nextKey] || process.env[key];
    } else {
        return process.env[key] || process.env[nextKey];
    }
}

// Client-side Firebase configuration
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || process.env.FIREBASE_DATABASE_URL,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.GCP_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

if (isBrowser) {
    console.log('[Firebase] Configuration:', {
        authDomain: firebaseConfig.authDomain,
        databaseURL: firebaseConfig.databaseURL,
        projectId: firebaseConfig.projectId
    });
}

// Initialize Firebase client
let clientApp;
let clientDatabase;

// Only initialize if we have a database URL
if (firebaseConfig.databaseURL) {
    try {
        clientApp = initializeApp(firebaseConfig);
        clientDatabase = getDatabase(clientApp);
        console.log('[Firebase] Client initialized');
    } catch (error) {
        console.warn('[Firebase] Client initialization failed:', error.message);
    }
} else {
    console.warn('[Firebase] Skipping client initialization - no database URL configured');
}

// Initialize Firebase Admin (server-side only, lazy)
let adminDatabase;
let adminInitPromise = null;

async function ensureAdminDatabase() {
    if (isBrowser) return null;
    if (adminDatabase) return adminDatabase;
    if (adminInitPromise) return adminInitPromise;

    adminInitPromise = (async () => {
        try {
            const admin = await import('firebase-admin');

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
                            databaseURL: dbUrl
                        });

                        adminDatabase = admin.default.database();
                        console.log('[Firebase] Admin initialized with service account');
                        return adminDatabase;
                    }

                    console.warn('[Firebase] Service account file not found:', credPath);
                }

                admin.default.initializeApp({
                    credential: admin.default.credential.applicationDefault(),
                    databaseURL: dbUrl
                });

                adminDatabase = admin.default.database();
                console.log('[Firebase] Admin initialized with default credentials');
                return adminDatabase;
            }

            adminDatabase = admin.default.database();
            return adminDatabase;
        } catch (error) {
            console.warn('[Firebase] Admin initialization skipped:', error.message);
            return null;
        } finally {
            adminInitPromise = null;
        }
    })();

    return adminInitPromise;
}

/**
 * Subscribe to real-time match updates (client-side)
 * 
 * @param {string} userId - User ID
 * @param {Function} callback - Called when matches update: callback(matchData)
 * @returns {Function} Unsubscribe function
 */
export function subscribeToMatches(userId, callback) {
    if (!clientDatabase) {
        console.warn('[Firebase] Client database not initialized');
        return () => { };
    }

    const matchRef = ref(clientDatabase, `matches/${userId}/current`);

    onValue(matchRef, (snapshot) => {
        const data = snapshot.val();
        callback(data);
    }, (error) => {
        console.error('[Firebase] Subscription error:', error);
        callback(null);
    });

    console.log(`[Firebase] Subscribed to matches for user: ${userId}`);

    // Return unsubscribe function
    return () => {
        off(matchRef);
        console.log(`[Firebase] Unsubscribed from matches for user: ${userId}`);
    };
}

/**
 * Update match data (server-side)
 * 
 * @param {string} userId - User ID
 * @param {Object} matchData - Match data object
 * @param {string} matchData.designId - Design UUID
 * @param {Array} matchData.artists - Array of matched artists
 * @returns {Promise<boolean>} True if update successful
 */
export async function updateMatches(userId, matchData) {
    const db = adminDatabase || await ensureAdminDatabase() || clientDatabase;

    if (!db) {
        throw new Error('[Firebase] Database not initialized');
    }

    try {
        const matchRef = ref(db, `matches/${userId}/current`);

        const dataToWrite = {
            designId: matchData.designId,
            updatedAt: Date.now(),
            artists: matchData.artists || []
        };

        await set(matchRef, dataToWrite);

        console.log(`[Firebase] Updated matches for user: ${userId}`);
        return true;

    } catch (error) {
        console.error('[Firebase] Update failed:', error);
        throw new Error(`Failed to update matches: ${error.message}`);
    }
}

/**
 * Get current matches (one-time read)
 * 
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} Match data or null
 */
export async function getMatches(userId) {
    const db = adminDatabase || await ensureAdminDatabase() || clientDatabase;

    if (!db) {
        throw new Error('[Firebase] Database not initialized');
    }

    try {
        const matchRef = ref(db, `matches/${userId}/current`);
        const snapshot = await get(matchRef);

        return snapshot.val();

    } catch (error) {
        console.error('[Firebase] Get matches failed:', error);
        return null;
    }
}

/**
 * Clear matches for a user
 * 
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} True if cleared successfully
 */
export async function clearMatches(userId) {
    const db = adminDatabase || await ensureAdminDatabase() || clientDatabase;

    if (!db) {
        throw new Error('[Firebase] Database not initialized');
    }

    try {
        const matchRef = ref(db, `matches/${userId}/current`);
        await set(matchRef, null);

        console.log(`[Firebase] Cleared matches for user: ${userId}`);
        return true;

    } catch (error) {
        console.error('[Firebase] Clear matches failed:', error);
        throw new Error(`Failed to clear matches: ${error.message}`);
    }
}

/**
 * Debounced match update (prevents excessive writes)
 * 
 * @param {string} userId - User ID
 * @param {Object} matchData - Match data
 * @param {number} debounceMs - Debounce delay in ms (default: 2000)
 * @returns {Function} Debounced update function
 */
export function createDebouncedMatchUpdate(userId, debounceMs = 2000) {
    let timeoutId;

    return (matchData) => {
        clearTimeout(timeoutId);

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
 * Health check for Firebase connection
 * 
 * @returns {Promise<Object>} Health status
 */
export async function checkFirebaseHealth() {
    const db = adminDatabase || clientDatabase;

    if (!db) {
        return {
            healthy: false,
            error: 'Database not initialized - check Firebase configuration'
        };
    }

    try {
        // Try to read from a test path
        const testRef = ref(db, 'health_check');
        await set(testRef, { timestamp: Date.now() });
        const snapshot = await get(testRef);
        await set(testRef, null); // Clean up

        return {
            healthy: true,
            connected: snapshot.exists(),
            database: getEnv('FIREBASE_DATABASE_URL') || getEnv('VITE_FIREBASE_DATABASE_URL')
        };

    } catch (error) {
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
    createDebouncedMatchUpdate,
    checkFirebaseHealth
};

export default firebaseService;
