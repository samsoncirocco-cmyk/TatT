/**
 * Vector Database Configuration (Supabase pgvector)
 * 
 * Settings for Supabase vector database integration using pgvector extension.
 */

import { createClient } from '@supabase/supabase-js';

// Supabase configuration (reuses existing credentials)
const SUPABASE_URL = typeof import.meta.env !== 'undefined'
    ? import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL
    : process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://yfcmysjmoehcyszvkxsr.supabase.co';

const SUPABASE_ANON_KEY = typeof import.meta.env !== 'undefined'
    ? import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY
    : process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const SUPABASE_SERVICE_KEY = typeof import.meta.env !== 'undefined'
    ? import.meta.env.SUPABASE_SERVICE_KEY
    : process.env.SUPABASE_SERVICE_KEY;

export const VECTOR_DB_CONFIG = {
    // Dimension of CLIP model embeddings
    DIMENSIONS: 4096,

    // Similarity metric
    METRIC: 'cosine',

    // Service type
    SERVICE: 'supabase-pgvector',

    // Table name
    TABLE_NAME: 'portfolio_embeddings',

    // Default search parameters
    DEFAULT_TOP_K: 10,

    // Index configuration
    INDEX_LISTS: 100, // For IVFFlat index
};

export const CLIP_MODEL_CONFIG = {
    // Replicate model for CLIP embeddings
    MODEL: 'openai/clip-vit-base-patch32',
    VERSION: '0e36398b76c8cb81a67dd463ae37d97d02dd67d9d0dec8411d73a62ae5e1ec4b'
};

/**
 * Create Supabase client for vector operations
 * Uses service key for server-side operations, anon key for client-side
 */
export function createVectorDbClient(useServiceKey = false) {
    const key = useServiceKey ? SUPABASE_SERVICE_KEY : SUPABASE_ANON_KEY;

    if (!key) {
        throw new Error(`Supabase ${useServiceKey ? 'service' : 'anon'} key not configured`);
    }

    return createClient(SUPABASE_URL, key);
}
