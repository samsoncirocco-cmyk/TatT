/**
 * Match Service
 *
 * Combines Neo4j and Firestore vector results using weighted RRF.
 * Falls back to demo matching when services aren't available.
 */

import { searchSimilarArtists } from './firestore-vector-service';
import { getMatchConfig, weightedRRF } from './match-config-service';
import {
  findArtistMatchesForPulse,
  getArtistsByIds,
  isNeo4jEnabled
} from './neo4jService';
import { findMatchingArtistsForDemo } from './demoMatchService';

export interface MatchContext {
  style?: string;
  bodyPart?: string;
  location?: string;
  budget?: number;
  [key: string]: any;
}

export interface MatchBreakdown {
  visual: number;
  style: number;
  location: number;
  budget: number;
  variety: number;
}

export interface Artist {
  id: string;
  name: string;
  location?: string;
  city?: string;
  styles?: string[];
  bodyParts?: string[];
  portfolio?: string[];
  portfolioImages?: string[];
  thumbnail?: string;
  profileImage?: string;
  instagram?: string;
  tags?: string[];
  hourlyRate?: number;
  rate?: number;
  distance?: number;
  score?: number;
}

export interface ArtistCard extends Artist {
  matchScore: number;
  breakdown: MatchBreakdown;
  reasoning: string;
  rrfScore: number;
}

export interface HybridMatchResult {
  total: number;
  matches: ArtistCard[];
}

export interface HybridMatchOptions {
  embeddingVector?: number[] | null;
  limit?: number;
}

interface RankListItem {
  id?: string;
  score?: number;
  rank?: number;
  [key: string]: any;
}

function withStringId<T extends { id: string | number }>(artist: T): T & { id: string } {
  return { ...artist, id: String(artist.id) };
}

function normalizePercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function stableHashScore(input: string | undefined): number {
  if (!input) return 0.5;
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash % 100) / 100;
}

function computeMatchBreakdown(artist: Artist, context: MatchContext, vectorScore: number = 0): MatchBreakdown {
  const style = context.style?.toLowerCase();
  const location = context.location?.toLowerCase();
  const budget = context.budget;

  const styles = (artist.styles || []).map((s) => s.toLowerCase());
  const artistLocation = (artist.location || artist.city || '').toLowerCase();

  const visual = Number.isFinite(vectorScore) ? Math.max(0, Math.min(1, vectorScore)) : 0.5;
  const styleScore = style ? (styles.includes(style) ? 1 : 0.4) : 0.6;
  const locationScore = location ? (artistLocation.includes(location) ? 1 : 0.5) : 0.6;
  const hourlyRate = artist.hourlyRate || artist.rate;
  const budgetScore = budget && hourlyRate ? (hourlyRate <= budget ? 1 : 0.4) : 0.6;
  const varietyScore = stableHashScore(artist.id || artist.name);

  return {
    visual,
    style: styleScore,
    location: locationScore,
    budget: budgetScore,
    variety: varietyScore
  };
}

function computeMatchScoreFromBreakdown(breakdown: MatchBreakdown): number {
  const weighted = (
    breakdown.visual * 0.4 +
    breakdown.style * 0.25 +
    breakdown.location * 0.2 +
    breakdown.budget * 0.1 +
    breakdown.variety * 0.05
  );
  return normalizePercent(weighted * 100);
}

function buildReasoning(artist: Artist, breakdown: MatchBreakdown, context: MatchContext): string {
  const parts: string[] = [];
  parts.push(`Strong visual match (${normalizePercent(breakdown.visual * 100)}%)`);

  if (context.style && (artist.styles || []).length) {
    parts.push(`specializes in ${context.style}`);
  }

  if (artist.distance != null) {
    parts.push(`${Math.round(artist.distance)} miles away`);
  } else if (artist.location || artist.city) {
    parts.push(`based in ${artist.location || artist.city}`);
  }

  if (context.budget && (artist.hourlyRate || artist.rate)) {
    parts.push(`rate ${artist.hourlyRate || artist.rate} fits budget`);
  }

  return parts.join(', ');
}

function buildArtistCard(artist: Artist, context: MatchContext, rrfScore: number, vectorScore: number): ArtistCard {
  const thumbnail = artist.portfolioImages?.[0] || artist.portfolio?.[0] || artist.thumbnail || artist.profileImage;
  const breakdown = computeMatchBreakdown(artist, context, vectorScore);

  return {
    ...artist,
    thumbnail,
    matchScore: computeMatchScoreFromBreakdown(breakdown),
    breakdown,
    reasoning: buildReasoning(artist, breakdown, context),
    rrfScore
  };
}

export async function getHybridArtistMatches(
  context: MatchContext,
  options: HybridMatchOptions = {}
): Promise<HybridMatchResult> {
  const { embeddingVector, limit = 20 } = options;
  const matchConfig = await getMatchConfig();

  const neo4jEnabled = isNeo4jEnabled();
  const neo4jMatches = neo4jEnabled
    ? await findArtistMatchesForPulse({
      style: context.style,
      bodyPart: context.bodyPart,
      location: context.location,
      limit
    })
    : [];

  let vectorMatches: RankListItem[] = [];
  if (embeddingVector && Array.isArray(embeddingVector)) {
    try {
      const firestoreMatches = await searchSimilarArtists(embeddingVector, limit);
      vectorMatches = firestoreMatches.map((item) => ({
        id: item.artistId,
        score: item.score,
        rank: item.rank
      }));
    } catch (error) {
      console.warn('[MatchService] Firestore vector search failed:', error);
    }
  }

  if (neo4jMatches.length === 0 && vectorMatches.length === 0) {
    try {
      const demoMatches = await findMatchingArtistsForDemo(
        {
          style: context.style,
          bodyPart: context.bodyPart
        },
        {
          location: context.location
        }
      );

      return {
        total: demoMatches.length,
        matches: demoMatches.map((artist) => ({
          ...artist,
          matchScore: Math.round((artist.score || 0) * 100),
          thumbnail: artist.portfolioImages?.[0] || artist.profileImage
        })) as ArtistCard[]
      };
    } catch (error) {
      console.error('[MatchService] Demo matching failed:', error);
      return { total: 0, matches: [] };
    }
  }

  const graphRankList = neo4jMatches.map((artist, index) => ({
    id: String(artist.id),
    rank: index + 1
  }));
  const vectorRankList = vectorMatches.map((item, index) => ({
    id: item.id as string,
    rank: item.rank || (index + 1)
  }));

  const rrfScores = weightedRRF(graphRankList, vectorRankList, matchConfig);
  const vectorScoreMap = new Map<string, number>();
  vectorMatches.forEach((item) => {
    if (item?.id) {
      vectorScoreMap.set(item.id, item.score || 0);
    }
  });

  const artistMap = new Map<string, Artist>();
  neo4jMatches.forEach((artist) => {
    const normalizedArtist = withStringId(artist);
    artistMap.set(normalizedArtist.id, normalizedArtist);
  });

  const missingIds = vectorMatches
    .map((item) => item.id)
    .filter((id): id is string => id != null && !artistMap.has(id));

  if (missingIds.length) {
    try {
      const missingArtists = await getArtistsByIds(missingIds);
      missingArtists.forEach((artist) => {
        const normalizedArtist = withStringId(artist as any);
        artistMap.set(normalizedArtist.id, normalizedArtist as Artist);
      });
    } catch (error) {
      console.warn('[MatchService] Failed to hydrate artists from Neo4j:', error);
    }
  }

  const merged = Array.from(artistMap.values())
    .map((artist) =>
      buildArtistCard(
        artist,
        context,
        rrfScores.get(String(artist.id)) || 0,
        vectorScoreMap.get(String(artist.id)) || 0
      )
    )
    .filter((artist) => (artist.rrfScore >= matchConfig.confidenceThreshold) || vectorScoreMap.has(String(artist.id)));

  merged.sort((a, b) => {
    const rrfDiff = (b.rrfScore || 0) - (a.rrfScore || 0);
    if (rrfDiff !== 0) return rrfDiff;
    return b.matchScore - a.matchScore;
  });

  return {
    total: merged.length,
    matches: merged.slice(0, limit)
  };
}
