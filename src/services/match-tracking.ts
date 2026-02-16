import { logger } from '@/lib/logger';

/**
 * Match tracking service for logging match engagement and results.
 *
 * These events flow to BigQuery via Cloud Logging sink for analytics.
 */

export type MatchAction = 'view' | 'click' | 'contact';

export interface MatchEngagementParams {
  userId: string;
  matchId: string;
  artistId: string;
  action: MatchAction;
  rankPosition: number;
  matchScore: number;
  sources: string[];
}

export interface MatchResultsParams {
  userId: string;
  query: string;
  matchCount: number;
  topScores: number[];
  sources: string[];
}

/**
 * Log match engagement event (view, click, contact).
 *
 * BigQuery sink captures these for match quality analysis.
 *
 * @param params - Match engagement details
 */
export function logMatchEngagement(params: MatchEngagementParams): void {
  const {
    userId,
    matchId,
    artistId,
    action,
    rankPosition,
    matchScore,
    sources,
  } = params;

  logger.info({
    event_type: 'match.engagement',
    user_id: userId,
    match_id: matchId,
    artist_id: artistId,
    action,
    rank_position: rankPosition,
    match_score: matchScore,
    sources,
  }, `User ${action} match at rank ${rankPosition}`);
}

/**
 * Log match results summary (not individual matches).
 *
 * Used for query pattern analysis and performance tracking.
 * Logs query_length instead of raw query to avoid PII.
 *
 * @param params - Match results summary
 */
export function logMatchResults(params: MatchResultsParams): void {
  const { userId, query, matchCount, topScores, sources } = params;

  logger.info({
    event_type: 'match.results',
    user_id: userId,
    query_length: query.length, // PII protection - log length not content
    match_count: matchCount,
    top_scores: topScores.slice(0, 5), // First 5 scores only
    sources,
  }, `Match query returned ${matchCount} results`);
}
