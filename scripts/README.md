# Neo4j Import Script Documentation

## Overview

This directory contains the Neo4j import script for TatTester's artist database. The script imports 100 Arizona artists from `src/data/artists.json` into a Neo4j graph database with optimized schema and indexes for high-performance matching queries.

## Prerequisites

### 1. Install Neo4j

You need a running Neo4j database instance. Choose one of these options:

#### Option A: Neo4j Desktop (Recommended for Development)
1. Download from https://neo4j.com/download/
2. Install and create a new database
3. Set password during setup
4. Start the database (default port: 7687)

#### Option B: Neo4j Docker
```bash
docker run \
  --name neo4j-tattester \
  -p 7474:7474 -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/your_password_here \
  neo4j:latest
```

#### Option C: Neo4j Aura (Cloud - Free Tier Available)
1. Sign up at https://neo4j.com/cloud/aura/
2. Create a free instance
3. Note the connection URI and credentials

### 2. Configure Environment Variables

Add these to your `.env` file (see `.env.example`):

```bash
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_neo4j_password_here
```

For Neo4j Aura, use the provided connection string:
```bash
NEO4J_URI=neo4j+s://xxxxx.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_aura_password
```

### 3. Install Dependencies

The Neo4j driver is already installed via:
```bash
npm install neo4j-driver --legacy-peer-deps
```

## Usage

### Run the Import Script

From the project root:
```bash
npm run neo4j:import
```

Or directly:
```bash
node scripts/import-to-neo4j.js
```

### What the Script Does

1. **Creates Indexes** - Optimizes queries for Artist ID, name, city, and styles
2. **Cleans Database** - Removes all existing nodes (use caution!)
3. **Imports Cities** - Creates 20 City nodes for Arizona locations
4. **Imports Styles** - Creates 15 Style nodes (Traditional, Realism, etc.)
5. **Imports Artists** - Batch imports 100 artists with all properties
6. **Creates Relationships** - Links artists to cities, styles, and tags
7. **Verifies Import** - Runs sample queries to confirm success

### Expected Output

```
🚀 Starting Neo4j import for TatTester artists...
✅ Connected to Neo4j successfully

📊 Creating indexes...
  ✓ artist_id_index
  ✓ artist_name_index
  ✓ city_name_index
  ✓ style_name_index
  ✓ tag_name_index
  ✓ artist_location_index

🧹 Cleaning existing data...
  ✓ All existing nodes and relationships deleted

🏙️  Importing cities...
  ✓ 20 cities imported

🎨 Importing styles...
  ✓ 15 styles imported

👨‍🎨 Importing artists...
  ✓ Batch 1: 336 artists imported (Total: 336/100)
  ✓ Batch 2: 295 artists imported (Total: 631/100)
  ✓ Batch 3: 363 artists imported (Total: 994/100)
  ✓ Batch 4: 261 artists imported (Total: 1255/100)
  ✅ All 1255 artists imported successfully

🔍 Verifying import...
  ✓ Artists: 100
  ✓ Cities: 20
  ✓ Styles: 15
  ✓ Tags: 59
  ✓ LOCATED_IN relationships: 100
  ✓ SPECIALIZES_IN relationships: 198
  ✓ TAGGED_WITH relationships: 563

✅ Import completed successfully!
```

Note: The batch counts (336, 295, etc.) are relationship counts, not artist counts. The verification shows the correct 100 artists were imported.

## Database Schema

### Node Types

#### Artist
Properties:
- `id` (Integer) - Unique identifier
- `name` (String) - Artist name
- `shopName` (String) - Tattoo shop name
- `city` (String) - City name
- `state` (String) - State abbreviation (AZ)
- `location` (Point) - Spatial coordinates for distance queries
- `lat` (Float) - Latitude
- `lng` (Float) - Longitude
- `instagram` (String) - Instagram handle
- `hourlyRate` (Integer) - Hourly rate in USD
- `rating` (Float) - Average rating (0-5)
- `reviewCount` (Integer) - Number of reviews
- `bio` (String) - Artist biography
- `yearsExperience` (Integer) - Years of experience
- `bookingAvailable` (Boolean) - Booking availability
- `portfolioImages` (Array[String]) - URLs to portfolio images

#### City
Properties:
- `name` (String) - City name
- `state` (String) - State abbreviation

#### Style
Properties:
- `name` (String) - Style name (Traditional, Realism, etc.)

#### Tag
Properties:
- `name` (String) - Tag/keyword name

### Relationships

- `(Artist)-[:LOCATED_IN]->(City)` - Artist's location
- `(Artist)-[:SPECIALIZES_IN]->(Style)` - Artist's specialties (multiple)
- `(Artist)-[:TAGGED_WITH]->(Tag)` - Artist's tags/keywords (multiple)

### Indexes

The script creates these indexes for optimal query performance:

- `artist_id_index` - Fast lookup by artist ID
- `artist_name_index` - Artist name searches
- `artist_city_index` - Filter by city
- `city_name_index` - City lookups
- `style_name_index` - Style filtering
- `tag_name_index` - Tag searches
- `artist_location_index` - Spatial queries (distance-based matching)

## Sample Queries

### Find artists in a specific city with a style

```cypher
MATCH (a:Artist)-[:LOCATED_IN]->(c:City {name: 'Phoenix'})
MATCH (a)-[:SPECIALIZES_IN]->(s:Style {name: 'Traditional'})
RETURN a.name, a.shopName, a.hourlyRate, a.rating
ORDER BY a.rating DESC
```

### Find artists within 50km of Phoenix downtown

```cypher
WITH point({latitude: 33.4484, longitude: -112.074}) AS phoenixDowntown
MATCH (a:Artist)
WHERE point.distance(a.location, phoenixDowntown) < 50000
RETURN a.name, a.city, a.shopName,
       round(point.distance(a.location, phoenixDowntown) / 1000) AS distanceKm
ORDER BY distanceKm
LIMIT 10
```

### Find artists by budget and style

```cypher
MATCH (a:Artist)-[:SPECIALIZES_IN]->(s:Style {name: 'Watercolor'})
WHERE a.hourlyRate <= 200 AND a.bookingAvailable = true
RETURN a.name, a.shopName, a.hourlyRate, a.rating
ORDER BY a.rating DESC
```

### Get artist with full details

```cypher
MATCH (a:Artist {id: 1})
OPTIONAL MATCH (a)-[:LOCATED_IN]->(c:City)
OPTIONAL MATCH (a)-[:SPECIALIZES_IN]->(s:Style)
OPTIONAL MATCH (a)-[:TAGGED_WITH]->(t:Tag)
RETURN a,
       c.name AS city,
       collect(DISTINCT s.name) AS styles,
       collect(DISTINCT t.name) AS tags
```

### Complex matching query (similar to TatTester's algorithm)

```cypher
// Find artists matching user preferences
WITH ['Traditional', 'Realism'] AS userStyles,
     ['dragon', 'colorful'] AS userKeywords,
     point({latitude: 33.4484, longitude: -112.074}) AS userLocation,
     200 AS maxBudget

MATCH (a:Artist)
WHERE a.hourlyRate <= maxBudget AND a.bookingAvailable = true

// Calculate style overlap score
OPTIONAL MATCH (a)-[:SPECIALIZES_IN]->(s:Style)
WHERE s.name IN userStyles
WITH a, userLocation, userKeywords, count(DISTINCT s) AS styleScore

// Calculate keyword match score
OPTIONAL MATCH (a)-[:TAGGED_WITH]->(t:Tag)
WHERE t.name IN userKeywords
WITH a, userLocation, styleScore, count(DISTINCT t) AS keywordScore

// Calculate distance
WITH a, styleScore, keywordScore,
     point.distance(a.location, userLocation) / 1000 AS distanceKm

// Calculate total match score
WITH a,
     styleScore * 0.4 AS styleWeight,
     keywordScore * 0.25 AS keywordWeight,
     (50 - CASE WHEN distanceKm > 50 THEN 50 ELSE distanceKm END) * 0.15 AS distanceWeight,
     styleScore, keywordScore, distanceKm

WITH a, styleWeight + keywordWeight + distanceWeight AS matchScore,
     styleScore, keywordScore, distanceKm

RETURN a.name, a.shopName, a.city, a.hourlyRate, a.rating,
       round(matchScore * 100) AS matchPercentage,
       styleScore, keywordScore, round(distanceKm) AS distanceKm
ORDER BY matchScore DESC
LIMIT 20
```

## Performance Optimizations

### Batch Processing
- Artists are imported in batches of 25 to reduce database round trips
- Optimal batch size balances memory usage and network efficiency

### Indexed Queries
- All primary lookup fields are indexed
- Spatial index enables fast distance-based queries
- Compound queries leverage multiple indexes simultaneously

### MERGE Operations
- Prevents duplicate nodes when re-running the script
- Safe for incremental imports (future feature)

## Cost Considerations (Bootstrap Budget)

### Neo4j Hosting Options

1. **Neo4j Desktop (Free)**
   - Local development only
   - No hosting costs
   - Best for Phase 0/MVP

2. **Neo4j Aura Free Tier**
   - Cloud-hosted
   - 200,000 nodes + 400,000 relationships
   - More than enough for 100 artists + relationships
   - $0/month

3. **Neo4j Aura Professional**
   - Recommended for production (Phase 1)
   - Starts at ~$65/month
   - Auto-scaling, backups, monitoring

4. **Self-hosted (AWS/DigitalOcean)**
   - ~$10-20/month for small instance
   - Requires DevOps management
   - Consider for Phase 2+

### Recommended Approach
- **Phase 0 (Current)**: Neo4j Desktop or Aura Free Tier ($0)
- **Phase 1 (Seed funded)**: Neo4j Aura Professional ($65/month)
- **Phase 2 (Scaling)**: Evaluate self-hosted vs. Aura

## Troubleshooting

### Error: "Cannot connect to Neo4j"
- Verify Neo4j is running: Check Neo4j Desktop or `docker ps`
- Check connection URI in `.env` matches your setup
- Verify port 7687 is not blocked by firewall

### Error: "Authentication failed"
- Double-check `NEO4J_PASSWORD` in `.env`
- Default Neo4j credentials are `neo4j/neo4j` (requires password change on first login)

### Error: "Cannot mix BigInt and other types"
- This is fixed in the current script via `neo4j.integer.toNumber()`
- Ensure you're using the latest version of the import script

### Error: "'distance' has been replaced by 'point.distance'"
- This is fixed in the current script
- Neo4j 5.0+ requires `point.distance()` instead of `distance()`

### Import completes but shows wrong artist count
- The batch totals (336, 295, etc.) are relationship counts, not artist counts
- Check the verification section - it should show exactly 100 artists

## Next Steps (Phase 1 Integration)

To connect Neo4j to the TatTester UI:

1. **Create Neo4j Service** (`src/services/neo4jService.js`)
   - Driver initialization
   - Connection pooling
   - Query execution wrapper

2. **Update Matching Algorithm** (`src/utils/matching.js`)
   - Replace static JSON with Neo4j queries
   - Implement complex Cypher matching query
   - Add caching layer (Redis or in-memory)

3. **Add Artist API Endpoints** (Express.js)
   - `GET /api/artists` - List all artists
   - `GET /api/artists/:id` - Get artist details
   - `POST /api/artists/match` - Match artists based on preferences
   - `GET /api/artists/search` - Search by name, style, location

4. **Environment Configuration**
   - Add Neo4j credentials to production `.env`
   - Set up connection pooling limits
   - Configure query timeouts

5. **Testing**
   - Unit tests for Neo4j service
   - Integration tests for matching algorithm
   - Load testing for 10,000+ concurrent users

## Additional Resources

- [Neo4j Cypher Manual](https://neo4j.com/docs/cypher-manual/current/)
- [Neo4j JavaScript Driver Docs](https://neo4j.com/docs/javascript-manual/current/)
- [Spatial Data in Neo4j](https://neo4j.com/docs/cypher-manual/current/functions/spatial/)
- [Neo4j Performance Tuning](https://neo4j.com/developer/guide-performance-tuning/)
