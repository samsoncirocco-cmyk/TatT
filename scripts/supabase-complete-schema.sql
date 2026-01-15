-- ============================================
-- TatT Pro: Complete Supabase Schema
-- ============================================
-- Creates all necessary tables for TatT Pro:
-- 1. users - User profiles
-- 2. designs - Generated tattoo designs
-- 3. design_layers - RGBA layer PNGs from Vision API
-- 4. portfolio_embeddings - Vertex AI embeddings for artist matching
--
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/YOUR_PROJECT/editor
-- ============================================

-- ============================================
-- 1. Enable required extensions
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- 2. Create users table (if not exists)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. Create designs table
-- ============================================
CREATE TABLE IF NOT EXISTS designs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT,
  prompt TEXT NOT NULL,
  negative_prompt TEXT,
  style TEXT NOT NULL,
  body_part TEXT NOT NULL,
  image_url TEXT NOT NULL,
  model_used TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for designs
CREATE INDEX IF NOT EXISTS idx_designs_user_id ON designs(user_id);
CREATE INDEX IF NOT EXISTS idx_designs_style ON designs(style);
CREATE INDEX IF NOT EXISTS idx_designs_body_part ON designs(body_part);
CREATE INDEX IF NOT EXISTS idx_designs_created_at ON designs(created_at DESC);

-- ============================================
-- 4. Create design_layers table
-- ============================================
CREATE TABLE IF NOT EXISTS design_layers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  design_id UUID NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('subject', 'background', 'effect')),
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  transform JSONB NOT NULL DEFAULT '{
    "x": 0,
    "y": 0,
    "scaleX": 1,
    "scaleY": 1,
    "rotation": 0
  }',
  blend_mode TEXT DEFAULT 'normal' CHECK (blend_mode IN ('normal', 'multiply', 'screen', 'overlay')),
  visible BOOLEAN DEFAULT TRUE,
  z_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for design_layers
CREATE INDEX IF NOT EXISTS idx_design_layers_design_id ON design_layers(design_id);
CREATE INDEX IF NOT EXISTS idx_design_layers_z_index ON design_layers(design_id, z_index);
CREATE INDEX IF NOT EXISTS idx_design_layers_type ON design_layers(type);

-- ============================================
-- 5. Create portfolio_embeddings table
-- ============================================
CREATE TABLE IF NOT EXISTS portfolio_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artist_id UUID NOT NULL,
  embedding VECTOR(1408) NOT NULL,
  source_images TEXT[] NOT NULL,
  model_version TEXT DEFAULT 'vertex-multimodal-v1',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for portfolio_embeddings
CREATE INDEX IF NOT EXISTS idx_portfolio_embeddings_artist_id ON portfolio_embeddings(artist_id);

-- Create HNSW index for vector similarity search
-- HNSW supports higher dimensions (1408) better than IVFFlat (max 2000)
CREATE INDEX IF NOT EXISTS idx_portfolio_embeddings_vector
  ON portfolio_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Note: If HNSW fails, reduce dimensions to 1024 and use IVFFlat:
-- ALTER TABLE portfolio_embeddings ALTER COLUMN embedding TYPE vector(1024);
-- CREATE INDEX idx_portfolio_embeddings_vector USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================
-- 6. Create updated_at trigger function
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_designs_updated_at ON designs;
CREATE TRIGGER update_designs_updated_at
  BEFORE UPDATE ON designs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_design_layers_updated_at ON design_layers;
CREATE TRIGGER update_design_layers_updated_at
  BEFORE UPDATE ON design_layers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_portfolio_embeddings_updated_at ON portfolio_embeddings;
CREATE TRIGGER update_portfolio_embeddings_updated_at
  BEFORE UPDATE ON portfolio_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. Create vector search function
-- ============================================
CREATE OR REPLACE FUNCTION match_artists(
  query_embedding VECTOR(1408),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 20
)
RETURNS TABLE (
  artist_id UUID,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    portfolio_embeddings.artist_id,
    1 - (portfolio_embeddings.embedding <=> query_embedding) AS similarity
  FROM portfolio_embeddings
  WHERE 1 - (portfolio_embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY portfolio_embeddings.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================
-- 8. Enable Row Level Security (RLS)
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_layers ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_embeddings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 9. Create RLS Policies
-- ============================================

-- Users policies
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON users;
CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Designs policies
DROP POLICY IF EXISTS "Users can view their own designs" ON designs;
CREATE POLICY "Users can view their own designs"
  ON designs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own designs" ON designs;
CREATE POLICY "Users can create their own designs"
  ON designs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own designs" ON designs;
CREATE POLICY "Users can update their own designs"
  ON designs FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own designs" ON designs;
CREATE POLICY "Users can delete their own designs"
  ON designs FOR DELETE
  USING (auth.uid() = user_id);

-- Design layers policies
DROP POLICY IF EXISTS "Users can view their own design layers" ON design_layers;
CREATE POLICY "Users can view their own design layers"
  ON design_layers FOR SELECT
  USING (
    design_id IN (
      SELECT id FROM designs WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create layers for their own designs" ON design_layers;
CREATE POLICY "Users can create layers for their own designs"
  ON design_layers FOR INSERT
  WITH CHECK (
    design_id IN (
      SELECT id FROM designs WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their own design layers" ON design_layers;
CREATE POLICY "Users can update their own design layers"
  ON design_layers FOR UPDATE
  USING (
    design_id IN (
      SELECT id FROM designs WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete their own design layers" ON design_layers;
CREATE POLICY "Users can delete their own design layers"
  ON design_layers FOR DELETE
  USING (
    design_id IN (
      SELECT id FROM designs WHERE user_id = auth.uid()
    )
  );

-- Portfolio embeddings policies (public read, service role write)
DROP POLICY IF EXISTS "Anyone can view portfolio embeddings" ON portfolio_embeddings;
CREATE POLICY "Anyone can view portfolio embeddings"
  ON portfolio_embeddings FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Service role can manage embeddings" ON portfolio_embeddings;
CREATE POLICY "Service role can manage embeddings"
  ON portfolio_embeddings FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 10. Create helper views
-- ============================================

-- View: design_with_layers
DROP VIEW IF EXISTS design_with_layers;
CREATE VIEW design_with_layers AS
SELECT 
  d.id AS design_id,
  d.user_id,
  d.name AS design_name,
  d.style,
  d.body_part,
  d.image_url AS design_image_url,
  d.created_at AS design_created_at,
  json_agg(
    json_build_object(
      'id', dl.id,
      'name', dl.name,
      'type', dl.type,
      'image_url', dl.image_url,
      'thumbnail_url', dl.thumbnail_url,
      'transform', dl.transform,
      'blend_mode', dl.blend_mode,
      'visible', dl.visible,
      'z_index', dl.z_index
    ) ORDER BY dl.z_index
  ) FILTER (WHERE dl.id IS NOT NULL) AS layers
FROM designs d
LEFT JOIN design_layers dl ON d.id = dl.design_id
GROUP BY d.id;

-- ============================================
-- 11. Verification Queries
-- ============================================

-- Check that all tables exist
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) AS column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('users', 'designs', 'design_layers', 'portfolio_embeddings')
ORDER BY table_name;

-- Check that indexes exist
SELECT 
  indexname,
  tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('users', 'designs', 'design_layers', 'portfolio_embeddings')
ORDER BY tablename, indexname;

-- Check that RLS is enabled
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('users', 'designs', 'design_layers', 'portfolio_embeddings');

-- ============================================
-- Migration Complete!
-- ============================================
-- You now have:
-- ✅ users table
-- ✅ designs table
-- ✅ design_layers table (for RGBA layers)
-- ✅ portfolio_embeddings table (for vector search)
-- ✅ Vector search function: match_artists()
-- ✅ Row Level Security enabled
-- ✅ Indexes for performance
-- ✅ Helper views
--
-- Next steps:
-- 1. Start creating designs via your app
-- 2. Generate embeddings: node scripts/generate-embeddings.js
-- 3. Test vector search: SELECT * FROM match_artists('[...]'::vector(1408), 0.7, 10);
-- ============================================
