/**
 * Neo4j Service
 *
 * Handles Neo4j database queries for artist matching.
 * Provides a feature-flagged alternative to JS-based matching.
 */

// Type Definitions
export interface ArtistPreferences {
    styles?: string[];
    location?: string | null;
    budget?: number | null;
    keywords?: string[];
    style?: string;
    bodyPart?: string;
    limit?: number;
}

export interface ArtistRecord {
    id: string | number;
    name: string;
    city: string;
    location?: string;
    styles: string[];
    hourlyRate?: number;
    portfolio?: string[];
    portfolioImages?: string[];
    instagram?: string;
    embedding_id?: string;
    tags?: string[];
    score?: number;
    matchScore?: number;
    reasons?: string[];
    bodyParts?: string[];
}

export interface Neo4jQueryResponse {
    records: any[];
    message?: string;
}

export interface ArtistGenealogy {
    artist: {
        id: string | number;
        name: string;
    };
    directMentor: {
        id: string | number;
        name: string;
        startYear?: number;
        endYear?: number;
    } | null;
    mentorChain: Array<{
        id: string | number;
        name: string;
    }>;
    apprentices: Array<{
        id: string | number;
        name: string;
        yearsExperience?: number;
        startYear?: number;
        endYear?: number;
    }>;
}

export interface InfluencedArtist {
    id: string | number;
    name: string;
    influence_type: string;
    strength: number;
}

const NEO4J_ENABLED = process.env.NEXT_PUBLIC_NEO4J_ENABLED === 'true';
const NEO4J_ENDPOINT = process.env.NEXT_PUBLIC_NEO4J_ENDPOINT || '/api/neo4j/query';
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

/**
 * Relationship type constants
 */
export const INFLUENCE_TYPES = {
    STYLE: 'style_influence',
    TECHNIQUE: 'technique_influence',
    PHILOSOPHY: 'philosophy_influence',
    COMPOSITION: 'composition_influence'
} as const;

// Mock artist data for demo mode
const MOCK_ARTISTS: ArtistRecord[] = [
    {
        id: 'artist-1',
        name: 'Luna Martinez',
        city: 'Brooklyn',
        location: 'Brooklyn, NY',
        styles: ['Neo-Traditional', 'Japanese'],
        bodyParts: ['arm', 'back', 'leg'],
        hourlyRate: 250,
        portfolio: ['https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?w=400'],
        portfolioImages: ['https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?w=400'],
        instagram: '@luna.ink',
        tags: ['color', 'bold', 'traditional'],
        score: 95,
        matchScore: 0.95,
    },
    {
        id: 'artist-2',
        name: 'Kai Chen',
        city: 'San Francisco',
        location: 'San Francisco, CA',
        styles: ['Japanese', 'Blackwork'],
        bodyParts: ['arm', 'chest', 'back'],
        hourlyRate: 300,
        portfolio: ['https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=400'],
        portfolioImages: ['https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=400'],
        instagram: '@kai.tattoo',
        tags: ['traditional', 'japanese', 'detail'],
        score: 88,
        matchScore: 0.88,
    },
    {
        id: 'artist-3',
        name: 'River Thompson',
        city: 'Portland',
        location: 'Portland, OR',
        styles: ['Blackwork', 'Minimalist'],
        bodyParts: ['wrist', 'ankle', 'shoulder'],
        hourlyRate: 200,
        portfolio: ['https://images.unsplash.com/photo-1590246814883-57c511e76729?w=400'],
        portfolioImages: ['https://images.unsplash.com/photo-1590246814883-57c511e76729?w=400'],
        instagram: '@river.minimal',
        tags: ['minimalist', 'geometric', 'clean'],
        score: 82,
        matchScore: 0.82,
    },
    {
        id: 'artist-4',
        name: 'Alex Storm',
        city: 'Austin',
        location: 'Austin, TX',
        styles: ['Traditional', 'Neo-Traditional'],
        bodyParts: ['arm', 'leg', 'chest'],
        hourlyRate: 220,
        portfolio: ['https://images.unsplash.com/photo-1565058379802-bbe93b2f703f?w=400'],
        portfolioImages: ['https://images.unsplash.com/photo-1565058379802-bbe93b2f703f?w=400'],
        instagram: '@alex.storm.ink',
        tags: ['bold', 'color', 'american traditional'],
        score: 78,
        matchScore: 0.78,
    },
];

/**
 * Execute a read-only Cypher query via proxy
 * Falls back to mock data in demo mode or on error
 */
async function executeCypherQuery(query: string, params: Record<string, any> = {}): Promise<any[]> {
    if (DEMO_MODE) {
        console.log('[Neo4j] Demo mode - returning mock data');
        return [];
    }

    if (!NEO4J_ENABLED) {
        console.warn('[Neo4j] Not enabled, using mock data');
        return [];
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
            const error: Neo4jQueryResponse = await response.json();
            throw new Error(error.message || 'Neo4j query failed');
        }

        const data: Neo4jQueryResponse = await response.json();
        return data.records || [];
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.warn('[Neo4j] Query error, using mock data:', message);
        return [];
    }
}

/**
 * Find matching artists using Neo4j Cypher
 * Falls back to mock data when Neo4j unavailable
 */
export async function findMatchingArtists(preferences: ArtistPreferences): Promise<ArtistRecord[]> {
    if (DEMO_MODE || !NEO4J_ENABLED) {
        console.log('[Neo4j] Using mock artists for matching');
        // Filter mock artists based on preferences
        let filtered = [...MOCK_ARTISTS];
        
        if (preferences.styles && preferences.styles.length > 0) {
            filtered = filtered.filter(a => 
                a.styles.some(s => preferences.styles?.includes(s))
            );
        }
        
        if (preferences.location) {
            filtered = filtered.filter(a => 
                a.city.toLowerCase().includes(preferences.location!.toLowerCase())
            );
        }
        
        if (preferences.budget) {
            filtered = filtered.filter(a => 
                (a.hourlyRate || 0) <= preferences.budget! * 1.5
            );
        }
        
        return filtered.length > 0 ? filtered : MOCK_ARTISTS;
    }

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
    return results.map((record: any): ArtistRecord => ({
        id: record.id,
        name: record.name,
        city: record.city,
        styles: record.styles || [],
        hourlyRate: record.hourlyRate,
        portfolio: record.portfolio || [],
        instagram: record.instagram,
        embedding_id: record.embedding_id,
        tags: record.tags || [],
        score: Math.round(record.score || 0),
        matchScore: (record.score || 0) / 100,
        reasons: generateMatchReasons(record, preferences)
    }));
}

/**
 * Match Pulse query optimized for sidebar updates
 * Falls back to mock data when Neo4j unavailable
 */
export async function findArtistMatchesForPulse(preferences: ArtistPreferences): Promise<ArtistRecord[]> {
    if (DEMO_MODE || !NEO4J_ENABLED) {
        console.log('[Neo4j] Using mock artists for pulse matching');
        let filtered = [...MOCK_ARTISTS];
        
        if (preferences.style) {
            filtered = filtered.filter(a => 
                a.styles.some(s => s.toLowerCase() === preferences.style?.toLowerCase())
            );
        }
        
        if (preferences.bodyPart) {
            filtered = filtered.filter(a => 
                a.bodyParts?.some(bp => bp.toLowerCase() === preferences.bodyPart?.toLowerCase())
            );
        }
        
        if (preferences.location) {
            filtered = filtered.filter(a => 
                a.location?.toLowerCase().includes(preferences.location!.toLowerCase())
            );
        }
        
        return filtered.length > 0 ? filtered.slice(0, preferences.limit || 20) : MOCK_ARTISTS;
    }

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

    return results.map((record: any): ArtistRecord => ({
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
 * Generate human-readable match reasons
 */
function generateMatchReasons(artist: any, preferences: ArtistPreferences): string[] {
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
    if (preferences.budget && artist.hourlyRate <= preferences.budget) {
        reasons.push('Within your budget');
    }

    return reasons.length > 0 ? reasons : ['Explore this artist'];
}

/**
 * Check if Neo4j integration is enabled
 */
export function isNeo4jEnabled(): boolean {
    return NEO4J_ENABLED;
}

/**
 * Get artist by ID from Neo4j
 */
export async function getArtistById(artistId: string): Promise<any | null> {
    const query = `
    MATCH (a:Artist {id: $artistId})
    RETURN a
  `;

    const results = await executeCypherQuery(query, { artistId });
    return results[0]?.a || null;
}

/**
 * Get multiple artists by ID
 */
export async function getArtistsByIds(artistIds: Array<string | number> = []): Promise<ArtistRecord[]> {
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

    return results.map((record: any): ArtistRecord => ({
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
    return results.map((record: any) => record.influencedArtist);
}

/**
 * Find artists by embedding IDs (batch lookup)
 */
export async function findArtistsByEmbeddingIds(embeddingIds: string[]): Promise<any[]> {
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
    return results.map((record: any) => record.a);
}

/**
 * Update artist embedding ID (link artist to vector embedding)
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
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.warn('[Neo4j] Failed to update artist embedding ID:', message);
        return false;
    }
}
