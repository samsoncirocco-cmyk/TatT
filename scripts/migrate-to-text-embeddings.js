/**
 * Migrate Portfolio Embeddings to Text-Based (Vertex AI text-embedding-005)
 *
 * Migrates from image-based embeddings (1408-dim multimodal) to text-based
 * embeddings (768-dim text-embedding-005). This enables better semantic matching
 * between user queries and artist specialties.
 *
 * Usage: node scripts/migrate-to-text-embeddings.js [--limit=N] [--force] [--dry-run]
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local from project root
dotenv.config({ path: path.join(__dirname, '../.env.local') });

// Import Google Auth for API calls
const { GoogleAuth } = await import('google-auth-library');

const PROJECT_ID = process.env.GCP_PROJECT_ID || 'tatt-pro';
const LOCATION = process.env.GCP_REGION || 'us-central1';
const EMBEDDING_MODEL = 'text-embedding-005';

const auth = new GoogleAuth({
    scopes: 'https://www.googleapis.com/auth/cloud-platform',
});

/**
 * Generate text embedding using Vertex AI REST API
 */
async function generateTextEmbedding(text) {
    // Get auth client and access token
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    if (!accessToken.token) {
        throw new Error('Failed to get access token');
    }

    // Construct API endpoint
    const endpoint = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${EMBEDDING_MODEL}:predict`;

    // Make prediction request
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken.token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            instances: [
                {
                    content: text.trim(),
                    task_type: 'RETRIEVAL_DOCUMENT',
                }
            ],
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Vertex AI API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    // Extract embedding values
    if (!data.predictions || !Array.isArray(data.predictions) || data.predictions.length === 0) {
        throw new Error('Invalid embedding response from Vertex AI');
    }

    const prediction = data.predictions[0];
    const embedding = prediction.embeddings?.values || prediction.values;

    if (!Array.isArray(embedding)) {
        throw new Error('Embedding values not found in response');
    }

    return embedding;
}

// Configuration
const ARTISTS_FILE = path.join(__dirname, '../src/data/artists.json');
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BATCH_SIZE = 5; // Process 5 artists at a time to avoid rate limits
const DELAY_MS = 1000; // Delay between batches

// Parse command line arguments
const args = process.argv.slice(2);
const limitMatch = args.find(arg => arg.startsWith('--limit='));
const limit = limitMatch ? parseInt(limitMatch.split('=')[1], 10) : null;
const force = args.includes('--force');
const dryRun = args.includes('--dry-run');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Validate environment
if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in .env.local');
    console.error('   Get it from: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api');
    process.exit(1);
}

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.GCP_PROJECT_ID) {
    console.error('❌ Google Cloud credentials not configured');
    console.error('   Set GOOGLE_APPLICATION_CREDENTIALS or ensure GCP_PROJECT_ID is set');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Generate descriptive text for an artist
 * This text will be embedded and used for semantic matching
 */
function generateArtistDescription(artist) {
    const parts = [];

    // Name and location
    parts.push(`${artist.name}, tattoo artist in ${artist.city}, ${artist.state}`);

    // Styles
    if (artist.styles && artist.styles.length > 0) {
        parts.push(`Specializes in ${artist.styles.join(', ')} styles`);
    }

    // Tags (visual/thematic descriptors)
    if (artist.tags && artist.tags.length > 0) {
        parts.push(`Known for ${artist.tags.join(', ')} work`);
    }

    // Bio (often contains rich semantic info)
    if (artist.bio) {
        parts.push(artist.bio);
    }

    // Experience
    if (artist.yearsExperience) {
        parts.push(`${artist.yearsExperience} years of experience`);
    }

    // Shop name
    if (artist.shopName) {
        parts.push(`Works at ${artist.shopName}`);
    }

    return parts.join('. ');
}

/**
 * Check if artist already has text embedding
 */
async function hasExistingEmbedding(artistId) {
    if (dryRun) return false;

    const { data, error } = await supabase
        .from('portfolio_embeddings')
        .select('id, model_version')
        .eq('artist_id', artistId)
        .single();

    // Return true only if it's a text-embedding-005 version
    return !error && data !== null && data.model_version === 'text-embedding-005';
}

/**
 * Store embedding in Supabase
 */
async function storeEmbeddingInSupabase(artistId, vector, description) {
    if (dryRun) {
        console.log(`    [DRY RUN] Would store ${vector.length}-dim embedding`);
        return { id: 'dry-run-id' };
    }

    // Delete existing embedding (upsert behavior)
    const { error: deleteError } = await supabase
        .from('portfolio_embeddings')
        .delete()
        .eq('artist_id', artistId);

    if (deleteError) {
        throw new Error(`Supabase delete error: ${deleteError.message}`);
    }

    // Insert new embedding
    const { data, error } = await supabase
        .from('portfolio_embeddings')
        .insert({
            artist_id: artistId,
            embedding: vector,
            description: description,
            model_version: 'text-embedding-005'
        })
        .select()
        .single();

    if (error) {
        throw new Error(`Supabase insert error: ${error.message}`);
    }

    return data;
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

        console.log('='.repeat(70));
        console.log('🔄 Migrate to Text-Based Embeddings (Vertex AI text-embedding-005)');
        console.log('='.repeat(70));
        console.log();
        console.log(`Total artists:     ${allArtists.length}`);
        console.log(`Processing:        ${artists.length}${limit ? ' (limited)' : ''}`);
        console.log(`Mode:              ${dryRun ? 'DRY RUN' : force ? 'FORCE' : 'NORMAL'}`);
        console.log(`Embedding model:   text-embedding-005 (768 dimensions)`);
        console.log(`Previous model:    multimodal (1408 dimensions)`);
        console.log();

        let processed = 0;
        let skipped = 0;
        let errors = 0;

        for (let i = 0; i < artists.length; i++) {
            const artist = artists[i];
            const artistId = String(artist.id);

            console.log(`[${i + 1}/${artists.length}] Processing ${artist.name} (ID: ${artistId})...`);

            try {
                // Check if already has text embedding
                const hasEmbedding = await hasExistingEmbedding(artistId);
                if (hasEmbedding && !force) {
                    console.log(`  ⏭️  Already has text embedding, skipping`);
                    skipped++;
                    continue;
                }

                // Generate descriptive text
                const description = generateArtistDescription(artist);
                console.log(`  📝 Description: "${description.substring(0, 100)}..."`);

                // Generate text embedding
                console.log(`  🧮 Generating embedding...`);
                const embedding = await generateTextEmbedding(description);

                // Validate dimensions
                if (embedding.length !== 768) {
                    throw new Error(`Expected 768 dimensions, got ${embedding.length}`);
                }

                console.log(`  ✓ Generated ${embedding.length}-dim embedding`);

                // Store in Supabase
                await storeEmbeddingInSupabase(artistId, embedding, description);
                console.log(`  ✅ Stored in Supabase`);

                processed++;

                // Rate limiting (every BATCH_SIZE artists)
                if ((i + 1) % BATCH_SIZE === 0 && i < artists.length - 1) {
                    console.log(`  ⏸️  Rate limit pause (${DELAY_MS}ms)...`);
                    await sleep(DELAY_MS);
                }

            } catch (err) {
                console.error(`  ❌ Error: ${err.message}`);
                errors++;
            }

            console.log();
        }

        // Summary
        console.log('='.repeat(70));
        console.log('Summary');
        console.log('='.repeat(70));
        console.log(`✅ Processed:  ${processed}`);
        console.log(`⏭️  Skipped:    ${skipped}`);
        console.log(`❌ Errors:     ${errors}`);
        console.log(`📊 Total:      ${artists.length}`);
        console.log('='.repeat(70));
        console.log();

        if (dryRun) {
            console.log('🏁 Dry run complete. Run without --dry-run to execute migration.');
        } else if (processed > 0) {
            console.log('🎉 Migration complete!');
            console.log();
            console.log('Next steps:');
            console.log('  1. Test vector search with text queries');
            console.log('  2. Verify embedding dimensions (should be 768)');
            console.log('  3. Test hybrid matching in the UI');
        }

        process.exit(errors > 0 ? 1 : 0);

    } catch (err) {
        console.error(`\n❌ Fatal error: ${err.message}`);
        console.error(err.stack);
        process.exit(1);
    }
}

main();
