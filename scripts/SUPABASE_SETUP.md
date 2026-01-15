# Supabase Complete Schema Setup Guide

This guide walks you through setting up the complete Supabase database schema for TatTester.

## 📋 What Gets Created

### Tables
1. **`users`** - User profiles and authentication data
2. **`designs`** - Generated tattoo designs from The Forge
3. **`design_layers`** - Individual RGBA layer PNGs (subject, background, effect)
4. **`portfolio_embeddings`** - Vector embeddings for artist/portfolio matching

### Additional Components
- **Indexes** - Optimized for common queries and vector search
- **RLS Policies** - Row Level Security for data protection
- **Functions** - `match_artists()` for vector similarity search
- **Views** - `design_summary` for quick design overviews
- **Triggers** - Auto-update `updated_at` timestamps

## 🚀 Quick Start

### Step 1: Run the Schema Script

1. **Open Supabase SQL Editor**
   ```
   https://supabase.com/dashboard/project/yfcmysjmoehcyszvkxsr/editor
   ```

2. **Copy the Schema**
   ```bash
   # Open the file
   open scripts/supabase-complete-schema.sql

   # Or view in terminal
   cat scripts/supabase-complete-schema.sql
   ```

3. **Paste and Execute**
   - Copy ALL contents (Cmd+A, Cmd+C)
   - Paste into Supabase SQL Editor
   - Click "Run" (or press Cmd+Enter)
   - Wait for "Success" message

### Step 2: Verify Schema

Run the verification script to confirm everything was created correctly:

```bash
node scripts/verify-supabase-schema.js
```

Expected output:
```
✅ All checks passed! Schema is ready to use.

Tables: 4/4 ✅
Extensions: 1/1 ✅
Functions: 1/1 ✅
Views: 1/1 ✅
```

### Step 3: Populate Embeddings (Optional)

If you want to test artist matching, populate the embeddings:

```bash
node scripts/generate-portfolio-embeddings.js
```

## 📊 Schema Details

### Table: `users`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `email` | TEXT | User email (unique) |
| `full_name` | TEXT | Display name |
| `avatar_url` | TEXT | Profile picture URL |
| `preferences` | JSONB | User preferences |
| `created_at` | TIMESTAMPTZ | Account creation |
| `updated_at` | TIMESTAMPTZ | Last update |

**RLS**: Users can only view/edit their own profile.

### Table: `designs`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key to users |
| `prompt` | TEXT | Original user prompt |
| `enhanced_prompt` | TEXT | AI council enhanced prompt |
| `style` | TEXT | Tattoo style (e.g., "Japanese") |
| `body_part` | TEXT | Target body part (e.g., "forearm") |
| `subject` | TEXT | Main subject |
| `model` | TEXT | AI model used |
| `parameters` | JSONB | Generation parameters |
| `image_url` | TEXT | Generated image URL |
| `thumbnail_url` | TEXT | Thumbnail URL |
| `session_id` | TEXT | Design session ID |
| `version_number` | INTEGER | Version number |
| `branched_from` | JSONB | Branching info |
| `merged_from` | JSONB | Merge info |
| `is_favorite` | BOOLEAN | Favorite flag |
| `is_public` | BOOLEAN | Public visibility |
| `created_at` | TIMESTAMPTZ | Creation time |
| `updated_at` | TIMESTAMPTZ | Last update |

**RLS**: Users can view/edit their own designs; public designs visible to all.

### Table: `design_layers`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `design_id` | UUID | Foreign key to designs |
| `user_id` | UUID | Foreign key to users |
| `layer_name` | TEXT | Layer name |
| `layer_type` | TEXT | Type: subject/background/effect/custom |
| `layer_order` | INTEGER | Z-index (stacking order) |
| `image_url` | TEXT | Layer image URL |
| `blend_mode` | TEXT | Blend mode (normal/multiply/screen/etc) |
| `opacity` | REAL | Opacity (0.0 to 1.0) |
| `visible` | BOOLEAN | Visibility flag |
| `locked` | BOOLEAN | Lock flag |
| `transform` | JSONB | Transform data (position, rotation, scale) |
| `created_at` | TIMESTAMPTZ | Creation time |
| `updated_at` | TIMESTAMPTZ | Last update |

**RLS**: Users can only view/edit layers for their own designs.

### Table: `portfolio_embeddings`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `artist_id` | TEXT | Artist identifier |
| `artist_name` | TEXT | Artist display name |
| `portfolio_item_id` | TEXT | Portfolio item identifier |
| `image_url` | TEXT | Portfolio image URL |
| `style` | TEXT | Tattoo style |
| `tags` | TEXT[] | Style tags array |
| `description` | TEXT | Portfolio item description |
| `embedding` | vector(4096) | CLIP ViT-L/14@336px embedding |
| `metadata` | JSONB | Additional metadata |
| `created_at` | TIMESTAMPTZ | Creation time |
| `updated_at` | TIMESTAMPTZ | Last update |

**Unique Constraint**: `(artist_id, portfolio_item_id)`

**Indexes**:
- HNSW index on `embedding` for fast vector similarity search
- GIN index on `tags` for array queries
- B-tree indexes on `artist_id`, `style`

**RLS**: Authenticated users can read; service role can manage.

### Function: `match_artists()`

Vector similarity search for artist matching.

```sql
SELECT * FROM match_artists(
    query_embedding := '[...]'::vector(4096),
    match_threshold := 0.7,
    match_count := 10,
    filter_style := 'Japanese',
    filter_tags := ARRAY['blackwork', 'geometric']
);
```

**Parameters**:
- `query_embedding` - Vector(4096) from user's design
- `match_threshold` - Minimum similarity (0.0 to 1.0, default: 0.7)
- `match_count` - Max results (default: 10)
- `filter_style` - Optional style filter (default: NULL)
- `filter_tags` - Optional tag filters (default: NULL)

**Returns**:
- `artist_id`, `artist_name`, `portfolio_item_id`
- `image_url`, `style`, `tags`, `description`
- `similarity` - Cosine similarity score (0.0 to 1.0)
- `metadata` - Additional metadata JSONB

### View: `design_summary`

Quick overview of designs with layer counts and metadata.

```sql
SELECT * FROM design_summary
WHERE user_id = 'uuid-here'
ORDER BY created_at DESC;
```

**Columns**: All `designs` columns + `layer_count` + `layers` JSON array.

## 🔒 Security (RLS Policies)

### Users Table
- ✅ Users can view their own profile
- ✅ Users can update their own profile
- ✅ Users can insert their own profile

### Designs Table
- ✅ Users can view their own designs
- ✅ Users can view public designs
- ✅ Users can insert their own designs
- ✅ Users can update their own designs
- ✅ Users can delete their own designs

### Design Layers Table
- ✅ Users can view layers for their own designs
- ✅ Users can insert layers for their own designs
- ✅ Users can update layers for their own designs
- ✅ Users can delete layers for their own designs

### Portfolio Embeddings Table
- ✅ Authenticated users can view all embeddings
- ✅ Service role can manage embeddings (insert/update/delete)

## 🧪 Testing the Schema

### Test 1: Insert a Test User

```sql
INSERT INTO public.users (id, email, full_name)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'test@tattester.com',
    'Test User'
);
```

### Test 2: Insert a Test Design

```sql
INSERT INTO public.designs (user_id, prompt, style, body_part)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Japanese koi fish swimming upstream',
    'Japanese',
    'forearm'
);
```

### Test 3: Insert a Test Layer

```sql
INSERT INTO public.design_layers (design_id, user_id, layer_name, layer_type, image_url)
VALUES (
    (SELECT id FROM public.designs LIMIT 1),
    '00000000-0000-0000-0000-000000000001',
    'Koi Fish Subject',
    'subject',
    'https://example.com/koi.png'
);
```

### Test 4: Test Vector Search

```sql
-- Create a dummy embedding
SELECT * FROM match_artists(
    query_embedding := array_fill(0::real, ARRAY[4096])::vector(4096),
    match_threshold := 0.0,
    match_count := 5
);
```

## 🔧 Troubleshooting

### Error: "extension vector does not exist"

**Solution**: Enable the vector extension first:

```sql
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;
```

Then re-run the schema script.

### Error: "relation already exists"

**Solution**: The script is idempotent - you can safely re-run it. The `IF NOT EXISTS` clauses prevent errors.

### Error: "insufficient privilege"

**Solution**: Make sure you're using the service role key, not the anon key.

### Error: "index method hnsw does not exist"

**Solution**: Your Supabase instance may not support HNSW. Comment out that index and use IVFFlat instead:

```sql
-- Comment out HNSW:
-- CREATE INDEX ... USING hnsw ...

-- Use IVFFlat instead:
CREATE INDEX idx_portfolio_embeddings_vector_ivf
    ON public.portfolio_embeddings
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
```

### Error: RLS prevents data access

**Solution**:
1. Ensure you're authenticated with a valid user ID
2. For testing, temporarily disable RLS:
   ```sql
   ALTER TABLE public.designs DISABLE ROW LEVEL SECURITY;
   ```
3. Re-enable before production:
   ```sql
   ALTER TABLE public.designs ENABLE ROW LEVEL SECURITY;
   ```

## 📚 Next Steps

1. ✅ **Run schema**: Execute `supabase-complete-schema.sql`
2. ✅ **Verify setup**: Run `node scripts/verify-supabase-schema.js`
3. 🔄 **Populate embeddings**: Run `node scripts/generate-portfolio-embeddings.js`
4. 🧪 **Test matching**: Try artist matching in The Forge
5. 🚀 **Start building**: Create designs and test layer management

## 📖 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [HNSW Index Tuning](https://github.com/pgvector/pgvector#hnsw)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)

---

**Last Updated**: January 2026
**TatTester Phase**: MVP (Phase 1)
