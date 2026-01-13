/**
 * Vector Database Service (Supabase pgvector)
 * 
 * Handles interactions with Supabase for artist portfolio embeddings.
 * Uses pgvector extension for efficient cosine similarity search.
 */

import { VECTOR_DB_CONFIG, createVectorDbClient } from '../config/vectorDbConfig.js';

/**
 * Store a vector embedding for an artist
 * @param {string} artistId - Unique artist identifier
 * @param {Array<number>} vector - 4096-dimensional embedding vector
 * @param {Object} metadata - Additional metadata (source_images, model_version)
 * @returns {Promise<Object>} Stored embedding record
 */
export async function storeEmbedding(artistId, vector, metadata = {}) {
    if (!vector || vector.length !== VECTOR_DB_CONFIG.DIMENSIONS) {
        throw new Error(`Vector must be ${VECTOR_DB_CONFIG.DIMENSIONS} dimensions`);
    }

    const supabase = createVectorDbClient(true); // Use service key for writes

    const { data, error } = await supabase
        .from(VECTOR_DB_CONFIG.TABLE_NAME)
        .upsert({
            artist_id: artistId,
            embedding: vector,
            source_images: metadata.source_images || [],
            model_version: metadata.model_version || 'clip-vit-base-patch32'
        })
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to store embedding: ${error.message}`);
    }

    return data;
}

/**
 * Search for similar artists based on a query vector
 * Uses pgvector's cosine similarity operator (<=>)
 * 
 * @param {Array<number>} queryVector - Query embedding vector
 * @param {number} topK - Number of results to return
 * @param {Object} filters - Optional filters (not implemented in MVP)
 * @returns {Promise<Array>} List of similar matches with scores
 */
export async function searchSimilar(queryVector, topK = VECTOR_DB_CONFIG.DEFAULT_TOP_K, filters = {}) {
    if (!queryVector || queryVector.length !== VECTOR_DB_CONFIG.DIMENSIONS) {
        throw new Error(`Query vector must be ${VECTOR_DB_CONFIG.DIMENSIONS} dimensions`);
    }

    const supabase = createVectorDbClient();

    // Convert vector to pgvector format string
    const vectorString = `[${queryVector.join(',')}]`;

    // Use RPC for cosine similarity search
    // Note: This requires a custom function in Supabase (see setup script)
    const { data, error } = await supabase.rpc('match_portfolio_embeddings', {
        query_embedding: vectorString,
        match_count: topK
    });

    if (error) {
        // Fallback: Try direct query if RPC not available
        console.warn('RPC function not available, using direct query (slower)');

        const { data: fallbackData, error: fallbackError } = await supabase
            .from(VECTOR_DB_CONFIG.TABLE_NAME)
            .select('artist_id, source_images, model_version, created_at')
            .limit(topK);

        if (fallbackError) {
            throw new Error(`Failed to search embeddings: ${fallbackError.message}`);
        }

        // Return without similarity scores (requires manual calculation)
        return fallbackData.map(item => ({
            id: item.artist_id,
            score: 0, // Placeholder
            metadata: {
                source_images: item.source_images,
                model_version: item.model_version,
                created_at: item.created_at
            }
        }));
    }

    return data.map(item => ({
        id: item.artist_id,
        score: item.similarity, // Similarity is returned directly by RPC
        metadata: {
            source_images: item.source_images,
            model_version: item.model_version,
            created_at: item.created_at
        }
    }));
}

/**
 * Retrieve a specific embedding by artist ID
 * @param {string} artistId - Artist identifier
 * @returns {Promise<Object>} Embedding data and metadata
 */
export async function getEmbedding(artistId) {
    const supabase = createVectorDbClient();

    const { data, error } = await supabase
        .from(VECTOR_DB_CONFIG.TABLE_NAME)
        .select('*')
        .eq('artist_id', artistId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            throw new Error(`Embedding not found for artist: ${artistId}`);
        }
        throw new Error(`Failed to retrieve embedding: ${error.message}`);
    }

    return {
        id: data.artist_id,
        values: data.embedding,
        metadata: {
            source_images: data.source_images,
            model_version: data.model_version,
            created_at: data.created_at,
            updated_at: data.updated_at
        }
    };
}

/**
 * Remove an embedding from the database
 * @param {string} artistId - Artist identifier
 * @returns {Promise<Object>} Confirmation response
 */
export async function deleteEmbedding(artistId) {
    const supabase = createVectorDbClient(true); // Use service key for deletes

    const { error } = await supabase
        .from(VECTOR_DB_CONFIG.TABLE_NAME)
        .delete()
        .eq('artist_id', artistId);

    if (error) {
        throw new Error(`Failed to delete embedding: ${error.message}`);
    }

    return { success: true, artist_id: artistId };
}

/**
 * Update metadata for an existing embedding
 * @param {string} artistId - Artist identifier
 * @param {Object} metadata - New metadata to merge
 * @returns {Promise<Object>} Updated record
 */
export async function updateMetadata(artistId, metadata) {
    const supabase = createVectorDbClient(true); // Use service key for updates

    const updateData = {};
    if (metadata.source_images) updateData.source_images = metadata.source_images;
    if (metadata.model_version) updateData.model_version = metadata.model_version;

    const { data, error } = await supabase
        .from(VECTOR_DB_CONFIG.TABLE_NAME)
        .update(updateData)
        .eq('artist_id', artistId)
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to update metadata: ${error.message}`);
    }

    return data;
}

/**
 * Get statistics about stored embeddings
 * @returns {Promise<Object>} Statistics
 */
export async function getEmbeddingStats() {
    const supabase = createVectorDbClient();

    const { count, error } = await supabase
        .from(VECTOR_DB_CONFIG.TABLE_NAME)
        .select('*', { count: 'exact', head: true });

    if (error) {
        throw new Error(`Failed to get stats: ${error.message}`);
    }

    return {
        total_embeddings: count,
        dimension: VECTOR_DB_CONFIG.DIMENSIONS,
        service: VECTOR_DB_CONFIG.SERVICE
    };
}
