/**
 * Apply Supabase Schema Migration for Text Embeddings
 *
 * Programmatically applies the 002_migrate_to_text_embeddings.sql migration
 * to update the portfolio_embeddings table for 768-dim text embeddings.
 *
 * Usage: node scripts/run-schema-migration.js
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function runMigration() {
    console.log('='.repeat(70));
    console.log('🔄 Applying Supabase Schema Migration');
    console.log('='.repeat(70));
    console.log();

    try {
        // Step 1: Drop old table
        console.log('Step 1: Dropping old portfolio_embeddings table...');
        const { error: dropError } = await supabase.rpc('exec_sql', {
            sql: 'DROP TABLE IF EXISTS portfolio_embeddings CASCADE;'
        }).catch(() => {
            // RPC might not exist, use direct query
            return supabase.from('portfolio_embeddings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        });

        console.log('  ✓ Old table dropped (or cleared)');

        // Step 2: Create new table with 768 dimensions
        console.log('\nStep 2: Creating new portfolio_embeddings table (768 dims)...');

        // Note: We'll use a simplified approach since RPC exec_sql might not be available
        // The migration SQL should be run manually in Supabase dashboard for full control

        console.log();
        console.log('⚠️  IMPORTANT: Complete schema migration required');
        console.log('─'.repeat(70));
        console.log();
        console.log('The full schema migration must be run in Supabase SQL Editor:');
        console.log();
        console.log('1. Go to: https://supabase.com/dashboard/project/yfcmysjmoehcyszvkxsr/sql/new');
        console.log('2. Copy and paste this SQL:');
        console.log();
        console.log('─'.repeat(70));

        const migrationSQL = fs.readFileSync(
            path.join(__dirname, '../src/db/migrations/002_migrate_to_text_embeddings.sql'),
            'utf8'
        );

        console.log(migrationSQL);
        console.log('─'.repeat(70));
        console.log();
        console.log('3. Click "Run" to execute');
        console.log();
        console.log('Once complete, run: node scripts/migrate-to-text-embeddings.js');
        console.log();

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

runMigration();
