/**
 * Test Supabase Connection
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });

console.log('Testing Supabase Connection...\n');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Configuration:');
console.log(`  URL: ${SUPABASE_URL}`);
console.log(`  Anon Key: ${SUPABASE_ANON_KEY ? '✓ Set' : '✗ Missing'}`);
console.log(`  Service Key: ${SUPABASE_SERVICE_KEY ? '✓ Set' : '✗ Missing'}`);
console.log();

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

// Test with service key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testConnection() {
    try {
        // Try to query any table (health check)
        const { data, error } = await supabase
            .from('portfolio_embeddings')
            .select('count')
            .limit(0);

        if (error) {
            console.log('Table query result:', error);

            // Check if it's a "table doesn't exist" error
            if (error.message && error.message.includes('does not exist')) {
                console.log('\n❌ Table "portfolio_embeddings" does not exist');
                console.log('\n📋 Action Required:');
                console.log('   Run this SQL in Supabase dashboard:');
                console.log('   https://supabase.com/dashboard/project/yfcmysjmoehcyszvkxsr/sql/new');
                console.log('   File: src/db/migrations/002_migrate_to_text_embeddings.sql');
            } else {
                console.log('\n❌ Connection error:', error.message);
            }
        } else {
            console.log('✅ Connected successfully to Supabase');
            console.log('✅ Table "portfolio_embeddings" exists');
        }

    } catch (err) {
        console.error('❌ Connection failed:', err.message);
        console.error('   Check your network and Supabase credentials');
    }
}

testConnection();
