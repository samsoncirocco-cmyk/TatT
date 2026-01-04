/**
 * Neo4j Service
 * 
 * Handles Neo4j database queries for artist matching.
 * Provides a feature-flagged alternative to JS-based matching.
 */

const NEO4J_ENABLED = import.meta.env.VITE_NEO4J_ENABLED === 'true';
const NEO4J_ENDPOINT = import.meta.env.VITE_NEO4J_ENDPOINT || 'http://localhost:3001/api/neo4j/query';

/**
 * Execute a read-only Cypher query via proxy
 * @param {string} query - Cypher query string
 * @param {Object} params - Query parameters
 * @returns {Promise<Array>} Query results
 */
async function executeCypherQuery(query, params = {}) {
  if (!NEO4J_ENABLED) {
    throw new Error('Neo4j integration is not enabled. Set VITE_NEO4J_ENABLED=true');
  }

  try {
    const response = await fetch(NEO4J_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_FRONTEND_AUTH_TOKEN || 'dev-token-change-in-production'}`
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
 * Find matching artists using Neo4j Cypher
 * @param {Object} preferences - User preferences
 * @returns {Promise<Array>} Matched artists with scores
 */
export async function findMatchingArtists(preferences) {
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
    score: Math.round(record.score),
    matchScore: record.score / 100,
    reasons: generateMatchReasons(record, preferences)
  }));
}

/**
 * Generate human-readable match reasons
 * @param {Object} artist - Artist record
 * @param {Object} preferences - User preferences
 * @returns {Array<string>} Match reasons
 */
function generateMatchReasons(artist, preferences) {
  const reasons = [];

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
 * @returns {boolean} True if Neo4j is enabled
 */
export function isNeo4jEnabled() {
  return NEO4J_ENABLED;
}

/**
 * Get artist by ID from Neo4j
 * @param {string} artistId - Artist ID
 * @returns {Promise<Object>} Artist data
 */
export async function getArtistById(artistId) {
  const query = `
    MATCH (a:Artist {id: $artistId})
    RETURN a
  `;

  const results = await executeCypherQuery(query, { artistId });
  return results[0]?.a || null;
}

