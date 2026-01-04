/**
 * Insert Tattoo Artists to Supabase using MCP
 * 
 * This script is designed to be run with Supabase MCP tools
 * It generates the SQL needed for batch insertion
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { CREATE_TABLE_SQL, loadBatchData, generateInsertSQL } from './setup-supabase-tattoo-artists.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Generate batch insert SQL that can be used with Supabase MCP execute_sql
 */
function generateBatchInsertSQL(artists) {
  if (artists.length === 0) return '';
  
  // Use proper SQL escaping
  function escapeSQL(str) {
    return str.replace(/'/g, "''");
  }
  
  const values = artists.map(artist => {
    const styles = artist.styles.map(s => `'${escapeSQL(s)}'`).join(',');
    const colors = artist.color_palettes.map(c => `'${escapeSQL(c)}'`).join(',');
    const specs = artist.specializations.map(s => `'${escapeSQL(s)}'`).join(',');
    
    return `(
      '${artist.id}'::UUID,
      '${escapeSQL(artist.name)}',
      '${escapeSQL(artist.location_city)}',
      '${escapeSQL(artist.location_region)}',
      '${escapeSQL(artist.location_country)}',
      ${artist.has_multiple_locations},
      '${escapeSQL(artist.profile_url)}',
      ${artist.is_curated},
      '${artist.created_at}'::TIMESTAMPTZ,
      ARRAY[${styles}]::TEXT[],
      ARRAY[${colors}]::TEXT[],
      ARRAY[${specs}]::TEXT[]
    )`;
  }).join(',\n    ');
  
  return `
INSERT INTO tattoo_artists (
  id, name, location_city, location_region, location_country,
  has_multiple_locations, profile_url, is_curated, created_at,
  styles, color_palettes, specializations
) VALUES
    ${values}
ON CONFLICT (id) DO NOTHING;
  `.trim();
}

function main() {
  console.log('📋 Supabase MCP Setup SQL\n');
  
  const artists = loadBatchData();
  console.log(`✅ Loaded ${artists.length} artists from batch file\n`);
  
  console.log('=' .repeat(80));
  console.log('STEP 1: CREATE TABLE MIGRATION');
  console.log('=' .repeat(80));
  console.log('Migration Name: create_tattoo_artists_table');
  console.log('\nSQL:');
  console.log(CREATE_TABLE_SQL);
  
  console.log('\n' + '=' .repeat(80));
  console.log('STEP 2: BATCH INSERT SQL (50 records)');
  console.log('=' .repeat(80));
  const insertSQL = generateBatchInsertSQL(artists);
  console.log(insertSQL);
  
  console.log('\n' + '=' .repeat(80));
  console.log('USAGE WITH SUPABASE MCP:');
  console.log('=' .repeat(80));
  console.log(`
1. Get your project ID:
   - Visit: https://supabase.com/dashboard/org/qfehpvedicyutujuzjwq
   - Or ask Cursor: "List my Supabase projects"

2. Create the table using apply_migration:
   Migration name: create_tattoo_artists_table
   SQL: (use CREATE_TABLE_SQL above)

3. Insert data using execute_sql:
   SQL: (use INSERT SQL above)

4. Verify:
   SELECT COUNT(*) FROM tattoo_artists;
   SELECT * FROM tattoo_artists LIMIT 5;
  `);
  
  // Save SQL files for easy copy-paste
  const sqlDir = join(__dirname, '../generated');
  const createTablePath = join(sqlDir, 'create-table.sql');
  const insertDataPath = join(sqlDir, 'insert-batch-50.sql');
  
  writeFileSync(createTablePath, CREATE_TABLE_SQL, 'utf-8');
  writeFileSync(insertDataPath, insertSQL, 'utf-8');
  
  console.log(`\n✅ SQL files saved:`);
  console.log(`   - ${createTablePath}`);
  console.log(`   - ${insertDataPath}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { generateBatchInsertSQL };

