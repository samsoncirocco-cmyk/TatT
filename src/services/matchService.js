/**
 * Match Service
 *
 * Combines Neo4j and Supabase vector results using Reciprocal Rank Fusion (RRF).
 * Falls back to demo matching when services aren't available.
 */

import { searchSimilar } from './vectorDbService.js';
import {
  findArtistMatchesForPulse,
  getArtistsByIds,
  isNeo4jEnabled
} from './neo4jService.js';
import { findMatchingArtistsForDemo } from './demoMatchService.js';

const RRF_K = 60;

function reciprocalRankFusion(rankLists, k = RRF_K) {
  const scores = new Map();

  rankLists.forEach((list) => {
    if (!Array.isArray(list)) return;
    list.forEach((item, index) => {
      if (!item?.id) return;
      const rank = index + 1;
      const score = 1 / (k + rank);
      scores.set(item.id, (scores.get(item.id) || 0) + score);
    });
  });

  return scores;
}

function normalizeScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function computeMatchScore(artist, context, rrfScore = 0) {
  const style = context.style?.toLowerCase();
  const bodyPart = context.bodyPart?.toLowerCase();
  const location = context.location?.toLowerCase();
  const layerCount = context.layerCount || 0;

  const styles = (artist.styles || []).map(s => s.toLowerCase());
  const bodyParts = (artist.bodyParts || artist.specialties || []).map(bp => bp.toLowerCase());
  const artistLocation = (artist.location || artist.city || '').toLowerCase();

  const styleScore = style ? (styles.includes(style) ? 1 : 0.4) : 0.6;
  const bodyPartScore = bodyPart ? (bodyParts.includes(bodyPart) ? 1 : 0.5) : 0.6;
  const locationScore = location
    ? (artistLocation.includes(location) ? 1 : 0.5)
    : 0.6;
  const complexityScore = layerCount ? Math.min(layerCount / 10, 1) : 0.5;

  const weighted = (
    styleScore * 0.4 +
    complexityScore * 0.2 +
    bodyPartScore * 0.2 +
    locationScore * 0.2
  );

  const rrfBoost = Math.min(rrfScore * 120, 20);
  return normalizeScore(weighted * 80 + rrfBoost);
}

function buildArtistCard(artist, context, rrfScore) {
  const thumbnail = artist.portfolioImages?.[0] || artist.portfolio?.[0] || artist.thumbnail || artist.profileImage;
  return {
    ...artist,
    thumbnail,
    matchScore: computeMatchScore(artist, context, rrfScore),
    rrfScore
  };
}

/**
 * Hybrid search using Neo4j and Supabase embeddings + RRF.
 * Falls back to demo matching if services aren't available.
 */
export async function getHybridArtistMatches(context, options = {}) {
  const {
    embeddingVector,
    limit = 20
  } = options;

  // Try Neo4j first
  const neo4jEnabled = isNeo4jEnabled();
  const neo4jMatches = neo4jEnabled
    ? await findArtistMatchesForPulse({
      style: context.style,
      bodyPart: context.bodyPart,
      location: context.location,
      limit
    })
    : [];

  // Try Supabase vector search
  let supabaseMatches = [];
  if (embeddingVector && Array.isArray(embeddingVector)) {
    try {
      supabaseMatches = await searchSimilar(embeddingVector, limit);
    } catch (error) {
      console.warn('[MatchService] Supabase vector search failed:', error);
    }
  }

  // If both services failed or returned no results, use demo matching
  if (neo4jMatches.length === 0 && supabaseMatches.length === 0) {
    console.log('[MatchService] Using demo matching fallback');
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
        matches: demoMatches.map(artist => ({
          ...artist,
          matchScore: Math.round((artist.score || 0) * 100),
          thumbnail: artist.portfolioImages?.[0] || artist.profileImage
        }))
      };
    } catch (error) {
      console.error('[MatchService] Demo matching failed:', error);
      return { total: 0, matches: [] };
    }
  }


  const rrfScores = reciprocalRankFusion([neo4jMatches, supabaseMatches]);

  const artistMap = new Map();
  neo4jMatches.forEach((artist) => {
    artistMap.set(artist.id, artist);
  });

  const missingIds = supabaseMatches
    .map(item => item.id)
    .filter(id => id && !artistMap.has(id));

  if (missingIds.length) {
    try {
      const missingArtists = await getArtistsByIds(missingIds);
      missingArtists.forEach((artist) => {
        artistMap.set(artist.id, artist);
      });
    } catch (error) {
      console.warn('[MatchService] Failed to hydrate artists from Neo4j:', error);
    }
  }

  const merged = Array.from(artistMap.values()).map((artist) =>
    buildArtistCard(artist, context, rrfScores.get(artist.id) || 0)
  );

  merged.sort((a, b) => b.matchScore - a.matchScore);

  return {
    total: merged.length,
    matches: merged.slice(0, limit)
  };
}
