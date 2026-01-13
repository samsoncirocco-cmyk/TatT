/**
 * Vector Search Benchmark Script
 * 
 * Validates performance of vector similarity search at 10,000+ artist scale.
 * Target: Average query time < 100ms
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Generate a random 4096-dimensional embedding
 */
function generateRandomEmbedding() {
    return new Array(4096).fill(0).map(() => Math.random());
}

/**
 * Seed database with 10,000 mock artist embeddings
 */
async function seedMockData() {
    console.log('Seeding 10,000 mock artist embeddings...');

    const BATCH_SIZE = 100;
    const TOTAL_ARTISTS = 10000;

    for (let i = 0; i < TOTAL_ARTISTS; i += BATCH_SIZE) {
        const batch = [];
        for (let j = 0; j < BATCH_SIZE; j++) {
            batch.push({
                artist_id: crypto.randomUUID(),
                embedding: generateRandomEmbedding(),
                metadata: { name: `Artist ${i + j}`, style: 'Abstract' }
            });
        }

        const { error } = await supabase.from('artist_embeddings').insert(batch);
        if (error) {
            console.error(`Error inserting batch at ${i}:`, error);
            return false;
        }

        if (i % 1000 === 0) {
            console.log(`Inserted ${i} artists...`);
        }
    }

    console.log('Seeding complete.');
    return true;
}

/**
 * Run benchmark
 */
async function runBenchmark(iterations = 100) {
    console.log(`Running benchmark with ${iterations} iterations...`);

    const latencies = [];

    for (let i = 0; i < iterations; i++) {
        const queryVector = generateRandomEmbedding();
        const start = performance.now();

        // Call the RPC function (match_artists)
        const { data, error } = await supabase.rpc('match_artists', {
            query_embedding: queryVector,
            match_threshold: 0.5,
            match_count: 10
        });

        const duration = performance.now() - start;

        if (error) {
            console.error('Search error:', error);
        } else {
            latencies.push(duration);
        }

        if (i % 20 === 0) {
            process.stdout.write('.');
        }
    }

    console.log('\nBenchmark complete.');

    // Calculate stats
    const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    latencies.sort((a, b) => a - b);
    const p50 = latencies[Math.floor(latencies.length * 0.5)];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    const p99 = latencies[Math.floor(latencies.length * 0.99)];
    const threats = latencies.filter(l => l > 100).length;

    console.log('\n--- PERFORMANCE RESULTS ---');
    console.log(`Average Latency: ${avg.toFixed(2)}ms`);
    console.log(`P50  Latency: ${p50.toFixed(2)}ms`);
    console.log(`P95  Latency: ${p95.toFixed(2)}ms`);
    console.log(`P99  Latency: ${p99.toFixed(2)}ms`);
    console.log(`Threshold Violations (>100ms): ${threats} (${((threats / iterations) * 100).toFixed(1)}%)`);
    console.log('---------------------------');

    if (avg < 100) {
        console.log('✅ Performance Target Met (<100ms average)');
    } else {
        console.error('❌ Performance Target Failed (>100ms average)');
    }
}

/**
 * Main execution
 */
async function main() {
    // Check if we already have data
    const { count, error } = await supabase.from('artist_embeddings').select('*', { count: 'exact', head: true });

    if (error) {
        console.error('Error checking artist count:', error);
        return;
    }

    if (count < 10000) {
        console.log(`Found only ${count} artists. Seeding more...`);
        const seeded = await seedMockData();
        if (!seeded) return;
    } else {
        console.log(`Found ${count} artists in database. Proceeding with benchmark.`);
    }

    await runBenchmark(100);
}

main();
