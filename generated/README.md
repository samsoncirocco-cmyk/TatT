# Generated Data Files

This directory contains **pre-built data artifacts** for seeding the Supabase and Neo4j databases with synthetic tattoo artist data. These files are checked into version control so the project can be set up without re-running the generation scripts.

## How They Were Created

The primary generation script is `scripts/generate-tattoo-artists-data.js`. It produces synthetic artist profiles with realistic names, locations, styles, specializations, color palettes, and pricing. Related scripts (`scripts/generate-neo4j-cypher.js`, `scripts/extend-artists-schema.js`) produce the Neo4j-specific formats.

## File Reference

### Supabase / PostgreSQL

| File | Size | Description |
|---|---|---|
| `create-table.sql` | 24 lines | `CREATE TABLE tattoo_artists` DDL with indexes |
| `insert-batch-50.sql` | 705 lines | `INSERT` statements for 50 artists |
| `tattoo-artists-supabase.json` | ~124 KB | Full 100-artist dataset as JSON array (Supabase-compatible schema) |
| `tattoo-artists-batch-50.json` | ~31 KB | 50-artist subset as JSON array (for testing) |

**To seed Supabase:**
```bash
# Option A: Via script
node scripts/inject-supabase-data.js

# Option B: Manually in Supabase SQL Editor
# 1. Run create-table.sql
# 2. Run insert-batch-50.sql
```

### Neo4j / Graph Database

| File | Size | Description |
|---|---|---|
| `tattoo-artists-neo4j.json` | ~322 KB | Full artist dataset with graph-ready structure (nodes + relationships) |
| `tattoo-artists-neo4j.cypher` | ~273 KB | Individual `CREATE` Cypher statements for all artists, styles, tags, and relationships |
| `tattoo-artists-neo4j-batch.cypher` | ~2.3 KB | Optimized batch import using `UNWIND` with parameter references |
| `tattoo-artists-neo4j-params.json` | ~138 KB | Parameter data for the batch Cypher script |

**To seed Neo4j:**
```bash
# Option A: Via script
node scripts/import-to-neo4j.js

# Option B: Copy-paste the Cypher
# Paste tattoo-artists-neo4j.cypher into Neo4j Browser
```

### Neo4j Graph Schema

```
(:Artist) -[:SPECIALIZES_IN]-> (:Style)
(:Artist) -[:LOCATED_IN]-> (:City)
(:Artist) -[:TAGGED_WITH]-> (:Tag)
```

**Indexes created:**
- `artist_id_index`, `artist_name_index`, `artist_city_index`
- `city_name_index`, `style_name_index`, `tag_name_index`
- `artist_location_index` (spatial, uses Neo4j Point type)

## Data Shape

Each artist record includes:

```json
{
  "id": "uuid",
  "name": "Aria Rivers",
  "location_city": "Perth",
  "location_region": "Western Australia",
  "location_country": "Australia",
  "has_multiple_locations": false,
  "styles": ["watercolor", "illustrative"],
  "color_palettes": ["vibrant", "pastel"],
  "specializations": ["floral", "nature"],
  "is_curated": true
}
```

Neo4j records additionally include `latitude`, `longitude`, `rating`, `price_range`, `portfolio_images`, and tag arrays.

## Regenerating

If you need to regenerate the data (e.g., with more artists or different locations):

```bash
# Generate base data
node scripts/generate-tattoo-artists-data.js

# Generate Neo4j Cypher from JSON
node scripts/generate-neo4j-cypher.js

# Generate embeddings (requires Vertex AI credentials)
node scripts/generate-vertex-embeddings.js
```
