# Quick Start: Supabase Setup for Tattoo Artists

All data has been generated! Here's how to set it up in Supabase.

## Option 1: Using Supabase Dashboard (Easiest)

1. **Go to your Supabase project:**
   - Visit: https://supabase.com/dashboard/org/qfehpvedicyutujuzjwq
   - Click on your project

2. **Create the table:**
   - Go to SQL Editor
   - Copy and paste the contents of `generated/create-table.sql`
   - Click "Run"

3. **Insert the data:**
   - Still in SQL Editor
   - Copy and paste the contents of `generated/insert-batch-50.sql`
   - Click "Run"

4. **Verify:**
   ```sql
   SELECT COUNT(*) FROM tattoo_artists;
   SELECT * FROM tattoo_artists LIMIT 5;
   ```

## Option 2: Using Supabase MCP (If Configured)

To use the MCP tools, I need your **project ID** (not organization ID).

The project ID can be found:
- In your project dashboard URL: `https://supabase.com/dashboard/project/[PROJECT_ID]`
- In Project Settings → General → Reference ID

Once you have the project ID, I can:
1. Create the table using `apply_migration`
2. Insert the batch data using `execute_sql`

## Generated Files

All files are ready in the `generated/` directory:
- ✅ `create-table.sql` - Table creation SQL
- ✅ `insert-batch-50.sql` - 50 artist records
- ✅ `tattoo-artists-supabase.json` - All 200 artists (JSON)
- ✅ `tattoo-artists-neo4j.json` - Neo4j format
- ✅ `tattoo-artists-neo4j.cypher` - Cypher import script

## Data Summary

- **200 artists** generated with geographic diversity
- **US locations:** NY, NJ, CA, TX, OR, FL, VT, CO, AZ
- **International:** Canada, Australia
- **50 records** ready for initial batch insert
- All required fields: UUID, name, location, styles, color_palettes, specializations

