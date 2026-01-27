# Supabase Setup Instructions for Tattoo Artists Data

This guide walks you through setting up the tattoo_artists table and importing data using Supabase MCP.

## Prerequisites

1. Supabase MCP is configured in Cursor (see `SUPABASE_MCP_SETUP.md`)
2. You have access to your Supabase project in organization `qfehpvedicyutujuzjwq`

## Step 1: Get Your Project ID

First, you need to identify your Supabase project ID. You can:

1. Visit your Supabase dashboard: https://supabase.com/dashboard/org/qfehpvedicyutujuzjwq
2. Select your project
3. The project ID (starts with a string like `abcdefghijklmnop`) can be found in the project settings or URL

Alternatively, you can ask Cursor: "List my Supabase projects" (this uses the MCP tools).

## Step 2: Create the Table

Use the Supabase MCP `apply_migration` tool to create the `tattoo_artists` table.

The migration SQL is in `scripts/setup-supabase-tattoo-artists.js` as `CREATE_TABLE_SQL`.

You can ask Cursor:
```
Apply a migration to create the tattoo_artists table using the SQL from scripts/setup-supabase-tattoo-artists.js
```

Or manually use the MCP tool with this SQL:

```sql
CREATE TABLE IF NOT EXISTS tattoo_artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location_city TEXT NOT NULL,
  location_region TEXT NOT NULL,
  location_country TEXT NOT NULL,
  has_multiple_locations BOOLEAN DEFAULT FALSE,
  profile_url TEXT,
  is_curated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  styles TEXT[] DEFAULT '{}',
  color_palettes TEXT[] DEFAULT '{}',
  specializations TEXT[] DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_tattoo_artists_location_city ON tattoo_artists(location_city);
CREATE INDEX IF NOT EXISTS idx_tattoo_artists_location_region ON tattoo_artists(location_region);
CREATE INDEX IF NOT EXISTS idx_tattoo_artists_location_country ON tattoo_artists(location_country);
CREATE INDEX IF NOT EXISTS idx_tattoo_artists_is_curated ON tattoo_artists(is_curated);
CREATE INDEX IF NOT EXISTS idx_tattoo_artists_styles ON tattoo_artists USING GIN(styles);
CREATE INDEX IF NOT EXISTS idx_tattoo_artists_color_palettes ON tattoo_artists USING GIN(color_palettes);
CREATE INDEX IF NOT EXISTS idx_tattoo_artists_specializations ON tattoo_artists USING GIN(specializations);
```

Migration name: `create_tattoo_artists_table`

## Step 3: Insert Batch Data

The generated data is in `generated/tattoo-artists-batch-50.json` (50 records ready for insertion).

You can use the Supabase MCP `execute_sql` tool to insert the data, or use a batch insert script.

### Option A: Using Supabase MCP execute_sql

Ask Cursor to insert the batch data:
```
Insert the tattoo artists from generated/tattoo-artists-batch-50.json into the tattoo_artists table
```

### Option B: Manual SQL Insert

You can generate the INSERT SQL by running:
```bash
node scripts/setup-supabase-tattoo-artists.js
```

Then use the generated SQL with the `execute_sql` MCP tool.

## Step 4: Verify the Data

Query the table to verify:
```
SELECT COUNT(*) FROM tattoo_artists;
SELECT * FROM tattoo_artists LIMIT 5;
```

## Generated Files

All generated files are in the `generated/` directory:

- `tattoo-artists-supabase.json` - All 200 artists in Supabase format
- `tattoo-artists-batch-50.json` - First 50 artists for initial insert
- `tattoo-artists-neo4j.json` - Neo4j-compatible format with nodes and relationships
- `tattoo-artists-neo4j.cypher` - Cypher script for Neo4j import
- `tattoo-artists-neo4j-batch.cypher` - Optimized batch Cypher script
- `tattoo-artists-neo4j-params.json` - Parameters for batch Cypher script

## Data Structure

Each artist record includes:

- **id** (UUID) - Unique identifier
- **name** (TEXT) - Artist name
- **location_city** (TEXT) - City name
- **location_region** (TEXT) - State/province
- **location_country** (TEXT) - Country
- **has_multiple_locations** (BOOLEAN) - Whether artist has multiple locations
- **profile_url** (TEXT) - Profile URL placeholder
- **is_curated** (BOOLEAN) - Whether artist is curated
- **created_at** (TIMESTAMPTZ) - Creation timestamp
- **styles** (TEXT[]) - Array of tattoo styles
- **color_palettes** (TEXT[]) - Array of color preferences
- **specializations** (TEXT[]) - Array of specializations

## Geographic Coverage

The dataset includes artists from:

**US States:**
- New York (Manhattan, Brooklyn)
- New Jersey (Ewing Township, Newark, Jersey City)
- California (Los Angeles, San Francisco, San Diego)
- Texas (Austin, Houston, Dallas)
- Oregon (Portland)
- Florida (Miami, Tampa)
- Vermont (Burlington)
- Colorado (Denver)
- Arizona (Phoenix, Tucson)

**International:**
- Canada (Vancouver, British Columbia; Toronto, Ontario; Montreal, Quebec)
- Australia (Perth, Western Australia; Sydney, New South Wales; Melbourne, Victoria)

## Next Steps

1. ✅ Data generation complete (200 artists)
2. ⏳ Create table in Supabase
3. ⏳ Insert initial batch (50 records)
4. ✅ Neo4j export formats generated
5. ⏳ Import to Neo4j (optional)

