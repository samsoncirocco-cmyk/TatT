-- ============================================
-- Fix for portfolio_embeddings vector index
-- ============================================
-- Option 1: Use HNSW index (better for high dims)
-- Option 2: Reduce to 1024 dimensions
-- ============================================

-- Drop the problematic ivfflat index
DROP INDEX IF EXISTS idx_portfolio_embeddings_vector;

-- ============================================
-- OPTION 1: Use HNSW (Recommended)
-- ============================================
-- HNSW supports higher dimensions and is faster
-- Uncomment this if you want to keep 4096 dims:

CREATE INDEX IF NOT EXISTS idx_portfolio_embeddings_vector_hnsw
  ON portfolio_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ============================================
-- OPTION 2: Reduce to 1024 dimensions
-- ============================================
-- If HNSW doesn't work or you prefer smaller dims:
-- 1. First, update the column type:
-- ALTER TABLE portfolio_embeddings
--   ALTER COLUMN embedding TYPE vector(1024);
--
-- 2. Then create ivfflat index:
-- CREATE INDEX IF NOT EXISTS idx_portfolio_embeddings_vector
--   ON portfolio_embeddings
--   USING ivfflat (embedding vector_cosine_ops)
--   WITH (lists = 100);
--
-- 3. Update the match_artists function signature:
-- CREATE OR REPLACE FUNCTION match_artists(
--   query_embedding VECTOR(1024),  -- Changed from 4096
--   match_threshold FLOAT DEFAULT 0.5,
--   match_count INT DEFAULT 20
-- )
-- RETURNS TABLE (
--   artist_id UUID,
--   similarity FLOAT
-- )
-- LANGUAGE plpgsql
-- AS $$
-- BEGIN
--   RETURN QUERY
--   SELECT
--     portfolio_embeddings.artist_id,
--     1 - (portfolio_embeddings.embedding <=> query_embedding) AS similarity
--   FROM portfolio_embeddings
--   WHERE 1 - (portfolio_embeddings.embedding <=> query_embedding) > match_threshold
--   ORDER BY portfolio_embeddings.embedding <=> query_embedding
--   LIMIT match_count;
-- END;
-- $$;

-- ============================================
-- Verification
-- ============================================
-- Check that the new index exists
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'portfolio_embeddings';
