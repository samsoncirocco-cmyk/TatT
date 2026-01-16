/**
 * Generate Portfolio Embeddings - Vertex AI Version
 * 
 * Processes artists and generates multimodal embeddings for their
 * portfolio images using Vertex AI, then stores them in Supabase.
 * 
 * Usage: node scripts/generate-vertex-embeddings.js [--limit=N] [--force]
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { generateEmbedding } from '../src/services/vertex-ai-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local from project root
dotenv.config({ path: path.join(__dirname, '../.env.local') });

// Configuration
const ARTISTS_FILE = path.join(__dirname, '../src/data/artists.json');
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MAX_IMAGES_PER_ARTIST = 3; // Average embeddings from multiple images
const ARTIST_DELAY_MS = 2000; // Rate limiting
const DEBUG = process.env.DEBUG_EMBEDDINGS === 'true';

// Parse command line arguments
const args = process.argv.slice(2);
const limitMatch = args.find(arg => arg.startsWith('--limit='));
const limit = limitMatch ? parseInt(limitMatch.split('=')[1], 10) : null;
const force = args.includes('--force');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Validate environment
if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in .env.local');
    console.error('   Get it from: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api');
    process.exit(1);
}

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('❌ GOOGLE_APPLICATION_CREDENTIALS not set');
    console.error('   Run: export GOOGLE_APPLICATION_CREDENTIALS=./gcp-service-account-key.json');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Store embedding in Supabase
 */
async function storeEmbeddingInSupabase(artistId, vector, sourceImages) {
    const { data, error } = await supabase
        .from('portfolio_embeddings')
        .delete()
        .eq('artist_id', artistId);

    if (error) {
        throw new Error(`Supabase delete error: ${error.message}`);
    }

    const { data: insertData, error: insertError } = await supabase
        .from('portfolio_embeddings')
        .insert({
            artist_id: artistId,
            embedding: vector,
            source_images: sourceImages,
            model_version: 'vertex-multimodal-v1'
        })
        .select()
        .single();

    if (insertError) {
        throw new Error(`Supabase insert error: ${insertError.message}`);
    }

    return insertData;
}

/**
 * Check if artist already has embedding
 */
async function hasExistingEmbedding(artistId) {
    const { data, error } = await supabase
        .from('portfolio_embeddings')
        .select('id')
        .eq('artist_id', artistId)
        .single();

    return !error && data !== null;
}

/**
 * Main execution
 */
async function main() {
    try {
        // Load artists
        if (!fs.existsSync(ARTISTS_FILE)) {
            console.error(`❌ Artists file not found: ${ARTISTS_FILE}`);
            process.exit(1);
        }

        const data = JSON.parse(fs.readFileSync(ARTISTS_FILE, 'utf8'));
        const allArtists = data.artists || [];
        const artists = limit ? allArtists.slice(0, limit) : allArtists;

        console.log('='.repeat(60));
        console.log('🎨 Vertex AI Portfolio Embedding Generation');
        console.log('='.repeat(60));
        console.log();
        console.log(`Total artists: ${allArtists.length}`);
        console.log(`Processing: ${artists.length}${limit ? ` (limited)` : ''}${force ? ' (force)' : ''}`);
        console.log(`Max images per artist: ${MAX_IMAGES_PER_ARTIST}`);
        console.log();

        let processed = 0;
        let skipped = 0;
        let errors = 0;

        for (let i = 0; i < artists.length; i++) {
            const artist = artists[i];
            const artistId = artist.id;

            console.log(`[${i + 1}/${artists.length}] Processing ${artist.name}...`);

            try {
                // Check if already has embedding
                const hasEmbedding = await hasExistingEmbedding(artistId);
                if (hasEmbedding && !force) {
                    console.log(`  ⏭️  Already has embedding, skipping`);
                    skipped++;
                    continue;
                }

                // Get portfolio images (prefer local files under /portfolio/)
                const images = (artist.portfolioImages || []).filter((img) =>
                    typeof img === 'string' && img.startsWith('/portfolio/')
                );
                if (images.length === 0) {
                    console.warn(`  ⚠️  No local portfolio images, skipping`);
                    skipped++;
                    continue;
                }

                // Select images to process
                const imagesToProcess = images.slice(0, MAX_IMAGES_PER_ARTIST);
                console.log(`  📸 Processing ${imagesToProcess.length} image(s)...`);

                // Generate embeddings for each image
                const vectors = [];
                for (let j = 0; j < imagesToProcess.length; j++) {
                    const imageUrl = imagesToProcess[j];

                    // Resolve local file path to Data URL
                    let processedUrl = imageUrl;
                    if (imageUrl.startsWith('/')) {
                        // Assuming it's in public/
                        const localPath = path.join(process.cwd(), 'public', imageUrl);
                        if (fs.existsSync(localPath)) {
                            // Convert to Data URL here to avoid fetch issues with local paths in service
                            const buffer = fs.readFileSync(localPath);
                            const base64 = buffer.toString('base64');
                            const ext = path.extname(localPath).substring(1); // 'png'
                            processedUrl = `data:image/${ext};base64,${base64}`;

                            if (DEBUG) console.log(`      ✓ Resolved local file: ${localPath} (${base64.length} chars)`);
                        } else {
                            console.warn(`      ⚠️ Local file not found: ${localPath}`);
                            continue;
                        }
                    }

                    try {
                        console.log(`    - Image ${j + 1}/${imagesToProcess.length}...`);
                        const embedding = await generateEmbedding([processedUrl]);
                        vectors.push(embedding);

                        if (DEBUG) {
                            console.log(`      ✓ Embedding dimension: ${embedding.length}`);
                        }
                    } catch (err) {
                        console.error(`    ❌ Failed to generate embedding: ${err.message}`);
                    }
                }

                if (vectors.length === 0) {
                    console.error(`  ❌ No embeddings generated`);
                    errors++;
                    continue;
                }

                // Average the vectors
                const avgVector = new Array(vectors[0].length).fill(0);
                for (const v of vectors) {
                    for (let d = 0; d < v.length; d++) {
                        avgVector[d] += v[d] / vectors.length;
                    }
                }

                console.log(`  🧮 Averaged ${vectors.length} embedding(s)`);

                // Store in Supabase
                await storeEmbeddingInSupabase(artistId, avgVector, imagesToProcess);
                console.log(`  ✅ Stored in Supabase`);

                processed++;

                // Rate limiting
                if (i < artists.length - 1) {
                    await sleep(ARTIST_DELAY_MS);
                }

            } catch (err) {
                console.error(`  ❌ Error: ${err.message}`);
                errors++;
            }

            console.log();
        }

        // Summary
        console.log('='.repeat(60));
        console.log('Summary');
        console.log('='.repeat(60));
        console.log(`✅ Processed:  ${processed}`);
        console.log(`⏭️  Skipped:    ${skipped}`);
        console.log(`❌ Errors:     ${errors}`);
        console.log(`📊 Total:      ${artists.length}`);
        console.log('='.repeat(60));
        console.log();

        if (processed > 0) {
            console.log('🎉 Embedding generation complete!');
            console.log();
            console.log('Next steps:');
            console.log('  1. Test vector search: SELECT * FROM match_artists(...);');
            console.log('  2. Integrate into hybrid matching service');
            console.log('  3. Build Match Pulse UI');
        }

        process.exit(errors > 0 ? 1 : 0);

    } catch (err) {
        console.error(`\n❌ Fatal error: ${err.message}`);
        if (DEBUG) {
            console.error(err.stack);
        }
        process.exit(1);
    }
}

main();
