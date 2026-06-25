# Import Artists

> Directive for importing tattoo artist data into Neo4j and Supabase

## Goal

Populate the Neo4j graph database and Supabase relational store with artist data from `src/data/artists.json`, establishing nodes (Artist, City, Style, Tag) and relationships (LOCATED_IN, SPECIALIZES_IN, TAGGED_WITH, APPRENTICED_UNDER, INFLUENCED_BY).

## When to Use

- Initial project setup after provisioning Neo4j and Supabase
- After regenerating or updating `src/data/artists.json`
- After resetting or wiping either database
- When adding new artist records to the dataset

## Prerequisites

- **Neo4j** instance running (local `bolt://localhost:7687` or remote via `NEO4J_URI`)
- **Supabase** project with `tattoo_artists` table created (run `generated/create-table.sql` in the Supabase SQL Editor if table does not exist)
- Environment variables in `.env` / `.env.local`:
  - `NEO4J_URI` (default: `bolt://localhost:7687`)
  - `NEO4J_USER` (default: `neo4j`)
  - `NEO4J_PASSWORD` (required)
  - `NEXT_PUBLIC_SUPABASE_URL` (default: `https://yfcmysjmoehcyszvkxsr.supabase.co`)
  - `SUPABASE_SERVICE_ROLE_KEY` (required)
- `src/data/artists.json` exists with `artists`, `cities`, and `styles` arrays
- `generated/tattoo-artists-batch-50.json` exists for the Supabase script
- Node.js dependencies installed (`npm install`)

## Steps

### Part A: Import to Neo4j

1. Verify Neo4j is reachable:

   ```bash
   # If using local Docker:
   docker ps | grep neo4j
   ```

2. Run the Neo4j import script:

   ```bash
   node scripts/import-to-neo4j.js
   ```

3. The script will:
   - Create indexes on Artist.id, City.name, Style.name, Tag.name, and a spatial index on Artist.location
   - **Wipe all existing nodes/relationships** (`MATCH (n) DETACH DELETE n`)
   - Import City and Style reference nodes
   - Batch-import all artists (25 per batch) with LOCATED_IN, SPECIALIZES_IN, TAGGED_WITH relationships
   - Import APPRENTICED_UNDER relationships (from `artist.mentor_id`)
   - Import INFLUENCED_BY relationships (from `artist.influenced_by` arrays)
   - Run verification queries and print node/relationship counts

### Part B: Import to Supabase

1. Ensure the `tattoo_artists` table exists. If not:

   ```
   Open https://supabase.com/dashboard/project/yfcmysjmoehcyszvkxsr/editor
   Paste and run the SQL from generated/create-table.sql
   ```

2. Run the Supabase insert script:

   ```bash
   node scripts/insert-artists-to-supabase.js
   ```

3. The script will:
   - Load artists from `generated/tattoo-artists-batch-50.json`
   - Insert in batches of 10
   - Skip duplicates (error code `23505`)
   - Print a count verification at the end

## Expected Output

**Neo4j import:**
```
✅ Connected to Neo4j successfully
📊 Creating indexes...
🧹 Cleaning existing data...
🏙️  Importing cities...
🎨 Importing styles...
👨‍🎨 Importing artists...
  ✓ Batch 1: 25 artists imported (Total: 25/100)
  ...
👥 Importing mentor/apprentice relationships...
🎨 Importing influence relationships...
🔍 Verifying import...
  ✓ Artists: 100
  ✓ Cities: N
  ✓ Styles: N
✅ Import completed successfully!
```

**Supabase import:**
```
🚀 TatTester - Supabase Artist Data Insertion
✅ Inserted 50 artists
✅ Total artists in database: 50
```

## Edge Cases

- **Neo4j connection refused**: Ensure Neo4j is running and `NEO4J_PASSWORD` is correct. Docker: `docker start neo4j`
- **Neo4j wipes all data**: The script runs `MATCH (n) DETACH DELETE n` before importing. This is intentional for clean imports but destructive in production.
- **Supabase table missing**: The script cannot create the table programmatically. You must run `generated/create-table.sql` manually in the Supabase SQL Editor first.
- **Duplicate key errors (23505)**: The Supabase script continues past duplicates. Re-running is safe.
- **Mentor relationships show 0 created**: The MATCH query requires both apprentice and mentor Artist nodes to already exist. If IDs in `mentor_id` reference non-existent artists, the relationship is silently skipped.
- **Spatial queries fail**: Ensure artist records have valid `coordinates.lat` / `coordinates.lng` in `artists.json`.

## Cost

- **Neo4j**: Free for local/Aura Free Tier. No per-query cost.
- **Supabase**: Free tier covers this volume. No cost for insert operations.

## Related Directives

- Run **generate-embeddings.md** after this directive to generate vector embeddings for the imported artists
- Run **council-enhance.md** only after artists are imported (council uses artist style data for enhancement context)
