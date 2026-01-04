/**
 * Inject Tattoo Artists Data into Supabase
 * 
 * This script directly inserts the artist data into Supabase using the JS client.
 * Run with: node scripts/inject-supabase-data.js
 * 
 * Prerequisites:
 * 1. npm install @supabase/supabase-js
 * 2. Set environment variables: SUPABASE_URL, SUPABASE_SERVICE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Supabase credentials
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials');
  console.error('   Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Create the tattoo_artists table if it doesn't exist
 */
async function createTable() {
  console.log('📋 Creating tattoo_artists table...');
  
  const createTableSQL = `
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

  const { error } = await supabase.rpc('exec_sql', { sql: createTableSQL });
  
  if (error) {
    console.error('❌ Table creation failed:', error.message);
    // Try alternative method using raw SQL
    console.log('   Trying alternative method...');
    
    try {
      // Note: This requires the SQL to be run manually via dashboard
      // as Supabase JS client doesn't support raw DDL directly
      console.log('⚠️  Please run create-table.sql manually in Supabase dashboard');
      console.log('   Path: generated/create-table.sql');
      return false;
    } catch (e) {
      console.error('   Alternative method failed:', e);
      return false;
    }
  }
  
  console.log('✅ Table created successfully');
  return true;
}

/**
 * Insert artist data in batches
 */
async function insertArtists() {
  console.log('\n📥 Loading artist data...');
  
  const dataPath = join(__dirname, '../generated/tattoo-artists-batch-50.json');
  const artists = JSON.parse(readFileSync(dataPath, 'utf-8'));
  
  console.log(`   Found ${artists.length} artists to insert`);
  
  // Check if data already exists
  const { count } = await supabase
    .from('tattoo_artists')
    .select('*', { count: 'exact', head: true });
  
  if (count > 0) {
    console.log(`⚠️  Table already has ${count} records`);
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      rl.question('   Continue and add more? (y/n): ', resolve);
    });
    rl.close();
    
    if (answer.toLowerCase() !== 'y') {
      console.log('   Skipping insert');
      return;
    }
  }
  
  console.log('\n📤 Inserting artists...');
  
  // Insert in batches of 10 to avoid timeout
  const batchSize = 10;
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < artists.length; i += batchSize) {
    const batch = artists.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(artists.length / batchSize);
    
    console.log(`   Batch ${batchNum}/${totalBatches} (${batch.length} artists)...`);
    
    const { data, error } = await supabase
      .from('tattoo_artists')
      .insert(batch)
      .select();
    
    if (error) {
      console.error(`   ❌ Batch ${batchNum} failed:`, error.message);
      errorCount += batch.length;
    } else {
      console.log(`   ✅ Batch ${batchNum} inserted (${data.length} records)`);
      successCount += data.length;
    }
    
    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(`\n📊 Results:`);
  console.log(`   ✅ Success: ${successCount} artists`);
  console.log(`   ❌ Failed:  ${errorCount} artists`);
  
  return successCount;
}

/**
 * Verify the inserted data
 */
async function verifyData() {
  console.log('\n🔍 Verifying data...');
  
  const { data, error, count } = await supabase
    .from('tattoo_artists')
    .select('*', { count: 'exact' })
    .limit(5);
  
  if (error) {
    console.error('❌ Verification failed:', error.message);
    return false;
  }
  
  console.log(`   ✅ Total records: ${count}`);
  console.log(`\n   Sample artists:`);
  data.forEach((artist, i) => {
    console.log(`   ${i + 1}. ${artist.name} (${artist.location_city}, ${artist.location_region})`);
    console.log(`      Styles: ${artist.styles.join(', ')}`);
  });
  
  return true;
}

/**
 * Main execution
 */
async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('  🎨 Supabase Artist Data Injection');
  console.log('═══════════════════════════════════════════════\n');
  
  try {
    // Note: Table creation via JS client is limited
    // Recommend running SQL manually for DDL operations
    console.log('📝 Note: Table should be created manually via Supabase dashboard');
    console.log('   Run the SQL from: generated/create-table.sql\n');
    
    // Insert data
    const insertedCount = await insertArtists();
    
    // Verify
    if (insertedCount > 0) {
      await verifyData();
    }
    
    console.log('\n═══════════════════════════════════════════════');
    console.log('  ✅ Data injection complete!');
    console.log('═══════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { createTable, insertArtists, verifyData };

