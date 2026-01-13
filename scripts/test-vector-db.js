/**
 * Test Supabase Vector DB Integration
 * 
 * Verifies that the vectorDbService correctly interacts with Supabase pgvector.
 */

import { storeEmbedding, getEmbedding, getEmbeddingStats } from '../src/services/vectorDbService.js';
import dotenv from 'dotenv';

dotenv.config();

// Set environment variables for testing
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://yfcmysjmoehcyszvkxsr.supabase.co';
process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!process.env.SUPABASE_SERVICE_KEY) {
    console.error('❌ SUPABASE_SERVICE_KEY not found in .env');
    console.error('   Get it from: https://supabase.com/dashboard/project/yfcmysjmoehcyszvkxsr/settings/api');
    process.exit(1);
}

async function runTest() {
    console.log('--- Testing Supabase Vector DB Service ---\n');

    try {
        const testId = 'test_artist_001';
        const testVector = new Array(4096).fill(0).map(() => Math.random());
        const testMetadata = {
            source_images: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
            model_version: 'clip-vit-base-patch32'
        };

        console.log('1️⃣  Storing test embedding...');
        const storeResult = await storeEmbedding(testId, testVector, testMetadata);
        console.log('   ✅ Stored:', storeResult.artist_id);

        console.log('\n2️⃣  Retrieving embedding...');
        const retrieved = await getEmbedding(testId);
        console.log('   Retrieved ID:', retrieved.id);
        console.log('   Vector Length:', retrieved.values.length);
        console.log('   Source Images:', retrieved.metadata.source_images.length);

        // Check if vectors match
        let matches = true;
        for (let i = 0; i < 100; i++) { // Check first 100 dimensions
            if (Math.abs(retrieved.values[i] - testVector[i]) > 0.0001) {
                matches = false;
                break;
            }
        }
        console.log('   Vector Matches:', matches ? '✅ Yes' : '❌ No');

        console.log('\n3️⃣  Getting statistics...');
        const stats = await getEmbeddingStats();
        console.log('   Total Embeddings:', stats.total_embeddings);
        console.log('   Dimension:', stats.dimension);
        console.log('   Service:', stats.service);

        if (matches && retrieved.id === testId) {
            console.log('\n🎉 All tests passed!');
            console.log('\nNext steps:');
            console.log('1. Run: node scripts/setup-supabase-vector-schema.js');
            console.log('2. Run: node scripts/generate-portfolio-embeddings.js');
        } else {
            console.log('\n❌ Some tests failed!');
        }

    } catch (err) {
        console.error('\n❌ Test Errored:', err.message);
        if (err.message.includes('relation "portfolio_embeddings" does not exist')) {
            console.error('\n💡 Hint: Run the schema setup first:');
            console.error('   node scripts/setup-supabase-vector-schema.js');
        }
    }
}

runTest();
