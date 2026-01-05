/**
 * Setup Supabase Vector Schema
 * 
 * Enables pgvector extension and creates the portfolio_embeddings table
 * for storing 4096-dimensional CLIP embeddings of artist portfolios.
 * 
 * Usage: node scripts/setup-supabase-vector-schema.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://yfcmysjmoehcyszvkxsr.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ SUPABASE_SERVICE_KEY not found in .env file');
    console.error('   Get it from: https://supabase.com/dashboard/project/yfcmysjmoehcyszvkxsr/settings/api');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function setupVectorSchema() {
    console.log('🚀 Setting up Supabase Vector Schema...\n');

    try {
        // Step 1: Enable pgvector extension
        console.log('1️⃣  Enabling pgvector extension...');
        const { error: extensionError } = await supabase.rpc('exec_sql', {
            sql: 'CREATE EXTENSION IF NOT EXISTS vector'
        });

        if (extensionError) {
            // Try alternative method using direct SQL
            const { error: altError } = await supabase
                .from('_sql')
                .insert({ query: 'CREATE EXTENSION IF NOT EXISTS vector' });

            if (altError) {
                console.log('   ⚠️  Extension may already be enabled or requires manual setup');
                console.log('   Run this SQL in Supabase SQL Editor:');
                console.log('   CREATE EXTENSION IF NOT EXISTS vector;\n');
            }
        } else {
            console.log('   ✅ pgvector extension enabled\n');
        }

        // Step 2: Create portfolio_embeddings table
        console.log('2️⃣  Creating portfolio_embeddings table...');
        const createTableSQL = `
      CREATE TABLE IF NOT EXISTS portfolio_embeddings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        artist_id TEXT NOT NULL UNIQUE,
        embedding vector(4096) NOT NULL,
        source_images TEXT[] NOT NULL,
        model_version TEXT NOT NULL DEFAULT 'clip-vit-base-patch32',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

        const { error: tableError } = await supabase.rpc('exec_sql', {
            sql: createTableSQL
        });

        if (tableError) {
            console.log('   ℹ️  Manual SQL required. Copy and run in SQL Editor:');
            console.log('   ' + createTableSQL.trim().replace(/\n\s+/g, '\n   '));
            console.log('');
        } else {
            console.log('   ✅ Table created\n');
        }

        // Step 3: Create index for cosine similarity search
        console.log('3️⃣  Creating vector similarity index...');
        const createIndexSQL = `
      CREATE INDEX IF NOT EXISTS portfolio_embeddings_embedding_idx 
      ON portfolio_embeddings 
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100);
    `;

        const { error: indexError } = await supabase.rpc('exec_sql', {
            sql: createIndexSQL
        });

        if (indexError) {
            console.log('   ℹ️  Manual SQL required. Copy and run in SQL Editor:');
            console.log('   ' + createIndexSQL.trim().replace(/\n\s+/g, '\n   '));
            console.log('');
        } else {
            console.log('   ✅ Index created\n');
        }

        // Step 4: Create updated_at trigger
        console.log('4️⃣  Creating updated_at trigger...');
        const triggerSQL = `
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';

      DROP TRIGGER IF EXISTS update_portfolio_embeddings_updated_at ON portfolio_embeddings;
      
      CREATE TRIGGER update_portfolio_embeddings_updated_at 
      BEFORE UPDATE ON portfolio_embeddings 
      FOR EACH ROW 
      EXECUTE FUNCTION update_updated_at_column();
    `;

        const { error: triggerError } = await supabase.rpc('exec_sql', {
            sql: triggerSQL
        });

        if (triggerError) {
            console.log('   ℹ️  Manual SQL required. Copy and run in SQL Editor:');
            console.log('   ' + triggerSQL.trim().replace(/\n\s+/g, '\n   '));
            console.log('');
        } else {
            console.log('   ✅ Trigger created\n');
        }

        console.log('═══════════════════════════════════════════════════');
        console.log('✅ Setup Complete!');
        console.log('═══════════════════════════════════════════════════');
        console.log('');
        console.log('If any steps failed, run the SQL manually in:');
        console.log('https://supabase.com/dashboard/project/yfcmysjmoehcyszvkxsr/sql/new');
        console.log('');
        console.log('Next steps:');
        console.log('1. Run: node scripts/generate-portfolio-embeddings.js');
        console.log('2. Test similarity search with your vector service');

    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        console.error('');
        console.error('Please run the following SQL manually in Supabase SQL Editor:');
        console.error('https://supabase.com/dashboard/project/yfcmysjmoehcyszvkxsr/sql/new');
        console.error('');
        console.error(`
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create portfolio_embeddings table
CREATE TABLE IF NOT EXISTS portfolio_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id TEXT NOT NULL UNIQUE,
  embedding vector(4096) NOT NULL,
  source_images TEXT[] NOT NULL,
  model_version TEXT NOT NULL DEFAULT 'clip-vit-base-patch32',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for cosine similarity search
CREATE INDEX IF NOT EXISTS portfolio_embeddings_embedding_idx 
ON portfolio_embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_portfolio_embeddings_updated_at ON portfolio_embeddings;

CREATE TRIGGER update_portfolio_embeddings_updated_at 
BEFORE UPDATE ON portfolio_embeddings 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();
    `);
    }
}

setupVectorSchema();
