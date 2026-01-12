/**
 * Version History Service
 *
 * Manages the version history of tattoo designs using localStorage.
 * Handles auto-saving versions, branching, and comparison data retrieval.
 */

import { safeLocalStorageGet, safeLocalStorageSet } from './storageService.js';

const VERSION_STORAGE_KEY_PREFIX = 'tattester_version_history_';
const MAX_VERSIONS_PER_DESIGN = 50;

/**
 * Generate a unique version ID
 */
function generateVersionId() {
    return `v_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a version object
 */
function createVersion(data) {
    return {
        id: generateVersionId(),
        timestamp: new Date().toISOString(),
        ...data
    };
}

/**
 * Get all versions for a specific design session
 * @param {string} sessionId - Unique identifier for the current design session
 */
export function getVersions(sessionId) {
    if (!sessionId) return [];

    // Chance to purge old histories (1 in 10 calls to avoid slight perf hit every time)
    if (Math.random() < 0.1) {
        purgeOldHistories();
    }

    const key = `${VERSION_STORAGE_KEY_PREFIX}${sessionId}`;
    return safeLocalStorageGet(key, []);
}

/**
 * Purge version histories older than 90 days
 */
function purgeOldHistories() {
    const now = Date.now();
    const expiryMs = 90 * 24 * 60 * 60 * 1000; // 90 days

    try {
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(VERSION_STORAGE_KEY_PREFIX)) {
                try {
                    const rawFn = localStorage.getItem(key);
                    const versions = JSON.parse(rawFn);

                    if (Array.isArray(versions) && versions.length > 0) {
                        // Check timestamp of the most recent version
                        const lastVersion = versions[versions.length - 1];
                        const lastActive = new Date(lastVersion.timestamp).getTime();

                        if (now - lastActive > expiryMs) {
                            localStorage.removeItem(key);
                            console.log('[VersionService] Purged expired history:', key);
                        }
                    } else {
                        // Corrupt or empty, remove
                        localStorage.removeItem(key);
                    }
                } catch (e) {
                    // Ignore parse errors, maybe remove key?
                }
            }
        });
    } catch (error) {
        console.warn('[VersionService] Error purging old histories:', error);
    }
}

/**
 * Add a new version to the history
 * @param {string} sessionId - The session ID
 * @param {Object} versionData - Data to save (image, prompt, params, etc.)
 */
export function addVersion(sessionId, versionData) {
    if (!sessionId) {
        console.warn('[VersionService] No session ID provided for saving version.');
        return null;
    }

    try {
        const versions = getVersions(sessionId);
        const newVersion = createVersion({
            versionNumber: versions.length + 1,
            ...versionData
        });

        // Add to end of array (chronological) 
        // Wait, typically timelines are newest first or oldest first? 
        // Let's do chronological (append) so 1, 2, 3...
        versions.push(newVersion);

        // Enforce limit (remove oldest non-favorite/non-protected if we had favorites, 
        // but typically versions are just raw history. Removing the very first one (oldest).)
        if (versions.length > MAX_VERSIONS_PER_DESIGN) {
            versions.shift(); // Remove oldest
            // Re-number remaining versions? No, keep original numbers to avoid confusion.
        }

        const key = `${VERSION_STORAGE_KEY_PREFIX}${sessionId}`;
        const result = safeLocalStorageSet(key, versions);

        if (!result.success) {
            console.error('[VersionService] Failed to save version:', result.error);
            return null;
        }

        return newVersion;
    } catch (error) {
        console.error('[VersionService] Error adding version:', error);
        return null;
    }
}

/**
 * Delete a specific version
 */
export function deleteVersion(sessionId, versionId) {
    const versions = getVersions(sessionId);
    const updatedVersions = versions.filter(v => v.id !== versionId);

    const key = `${VERSION_STORAGE_KEY_PREFIX}${sessionId}`;
    safeLocalStorageSet(key, updatedVersions);
    return updatedVersions;
}

/**
 * Clear all versions for a session
 */
export function clearSessionHistory(sessionId) {
    const key = `${VERSION_STORAGE_KEY_PREFIX}${sessionId}`;
    localStorage.removeItem(key);
}

/**
 * Get a specific version by ID
 */
export function getVersionById(sessionId, versionId) {
    const versions = getVersions(sessionId);
    return versions.find(v => v.id === versionId);
}

/**
 * Branch from a specific version
 * Creates a new session starting from the selected version
 */
export function branchFromVersion(originalSessionId, versionId) {
    const sourceVersion = getVersionById(originalSessionId, versionId);

    if (!sourceVersion) {
        console.error('[VersionService] Version not found:', versionId);
        return null;
    }

    // Generate new session ID for the branch
    const branchSessionId = `${originalSessionId}_branch_${Date.now()}`;

    // Create first version in new branch based on source version
    const branchVersion = createVersion({
        versionNumber: 1,
        ...sourceVersion,
        branchedFrom: {
            sessionId: originalSessionId,
            versionId: versionId,
            versionNumber: sourceVersion.versionNumber
        }
    });

    // Save to new session
    const key = `${VERSION_STORAGE_KEY_PREFIX}${branchSessionId}`;
    safeLocalStorageSet(key, [branchVersion]);

    return {
        sessionId: branchSessionId,
        version: branchVersion
    };
}

/**
 * Compare two versions
 * Returns comparison data for side-by-side display
 */
export function compareVersions(sessionId, versionId1, versionId2) {
    const version1 = getVersionById(sessionId, versionId1);
    const version2 = getVersionById(sessionId, versionId2);

    if (!version1 || !version2) {
        console.error('[VersionService] One or both versions not found');
        return null;
    }

    // Identify differences
    const differences = {
        prompt: version1.prompt !== version2.prompt,
        enhancedPrompt: version1.enhancedPrompt !== version2.enhancedPrompt,
        parameters: JSON.stringify(version1.parameters) !== JSON.stringify(version2.parameters),
        layerCount: (version1.layers?.length || 0) !== (version2.layers?.length || 0),
        imageUrl: version1.imageUrl !== version2.imageUrl
    };

    // Calculate similarity score (0-100)
    const totalChecks = Object.keys(differences).length;
    const sameCount = Object.values(differences).filter(diff => !diff).length;
    const similarityScore = Math.round((sameCount / totalChecks) * 100);

    return {
        version1,
        version2,
        differences,
        similarityScore,
        timeDifference: new Date(version2.timestamp).getTime() - new Date(version1.timestamp).getTime()
    };
}

/**
 * Merge elements from two versions
 * Combines layers from different versions into a new version
 */
export function mergeVersions(sessionId, versionId1, versionId2, mergeOptions = {}) {
    const version1 = getVersionById(sessionId, versionId1);
    const version2 = getVersionById(sessionId, versionId2);

    if (!version1 || !version2) {
        console.error('[VersionService] One or both versions not found');
        return null;
    }

    const {
        layersFromVersion1 = [],
        layersFromVersion2 = [],
        prompt = version1.prompt,
        parameters = version1.parameters
    } = mergeOptions;

    // Combine selected layers
    const mergedLayers = [
        ...(version1.layers || []).filter((_, idx) => layersFromVersion1.includes(idx)),
        ...(version2.layers || []).filter((_, idx) => layersFromVersion2.includes(idx))
    ];

    // Create new merged version
    const mergedVersion = addVersion(sessionId, {
        prompt,
        parameters,
        layers: mergedLayers,
        imageUrl: null, // Will need to be re-generated
        mergedFrom: {
            version1: versionId1,
            version2: versionId2,
            mergeOptions
        }
    });

    return mergedVersion;
}

/**
 * Get version timeline metadata
 * Returns summary info for timeline visualization
 */
export function getVersionTimeline(sessionId) {
    const versions = getVersions(sessionId);

    return versions.map(v => ({
        id: v.id,
        versionNumber: v.versionNumber,
        timestamp: v.timestamp,
        thumbnail: v.imageUrl || v.layers?.[0]?.imageUrl,
        promptPreview: (v.prompt || '').substring(0, 50) + (v.prompt?.length > 50 ? '...' : ''),
        layerCount: v.layers?.length || 0,
        branchedFrom: v.branchedFrom,
        mergedFrom: v.mergedFrom
    }));
}

/**
 * Mark version as favorite (won't be auto-purged)
 */
export function toggleVersionFavorite(sessionId, versionId) {
    const versions = getVersions(sessionId);
    const updatedVersions = versions.map(v =>
        v.id === versionId
            ? { ...v, isFavorite: !v.isFavorite }
            : v
    );

    const key = `${VERSION_STORAGE_KEY_PREFIX}${sessionId}`;
    safeLocalStorageSet(key, updatedVersions);

    return updatedVersions.find(v => v.id === versionId);
}
