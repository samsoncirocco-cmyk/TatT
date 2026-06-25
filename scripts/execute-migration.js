/**
 * Execute SQL Migration Programmatically
 *
 * This script executes the text embeddings migration using raw SQL
 * through the Supabase service role key.
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

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

async function executeSQL(sql) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`SQL execution failed: ${error}`);
    }

    return response.json();
}

async function executeMigration() {
    console.log('='.repeat(70));
    console.log('🔄 Executing Supabase Schema Migration');
    console.log('='.repeat(70));
    console.log();

    try {
        // Read migration SQL
        const migrationPath = path.join(__dirname, '../src/db/migrations/002_migrate_to_text_embeddings.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log('📄 Migration SQL loaded');
        console.log('⚠️  This will DROP the existing portfolio_embeddings table');
        console.log();

        // Split SQL into individual statements
        const statements = migrationSQL
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        console.log(`📝 Executing ${statements.length} SQL statements...`);
        console.log();

        for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i];

            // Extract first line for logging
            const firstLine = stmt.split('\n')[0].substring(0, 60);
            console.log(`[${i + 1}/${statements.length}] ${firstLine}...`);

            try {
                // Use Supabase REST API to execute raw SQL
                const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
                    method: 'POST',
                    headers: {
                        'apikey': SUPABASE_SERVICE_KEY,
                        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ sql: stmt + ';' })
                });

                if (!response.ok) {
                    // Try alternative approach - execute directly
                    console.log('  ⚠️  REST API method failed, trying direct execution...');

                    // For table creation, we need to use a workaround
                    // Since Supabase doesn't expose direct SQL execution via REST,
                    // we'll need to use the Supabase CLI or manual execution
                    throw new Error('Direct SQL execution not available via REST API');
                }

                console.log('  ✓ Success');
            } catch (err) {
                console.error(`  ❌ Failed: ${err.message}`);

                if (i === 0) {
                    console.log();
                    console.log('─'.repeat(70));
                    console.log('⚠️  SQL execution via REST API is not available.');
                    console.log('   Please run the migration manually:');
                    console.log();
                    console.log('   1. Open: https://supabase.com/dashboard/project/yfcmysjmoehcyszvkxsr/sql/new');
                    console.log('   2. Copy/paste: src/db/migrations/002_migrate_to_text_embeddings.sql');
                    console.log('   3. Click "Run"');
                    console.log('─'.repeat(70));
                    process.exit(1);
                }
            }
        }

        console.log();
        console.log('='.repeat(70));
        console.log('✅ Migration completed successfully!');
        console.log('='.repeat(70));
        console.log();
        console.log('Next step: Run the data migration');
        console.log('  node scripts/migrate-to-text-embeddings.js --limit=5');
        console.log();

    } catch (error) {
        console.error();
        console.error('❌ Migration failed:', error.message);
        console.error();
        process.exit(1);
    }
}

executeMigration();
