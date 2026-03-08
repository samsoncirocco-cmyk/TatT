-- Migration M002: New designs table — stores generated design metadata + embeddings
-- Source: docs/architecture/next-gen-ux.md §5
-- Run after M001 (requires pgvector extension already enabled)

CREATE TABLE IF NOT EXISTS designs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  firestore_doc_id  TEXT,                          -- /users/{uid}/designs/{designId}
  thumbnail_url     TEXT,
  full_image_url    TEXT,
  prompt_raw        TEXT,
  prompt_enriched   TEXT,                          -- from Style Council (claude-3.5-sonnet)
  style_tags        TEXT[]  DEFAULT '{}',
  body_region       TEXT,
  stencil_params    JSONB,                         -- pre-computed by Placement Specialist
  embedding         VECTOR(1408),                  -- Vertex multimodalembedding@001
  model_used        TEXT,                          -- 'imagen-3' | 'replicate'
  council_ms        INTEGER DEFAULT 0,             -- 0 if bypassed
  council_bypassed  BOOLEAN DEFAULT false,
  bypass_reason     TEXT,                          -- 'COUNCIL_TIMEOUT' | null
  generation_ms     INTEGER,
  is_public         BOOLEAN DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- User's design library (most recent first)
CREATE INDEX IF NOT EXISTS idx_designs_user
  ON designs (user_id, created_at DESC);

-- Vector similarity index for "find designs like this one" queries
CREATE INDEX IF NOT EXISTS idx_designs_embedding
  ON designs USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 10);

-- Public gallery index (Phase 3)
CREATE INDEX IF NOT EXISTS idx_designs_public
  ON designs (style_tags, created_at DESC)
  WHERE is_public = true;

-- Supabase RLS: users can only read/write their own designs; public designs readable by all
ALTER TABLE designs ENABLE ROW LEVEL SECURITY;

CREATE POLICY designs_owner_all ON designs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY designs_public_read ON designs
  FOR SELECT
  USING (is_public = true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER designs_updated_at
  BEFORE UPDATE ON designs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
