/**
 * Check current Supabase portfolio_embeddings table schema
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkSchema() {
    console.log('Checking portfolio_embeddings table...\n');

    // Try to get a sample record
    const { data, error } = await supabase
        .from('portfolio_embeddings')
        .select('*')
        .limit(1);

    if (error) {
        console.log('❌ Table query error:', error.message);
        console.log('\n📋 You need to run the schema migration SQL first:');
        console.log('   src/db/migrations/002_migrate_to_text_embeddings.sql');
        return;
    }

    if (!data || data.length === 0) {
        console.log('✅ Table exists but is empty');
        console.log('   Ready for data migration!');
    } else {
        console.log('✅ Table exists with data:');
        console.log('   Sample record:', data[0]);

        // Check embedding dimension
        if (data[0].embedding) {
            console.log(`   Embedding dimensions: ${data[0].embedding.length}`);
        }
    }

    // Get count
    const { count } = await supabase
        .from('portfolio_embeddings')
        .select('*', { count: 'exact', head: true });

    console.log(`   Total records: ${count}`);
}

checkSchema();
