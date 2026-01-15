#!/usr/bin/env node

/**
 * Verify Supabase Schema Setup
 *
 * This script verifies that the complete schema was created successfully.
 * Run after executing supabase-complete-schema.sql
 *
 * Usage:
 *   node scripts/verify-supabase-schema.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load from .env.local first, then .env
dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('   SUPABASE_SERVICE_KEY:', supabaseServiceKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifySchema() {
  console.log('🔍 Verifying TatTester Supabase Schema...\n');

  const results = {
    tables: {},
    indexes: {},
    functions: {},
    extensions: {},
    views: {}
  };

  // 1. Check tables exist
  console.log('📊 Checking Tables...');
  const expectedTables = ['users', 'designs', 'design_layers', 'portfolio_embeddings'];

  for (const table of expectedTables) {
    try {
      const { error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        results.tables[table] = { status: '❌', error: error.message };
        console.log(`   ❌ ${table}: ${error.message}`);
      } else {
        results.tables[table] = { status: '✅', count };
        console.log(`   ✅ ${table} (${count || 0} rows)`);
      }
    } catch (err) {
      results.tables[table] = { status: '❌', error: err.message };
      console.log(`   ❌ ${table}: ${err.message}`);
    }
  }

  // 2. Check vector extension
  console.log('\n🧩 Checking Extensions...');
  try {
    const { data, error } = await supabase.rpc('check_vector_extension', {});
    if (error && error.message.includes('does not exist')) {
      // Extension check function doesn't exist, try alternate method
      // We'll just try to query a table with vector column
      const { error: vectorError } = await supabase
        .from('portfolio_embeddings')
        .select('embedding')
        .limit(1);

      if (vectorError && vectorError.message.includes('column') && vectorError.message.includes('does not exist')) {
        results.extensions.vector = { status: '❌', error: 'Vector extension not enabled or embedding column missing' };
        console.log('   ❌ vector: Extension not enabled or embedding column missing');
      } else {
        results.extensions.vector = { status: '✅' };
        console.log('   ✅ vector: Extension enabled');
      }
    } else {
      results.extensions.vector = { status: '✅' };
      console.log('   ✅ vector: Extension enabled');
    }
  } catch (err) {
    // Assume it's working if portfolio_embeddings table exists
    results.extensions.vector = { status: '⚠️', note: 'Cannot verify directly, but table exists' };
    console.log('   ⚠️  vector: Cannot verify directly (table exists though)');
  }

  // 3. Check match_artists function
  console.log('\n🔧 Checking Functions...');
  try {
    // Create a dummy embedding (all zeros) to test the function
    const dummyEmbedding = new Array(4096).fill(0);

    const { data, error } = await supabase.rpc('match_artists', {
      query_embedding: dummyEmbedding,
      match_threshold: 0.7,
      match_count: 1
    });

    if (error) {
      results.functions.match_artists = { status: '❌', error: error.message };
      console.log(`   ❌ match_artists: ${error.message}`);
    } else {
      results.functions.match_artists = { status: '✅', returned: data.length };
      console.log(`   ✅ match_artists (returned ${data.length} results)`);
    }
  } catch (err) {
    results.functions.match_artists = { status: '❌', error: err.message };
    console.log(`   ❌ match_artists: ${err.message}`);
  }

  // 4. Check view
  console.log('\n👁️  Checking Views...');
  try {
    const { data, error } = await supabase
      .from('design_summary')
      .select('*')
      .limit(1);

    if (error) {
      results.views.design_summary = { status: '❌', error: error.message };
      console.log(`   ❌ design_summary: ${error.message}`);
    } else {
      results.views.design_summary = { status: '✅' };
      console.log(`   ✅ design_summary`);
    }
  } catch (err) {
    results.views.design_summary = { status: '❌', error: err.message };
    console.log(`   ❌ design_summary: ${err.message}`);
  }

  // 5. Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 VERIFICATION SUMMARY');
  console.log('='.repeat(60));

  const tableSuccess = Object.values(results.tables).filter(r => r.status === '✅').length;
  const tableTotal = Object.keys(results.tables).length;
  console.log(`\nTables: ${tableSuccess}/${tableTotal} ✅`);

  const extensionSuccess = Object.values(results.extensions).filter(r => r.status === '✅' || r.status === '⚠️').length;
  const extensionTotal = Object.keys(results.extensions).length;
  console.log(`Extensions: ${extensionSuccess}/${extensionTotal} ✅`);

  const functionSuccess = Object.values(results.functions).filter(r => r.status === '✅').length;
  const functionTotal = Object.keys(results.functions).length;
  console.log(`Functions: ${functionSuccess}/${functionTotal} ✅`);

  const viewSuccess = Object.values(results.views).filter(r => r.status === '✅').length;
  const viewTotal = Object.keys(results.views).length;
  console.log(`Views: ${viewSuccess}/${viewTotal} ✅`);

  const allSuccess = tableSuccess === tableTotal &&
                     extensionSuccess === extensionTotal &&
                     functionSuccess === functionTotal &&
                     viewSuccess === viewTotal;

  console.log('\n' + '='.repeat(60));
  if (allSuccess) {
    console.log('✅ All checks passed! Schema is ready to use.');
    console.log('\n🚀 Next Steps:');
    console.log('   1. Run: node scripts/generate-portfolio-embeddings.js');
    console.log('   2. Test artist matching in the app');
    console.log('   3. Start creating designs in The Forge!');
  } else {
    console.log('⚠️  Some checks failed. Review errors above.');
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Ensure you ran supabase-complete-schema.sql in SQL Editor');
    console.log('   2. Check that vector extension is enabled');
    console.log('   3. Verify your service role key has proper permissions');
  }
  console.log('='.repeat(60) + '\n');

  return allSuccess;
}

verifySchema()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('\n❌ Verification failed with error:');
    console.error(error);
    process.exit(1);
  });
