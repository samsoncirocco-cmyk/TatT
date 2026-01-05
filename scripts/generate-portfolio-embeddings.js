/**
 * Generate Portfolio Embeddings Script (Supabase)
 * 
 * Processes artists in artists.json, generates CLIP embeddings for their
 * portfolio images via Replicate, and stores them in Supabase using pgvector.
 * 
 * Usage: node scripts/generate-portfolio-embeddings.js
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ARTISTS_FILE = path.join(__dirname, '../src/data/artists.json');
const PROXY_URL = process.env.VITE_PROXY_URL || 'http://localhost:3001/api';
const AUTH_TOKEN = process.env.FRONTEND_AUTH_TOKEN || 'dev-token-change-in-production';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://yfcmysjmoehcyszvkxsr.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Configuration
const CLIP_MODEL_VERSION = "0e36398b76c8cb81a67dd463ae37d97d02dd67d9d0dec8411d73a62ae5e1ec4b";
const EMBEDDING_DIMENSION = 4096;

if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ SUPABASE_SERVICE_KEY not found in .env');
    console.error('   Get it from: https://supabase.com/dashboard/project/yfcmysjmoehcyszvkxsr/settings/api');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Fetch with timeout and auth
 */
async function fetchWithProxy(endpoint, options = {}) {
    const response = await fetch(`${PROXY_URL}${endpoint}`, {
        ...options,
        headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Content-Type': 'application/json',
            ...options.headers
        }
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || `HTTP ${response.status}`);
    }

    return response.json();
}

/**
 * Generate embedding for a single image URL
 */
async function generateImageEmbedding(imageUrl) {
    console.log(`  - Generating embedding for: ${imageUrl.substring(0, 60)}...`);

    // Create prediction
    const prediction = await fetchWithProxy('/predictions', {
        method: 'POST',
        body: JSON.stringify({
            version: CLIP_MODEL_VERSION,
            input: { image: imageUrl }
        })
    });

    let status = prediction.status;
    let currentPrediction = prediction;

    // Poll for completion
    while (status !== 'succeeded' && status !== 'failed') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        currentPrediction = await fetchWithProxy(`/predictions/${currentPrediction.id}`);
        status = currentPrediction.status;
    }

    if (status === 'failed') {
        throw new Error(`Embedding generation failed: ${currentPrediction.error}`);
    }

    // Extract vector from output
    let vector = currentPrediction.output;
    if (!Array.isArray(vector)) {
        vector = currentPrediction.output?.embedding || currentPrediction.output?.[0] || [];
    }

    // Pad or truncate to match expected dimension
    if (vector.length < EMBEDDING_DIMENSION) {
        const padding = new Array(EMBEDDING_DIMENSION - vector.length).fill(0);
        vector = [...vector, ...padding];
    } else if (vector.length > EMBEDDING_DIMENSION) {
        vector = vector.slice(0, EMBEDDING_DIMENSION);
    }

    return vector;
}

/**
 * Store embedding in Supabase
 */
async function storeEmbeddingInSupabase(artistId, vector, sourceImages) {
    const { data, error } = await supabase
        .from('portfolio_embeddings')
        .upsert({
            artist_id: artistId,
            embedding: vector,
            source_images: sourceImages,
            model_version: 'clip-vit-base-patch32'
        })
        .select()
        .single();

    if (error) {
        throw new Error(`Supabase error: ${error.message}`);
    }

    return data;
}

/**
 * Update Neo4j with embedding reference
 */
async function updateNeo4jEmbeddingId(artistId, embeddingId) {
    try {
        await fetchWithProxy('/neo4j/query', {
            method: 'POST',
            body: JSON.stringify({
                query: 'MATCH (a:Artist {id: $id}) SET a.embedding_id = $embeddingId RETURN a',
                params: { id: artistId, embeddingId }
            })
        });
        return true;
    } catch (err) {
        console.warn(`  ! Neo4j sync failed: ${err.message}`);
        return false;
    }
}

/**
 * Main execution
 */
async function main() {
    try {
        const data = JSON.parse(fs.readFileSync(ARTISTS_FILE, 'utf8'));
        const artists = data.artists;

        console.log(`\n🎨 Starting embedding generation for ${artists.length} artists...\n`);

        let processed = 0;
        let skipped = 0;
        let errors = 0;

        for (let i = 0; i < artists.length; i++) {
            const artist = artists[i];
            const embeddingId = `artist_${artist.id}`;

            if (artist.embedding_id) {
                console.log(`[${i + 1}/${artists.length}] ⏭️  Skipping ${artist.name} (already has embedding)`);
                skipped++;
                continue;
            }

            console.log(`[${i + 1}/${artists.length}] 🔄 Processing ${artist.name}...`);

            try {
                const images = artist.portfolioImages || [];
                if (images.length === 0) {
                    console.warn(`  ⚠️  No portfolio images for ${artist.name}`);
                    skipped++;
                    continue;
                }

                // Generate embeddings for all images and average them
                const vectors = [];
                for (const imgUrl of images) {
                    try {
                        const v = await generateImageEmbedding(imgUrl);
                        vectors.push(v);
                    } catch (err) {
                        console.error(`  ❌ Failed to embed image: ${err.message}`);
                    }
                }

                if (vectors.length === 0) {
                    errors++;
                    continue;
                }

                // Simple average of vectors
                const avgVector = new Array(EMBEDDING_DIMENSION).fill(0);
                for (const v of vectors) {
                    for (let d = 0; d < EMBEDDING_DIMENSION; d++) {
                        avgVector[d] += v[d] / vectors.length;
                    }
                }

                // Store in Supabase
                await storeEmbeddingInSupabase(embeddingId, avgVector, images);
                console.log(`  ✅ Stored embedding in Supabase`);

                // Update local artist record
                artist.embedding_id = embeddingId;

                // Sync to Neo4j
                const neo4jSuccess = await updateNeo4jEmbeddingId(artist.id, embeddingId);
                if (neo4jSuccess) {
                    console.log(`  ✅ Synced to Neo4j`);
                }

                processed++;

                // Save progress every 5 artists
                if ((i + 1) % 5 === 0) {
                    fs.writeFileSync(ARTISTS_FILE, JSON.stringify(data, null, 2));
                    console.log(`  💾 Progress saved to artists.json\n`);
                }

            } catch (err) {
                console.error(`  ❌ Error processing ${artist.name}: ${err.message}`);
                errors++;
            }
        }

        // Final save
        fs.writeFileSync(ARTISTS_FILE, JSON.stringify(data, null, 2));

        console.log('\n═══════════════════════════════════════════════════');
        console.log('✅ Embedding Generation Complete!');
        console.log('═══════════════════════════════════════════════════');
        console.log(`  Processed: ${processed}`);
        console.log(`  Skipped:   ${skipped}`);
        console.log(`  Errors:    ${errors}`);
        console.log(`  Total:     ${artists.length}`);
        console.log('═══════════════════════════════════════════════════\n');

    } catch (err) {
        console.error(`\n❌ Fatal error: ${err.message}`);
        process.exit(1);
    }
}

main();
