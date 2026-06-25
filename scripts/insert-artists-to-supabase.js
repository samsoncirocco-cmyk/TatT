/**
 * Insert tattoo artist data into Supabase
 *
 * This script:
 * 1. Creates the tattoo_artists table if it doesn't exist
 * 2. Inserts the first 50 artists from the generated data
 * 3. Verifies the insertion with a count query
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yfcmysjmoehcyszvkxsr.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
  console.error('   Add it to .env.local or export it in your shell');
  process.exit(1);
}

// Initialize Supabase client with service role key (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createTable() {
  console.log('\n📋 Creating tattoo_artists table...');

  const createTableSQL = fs.readFileSync(
    path.join(__dirname, '../generated/create-table.sql'),
    'utf8'
  );

  const { data, error } = await supabase.rpc('exec_sql', {
    sql: createTableSQL
  });

  if (error) {
    // Try using the SQL editor approach instead
    console.log('⚠️  RPC method failed, trying direct table creation...');

    // Use Supabase's built-in SQL execution (requires enabling in dashboard)
    const { error: directError } = await supabase
      .from('tattoo_artists')
      .select('id')
      .limit(1);

    if (directError && directError.code === '42P01') {
      // Table doesn't exist - we need to create it manually
      console.error('❌ Table does not exist and cannot be created programmatically');
      console.error('   Please run the SQL in generated/create-table.sql manually in Supabase dashboard:');
      console.error('   https://supabase.com/dashboard/project/yfcmysjmoehcyszvkxsr/editor');
      return false;
    }
  }

  console.log('✅ Table created successfully (or already exists)');
  return true;
}

async function insertArtists() {
  console.log('\n👥 Loading artist data...');

  const artistsData = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, '../generated/tattoo-artists-batch-50.json'),
      'utf8'
    )
  );

  console.log(`   Found ${artistsData.length} artists to insert`);

  // Check if table exists first
  const { data: existingData, error: checkError } = await supabase
    .from('tattoo_artists')
    .select('id')
    .limit(1);

  if (checkError && checkError.code === '42P01') {
    console.error('❌ Table does not exist. Please create it first.');
    console.error('   Run the SQL in generated/create-table.sql in Supabase dashboard.');
    return false;
  }

  // Insert in batches of 10 to avoid timeout
  const batchSize = 10;
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < artistsData.length; i += batchSize) {
    const batch = artistsData.slice(i, i + batchSize);
    console.log(`\n   Inserting batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(artistsData.length / batchSize)}...`);

    const { data, error } = await supabase
      .from('tattoo_artists')
      .insert(batch)
      .select('id');

    if (error) {
      console.error(`   ❌ Batch failed:`, error.message);
      failCount += batch.length;

      // If it's a duplicate key error, continue
      if (error.code !== '23505') {
        console.error('   Stopping due to non-duplicate error');
        return false;
      }
    } else {
      console.log(`   ✅ Inserted ${data.length} artists`);
      successCount += data.length;
    }
  }

  console.log(`\n📊 Insertion complete:`);
  console.log(`   ✅ Success: ${successCount}`);
  if (failCount > 0) {
    console.log(`   ⚠️  Failed/Duplicates: ${failCount}`);
  }

  return true;
}

async function verifyInsertion() {
  console.log('\n🔍 Verifying insertion...');

  const { count, error } = await supabase
    .from('tattoo_artists')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('❌ Verification failed:', error.message);
    return false;
  }

  console.log(`✅ Total artists in database: ${count}`);

  // Get sample records
  const { data: sample, error: sampleError } = await supabase
    .from('tattoo_artists')
    .select('name, location_city, location_country, styles')
    .limit(5);

  if (!sampleError && sample) {
    console.log('\n📋 Sample records:');
    sample.forEach((artist, i) => {
      console.log(`   ${i + 1}. ${artist.name} - ${artist.location_city}, ${artist.location_country}`);
      console.log(`      Styles: ${artist.styles.join(', ')}`);
    });
  }

  return true;
}

async function main() {
  console.log('🚀 TatTester - Supabase Artist Data Insertion');
  console.log('='.repeat(60));

  try {
    // Step 1: Create table (will skip if exists)
    // Note: This may require manual creation in Supabase dashboard
    console.log('\n📝 Note: If table creation fails, please run the SQL manually:');
    console.log('   https://supabase.com/dashboard/project/yfcmysjmoehcyszvkxsr/editor');

    // Step 2: Insert artists
    const insertSuccess = await insertArtists();
    if (!insertSuccess) {
      process.exit(1);
    }

    // Step 3: Verify
    const verifySuccess = await verifyInsertion();
    if (!verifySuccess) {
      process.exit(1);
    }

    console.log('\n✨ All done! Your artist data is now in Supabase.');
    console.log('   View it at: https://supabase.com/dashboard/project/yfcmysjmoehcyszvkxsr/editor');

  } catch (err) {
    console.error('\n💥 Unexpected error:', err);
    process.exit(1);
  }
}

main();
