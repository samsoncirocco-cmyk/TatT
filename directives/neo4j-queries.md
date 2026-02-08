# Neo4j Queries

## Goal
Define and execute graph queries on Neo4j to discover artist relationships, collaboration networks, style hierarchies, and shop affiliations.

## When to Use
- Artist matching workflow (find related artists via graph relationships)
- Network visualization (show artist collaboration graph)
- API endpoint: `POST /api/neo4j/query`
- Trigger: Semantic match results need graph enrichment

## Prerequisites
- Neo4j Aura instance (or self-hosted Neo4j 5.x+)
- Neo4j credentials configured in `.env.local`
- Artist nodes seeded with properties (id, name, styles, location, etc.)
- Relationship edges defined (COLLABORATED_WITH, TRAINED, WORKS_AT, etc.)

## Graph Schema

### Nodes

#### Artist
```cypher
CREATE (a:Artist {
  id: "artist_123",
  name: "Jane Doe",
  city: "Los Angeles",
  state: "CA",
  country: "USA",
  styles: ["traditional", "neo-traditional"],
  hourlyRate: 150,
  yearsExperience: 12,
  portfolioUrl: "https://example.com/portfolio",
  instagramHandle: "@janedoetattoo",
  isActive: true
})
```

#### Shop
```cypher
CREATE (s:Shop {
  id: "shop_456",
  name: "Ink Masters LA",
  city: "Los Angeles",
  address: "123 Main St",
  website: "https://inkmasters.com"
})
```

#### Style
```cypher
CREATE (st:Style {
  id: "traditional",
  name: "Traditional",
  description: "Bold lines, solid colors, classic motifs",
  parentStyle: null
})
```

### Relationships

#### COLLABORATED_WITH
```cypher
MATCH (a1:Artist {id: "artist_123"}), (a2:Artist {id: "artist_456"})
CREATE (a1)-[:COLLABORATED_WITH {
  year: 2022,
  project: "Tattoo convention booth"
}]->(a2)
```

#### TRAINED
```cypher
MATCH (mentor:Artist {id: "artist_789"}), (apprentice:Artist {id: "artist_123"})
CREATE (apprentice)-[:TRAINED {
  startYear: 2015,
  endYear: 2018,
  certificationType: "Traditional apprenticeship"
}]->(mentor)
```

#### WORKS_AT
```cypher
MATCH (a:Artist {id: "artist_123"}), (s:Shop {id: "shop_456"})
CREATE (a)-[:WORKS_AT {
  since: 2020,
  role: "Senior artist"
}]->(s)
```

#### SPECIALIZES_IN
```cypher
MATCH (a:Artist {id: "artist_123"}), (st:Style {id: "traditional"})
CREATE (a)-[:SPECIALIZES_IN {
  proficiencyLevel: 9,
  yearsExperience: 10
}]->(st)
```

## Common Queries

### 1. Find Artists by Style
**Use Case:** Semantic search returns artists, need to filter/boost by exact style match

```cypher
MATCH (a:Artist)-[:SPECIALIZES_IN]->(st:Style {id: $styleId})
WHERE a.isActive = true
RETURN a.id, a.name, a.city, a.hourlyRate
ORDER BY a.hourlyRate ASC
LIMIT 20
```

**Parameters:**
```json
{ "styleId": "traditional" }
```

**Location:** `src/features/match-pulse/services/neo4jService.ts` → `findArtistsByStyle()`

### 2. Find Collaborators (Network Expansion)
**Use Case:** User likes Artist A, find artists who worked with Artist A

```cypher
MATCH (a:Artist {id: $artistId})-[:COLLABORATED_WITH]-(collaborator:Artist)
WHERE collaborator.isActive = true
RETURN collaborator.id, collaborator.name, collaborator.styles, collaborator.city
ORDER BY collaborator.yearsExperience DESC
LIMIT 10
```

**Parameters:**
```json
{ "artistId": "artist_123" }
```

**Location:** `src/features/match-pulse/services/neo4jService.ts` → `findCollaborators()`

### 3. Find Artists Trained by Master
**Use Case:** User likes well-known artist, find their apprentices (similar style)

```cypher
MATCH (master:Artist {id: $masterId})<-[:TRAINED]-(apprentice:Artist)
WHERE apprentice.isActive = true
RETURN apprentice.id, apprentice.name, apprentice.city, apprentice.hourlyRate
ORDER BY apprentice.yearsExperience ASC
```

**Parameters:**
```json
{ "masterId": "artist_789" }
```

**Location:** `src/features/match-pulse/services/neo4jService.ts` → `findApprentices()`

### 4. Find Artists in Same Shop
**Use Case:** Group booking, or user prefers shop with multiple artists

```cypher
MATCH (a:Artist {id: $artistId})-[:WORKS_AT]->(s:Shop)<-[:WORKS_AT]-(colleague:Artist)
WHERE colleague.id <> $artistId AND colleague.isActive = true
RETURN colleague.id, colleague.name, colleague.styles, s.name AS shopName
```

**Parameters:**
```json
{ "artistId": "artist_123" }
```

**Location:** `src/features/match-pulse/services/neo4jService.ts` → `findShopColleagues()`

### 5. Find Artists Within Distance (Geo Query)
**Use Case:** User wants local artists

**Note:** Neo4j doesn't have built-in geo-spatial indexing (use Supabase PostGIS instead), but can filter by city/state:

```cypher
MATCH (a:Artist)
WHERE a.city = $city AND a.isActive = true
RETURN a.id, a.name, a.styles, a.hourlyRate
ORDER BY a.hourlyRate ASC
LIMIT 20
```

**Parameters:**
```json
{ "city": "Los Angeles" }
```

**Location:** `src/features/match-pulse/services/neo4jService.ts` → `findArtistsByCity()`

### 6. Find Related Styles (Style Hierarchy)
**Use Case:** User searches for "traditional", also show "neo-traditional" (child style)

```cypher
MATCH (parent:Style {id: $styleId})<-[:DERIVED_FROM*1..2]-(related:Style)
RETURN related.id, related.name, related.description
```

**Parameters:**
```json
{ "styleId": "traditional" }
```

**Location:** `src/features/match-pulse/services/neo4jService.ts` → `findRelatedStyles()`

### 7. Artist Influence Graph (Multi-Hop)
**Use Case:** Visualize artist's professional lineage (who trained them, who they trained)

```cypher
MATCH path = (origin:Artist {id: $artistId})-[:TRAINED*1..3]-(connected:Artist)
RETURN path
```

**Parameters:**
```json
{ "artistId": "artist_123" }
```

**Location:** `src/features/match-pulse/services/neo4jService.ts` → `getInfluenceGraph()`

### 8. Batch Fetch Artist Details
**Use Case:** Given list of artist IDs from Supabase, enrich with Neo4j data

```cypher
MATCH (a:Artist)
WHERE a.id IN $artistIds
OPTIONAL MATCH (a)-[:WORKS_AT]->(s:Shop)
OPTIONAL MATCH (a)-[:SPECIALIZES_IN]->(st:Style)
RETURN a, collect(DISTINCT s) AS shops, collect(DISTINCT st) AS styles
```

**Parameters:**
```json
{ "artistIds": ["artist_123", "artist_456", "artist_789"] }
```

**Location:** `src/features/match-pulse/services/neo4jService.ts` → `getArtistsByIds()`

## Query Execution Pattern

**Location:** `src/features/match-pulse/services/neo4jService.ts`

```typescript
import neo4j from 'neo4j-driver';

const driver = neo4j.driver(
  process.env.NEO4J_URI!,
  neo4j.auth.basic(
    process.env.NEO4J_USERNAME!,
    process.env.NEO4J_PASSWORD!
  )
);

export async function runQuery<T>(
  query: string,
  params: Record<string, any>
): Promise<T[]> {
  const session = driver.session();
  try {
    const result = await session.run(query, params);
    return result.records.map(record => record.toObject() as T);
  } finally {
    await session.close();
  }
}

export async function findArtistsByStyle(styleId: string) {
  const query = `
    MATCH (a:Artist)-[:SPECIALIZES_IN]->(st:Style {id: $styleId})
    WHERE a.isActive = true
    RETURN a.id AS id, a.name AS name, a.city AS city, a.hourlyRate AS hourlyRate
    ORDER BY a.hourlyRate ASC
    LIMIT 20
  `;
  return runQuery(query, { styleId });
}
```

## Expected Output

**Query Performance:**
- Simple lookups (<10 nodes): <50ms
- Network expansion (1-2 hops): 100-300ms
- Complex graph traversal (3+ hops): 500-1000ms

**Result Format:**
```typescript
interface ArtistNode {
  id: string;
  name: string;
  city?: string;
  styles?: string[];
  hourlyRate?: number;
  yearsExperience?: number;
  // ... other properties
}

interface RelationshipResult {
  artist: ArtistNode;
  relationship: {
    type: 'COLLABORATED_WITH' | 'TRAINED' | 'WORKS_AT';
    properties: Record<string, any>;
  };
  related: ArtistNode;
}
```

## Edge Cases

### Neo4j Connection Timeout
- **Fallback:** Return empty array, log error
- **User Impact:** Artist matching still works (Supabase only), just no network enrichment
- **Retry:** Exponential backoff (3 attempts)

### Artist Node Missing Properties
- **Issue:** Some artists have incomplete data (no hourlyRate, city, etc.)
- **Solution:** Use default values or skip in results
- **Validation:** Check for required fields before returning

### Circular Relationships
- **Issue:** A trained B, B trained C, C trained A (cycle detection)
- **Solution:** Limit traversal depth (max 3 hops)
- **Cypher:** Use `[:TRAINED*1..3]` with cycle detection

### Large Result Sets
- **Issue:** Query returns 1000+ nodes (too slow, too much data)
- **Solution:** Add `LIMIT` clause (default 20, max 100)
- **Pagination:** Use `SKIP` + `LIMIT` for pagination

### Neo4j Aura Auto-Pause
- **Issue:** Free tier instances pause after 3 days of inactivity
- **Detection:** Connection fails with "database unavailable" error
- **Solution:** Retry after 30s (Aura auto-resumes on connection attempt)
- **Alternative:** Ping database every 2 days (cron job)

## Performance Optimization

### Indexes
```cypher
-- Create index on Artist.id for fast lookups
CREATE INDEX artist_id_index FOR (a:Artist) ON (a.id);

-- Create index on Artist.isActive for filtering
CREATE INDEX artist_active_index FOR (a:Artist) ON (a.isActive);

-- Create composite index for style + location queries
CREATE INDEX artist_style_city_index FOR (a:Artist) ON (a.styles, a.city);
```

### Query Optimization
- Use `EXPLAIN` to analyze query plan
- Avoid `MATCH (a)-[*]-(b)` (unbounded traversal)
- Use `OPTIONAL MATCH` for optional relationships (avoid nulls)
- Limit result sets with `LIMIT` clause

### Connection Pooling
- Reuse Neo4j driver instance across requests
- Close sessions after each query (not driver)
- Max connection pool size: 50 (configurable)

## Cost Monitoring

| Tier | Storage | Queries/Month | Cost |
|------|---------|---------------|------|
| **Aura Free** | 200MB | Unlimited | $0 |
| **Aura Pro** | 8GB | Unlimited | $65/mo |
| **Aura Enterprise** | Custom | Unlimited | Custom |

**Current Usage (Estimated):**
- Storage: ~50MB (1000 artists, 5000 relationships)
- Queries: ~10,000/month (artist matching workflow)

**Recommendation:** Stay on Aura Free tier for development/staging, upgrade to Pro for production.

## Related Directives
- `artist-matching.md` — Uses Neo4j for network enrichment
- `api-endpoints.md` — API reference for `/api/neo4j/query`

## Database Seeding

**Initial Setup:**
```bash
node scripts/import-to-neo4j.js
```

**Seed Data Sources:**
- `scripts/generate-tattoo-artists-data.js` — Generate synthetic artist data
- `scripts/add-sample-relationships.js` — Create collaboration/training edges

**Schema Migration:**
```bash
node scripts/migrate-neo4j-schema.js
```

## Future Enhancements
- **Real-time Graph Updates:** WebSocket connection for live relationship changes
- **Graph Algorithms:** PageRank for artist influence scores, Community Detection for style clusters
- **Visualization:** D3.js network graph of artist relationships
- **Geospatial Queries:** Store lat/long, use distance calculations (combine with PostGIS)
