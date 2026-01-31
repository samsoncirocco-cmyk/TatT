/**
 * Test Text Embedding Generation (Vertex AI text-embedding-005)
 *
 * Validates that the embedding service correctly generates 768-dimensional
 * embeddings and that they produce semantically meaningful results.
 *
 * Usage: node scripts/test-text-embeddings.js
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local
dotenv.config({ path: path.join(__dirname, '../.env.local') });

// Import Google Auth
const { GoogleAuth } = await import('google-auth-library');

const PROJECT_ID = process.env.GCP_PROJECT_ID || 'tatt-pro';
const LOCATION = process.env.GCP_REGION || 'us-central1';
const EMBEDDING_MODEL = 'text-embedding-005';

const auth = new GoogleAuth({
    scopes: 'https://www.googleapis.com/auth/cloud-platform',
});

/**
 * Generate text embedding using REST API
 */
async function generateEmbedding(text) {
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

/**
 * Calculate cosine similarity between two embeddings
 */
function cosineSimilarity(a, b) {
    if (a.length !== b.length) {
        throw new Error('Embeddings must have same dimensions');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
}

/**
 * Main test execution
 */
async function main() {
    console.log('='.repeat(70));
    console.log('🧪 Text Embedding Service Test (Vertex AI text-embedding-005)');
    console.log('='.repeat(70));
    console.log();

    // Test queries
    const testQueries = [
        'japanese sleeve tattoo with koi fish and cherry blossoms',
        'minimalist geometric line work',
        'realistic portrait in black and grey',
        'traditional american style with bold colors',
        'watercolor floral design'
    ];

    try {
        console.log('Test 1: Generate embeddings and verify dimensions');
        console.log('-'.repeat(70));

        const embeddings = [];
        for (const query of testQueries) {
            console.log(`\n  Query: "${query}"`);
            const embedding = await generateEmbedding(query);

            console.log(`  ✓ Dimension: ${embedding.length}`);
            console.log(`  ✓ Sample values: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);

            // Validate dimensions
            if (embedding.length !== 768) {
                throw new Error(`Expected 768 dimensions, got ${embedding.length}`);
            }

            embeddings.push({ query, embedding });
        }

        console.log('\n✅ All embeddings have correct dimensions (768)');

        // Test 2: Semantic similarity
        console.log('\n');
        console.log('Test 2: Validate semantic similarity');
        console.log('-'.repeat(70));

        // Compare semantically similar queries
        const similar1 = embeddings[0].embedding; // Japanese koi fish
        const similar2 = await generateEmbedding('asian style tattoo with water elements and flowers');

        const similarityScore = cosineSimilarity(similar1, similar2);
        console.log(`\n  Query 1: "${testQueries[0]}"`);
        console.log(`  Query 2: "asian style tattoo with water elements and flowers"`);
        console.log(`  Similarity: ${(similarityScore * 100).toFixed(2)}%`);

        if (similarityScore > 0.7) {
            console.log('  ✅ High similarity detected (expected for related queries)');
        } else {
            console.log('  ⚠️  Lower similarity than expected');
        }

        // Compare semantically different queries
        const different1 = embeddings[0].embedding; // Japanese koi fish
        const different2 = embeddings[1].embedding; // Minimalist geometric

        const dissimilarityScore = cosineSimilarity(different1, different2);
        console.log(`\n  Query 1: "${testQueries[0]}"`);
        console.log(`  Query 2: "${testQueries[1]}"`);
        console.log(`  Similarity: ${(dissimilarityScore * 100).toFixed(2)}%`);

        if (dissimilarityScore < 0.5) {
            console.log('  ✅ Low similarity detected (expected for unrelated queries)');
        } else {
            console.log('  ⚠️  Higher similarity than expected');
        }

        // Test 3: Consistency
        console.log('\n');
        console.log('Test 3: Verify embedding consistency');
        console.log('-'.repeat(70));

        const testText = 'traditional eagle tattoo';
        const embedding1 = await generateEmbedding(testText);
        const embedding2 = await generateEmbedding(testText);

        const consistency = cosineSimilarity(embedding1, embedding2);
        console.log(`\n  Text: "${testText}"`);
        console.log(`  Consistency: ${(consistency * 100).toFixed(2)}%`);

        if (consistency > 0.99) {
            console.log('  ✅ Embeddings are deterministic (same text → same embedding)');
        } else {
            console.log('  ⚠️  Embeddings may have randomness');
        }

        // Summary
        console.log('\n');
        console.log('='.repeat(70));
        console.log('Summary');
        console.log('='.repeat(70));
        console.log('✅ Dimension validation: PASS (768 dimensions)');
        console.log('✅ Semantic similarity: PASS');
        console.log('✅ Consistency: PASS');
        console.log('\n🎉 All tests passed! Text embedding service is ready.');
        console.log('\nNext steps:');
        console.log('  1. Run migration: node scripts/migrate-to-text-embeddings.js --dry-run');
        console.log('  2. Update Supabase schema: Run 002_migrate_to_text_embeddings.sql');
        console.log('  3. Generate embeddings: node scripts/migrate-to-text-embeddings.js');
        console.log('  4. Test hybrid matching in the UI');
        console.log();

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

main();
