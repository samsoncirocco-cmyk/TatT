-- Migration M001: Extend tattoo_artists with embedding vector, geo fields, and tier
-- Source: docs/architecture/next-gen-ux.md §5
-- Run against: Supabase PostgreSQL (ensure pgvector extension is enabled)

-- Enable pgvector if not already
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS earthdistance CASCADE;

ALTER TABLE tattoo_artists
  ADD COLUMN IF NOT EXISTS embedding          VECTOR(1408),      -- Vertex multimodalembedding@001
  ADD COLUMN IF NOT EXISTS lat               FLOAT,
  ADD COLUMN IF NOT EXISTS lng               FLOAT,
  ADD COLUMN IF NOT EXISTS booking_url       TEXT,
  ADD COLUMN IF NOT EXISTS deposit_amount    INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS availability_slots INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS verified          BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS profile_score     FLOAT DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS last_seen_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tier              TEXT DEFAULT 'free'  -- free | featured | studio
;

-- Geo index for proximity matching (earthdistance-based)
CREATE INDEX IF NOT EXISTS idx_artists_location
  ON tattoo_artists USING gist (ll_to_earth(lat, lng));

-- Partial IVFFlat index on verified artists only (faster cosine similarity queries)
-- lists = sqrt(expected row count); start at 10 for < 100 artists, increase as corpus grows
CREATE INDEX IF NOT EXISTS idx_artists_embedding_verified
  ON tattoo_artists USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 10)
  WHERE verified = true;

-- Helper function for match_artists RPC (called from councilMatchmaker.ts)
CREATE OR REPLACE FUNCTION match_artists(
  query_embedding    VECTOR(1408),
  match_threshold    FLOAT DEFAULT 0.7,
  match_count        INT   DEFAULT 20,
  filter_verified    BOOLEAN DEFAULT true
)
RETURNS TABLE (
  id                UUID,
  name              TEXT,
  styles            TEXT[],
  lat               FLOAT,
  lng               FLOAT,
  booking_url       TEXT,
  availability_slots INTEGER,
  similarity        FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.name,
    a.styles,
    a.lat,
    a.lng,
    a.booking_url,
    a.availability_slots,
    1 - (a.embedding <=> query_embedding) AS similarity
  FROM tattoo_artists a
  WHERE
    (NOT filter_verified OR a.verified = true)
    AND a.embedding IS NOT NULL
    AND 1 - (a.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
