/**
 * Score Aggregation Utilities
 * 
 * Provides functions for normalizing, combining, and explaining match scores
 * from multiple ranking signals (vector similarity, graph relationships, etc.)
 */

/**
 * Normalize a score to 0-1 range
 * @param {number} value - Raw score value
 * @param {number} min - Minimum possible value
 * @param {number} max - Maximum possible value
 * @returns {number} Normalized score between 0 and 1
 */
export function normalizeScore(value, min, max) {
    if (max === min) return 0.5; // Neutral if no variance
    return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

/**
 * Calculate weighted average of multiple scores
 * @param {Object} scores - Object with score names as keys and values as scores (0-1)
 * @param {Object} weights - Object with score names as keys and weights as values (should sum to 1)
 * @returns {number} Weighted composite score (0-1)
 */
export function weightedAverage(scores, weights) {
    let totalWeight = 0;
    let weightedSum = 0;

    for (const [key, weight] of Object.entries(weights)) {
        if (scores[key] !== undefined && scores[key] !== null) {
            weightedSum += scores[key] * weight;
            totalWeight += weight;
        }
    }

    // Normalize by actual total weight (in case some scores are missing)
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

/**
 * Generate human-readable match reasoning
 * @param {Object} scores - Individual component scores
 * @param {Object} artist - Artist data
 * @param {Object} preferences - User preferences
 * @returns {Array<string>} Array of match reasons
 */
export function generateMatchReasoning(scores, artist, preferences = {}) {
    const reasons = [];

    // Visual similarity (from vector search)
    if (scores.visualSimilarity !== undefined && scores.visualSimilarity > 0.7) {
        reasons.push(`Strong visual style match (${Math.round(scores.visualSimilarity * 100)}% similarity)`);
    } else if (scores.visualSimilarity !== undefined && scores.visualSimilarity > 0.5) {
        reasons.push(`Good visual style alignment (${Math.round(scores.visualSimilarity * 100)}% similarity)`);
    }

    // Style alignment (from graph/tags)
    if (scores.styleAlignment !== undefined && scores.styleAlignment > 0.7) {
        if (artist.styles && preferences.styles) {
            const matchingStyles = artist.styles.filter(s =>
                preferences.styles.some(ps => ps.toLowerCase() === s.toLowerCase())
            );
            if (matchingStyles.length > 0) {
                reasons.push(`Specializes in ${matchingStyles.join(', ')}`);
            }
        }
    }

    // Location proximity
    if (scores.location !== undefined && scores.location > 0.8) {
        reasons.push(`Located in ${artist.city || 'your area'}`);
    } else if (scores.location !== undefined && scores.location > 0.5) {
        reasons.push('Within your search radius');
    }

    // Budget fit
    if (scores.budget !== undefined && scores.budget > 0.8) {
        reasons.push('Within your budget');
    } else if (scores.budget !== undefined && scores.budget > 0.5) {
        reasons.push('Close to your budget range');
    }

    // Graph relationships (if available)
    if (scores.graphRelationship !== undefined && scores.graphRelationship > 0.5) {
        reasons.push('Connected through artist network');
    }

    // Fallback if no specific reasons
    if (reasons.length === 0) {
        reasons.push('Recommended based on your preferences');
    }

    return reasons;
}

/**
 * Default weight configuration for hybrid matching
 * Weights should sum to 1.0
 */
export const DEFAULT_WEIGHTS = {
    visualSimilarity: 0.40,  // 40% - Vector similarity from CLIP embeddings
    styleAlignment: 0.25,    // 25% - Style tag matching
    location: 0.15,          // 15% - Geographic proximity
    budget: 0.10,            // 10% - Budget fit
    randomVariety: 0.10      // 10% - Random factor for diversity
};

/**
 * Calculate composite score from multiple signals
 * @param {Object} signals - Individual scoring signals
 * @param {Object} weights - Custom weights (optional, uses defaults if not provided)
 * @returns {Object} { score: number, breakdown: Object }
 */
export function calculateCompositeScore(signals, weights = DEFAULT_WEIGHTS) {
    // Ensure all signals are normalized (0-1)
    const normalizedSignals = {};

    for (const [key, value] of Object.entries(signals)) {
        if (typeof value === 'number') {
            normalizedSignals[key] = Math.max(0, Math.min(1, value));
        }
    }

    // Add random variety if not provided
    if (normalizedSignals.randomVariety === undefined) {
        normalizedSignals.randomVariety = Math.random();
    }

    // Calculate weighted average
    const compositeScore = weightedAverage(normalizedSignals, weights);

    return {
        score: compositeScore,
        breakdown: {
            ...normalizedSignals,
            weights: weights
        }
    };
}

/**
 * Merge and deduplicate results from multiple sources
 * @param {Array} vectorResults - Results from vector search
 * @param {Array} graphResults - Results from graph query
 * @param {string} joinKey - Key to join on (e.g., 'artist_id' or 'id')
 * @returns {Array} Merged results with combined data
 */
export function mergeResults(vectorResults, graphResults, joinKey = 'id') {
    const merged = new Map();

    // Add vector results
    for (const result of vectorResults) {
        const key = result[joinKey];
        merged.set(key, {
            ...result,
            source: 'vector',
            vectorScore: result.score || 0
        });
    }

    // Merge with graph results
    for (const result of graphResults) {
        const key = result[joinKey];
        if (merged.has(key)) {
            // Combine data from both sources
            merged.set(key, {
                ...merged.get(key),
                ...result,
                source: 'hybrid',
                graphScore: result.score || 0
            });
        } else {
            // Add graph-only result
            merged.set(key, {
                ...result,
                source: 'graph',
                graphScore: result.score || 0
            });
        }
    }

    return Array.from(merged.values());
}
