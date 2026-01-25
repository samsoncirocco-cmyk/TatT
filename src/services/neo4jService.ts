/**
 * Neo4j Service
 *
 * Handles Neo4j database queries for artist matching.
 * Provides a feature-flagged alternative to JS-based matching.
 */

// ============================================================================
// Configuration
// ============================================================================

const NEO4J_ENABLED = process.env.NEXT_PUBLIC_NEO4J_ENABLED === 'true';
const NEO4J_ENDPOINT = process.env.NEXT_PUBLIC_NEO4J_ENDPOINT || '/api/neo4j/query';

// ============================================================================
// Constants
// ============================================================================

/**
 * Relationship type constants
 */
export const INFLUENCE_TYPES = {
  STYLE: 'style_influence',
  TECHNIQUE: 'technique_influence',
  PHILOSOPHY: 'philosophy_influence',
  COMPOSITION: 'composition_influence'
} as const;

// ============================================================================
// Types
// ============================================================================

export interface MatchPreferences {
  styles?: string[];
  location?: string;
  budget?: number;
  keywords?: string[];
  style?: string;
  bodyPart?: string;
  limit?: number;
}

export interface Artist {
  id: string | number;
  name: string;
  city?: string;
  location?: string;
  styles?: string[];
  bodyParts?: string[];
  hourlyRate?: number;
  portfolio?: string[];
  portfolioImages?: string[];
  instagram?: string;
  embedding_id?: string;
  tags?: string[];
  yearsExperience?: number;
}

export interface MatchedArtist extends Artist {
  score: number;
  matchScore?: number;
  reasons?: string[];
}

export interface PulsePreferences {
  style?: string;
  bodyPart?: string;
  location?: string;
  limit?: number;
}

export interface MentorInfo {
  id: string;
  name: string;
  startYear?: number;
  endYear?: number;
}

export interface ApprenticeInfo {
  id: string;
  name: string;
  yearsExperience?: number;
  startYear?: number;
  endYear?: number;
}

export interface ArtistGenealogy {
  artist: {
    id: string;
    name: string;
  };
  directMentor: MentorInfo | null;
  mentorChain: Array<{ id: string; name: string }>;
  apprentices: ApprenticeInfo[];
}

export interface InfluencedArtist {
  id: string;
  name: string;
  influence_type: string;
  strength: number;
}

interface CypherQueryParams {
  [key: string]: unknown;
}

// ============================================================================
// Internal Functions
// ============================================================================

/**
 * Execute a read-only Cypher query via proxy
 * @param query - Cypher query string
 * @param params - Query parameters
 * @returns Query results
 */
async function executeCypherQuery(query: string, params: CypherQueryParams = {}): Promise<any[]> {
  if (!NEO4J_ENABLED) {
    throw new Error('Neo4j integration is not enabled. Set VITE_NEO4J_ENABLED=true');
  }

  try {
    const response = await fetch(NEO4J_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_FRONTEND_AUTH_TOKEN || 'dev-token-change-in-production'}`
      },
      body: JSON.stringify({ query, params })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Neo4j query failed');
    }

    const data = await response.json();
    return data.records || [];
  } catch (error) {
    console.error('[Neo4j] Query error:', error);
    throw error;
  }
}

/**
 * Generate human-readable match reasons
 * @param artist - Artist record
 * @param preferences - User preferences
 * @returns Match reasons
 */
function generateMatchReasons(artist: any, preferences: MatchPreferences): string[] {
  const reasons: string[] = [];

  // Style matches
  if (preferences.styles && artist.styles) {
    const matchingStyles = preferences.styles.filter(s =>
      artist.styles.includes(s)
    );
    if (matchingStyles.length > 0) {
      reasons.push(`Specializes in ${matchingStyles.join(', ')}`);
    }
  }

  // Location match
  if (preferences.location && artist.city === preferences.location) {
    reasons.push(`Located in ${artist.city}`);
  }

  // Budget fit
  if (preferences.budget && artist.hourlyRate && artist.hourlyRate <= preferences.budget) {
    reasons.push('Within your budget');
  }

  return reasons.length > 0 ? reasons : ['Explore this artist'];
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Find matching artists using Neo4j Cypher
 * @param preferences - User preferences
 * @returns Matched artists with scores
 */
export async function findMatchingArtists(preferences: MatchPreferences): Promise<MatchedArtist[]> {
  const { styles = [], location, budget, keywords = [] } = preferences;

  // Cypher query for artist matching
  // This leverages Neo4j's graph capabilities for efficient matching
  const query = `
    MATCH (a:Artist)
    WHERE
      // Style matching
      (size($styles) = 0 OR any(style IN $styles WHERE style IN a.styles))

      // Location matching (city-based for now)
      AND ($location IS NULL OR a.city = $location OR a.city CONTAINS $location)

      // Budget matching (optional filter)
      AND ($budget IS NULL OR a.hourlyRate <= $budget * 1.5)

    // Calculate match score using Cypher
    WITH a,
      // Style overlap score (40%)
      CASE
        WHEN size($styles) = 0 THEN 0.4
        ELSE size([style IN $styles WHERE style IN a.styles]) * 0.4 / size($styles)
      END AS styleScore,

      // Keyword match score (25%)
      CASE
        WHEN size($keywords) = 0 THEN 0.125
        ELSE size([kw IN $keywords WHERE any(tag IN a.tags WHERE toLower(tag) CONTAINS toLower(kw))]) * 0.25 / size($keywords)
      END AS keywordScore,

      // Location score (15%)
      CASE
        WHEN $location IS NULL THEN 0.075
        WHEN a.city = $location THEN 0.15
        WHEN a.city CONTAINS $location THEN 0.1
        ELSE 0.05
      END AS locationScore,

      // Budget score (10%)
      CASE
        WHEN $budget IS NULL THEN 0.05
        WHEN a.hourlyRate <= $budget THEN 0.1
        WHEN a.hourlyRate <= $budget * 1.5 THEN 0.05
        ELSE 0.02
      END AS budgetScore,

      // Random variety (10%)
      rand() * 0.1 AS randomScore

    // Calculate total score
    WITH a,
      (styleScore + keywordScore + locationScore + budgetScore + randomScore) AS totalScore

    // Return top matches
    RETURN
      a.id AS id,
      a.name AS name,
      a.city AS city,
      a.styles AS styles,
      a.hourlyRate AS hourlyRate,
      a.portfolio AS portfolio,
      a.instagram AS instagram,
      a.embedding_id AS embedding_id,
      a.tags AS tags,
      totalScore * 100 AS score
    ORDER BY totalScore DESC
    LIMIT 20
  `;

  const results = await executeCypherQuery(query, {
    styles,
    location: location || null,
    budget: budget || null,
    keywords
  });

  // Transform Neo4j results to match expected format
  return results.map(record => ({
    id: record.id,
    name: record.name,
    city: record.city,
    styles: record.styles,
    hourlyRate: record.hourlyRate,
    portfolio: record.portfolio,
    instagram: record.instagram,
    embedding_id: record.embedding_id,
    tags: record.tags,
    score: Math.round(record.score),
    matchScore: record.score / 100,
    reasons: generateMatchReasons(record, preferences)
  }));
}

/**
 * Match Pulse query optimized for sidebar updates
 * @param preferences - Match context
 * @returns Matched artists
 */
export async function findArtistMatchesForPulse(preferences: PulsePreferences): Promise<Artist[]> {
  const { style, bodyPart, location, limit = 20 } = preferences;

  const query = `
    MATCH (a:Artist)
    WHERE
      ($style IS NULL OR any(s IN coalesce(a.styles, []) WHERE toLower(s) = toLower($style)))
      AND ($bodyPart IS NULL OR any(bp IN coalesce(a.bodyParts, []) WHERE toLower(bp) = toLower($bodyPart)))
      AND (
        $location IS NULL OR
        toLower(coalesce(a.location, '')) CONTAINS toLower($location) OR
        toLower(coalesce(a.city, '')) CONTAINS toLower($location)
      )
    WITH a,
      CASE
        WHEN $style IS NULL THEN 0.4
        WHEN any(s IN coalesce(a.styles, []) WHERE toLower(s) = toLower($style)) THEN 0.4
        ELSE 0.2
      END AS styleScore,
      CASE
        WHEN $bodyPart IS NULL THEN 0.2
        WHEN any(bp IN coalesce(a.bodyParts, []) WHERE toLower(bp) = toLower($bodyPart)) THEN 0.2
        ELSE 0.1
      END AS bodyPartScore,
      CASE
        WHEN $location IS NULL THEN 0.1
        WHEN toLower(coalesce(a.location, '')) CONTAINS toLower($location) THEN 0.1
        ELSE 0.05
      END AS locationScore,
      rand() * 0.1 AS varietyScore
    WITH a, (styleScore + bodyPartScore + locationScore + varietyScore) AS totalScore
    RETURN
      a.id AS id,
      a.name AS name,
      a.city AS city,
      a.location AS location,
      a.styles AS styles,
      a.bodyParts AS bodyParts,
      a.portfolio AS portfolio,
      a.portfolioImages AS portfolioImages,
      a.instagram AS instagram,
      a.tags AS tags,
      totalScore * 100 AS score
    ORDER BY totalScore DESC
    LIMIT $limit
  `;

  const results = await executeCypherQuery(query, {
    style: style || null,
    bodyPart: bodyPart || null,
    location: location || null,
    limit
  });

  return results.map(record => ({
    id: record.id,
    name: record.name,
    city: record.city,
    location: record.location,
    styles: record.styles || [],
    bodyParts: record.bodyParts || [],
    portfolio: record.portfolio || [],
    portfolioImages: record.portfolioImages || [],
    instagram: record.instagram,
    tags: record.tags || [],
    score: Math.round(record.score || 0)
  }));
}

/**
 * Check if Neo4j integration is enabled
 * @returns True if Neo4j is enabled
 */
export function isNeo4jEnabled(): boolean {
  return NEO4J_ENABLED;
}

/**
 * Get artist by ID from Neo4j
 * @param artistId - Artist ID
 * @returns Artist data
 */
export async function getArtistById(artistId: string): Promise<Artist | null> {
  const query = `
    MATCH (a:Artist {id: $artistId})
    RETURN a
  `;

  const results = await executeCypherQuery(query, { artistId });
  return results[0]?.a || null;
}

/**
 * Get multiple artists by ID
 * @param artistIds - Artist IDs
 * @returns Artist data
 */
export async function getArtistsByIds(artistIds: Array<string | number> = []): Promise<Artist[]> {
  if (!artistIds.length) return [];

  const query = `
    MATCH (a:Artist)
    WHERE a.id IN $artistIds
    RETURN
      a.id AS id,
      a.name AS name,
      a.city AS city,
      a.location AS location,
      a.styles AS styles,
      a.bodyParts AS bodyParts,
      a.portfolio AS portfolio,
      a.portfolioImages AS portfolioImages,
      a.instagram AS instagram,
      a.tags AS tags
  `;

  const results = await executeCypherQuery(query, { artistIds });

  return results.map(record => ({
    id: record.id,
    name: record.name,
    city: record.city,
    location: record.location,
    styles: record.styles || [],
    bodyParts: record.bodyParts || [],
    portfolio: record.portfolio || [],
    portfolioImages: record.portfolioImages || [],
    instagram: record.instagram,
    tags: record.tags || []
  }));
}

/**
 * Get artist genealogy (mentor chain and apprentices)
 * @param artistId - Artist ID
 * @returns Genealogy data with mentor chain and apprentices
 */
export async function getArtistGenealogy(artistId: string): Promise<ArtistGenealogy | null> {
  const query = `
    MATCH (a:Artist {id: $artistId})

    // Get direct mentor
    OPTIONAL MATCH (a)-[r:APPRENTICED_UNDER]->(directMentor:Artist)
    WITH a,
         CASE WHEN directMentor IS NOT NULL THEN {
           id: directMentor.id,
           name: directMentor.name,
           startYear: r.start_year,
           endYear: r.end_year
         } ELSE null END as directMentor

    // Get all mentors in chain (up to 5 levels deep)
    OPTIONAL MATCH path = (a)-[:APPRENTICED_UNDER*1..5]->(mentor:Artist)
    WITH a, directMentor, collect(DISTINCT { id: mentor.id, name: mentor.name }) as mentorChain

    // Get direct apprentices
    OPTIONAL MATCH (apprentice:Artist)-[apprRel:APPRENTICED_UNDER]->(a)
    WITH a, directMentor, mentorChain,
         collect(DISTINCT {
           id: apprentice.id,
           name: apprentice.name,
           yearsExperience: apprentice.yearsExperience,
           startYear: apprRel.start_year,
           endYear: apprRel.end_year
         }) as apprentices

    RETURN {
      artist: {
        id: a.id,
        name: a.name
      },
      directMentor: directMentor,
      mentorChain: mentorChain,
      apprentices: apprentices
    } as genealogy
  `;

  const results = await executeCypherQuery(query, { artistId });
  return results[0]?.genealogy || null;
}

/**
 * Get artists influenced by a specific artist
 * @param artistId - Artist ID (the influencer)
 * @returns List of artists influenced by this artist
 */
export async function getInfluencedArtists(artistId: string): Promise<InfluencedArtist[]> {
  const query = `
    MATCH (influencer:Artist {id: $artistId})
    MATCH (artist:Artist)-[r:INFLUENCED_BY]->(influencer)
    RETURN {
      id: artist.id,
      name: artist.name,
      influence_type: r.influence_type,
      strength: r.strength
    } as influencedArtist
    ORDER BY r.strength DESC
  `;

  const results = await executeCypherQuery(query, { artistId });
  return results.map(record => record.influencedArtist);
}

/**
 * Find artists by embedding IDs (batch lookup)
 * @param embeddingIds - Array of embedding IDs
 * @returns Artists with matching embedding IDs
 */
export async function findArtistsByEmbeddingIds(embeddingIds: string[]): Promise<Artist[]> {
  if (!Array.isArray(embeddingIds) || embeddingIds.length === 0) {
    return [];
  }

  const query = `
    MATCH (a:Artist)
    WHERE a.embedding_id IN $embeddingIds
    RETURN a
    ORDER BY a.name
  `;

  const results = await executeCypherQuery(query, { embeddingIds });
  return results.map(record => record.a);
}

/**
 * Update artist embedding ID (link artist to vector embedding)
 * @param artistId - Artist ID
 * @param embeddingId - Embedding ID
 * @returns Success status
 */
export async function updateArtistEmbeddingId(artistId: string, embeddingId: string): Promise<boolean> {
  const query = `
    MATCH (a:Artist {id: $artistId})
    SET a.embedding_id = $embeddingId
    RETURN a.embedding_id as embeddingId
  `;

  try {
    const results = await executeCypherQuery(query, { artistId, embeddingId });
    return results.length > 0;
  } catch (error) {
    console.warn('[Neo4j] Failed to update artist embedding ID:', (error as Error).message);
    return false;
  }
}
