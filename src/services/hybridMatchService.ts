/**
 * Hybrid Vector-Graph Matching Service
 *
 * Combines Neo4j graph traversal with vector similarity search
 * to enable semantic artist discovery beyond keyword matching.
 */

import { searchSimilar } from './vectorDbService';
import { VECTOR_DB_CONFIG } from '../config/vectorDbConfig';
import { findMatchingArtists as findGraphArtists, findArtistsByEmbeddingIds } from './neo4jService';
import {
    calculateCompositeScore,
    generateMatchReasoning,
    mergeResults,
    DEFAULT_WEIGHTS
} from '../utils/scoreAggregation';
import { fetchWithAbort } from './fetchWithAbort';

// Type Definitions
export interface QueryPreferences {
    location?: string | null;
    styles?: string[];
    budget?: number | null;
    keywords?: string[];
    distance?: number;
}

export interface VectorSearchResult {
    id: string | number;
    visualSimilarity: number;
    source: 'vector';
}

export interface GraphSearchResult {
    id: string | number;
    graphScore: number;
    source: 'graph';
    [key: string]: any;
}

export interface ScoreSignals {
    visualSimilarity: number;
    styleAlignment: number;
    location: number;
    budget: number;
    randomVariety: number;
}

export interface MatchedArtist {
    id: string | number;
    name?: string;
    city?: string;
    styles?: string[];
    hourlyRate?: number;
    compositeScore: number;
    score: number;
    matchScore: number;
    scoreBreakdown: Record<string, number>;
    reasons: string[];
    visualSimilarity?: number;
    source?: 'vector' | 'graph';
    [key: string]: any;
}

export interface MatchResult {
    matches: MatchedArtist[];
    totalCandidates: number;
    queryInfo: {
        query: string;
        visualConcepts: string[];
        keywords: string[];
        vectorResultCount: number;
        graphResultCount: number;
    };
    performance: {
        totalTime: number;
        vectorTime: number;
        mergeTime: number;
    };
}

interface ParsedQuery {
    visualConcepts: string[];
    keywords: string[];
}

interface CacheEntry {
    data: MatchResult;
    timestamp: number;
}

// Simple in-memory cache for query results (5 minute TTL)
const queryCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Parse user query to extract visual concepts and keywords
 */
function parseQuery(query: string): ParsedQuery {
    if (!query || typeof query !== 'string') {
        return { visualConcepts: [], keywords: [] };
    }

    // Split query into tokens
    const tokens = query.toLowerCase().trim().split(/\s+/);

    // For MVP, treat all tokens as both visual concepts and keywords
    // In production, could use NLP to distinguish visual vs. semantic terms
    return {
        visualConcepts: tokens,
        keywords: tokens
    };
}

/**
 * Generate embedding for query text
 * Note: This is a placeholder - in production, would call CLIP model
 * For now, returns a mock embedding for testing
 */
async function generateQueryEmbedding(query: string): Promise<number[]> {
    // TODO: Implement actual text embedding generation (Vertex text or CLIP text encoder)
    // For now, return a deterministic mock embedding aligned with vector DB dimensions.
    console.warn('[HybridMatch] Using mock embedding - implement text encoder in production');

    // Generate a deterministic "embedding" based on query hash
    // This ensures same query gets same embedding
    const hash = query.split('').reduce((acc, char) => {
        return ((acc << 5) - acc) + char.charCodeAt(0);
    }, 0);

    const dimension = VECTOR_DB_CONFIG.DIMENSIONS || 1408;
    const embedding = new Array(dimension).fill(0).map((_, i) => {
        return Math.sin(hash * (i + 1) * 0.001) * 0.5 + 0.5;
    });

    return embedding;
}

/**
 * Execute vector similarity search
 */
async function executeVectorSearch(query: string, topK: number = 20): Promise<VectorSearchResult[]> {
    try {
        // Generate query embedding
        const queryEmbedding = await generateQueryEmbedding(query);

        // Search for similar artists
        const results = await searchSimilar(queryEmbedding, topK);

        return results.map(result => ({
            id: result.id,
            visualSimilarity: result.score,
            source: 'vector' as const
        }));
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[HybridMatch] Vector search failed:', message);
        return [];
    }
}

/**
 * Execute graph query for artist matching
 */
async function executeGraphQuery(preferences: QueryPreferences): Promise<GraphSearchResult[]> {
    try {
        const results = await findGraphArtists(preferences);

        return results.map((artist: any) => ({
            ...artist,
            graphScore: artist.matchScore || 0,
            source: 'graph' as const
        }));
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[HybridMatch] Graph query failed:', message);
        return [];
    }
}

/**
 * Calculate location score
 */
function calculateLocationScore(artist: MatchedArtist, preferences: QueryPreferences): number {
    if (!preferences.location || !artist.city) {
        return 0.5; // Neutral if no location data
    }

    const userLocation = preferences.location.toLowerCase();
    const artistCity = artist.city.toLowerCase();

    if (artistCity === userLocation) {
        return 1.0; // Perfect match
    } else if (artistCity.includes(userLocation) || userLocation.includes(artistCity)) {
        return 0.75; // Partial match
    } else {
        return 0.25; // Different location
    }
}

/**
 * Calculate budget score
 */
function calculateBudgetScore(artist: MatchedArtist, preferences: QueryPreferences): number {
    if (!preferences.budget || !artist.hourlyRate) {
        return 0.5; // Neutral if no budget data
    }

    const rate = artist.hourlyRate;
    const budget = preferences.budget;

    if (rate <= budget) {
        return 1.0; // Within budget
    } else if (rate <= budget * 1.5) {
        return 0.5; // Slightly over budget
    } else {
        return 0.2; // Over budget
    }
}

/**
 * Calculate style alignment score
 */
function calculateStyleScore(artist: MatchedArtist, preferences: QueryPreferences): number {
    if (!preferences.styles || preferences.styles.length === 0 || !artist.styles) {
        return 0.5; // Neutral if no style preferences
    }

    const matchingStyles = artist.styles.filter(style =>
        preferences.styles!.some(prefStyle =>
            prefStyle.toLowerCase() === style.toLowerCase()
        )
    );

    return matchingStyles.length / Math.max(preferences.styles.length, 1);
}

/**
 * Find matching artists using hybrid vector-graph approach
 */
export async function findMatchingArtists(
    query: string,
    preferences: QueryPreferences = {},
    maxResults: number = 10
): Promise<MatchResult> {
    const startTime = performance.now();
    const TIMEOUT_MS = 500;

    // Check cache first
    const cacheKey = JSON.stringify({ query, preferences, maxResults });
    const cached = queryCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log('[HybridMatch] Returning cached results');
        return cached.data;
    }

    console.log('[HybridMatch] Executing hybrid search:', { query, preferences });

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
            reject(new Error(`Query timeout: exceeded ${TIMEOUT_MS}ms limit`));
        }, TIMEOUT_MS);
    });

    try {
        // Parse query
        const { visualConcepts, keywords } = parseQuery(query);

        // Execute with timeout
        const result = await Promise.race([
            (async (): Promise<MatchResult> => {
                const vectorStart = performance.now();

                // Execute vector and graph queries in parallel
                const [vectorResults, graphResults] = await Promise.all([
                    executeVectorSearch(query, 20),
                    executeGraphQuery({
                        ...preferences,
                        keywords: keywords
                    })
                ]);

                const vectorTime = performance.now() - vectorStart;
                const mergeStart = performance.now();

                console.log(`[HybridMatch] Vector results: ${vectorResults.length}, Graph results: ${graphResults.length}`);

                // Merge results by artist ID
                const mergedResults = mergeResults(vectorResults, graphResults, 'id');

                console.log(`[HybridMatch] Merged results: ${mergedResults.length}`);

                // Calculate composite scores for each artist
                const scoredArtists = mergedResults.map((artist: any): MatchedArtist => {
                    // Gather all scoring signals
                    const signals: ScoreSignals = {
                        visualSimilarity: artist.visualSimilarity || 0,
                        styleAlignment: calculateStyleScore(artist, preferences),
                        location: calculateLocationScore(artist, preferences),
                        budget: calculateBudgetScore(artist, preferences),
                        randomVariety: Math.random()
                    };

                    // Calculate composite score
                    const { score, breakdown } = calculateCompositeScore(signals, DEFAULT_WEIGHTS);

                    // Generate match reasoning
                    const reasons = generateMatchReasoning(signals, artist, preferences);

                    return {
                        ...artist,
                        compositeScore: score,
                        score: Math.round(score * 100), // For display (0-100)
                        matchScore: score, // For sorting (0-1)
                        scoreBreakdown: breakdown,
                        reasons: reasons
                    };
                });

                const mergeTime = performance.now() - mergeStart;

                // Sort by composite score and return top N
                const topMatches = scoredArtists
                    .sort((a, b) => b.compositeScore - a.compositeScore)
                    .slice(0, maxResults);

                const totalTime = performance.now() - startTime;

                // Log performance
                console.log(`[PERF] Semantic Match: ${totalTime.toFixed(0)}ms (vector: ${vectorTime.toFixed(0)}ms, merge: ${mergeTime.toFixed(0)}ms)`);

                // Warn if slow
                if (totalTime > 400) {
                    console.warn(`[PERF] Slow query detected: ${totalTime.toFixed(0)}ms - approaching ${TIMEOUT_MS}ms timeout`);
                }

                return {
                    matches: topMatches,
                    totalCandidates: mergedResults.length,
                    queryInfo: {
                        query,
                        visualConcepts,
                        keywords,
                        vectorResultCount: vectorResults.length,
                        graphResultCount: graphResults.length
                    },
                    performance: {
                        totalTime: Math.round(totalTime),
                        vectorTime: Math.round(vectorTime),
                        mergeTime: Math.round(mergeTime)
                    }
                };
            })(),
            timeoutPromise
        ]);

        // Cache the result
        queryCache.set(cacheKey, {
            data: result,
            timestamp: Date.now()
        });

        // Clean up old cache entries
        cleanCache();

        return result;

    } catch (error) {
        const totalTime = performance.now() - startTime;
        const message = error instanceof Error ? error.message : 'Unknown error';

        // Check if it's a timeout error
        if (message.includes('timeout')) {
            console.error(`[HybridMatch] Query timeout after ${totalTime.toFixed(0)}ms:`, { query, preferences });
            throw new Error(`Search timeout: Query exceeded ${TIMEOUT_MS}ms limit. Try simplifying your search.`);
        }

        console.error('[HybridMatch] Error in findMatchingArtists:', message);
        throw new Error(`Hybrid matching failed: ${message}`);
    }
}

/**
 * Clean up expired cache entries
 */
function cleanCache(): void {
    const now = Date.now();
    for (const [key, value] of queryCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
            queryCache.delete(key);
        }
    }
}

/**
 * Clear the query cache (useful for testing or manual refresh)
 */
export function clearCache(): void {
    queryCache.clear();
    console.log('[HybridMatch] Cache cleared');
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; ttl: number; entries: string[] } {
    return {
        size: queryCache.size,
        ttl: CACHE_TTL,
        entries: Array.from(queryCache.keys())
    };
}
