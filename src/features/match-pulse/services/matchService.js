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
} from './neo4jService';
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

function normalizePercent(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function stableHashScore(input) {
  if (!input) return 0.5;
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash % 100) / 100;
}

function computeMatchBreakdown(artist, context, supabaseScore = 0) {
  const style = context.style?.toLowerCase();
  const location = context.location?.toLowerCase();
  const budget = context.budget;

  const styles = (artist.styles || []).map(s => s.toLowerCase());
  const artistLocation = (artist.location || artist.city || '').toLowerCase();

  const visual = Number.isFinite(supabaseScore) ? Math.max(0, Math.min(1, supabaseScore)) : 0.5;
  const styleScore = style ? (styles.includes(style) ? 1 : 0.4) : 0.6;
  const locationScore = location
    ? (artistLocation.includes(location) ? 1 : 0.5)
    : 0.6;
  const hourlyRate = artist.hourlyRate || artist.rate;
  const budgetScore = budget && hourlyRate
    ? (hourlyRate <= budget ? 1 : 0.4)
    : 0.6;
  const varietyScore = stableHashScore(artist.id || artist.name);

  return {
    visual,
    style: styleScore,
    location: locationScore,
    budget: budgetScore,
    variety: varietyScore
  };
}

function computeMatchScoreFromBreakdown(breakdown) {
  const weighted = (
    breakdown.visual * 0.4 +
    breakdown.style * 0.25 +
    breakdown.location * 0.2 +
    breakdown.budget * 0.1 +
    breakdown.variety * 0.05
  );

  return normalizePercent(weighted * 100);
}

function buildReasoning(artist, breakdown, context) {
  const parts = [];
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

function buildArtistCard(artist, context, rrfScore, supabaseScore) {
  const thumbnail = artist.portfolioImages?.[0] || artist.portfolio?.[0] || artist.thumbnail || artist.profileImage;
  const breakdown = computeMatchBreakdown(artist, context, supabaseScore);
  return {
    ...artist,
    thumbnail,
    matchScore: computeMatchScoreFromBreakdown(breakdown),
    breakdown,
    reasoning: buildReasoning(artist, breakdown, context),
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
  const supabaseScoreMap = new Map();
  supabaseMatches.forEach((item) => {
    if (item?.id) {
      supabaseScoreMap.set(item.id, item.score || 0);
    }
  });

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
    buildArtistCard(
      artist,
      context,
      rrfScores.get(artist.id) || 0,
      supabaseScoreMap.get(artist.id) || 0
    )
  );

  merged.sort((a, b) => b.matchScore - a.matchScore);

  return {
    total: merged.length,
    matches: merged.slice(0, limit)
  };
}
