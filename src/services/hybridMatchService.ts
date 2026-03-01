/**
 * Hybrid Vector-Graph Matching Service
 *
 * Combines Neo4j graph traversal with Firestore vector similarity search.
 */

import {
  findMatchingArtists as findGraphArtists,
  getArtistsByIds,
  MatchPreferences,
  MatchedArtist as GraphMatchedArtist
} from './neo4jService';
import { getQueryEmbedding } from './vertex-embedding-service';
import { searchSimilarArtists } from './firestore-vector-service';
import { getMatchConfig, weightedRRF } from './match-config-service';
import {
  calculateCompositeScore,
  generateMatchReasoning,
  DEFAULT_WEIGHTS
} from '../utils/scoreAggregation.js';

export interface QueryParseResult {
  visualConcepts: string[];
  keywords: string[];
}

export interface VectorSearchResult {
  id: string;
  visualSimilarity: number;
  rank: number;
  source: 'vector';
}

export interface GraphSearchResult extends GraphMatchedArtist {
  graphScore: number;
  rank: number;
  source: 'graph';
}

export interface ScoringSignals {
  visualSimilarity: number;
  styleAlignment: number;
  location: number;
  budget: number;
  randomVariety: number;
  graphRelationship?: number;
}

export interface ScoreBreakdown extends ScoringSignals {
  weights: typeof DEFAULT_WEIGHTS;
}

export interface HybridMatchedArtist {
  id: string | number;
  name?: string;
  city?: string;
  styles?: string[];
  hourlyRate?: number;
  portfolio?: string[];
  portfolioImages?: string[];
  instagram?: string;
  tags?: string[];
  visualSimilarity?: number;
  graphScore?: number;
  rrfScore?: number;
  compositeScore: number;
  score: number;
  matchScore: number;
  scoreBreakdown: ScoreBreakdown;
  reasons: string[];
  source?: 'vector' | 'graph' | 'hybrid';
  [key: string]: unknown;
}

export interface QueryInfo {
  query: string;
  visualConcepts: string[];
  keywords: string[];
  vectorResultCount: number;
  graphResultCount: number;
}

export interface PerformanceMetrics {
  totalTime: number;
  vectorTime: number;
  mergeTime: number;
}

export interface HybridMatchResult {
  matches: HybridMatchedArtist[];
  totalCandidates: number;
  queryInfo: QueryInfo;
  performance: PerformanceMetrics;
}

interface CacheEntry {
  data: HybridMatchResult;
  timestamp: number;
}

const queryCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000;

function parseQuery(query: string): QueryParseResult {
  if (!query || typeof query !== 'string') {
    return { visualConcepts: [], keywords: [] };
  }

  const tokens = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return {
    visualConcepts: tokens,
    keywords: tokens
  };
}

async function executeVectorSearch(query: string, topK: number = 20): Promise<VectorSearchResult[]> {
  try {
    const queryEmbedding = await getQueryEmbedding(query);
    const results = await searchSimilarArtists(queryEmbedding, topK);

    return results.map((result) => ({
      id: result.artistId,
      visualSimilarity: result.score,
      rank: result.rank,
      source: 'vector' as const
    }));
  } catch (error) {
    console.error('[HybridMatch] Vector search failed:', error);
    return [];
  }
}

async function executeGraphQuery(preferences: MatchPreferences): Promise<GraphSearchResult[]> {
  try {
    const results = await findGraphArtists(preferences);
    return results.map((artist, index) => ({
      ...artist,
      graphScore: artist.matchScore || 0,
      rank: index + 1,
      source: 'graph' as const
    }));
  } catch (error) {
    console.error('[HybridMatch] Graph query failed:', error);
    return [];
  }
}

function calculateLocationScore(artist: any, preferences: MatchPreferences): number {
  if (!preferences.location || !artist.city) {
    return 0.5;
  }

  const userLocation = preferences.location.toLowerCase();
  const artistCity = String(artist.city).toLowerCase();

  if (artistCity === userLocation) return 1;
  if (artistCity.includes(userLocation) || userLocation.includes(artistCity)) return 0.75;
  return 0.25;
}

function calculateBudgetScore(artist: any, preferences: MatchPreferences): number {
  if (!preferences.budget || !artist.hourlyRate) {
    return 0.5;
  }

  const rate = Number(artist.hourlyRate);
  const budget = Number(preferences.budget);
  if (rate <= budget) return 1;
  if (rate <= budget * 1.5) return 0.5;
  return 0.2;
}

function calculateStyleScore(artist: any, preferences: MatchPreferences): number {
  if (!preferences.styles || preferences.styles.length === 0 || !artist.styles) {
    return 0.5;
  }

  const artistStyles = Array.isArray(artist.styles) ? artist.styles : [];
  const matchingStyles = artistStyles.filter((style: string) =>
    preferences.styles!.some((prefStyle) => prefStyle.toLowerCase() === String(style).toLowerCase())
  );

  return matchingStyles.length / Math.max(preferences.styles.length, 1);
}

function cleanCache(): void {
  const now = Date.now();
  queryCache.forEach((value, key) => {
    if (now - value.timestamp > CACHE_TTL) {
      queryCache.delete(key);
    }
  });
}

export async function findMatchingArtists(
  query: string,
  preferences: MatchPreferences = {},
  maxResults: number = 10
): Promise<HybridMatchResult> {
  const startTime = performance.now();
  const TIMEOUT_MS = 3000;
  const matchConfig = await getMatchConfig();

  const cacheKey = JSON.stringify({ query, preferences, maxResults });
  const cached = queryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Query timeout: exceeded ${TIMEOUT_MS}ms limit`)), TIMEOUT_MS);
  });

  try {
    const { visualConcepts, keywords } = parseQuery(query);

    const result = await Promise.race([
      (async () => {
        const vectorStart = performance.now();
        const [vectorResults, graphResults] = await Promise.all([
          executeVectorSearch(query, 20),
          executeGraphQuery({ ...preferences, keywords })
        ]);
        const vectorTime = performance.now() - vectorStart;
        const mergeStart = performance.now();

        const graphRankList = graphResults.map((artist, index) => ({
          id: String(artist.id),
          rank: artist.rank || index + 1
        }));
        const vectorRankList = vectorResults.map((artist, index) => ({
          id: String(artist.id),
          rank: artist.rank || index + 1
        }));

        const rrfScores = weightedRRF(graphRankList, vectorRankList, matchConfig);
        const maxRrfScore = Math.max(...Array.from(rrfScores.values()), 0);

        const graphById = new Map<string, GraphSearchResult>();
        graphResults.forEach((artist) => graphById.set(String(artist.id), artist));
        const vectorById = new Map<string, VectorSearchResult>();
        vectorResults.forEach((artist) => vectorById.set(String(artist.id), artist));

        const allIds = new Set<string>([
          ...Array.from(graphById.keys()),
          ...Array.from(vectorById.keys())
        ]);

        const missingIds = Array.from(allIds).filter((id) => !graphById.has(id));
        const hydratedArtists = missingIds.length ? await getArtistsByIds(missingIds) : [];
        const hydratedById = new Map<string, any>();
        hydratedArtists.forEach((artist) => hydratedById.set(String(artist.id), artist));

        const scoredArtists: HybridMatchedArtist[] = Array.from(allIds).map((id) => {
          const graphArtist = graphById.get(id);
          const hydratedArtist = hydratedById.get(id) || {};
          const vectorArtist = vectorById.get(id);
          const mergedArtist = {
            ...hydratedArtist,
            ...(graphArtist || {}),
            id
          };

          const normalizedRrf = maxRrfScore > 0 ? (rrfScores.get(id) || 0) / maxRrfScore : 0;
          const signals: ScoringSignals = {
            visualSimilarity: vectorArtist?.visualSimilarity || 0,
            styleAlignment: calculateStyleScore(mergedArtist, preferences),
            location: calculateLocationScore(mergedArtist, preferences),
            budget: calculateBudgetScore(mergedArtist, preferences),
            randomVariety: Math.random(),
            graphRelationship: normalizedRrf
          };

          const compositeResult = calculateCompositeScore(signals, DEFAULT_WEIGHTS) as { score: number; breakdown: unknown };
          const weightedScore = compositeResult.score;
          const breakdown = compositeResult.breakdown;
          const compositeScore = (weightedScore * 0.7) + (normalizedRrf * 0.3);
          const reasons = generateMatchReasoning(signals, mergedArtist, preferences);

          return {
            ...mergedArtist,
            visualSimilarity: vectorArtist?.visualSimilarity,
            graphScore: graphArtist?.graphScore,
            rrfScore: rrfScores.get(id) || 0,
            source: graphArtist && vectorArtist ? 'hybrid' : (graphArtist ? 'graph' : 'vector'),
            compositeScore,
            score: Math.round(compositeScore * 100),
            matchScore: compositeScore,
            scoreBreakdown: breakdown as ScoreBreakdown,
            reasons
          };
        });

        const topMatches = scoredArtists
          .filter((artist) => artist.compositeScore >= matchConfig.confidenceThreshold)
          .sort((a, b) => b.compositeScore - a.compositeScore)
          .slice(0, maxResults);

        const mergeTime = performance.now() - mergeStart;
        const totalTime = performance.now() - startTime;

        return {
          matches: topMatches,
          totalCandidates: allIds.size,
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

    queryCache.set(cacheKey, { data: result, timestamp: Date.now() });
    cleanCache();
    return result;
  } catch (error) {
    if ((error as Error).message.includes('timeout')) {
      throw new Error(`Search timeout: Query exceeded ${TIMEOUT_MS}ms limit. Try simplifying your search.`);
    }

    console.error('[HybridMatch] Error in findMatchingArtists:', error);
    throw new Error(`Hybrid matching failed: ${(error as Error).message}`);
  }
}

export function clearCache(): void {
  queryCache.clear();
}

export function getCacheStats(): { size: number; ttl: number; entries: string[] } {
  return {
    size: queryCache.size,
    ttl: CACHE_TTL,
    entries: Array.from(queryCache.keys())
  };
}
