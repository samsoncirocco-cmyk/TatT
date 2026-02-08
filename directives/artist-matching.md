# Artist Matching

## Goal
Match users with tattoo artists based on semantic similarity (design style) + graph relationships (collaborations, apprenticeships) + user preferences (location, budget, availability).

## When to Use
- User completes a tattoo design generation
- User navigates to the "Find Artists" tab
- API endpoint: `POST /api/v1/match/semantic`
- Trigger: Design is saved or user explicitly requests artist matches

## Prerequisites
- **Supabase:** Vector embeddings for artist portfolios (generated via `scripts/generate-vertex-embeddings.js`)
- **Neo4j:** Artist relationship graph (seeded via `scripts/import-to-neo4j.js`)
- **Firebase:** Real-time match updates (optional, for live notifications)
- User context:
  - Design image URL or prompt/style
  - Location preference (city/region)
  - Budget (hourly rate range)
  - Availability (optional)

## Steps

### 1. Generate Query Embedding
**Location:** `src/services/embeddingService.ts`
- If design image provided:
  - Use Vertex AI Vision API to extract visual features
  - Convert to text description
- If prompt/style provided:
  - Use prompt text directly
- Call Vertex AI Text Embeddings API (`text-embedding-gecko-002`)
- Get 768-dimensional vector

### 2. Vector Search (Supabase)
**Location:** `src/features/match-pulse/services/matchService.js` → `searchSimilar()`
- Query Supabase `tattoo_artists` table
- Use pgvector cosine similarity search:
  ```sql
  SELECT id, name, city, styles, hourly_rate, portfolio_url,
         1 - (embedding <=> $1) AS similarity
  FROM tattoo_artists
  ORDER BY embedding <=> $1
  LIMIT 20
  ```
- Return top 20 candidates with similarity scores

### 3. Graph Enrichment (Neo4j)
**Location:** `src/features/match-pulse/services/neo4jService.ts` → `findArtistMatchesForPulse()`
- Query Neo4j for relationship context:
  - Artists who collaborated with top Supabase matches
  - Artists trained by top matches (apprenticeships)
  - Artists in same shop/network
- Cypher query example:
  ```cypher
  MATCH (a:Artist)
  WHERE a.id IN $supabaseIds
  OPTIONAL MATCH (a)-[:COLLABORATED_WITH|TRAINED]-(related:Artist)
  RETURN a, collect(related) AS network
  ```
- Boost scores for artists with strong network connections

### 4. Reciprocal Rank Fusion (RRF)
**Location:** `src/features/match-pulse/services/matchService.js` → `reciprocalRankFusion()`
- Combine Supabase and Neo4j results using RRF algorithm:
  ```
  score(artist) = Σ [1 / (k + rank_in_list)]  where k=60
  ```
- Normalize scores to 0-100% match percentage
- Apply user preference filters:
  - **Location:** Boost artists in user's city (×1.2)
  - **Budget:** Filter out artists above hourly rate threshold
  - **Style:** Boost exact style matches (×1.25)

### 5. Compute Match Breakdown
**Location:** `src/features/match-pulse/services/matchService.js` → `computeMatchBreakdown()`
- Calculate component scores (0-1 scale):
  - **Visual:** Supabase similarity score (40% weight)
  - **Style:** Exact style match (25% weight)
  - **Location:** City/region proximity (20% weight)
  - **Budget:** Hourly rate ≤ user budget (15% weight)
- Return breakdown for transparency:
  ```json
  {
    "visual": 0.87,
    "style": 1.0,
    "location": 0.5,
    "budget": 0.8
  }
  ```

### 6. Real-Time Update (Firebase)
**Location:** `src/features/match-pulse/services/matchUpdateService.js`
- If Firebase enabled:
  - Write match results to `matches/{userId}/current`
  - Subscribe to live updates (new artists come online, availability changes)
  - Trigger "pulse" animation in UI when new high-quality match appears

### 7. Return to Client
**Response Format:**
```json
{
  "matches": [
    {
      "id": "artist_123",
      "name": "Jane Doe",
      "city": "Los Angeles",
      "styles": ["traditional", "neo-traditional"],
      "hourlyRate": 150,
      "portfolioUrl": "https://...",
      "matchScore": 92,
      "breakdown": {
        "visual": 0.87,
        "style": 1.0,
        "location": 0.5,
        "budget": 0.8
      },
      "network": ["artist_456", "artist_789"],
      "isAvailable": true
    }
  ],
  "totalCount": 47,
  "searchDuration": 0.34
}
```

## Expected Output
- **Top 20 artist matches** (or user-specified limit)
- **Match scores:** 0-100% overall + breakdown by category
- **Artist metadata:** Name, location, styles, hourly rate, portfolio link
- **Network context:** Related artists (collaborators, mentors)
- **Search time:** <500ms (Supabase vector search is fast!)

## Edge Cases

### No Vector Embeddings Found
- **Fallback:** Use demo match service (`demoMatchService.js`)
- **Demo Logic:** Stable hash-based scores + random portfolio images
- **User Impact:** Still get results, but not semantically accurate

### Neo4j Connection Fails
- **Fallback:** Use Supabase results only (skip graph enrichment)
- **Log:** Record Neo4j error for debugging
- **User Impact:** Slightly less accurate network-based recommendations

### All Artists Outside Budget
- **Fallback:** Return closest matches anyway, but flag as "above budget"
- **UI Message:** "Here are the best matches—some are above your budget"
- **Suggestion:** Offer to expand budget or show payment plan options

### User Location Not Recognized
- **Fallback:** Skip location-based filtering, rank by visual similarity only
- **Suggestion:** Prompt user to select from dropdown of known cities

### Real-Time Update Fails (Firebase Down)
- **Fallback:** Polling mode (refresh every 30s)
- **User Impact:** Delayed updates, no live pulse animations

## Cost (per request)

| Service | Cost | Notes |
|---------|------|-------|
| Vertex Text Embeddings | ~$0.0001 | 768-dim vector generation |
| Supabase Vector Search | Free | pgvector query (<100ms) |
| Neo4j Query | Free | Aura free tier sufficient |
| Firebase Read/Write | Free | Minimal usage |

**Average Full Workflow:** ~$0.0001 (negligible)

## Performance Optimization

### Caching Strategy
- Cache embeddings for common prompts/styles (Redis or in-memory)
- Cache top artists by city (refresh daily)
- Cache Neo4j relationship graph (rebuild weekly)

### Pagination
- Return top 20 initially
- Load more on scroll (increments of 20)
- Preload next page in background

### Prefetching
- Generate embeddings during design generation (async)
- Precompute matches for popular styles
- Prefetch artist portfolios (images) for top 5 matches

## Related Directives
- `generate-tattoo.md` — Design generation (provides input for matching)
- `neo4j-queries.md` — Graph query patterns for artist relationships
- `api-endpoints.md` — Full API reference for match endpoints
