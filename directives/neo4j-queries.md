# Neo4j Queries

## Goal
Manage the Neo4j graph database for artist relationships, style matching, and location-based queries.

## When to Use
- Importing/updating artist data
- Running graph-based artist matching (via `/api/neo4j/query` or `hybridMatchService`)
- Exploring artist relationships in Neo4j Browser

## Prerequisites
- Neo4j instance running (Docker, Desktop, or Aura)
- Environment variables: `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`
- Artist data in `src/data/artists.json`

## Steps

### Schema

The graph uses this node/relationship schema:

```
(Artist) -[:LOCATED_IN]-> (City)
(Artist) -[:SPECIALIZES_IN]-> (Style)
(Artist) -[:TAGGED_WITH]-> (Tag)
```

**Artist properties**: `id`, `name`, `shopName`, `city`, `state`, `location`, `lat`, `lng`, `instagram`, `hourlyRate`, `rating`, `reviewCount`, `bio`, `yearsExperience`, `bookingAvailable`

**City properties**: `name`, `state`

**Style properties**: `name`

**Tag properties**: `name`

### Data Import

```bash
node scripts/import-to-neo4j.js
```

The import script:
1. Reads 100 Arizona artists from `src/data/artists.json`.
2. Creates indexes on `Artist.id`, `City.name`, `Style.name`.
3. Uses `MERGE` operations to prevent duplicates.
4. Creates City, Style, Tag nodes and relationships in batches.

### Common Queries

**Find artists by city:**
```cypher
MATCH (a:Artist)-[:LOCATED_IN]->(c:City {name: 'Phoenix'})
RETURN a.name, a.shopName, a.rating
ORDER BY a.rating DESC
LIMIT 10
```

**Find artists by style:**
```cypher
MATCH (a:Artist)-[:SPECIALIZES_IN]->(s:Style {name: 'Traditional'})
RETURN a.name, a.city, a.hourlyRate
ORDER BY a.rating DESC
```

**Find artists within budget:**
```cypher
MATCH (a:Artist)
WHERE a.hourlyRate <= 200 AND a.bookingAvailable = true
RETURN a.name, a.shopName, a.hourlyRate
ORDER BY a.rating DESC
LIMIT 10
```

**Find artists with multiple styles:**
```cypher
MATCH (a:Artist)-[:SPECIALIZES_IN]->(s:Style)
WITH a, collect(s.name) AS styles, count(s) AS styleCount
WHERE styleCount >= 3
RETURN a.name, styles, styleCount
ORDER BY styleCount DESC
```

**Artists who share styles (recommendation graph):**
```cypher
MATCH (a1:Artist)-[:SPECIALIZES_IN]->(s:Style)<-[:SPECIALIZES_IN]-(a2:Artist)
WHERE a1 <> a2 AND a1.name = 'Target Artist Name'
RETURN a2.name, collect(s.name) AS sharedStyles, count(s) AS overlap
ORDER BY overlap DESC
LIMIT 5
```

**Geographic clustering:**
```cypher
MATCH (a:Artist)-[:LOCATED_IN]->(c:City)
RETURN c.name, count(a) AS artistCount, avg(a.hourlyRate) AS avgRate
ORDER BY artistCount DESC
```

### API Usage

The `/api/neo4j/query` endpoint accepts arbitrary Cypher:
```json
POST /api/neo4j/query
{
  "query": "MATCH (a:Artist)-[:SPECIALIZES_IN]->(s:Style {name: $style}) RETURN a",
  "params": { "style": "Japanese" }
}
```

The `hybridMatchService.ts` uses `neo4jService.ts` which calls `findMatchingArtists(preferences)` internally.

### Migration Scripts

| Script | Purpose |
|--------|---------|
| `scripts/import-to-neo4j.js` | Full import from artists.json |
| `scripts/generate-neo4j-cypher.js` | Generate Cypher from JSON |
| `scripts/migrate-neo4j-schema.js` | Schema migrations |
| `scripts/add-sample-relationships.js` | Add sample artist-to-artist relationships |

## Expected Output
```json
{
  "records": [
    { "a": { "name": "Mike Tanaka", "shopName": "Phoenix Ink", "rating": 4.9 } }
  ]
}
```

## Edge Cases
- **Neo4j not running**: `/api/neo4j/query` returns 500 with "Neo4j driver not initialized".
- **Empty database**: Import script logs counts; if artists.json is missing, fails with file read error.
- **Aura Free limits**: 200K nodes, 400K relationships — sufficient for MVP.
- **Connection drop**: Neo4j driver auto-reconnects; session is closed in `finally` block.

## Cost
- **Neo4j Community (Docker)**: $0
- **Neo4j Aura Free**: $0 (cloud, 200K nodes)
- **Neo4j Aura Pro**: From $65/month
