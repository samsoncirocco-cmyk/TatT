/**
 * Embedding Generation Service (Vertex AI)
 *
 * Generates semantic text embeddings using Google Vertex AI text-embedding-005.
 * These embeddings enable semantic search for artist matching beyond keyword lookup.
 */

import { GoogleAuth } from 'google-auth-library';

// Configuration
const PROJECT_ID = process.env.GCP_PROJECT_ID || 'tatt-pro';
const LOCATION = process.env.GCP_REGION || 'us-central1';
const EMBEDDING_MODEL = 'text-embedding-005'; // 768 dimensions
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// Initialize Google Auth
const auth = new GoogleAuth({
    scopes: 'https://www.googleapis.com/auth/cloud-platform',
});

/**
 * Generate text embedding for a query or document using REST API
 * @param text - Input text to embed
 * @returns 768-dimensional embedding vector
 */
export async function generateTextEmbedding(text: string): Promise<number[]> {
    if (!text || typeof text !== 'string') {
        throw new Error('Input text must be a non-empty string');
    }

    // Trim and validate input
    const trimmedText = text.trim();
    if (trimmedText.length === 0) {
        throw new Error('Input text cannot be empty');
    }

    // Vertex AI has a ~2000 token limit for text-embedding-005
    // Truncate if needed (roughly 4 chars per token)
    const maxChars = 8000;
    const processedText = trimmedText.length > maxChars
        ? trimmedText.substring(0, maxChars)
        : trimmedText;

    let lastError: Error | null = null;

    // Retry loop for transient errors
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
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
                            content: processedText,
                            task_type: 'RETRIEVAL_DOCUMENT', // For semantic search
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

            // Validate dimensions
            if (embedding.length !== 768) {
                throw new Error(`Expected 768 dimensions, got ${embedding.length}`);
            }

            // Log success (only in development)
            if (process.env.NODE_ENV === 'development') {
                console.log(`[EmbeddingService] Generated embedding for text: "${processedText.substring(0, 50)}..." (${embedding.length} dims)`);
            }

            return embedding;

        } catch (error) {
            lastError = error instanceof Error ? error : new Error('Unknown error');

            console.error(`[EmbeddingService] Attempt ${attempt}/${MAX_RETRIES} failed:`, lastError.message);

            // Don't retry on validation errors
            if (lastError.message.includes('must be a non-empty string') ||
                lastError.message.includes('cannot be empty')) {
                throw lastError;
            }

            // Wait before retrying (exponential backoff)
            if (attempt < MAX_RETRIES) {
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
            }
        }
    }

    // All retries failed
    throw new Error(`Failed to generate embedding after ${MAX_RETRIES} attempts: ${lastError?.message}`);
}

/**
 * Generate embeddings for multiple texts in batch
 * @param texts - Array of texts to embed
 * @returns Array of 768-dimensional embedding vectors
 */
export async function generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    if (!Array.isArray(texts) || texts.length === 0) {
        throw new Error('Input must be a non-empty array of texts');
    }

    // Process in parallel with concurrency limit to avoid rate limits
    const BATCH_SIZE = 5; // Adjust based on rate limits
    const results: number[][] = [];

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
        const batch = texts.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
            batch.map(text => generateTextEmbedding(text))
        );
        results.push(...batchResults);

        // Log progress for large batches
        if (texts.length > 10 && (i + BATCH_SIZE) % 20 === 0) {
            console.log(`[EmbeddingService] Processed ${Math.min(i + BATCH_SIZE, texts.length)}/${texts.length} embeddings`);
        }
    }

    return results;
}

/**
 * Generate query embedding (alias for generateTextEmbedding)
 * This matches the interface expected by hybridMatchService
 */
export async function generateQueryEmbedding(query: string): Promise<number[]> {
    return generateTextEmbedding(query);
}

/**
 * Calculate cosine similarity between two embeddings
 * Useful for testing and validation
 */
export function cosineSimilarity(a: number[], b: number[]): number {
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
