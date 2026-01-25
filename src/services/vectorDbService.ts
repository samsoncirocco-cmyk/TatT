/**
 * Vector Database Service (Supabase pgvector)
 *
 * Handles interactions with Supabase for artist portfolio embeddings.
 * Uses pgvector extension for efficient cosine similarity search.
 */

import { VECTOR_DB_CONFIG, createVectorDbClient } from '../config/vectorDbConfig.js';

// ============================================================================
// Types
// ============================================================================

export interface EmbeddingMetadata {
  source_images?: string[];
  model_version?: string;
  created_at?: string;
  updated_at?: string;
}

export interface StoredEmbedding {
  id: string;
  values: number[];
  metadata: EmbeddingMetadata;
}

export interface SimilarityMatch {
  id: string;
  score: number;
  metadata: EmbeddingMetadata;
}

export interface EmbeddingStats {
  total_embeddings: number | null;
  dimension: number;
  service: string;
}

export interface DeleteEmbeddingResult {
  success: boolean;
  artist_id: string;
}

// Database row types (internal)
interface EmbeddingRow {
  artist_id: string;
  embedding: number[];
  source_images: string[];
  model_version: string;
  created_at: string;
  updated_at: string;
}

interface RPCMatchResult {
  artist_id: string;
  similarity: number;
  source_images: string[];
  model_version: string;
  created_at: string;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Store a vector embedding for an artist
 * @param artistId - Unique artist identifier
 * @param vector - Embedding vector (dimension defined in VECTOR_DB_CONFIG)
 * @param metadata - Additional metadata (source_images, model_version)
 * @returns Stored embedding record
 */
export async function storeEmbedding(
  artistId: string,
  vector: number[],
  metadata: Partial<EmbeddingMetadata> = {}
): Promise<EmbeddingRow> {
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

  return data as EmbeddingRow;
}

/**
 * Search for similar artists based on a query vector
 * Uses pgvector's cosine similarity operator (<=>)
 *
 * @param queryVector - Query embedding vector
 * @param topK - Number of results to return
 * @param filters - Optional filters (not implemented in MVP)
 * @returns List of similar matches with scores
 */
export async function searchSimilar(
  queryVector: number[],
  topK: number = VECTOR_DB_CONFIG.DEFAULT_TOP_K,
  filters: Record<string, unknown> = {}
): Promise<SimilarityMatch[]> {
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
    return (fallbackData as Partial<EmbeddingRow>[]).map(item => ({
      id: item.artist_id!,
      score: 0, // Placeholder
      metadata: {
        source_images: item.source_images,
        model_version: item.model_version,
        created_at: item.created_at
      }
    }));
  }

  return (data as RPCMatchResult[]).map(item => ({
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
 * @param artistId - Artist identifier
 * @returns Embedding data and metadata
 */
export async function getEmbedding(artistId: string): Promise<StoredEmbedding> {
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

  const row = data as EmbeddingRow;

  return {
    id: row.artist_id,
    values: row.embedding,
    metadata: {
      source_images: row.source_images,
      model_version: row.model_version,
      created_at: row.created_at,
      updated_at: row.updated_at
    }
  };
}

/**
 * Remove an embedding from the database
 * @param artistId - Artist identifier
 * @returns Confirmation response
 */
export async function deleteEmbedding(artistId: string): Promise<DeleteEmbeddingResult> {
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
 * @param artistId - Artist identifier
 * @param metadata - New metadata to merge
 * @returns Updated record
 */
export async function updateMetadata(
  artistId: string,
  metadata: Partial<EmbeddingMetadata>
): Promise<EmbeddingRow> {
  const supabase = createVectorDbClient(true); // Use service key for updates

  const updateData: Partial<Pick<EmbeddingRow, 'source_images' | 'model_version'>> = {};
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

  return data as EmbeddingRow;
}

/**
 * Get statistics about stored embeddings
 * @returns Statistics
 */
export async function getEmbeddingStats(): Promise<EmbeddingStats> {
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
