# Generate Embeddings

> Directive for generating vector embeddings for artist portfolios and storing them in Supabase pgvector

## Goal

Generate text-based embeddings (768-dim, Vertex AI `text-embedding-005`) for each artist in `src/data/artists.json` and store them in the Supabase `portfolio_embeddings` table, enabling semantic search and artist-to-query matching.

## When to Use

- After running **import-artists.md** for the first time
- After updating artist data (new bios, styles, tags)
- When migrating from the older CLIP image embeddings (1408-dim) to text embeddings (768-dim)
- When the embedding model changes and embeddings need regeneration

## Prerequisites

- **Supabase** project with `portfolio_embeddings` table (must support 768-dim `vector` column)
- **Google Cloud** credentials configured for Vertex AI access
- `src/data/artists.json` populated with artist records
- Environment variables in `.env.local`:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY` (required)
  - `GCP_PROJECT_ID` (default: `tatt-pro`)
  - `GCP_REGION` (default: `us-central1`)
  - `GOOGLE_APPLICATION_CREDENTIALS` or `GCP_PROJECT_ID` for authentication
- Node.js dependencies installed (`npm install`)

## Steps

### Option A: Text Embeddings (Recommended)

Uses Vertex AI `text-embedding-005` to embed artist descriptions (name, styles, tags, bio, location).

1. Run the migration script:

   ```bash
   node scripts/migrate-to-text-embeddings.js
   ```

2. Optional flags:
   - `--limit=N` — process only the first N artists
   - `--force` — re-generate embeddings even if artist already has a `text-embedding-005` entry
   - `--dry-run` — print what would happen without writing to Supabase

3. The script will:
   - Build a descriptive text string per artist from name, city, state, styles, tags, bio, experience, and shop name
   - Call Vertex AI `text-embedding-005` with `task_type: RETRIEVAL_DOCUMENT`
   - Validate output is exactly 768 dimensions
   - Delete any existing embedding for the artist, then insert the new one with `model_version: 'text-embedding-005'`
   - Rate-limit: pauses 1 second every 5 artists

### Option B: Image Embeddings (Legacy)

Uses Replicate CLIP model to embed portfolio images. Only use if image-based matching is specifically needed.

1. Ensure the Express proxy is running on port 3001:

   ```bash
   npm run proxy
   ```

2. Set additional env vars:
   - `REPLICATE_API_TOKEN` (required)
   - `SUPABASE_SERVICE_KEY` (required, note: different var name than Option A)

3. Run:

   ```bash
   node scripts/generate-portfolio-embeddings.js
   ```

4. This script:
   - Processes 1 portfolio image per artist (configurable via `MAX_IMAGES_PER_ARTIST`)
   - Calls Replicate CLIP model (`75b337625c...`), polls for completion every 3 seconds
   - Pads/truncates vectors to 1408 dimensions
   - Stores in `portfolio_embeddings` with `model_version: 'clip-vit-base-patch32'`
   - Also syncs `embedding_id` back to Neo4j via the proxy
   - Saves progress to `artists.json` every 5 artists
   - Delays: 1.5s between images, 2.5s between artists

## Expected Output

**Text embeddings (Option A):**
```
======================================================================
Migrate to Text-Based Embeddings (Vertex AI text-embedding-005)
======================================================================
Total artists:     100
Processing:        100
Mode:              NORMAL
Embedding model:   text-embedding-005 (768 dimensions)

[1/100] Processing Artist Name (ID: 1)...
  Description: "Artist Name, tattoo artist in Phoenix, AZ. Specializes in..."
  Generating embedding...
  Generated 768-dim embedding
  Stored in Supabase
...
======================================================================
Summary
======================================================================
Processed:  100
Skipped:    0
Errors:     0
Total:      100
======================================================================
```

**Image embeddings (Option B):**
```
Starting embedding generation for 100 artists...
[1/100] Processing Artist Name...
  - Generating embedding for: https://...
  Stored embedding in Supabase
  Synced to Neo4j
...
Embedding Generation Complete!
  Processed: 100
```

## Edge Cases

- **Google Cloud auth failure**: Ensure `GOOGLE_APPLICATION_CREDENTIALS` points to a valid service account JSON, or that Application Default Credentials are configured (`gcloud auth application-default login`).
- **Vertex AI API error 403**: The service account needs the `aiplatform.endpoints.predict` permission. Grant the `Vertex AI User` role.
- **Dimension mismatch**: Text embeddings must be exactly 768-dim. If the `portfolio_embeddings` table column was created for 1408-dim (CLIP), you need to alter it or create a new column. The migration script validates dimensions before storing.
- **Replicate rate limiting (Option B)**: The script retries up to 4 times with exponential backoff (1.5s base). If still failing, increase `RETRY_BASE_MS` or `IMAGE_DELAY_MS`.
- **Proxy not running (Option B)**: The CLIP script requires the Express proxy at `localhost:3001`. Start with `npm run proxy`.
- **Partial failure**: Both scripts are resumable. Text embedding script skips artists that already have `text-embedding-005` entries (unless `--force`). CLIP script skips artists with existing `embedding_id`.

## Cost

- **Vertex AI text-embedding-005**: Approximately $0.00002 per 1,000 characters. For 100 artists with ~200 chars each, total cost is under $0.01.
- **Replicate CLIP (Option B)**: Approximately $0.002 per prediction. For 100 artists at 1 image each, total cost is ~$0.20.
- **Supabase**: Free tier covers pgvector storage at this scale.

## Related Directives

- Run **import-artists.md** first to ensure `artists.json` and databases are populated
- After embeddings are generated, the semantic match endpoint (`/api/v1/match/semantic`) becomes functional
