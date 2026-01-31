/**
 * Match Pulse Integration Service
 * 
 * Connects design changes to artist matching and Firebase real-time updates.
 * This is the glue that makes Match Pulse work end-to-end.
 */

import { findMatchingArtistsForDemo } from './demoMatchService.js';
import { updateMatches } from './firebase-match-service.js';

// Debounce timer
let updateTimer = null;
const DEBOUNCE_MS = 2000; // 2 seconds

/**
 * Update artist matches based on current design
 * Debounced to prevent excessive API calls
 * 
 * @param {string} userId - Current user ID
 * @param {Object} design - Current design object
 * @param {Object} preferences - User preferences (location, budget, etc.)
 * @returns {Promise<void>}
 */
export async function updateMatchPulse(userId, design, preferences = {}) {
    // Clear existing timer
    if (updateTimer) {
        clearTimeout(updateTimer);
    }

    // Debounce the update
    return new Promise((resolve, reject) => {
        updateTimer = setTimeout(async () => {
            try {
                console.log('[MatchPulse] Updating matches for design:', design.id);

                // Find matching artists
                const matches = await findMatchingArtistsForDemo(design, preferences);

                // Update Firebase with results
                await updateMatches(userId, {
                    designId: design.id,
                    artists: matches
                });

                console.log(`[MatchPulse] Updated with ${matches.length} matches`);
                resolve(matches);

            } catch (error) {
                console.error('[MatchPulse] Update failed:', error);
                reject(error);
            }
        }, DEBOUNCE_MS);
    });
}

/**
 * Initialize Match Pulse for a user
 * Call this when user starts designing
 * 
 * @param {string} userId - User ID
 * @param {Object} initialDesign - Initial design (optional)
 * @param {Object} preferences - User preferences
 * @returns {Promise<void>}
 */
export async function initializeMatchPulse(userId, initialDesign = null, preferences = {}) {
    try {
        console.log('[MatchPulse] Initializing for user:', userId);

        if (initialDesign) {
            // Get initial matches without debounce
            const matches = await findMatchingArtistsForDemo(initialDesign, preferences);

            await updateMatches(userId, {
                designId: initialDesign.id,
                artists: matches
            });

            console.log(`[MatchPulse] Initialized with ${matches.length} matches`);
        }

    } catch (error) {
        console.error('[MatchPulse] Initialization failed:', error);
        throw error;
    }
}

/**
 * Clear Match Pulse for a user
 * Call this when user logs out or clears design
 * 
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export async function clearMatchPulse(userId) {
    try {
        const { clearMatches } = await import('./firebase-match-service.js');
        await clearMatches(userId);
        console.log('[MatchPulse] Cleared for user:', userId);
    } catch (error) {
        console.error('[MatchPulse] Clear failed:', error);
    }
}

export default {
    updateMatchPulse,
    initializeMatchPulse,
    clearMatchPulse
};
