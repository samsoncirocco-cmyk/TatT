-- Migration: Update portfolio_embeddings to 768 dimensions (Vertex AI text-embedding-005)
-- Migrates from image embeddings (1408-dim multimodal) to text embeddings (768-dim text-embedding-005)
-- Warning: This will drop existing data!

-- 1. Enable pgvector extension if not exists
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Drop existing table (backing up existing data is recommended)
DROP TABLE IF EXISTS portfolio_embeddings;

-- 3. Recreate table with 768 dimensions
CREATE TABLE portfolio_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id TEXT NOT NULL UNIQUE,
  embedding vector(768), -- Vertex AI text-embedding-005
  description TEXT NOT NULL, -- Source text used for embedding
  model_version TEXT DEFAULT 'text-embedding-005',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create index for cosine similarity
CREATE INDEX portfolio_embeddings_embedding_idx
ON portfolio_embeddings
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- 5. Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS update_portfolio_embeddings_updated_at ON portfolio_embeddings;

CREATE TRIGGER update_portfolio_embeddings_updated_at
BEFORE UPDATE ON portfolio_embeddings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 6. Create RPC function for similarity search
CREATE OR REPLACE FUNCTION match_portfolio_embeddings (
  query_embedding vector(768),
  match_count int DEFAULT 10
)
RETURNS TABLE (
  artist_id TEXT,
  similarity FLOAT,
  description TEXT,
  model_version TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    portfolio_embeddings.artist_id,
    1 - (portfolio_embeddings.embedding <=> query_embedding) AS similarity,
    portfolio_embeddings.description,
    portfolio_embeddings.model_version,
    portfolio_embeddings.created_at
  FROM portfolio_embeddings
  ORDER BY portfolio_embeddings.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 7. Verify setup
DO $$
BEGIN
  RAISE NOTICE 'Migration complete: portfolio_embeddings table ready for 768-dim text embeddings';
END;
$$;
