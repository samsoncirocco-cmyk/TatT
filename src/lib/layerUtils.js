/**
 * Shared Layer Utilities
 *
 * Common utilities used across layer management services to avoid duplication
 */

/**
 * Generate unique layer ID
 *
 * Format: layer_<timestamp>_<random>
 * Example: layer_1704838274123_k3f9a2c
 *
 * @returns {string} Unique layer ID
 */
export function generateLayerId() {
    return `layer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate layer ID format
 *
 * @param {string} id - Layer ID to validate
 * @returns {boolean} True if valid layer ID format
 */
export function isValidLayerId(id) {
    return typeof id === 'string' && /^layer_\d+_[a-z0-9]+$/.test(id);
}

/**
 * Extract timestamp from layer ID
 *
 * @param {string} id - Layer ID
 * @returns {number|null} Timestamp in milliseconds or null if invalid
 */
export function getLayerTimestamp(id) {
    if (!isValidLayerId(id)) return null;

    const match = id.match(/^layer_(\d+)_/);
    return match ? parseInt(match[1], 10) : null;
}
