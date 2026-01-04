/**
 * Setup Supabase Tattoo Artists Table and Data
 * 
 * This script uses the Supabase MCP to:
 * 1. Create the tattoo_artists table
 * 2. Insert the batch of 50 records
 * 
 * Note: This script is designed to be run interactively or with MCP tools
 * The actual MCP calls need to be made through Cursor's MCP interface
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * SQL to create the tattoo_artists table
 */
export const CREATE_TABLE_SQL = `
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

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tattoo_artists_location_city ON tattoo_artists(location_city);
CREATE INDEX IF NOT EXISTS idx_tattoo_artists_location_region ON tattoo_artists(location_region);
CREATE INDEX IF NOT EXISTS idx_tattoo_artists_location_country ON tattoo_artists(location_country);
CREATE INDEX IF NOT EXISTS idx_tattoo_artists_is_curated ON tattoo_artists(is_curated);
CREATE INDEX IF NOT EXISTS idx_tattoo_artists_styles ON tattoo_artists USING GIN(styles);
CREATE INDEX IF NOT EXISTS idx_tattoo_artists_color_palettes ON tattoo_artists USING GIN(color_palettes);
CREATE INDEX IF NOT EXISTS idx_tattoo_artists_specializations ON tattoo_artists USING GIN(specializations);
`;

/**
 * Load batch data
 */
export function loadBatchData() {
  const batchPath = join(__dirname, '../generated/tattoo-artists-batch-50.json');
  const data = JSON.parse(readFileSync(batchPath, 'utf-8'));
  return data;
}

/**
 * Generate INSERT SQL for batch insert
 */
export function generateInsertSQL(artists) {
  if (artists.length === 0) return '';
  
  const values = artists.map(artist => {
    const styles = artist.styles.map(s => `'${s.replace(/'/g, "''")}'`).join(',');
    const colors = artist.color_palettes.map(c => `'${c.replace(/'/g, "''")}'`).join(',');
    const specs = artist.specializations.map(s => `'${s.replace(/'/g, "''")}'`).join(',');
    
    return `(
      '${artist.id}'::UUID,
      '${artist.name.replace(/'/g, "''")}',
      '${artist.location_city.replace(/'/g, "''")}',
      '${artist.location_region.replace(/'/g, "''")}',
      '${artist.location_country.replace(/'/g, "''")}',
      ${artist.has_multiple_locations},
      '${artist.profile_url}',
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

if (import.meta.url === `file://${process.argv[1]}`) {
  const artists = loadBatchData();
  console.log('📋 Table Creation SQL:');
  console.log(CREATE_TABLE_SQL);
  console.log('\n📋 Insert SQL (first 5 records as example):');
  console.log(generateInsertSQL(artists.slice(0, 5)));
  console.log(`\n✅ Total artists to insert: ${artists.length}`);
}


