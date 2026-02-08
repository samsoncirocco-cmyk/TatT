# Database and Infrastructure Setup

> Directive for provisioning Neo4j, Supabase, and GCP APIs required by TatTester

## Goal

Create and verify the Supabase database schema (tables, RLS, vector search), configure Neo4j for graph queries, and enable the required GCP APIs (Vertex AI, Gemini) so the application can generate designs, store layers, and match artists.

## When to Use

- First-time project setup (before `setup-local-dev.md`)
- After Supabase project reset or migration
- When adding a new environment (staging, production)
- After running `scripts/setup-and-migrate.sh` for text embeddings migration

## Prerequisites

- **Supabase account** with project `yfcmysjmoehcyszvkxsr` (or a new project)
- **Neo4j** instance running (local via Docker or AuraDB cloud)
- **Google Cloud SDK** (`gcloud`) installed and authenticated
- **GCP project** `tatt-pro` with billing enabled
- **Node.js 20+** for running verification scripts

## Steps

### Part A: Supabase Schema

1. **Open the Supabase SQL Editor**

   ```
   https://supabase.com/dashboard/project/yfcmysjmoehcyszvkxsr/sql/new
   ```

2. **Run the complete schema script**

   Copy the entire contents of `scripts/supabase-complete-schema.sql` and execute it in the SQL Editor. This creates:

   | Resource | Details |
   |----------|---------|
   | `users` table | Profiles and auth data |
   | `designs` table | Generated tattoo designs |
   | `design_layers` table | Individual RGBA layer PNGs |
   | `portfolio_embeddings` table | 768-dim text embeddings for artist matching (Vertex AI `text-embedding-005`) |
   | `vector` extension | pgvector for similarity search |
   | `match_artists()` function | Cosine similarity search with style/tag filters |
   | `design_summary` view | Designs with layer counts |
   | RLS policies | Row-level security on all tables |
   | HNSW index | Fast approximate nearest-neighbor on embeddings |

3. **Verify the schema**

   ```bash
   npm run supabase:verify
   ```

   Expected output:
   ```
   Tables: 4/4
   Extensions: 1/1
   Functions: 1/1
   Views: 1/1
   ```

4. **Populate test embeddings (optional)**

   ```bash
   node scripts/generate-portfolio-embeddings.js
   ```

### Part B: Text Embeddings Migration (if upgrading)

1. **Run the interactive migration script**

   ```bash
   bash scripts/setup-and-migrate.sh
   ```

   This script will:
   - Prompt you to run `src/db/migrations/002_migrate_to_text_embeddings.sql` in the Supabase SQL Editor
   - Test with 5 artists first
   - Ask for confirmation before full migration
   - Run `node scripts/migrate-to-text-embeddings.js` for all artists

### Part C: Neo4j

1. **Start Neo4j locally (Docker)**

   ```bash
   docker run -d \
     --name neo4j \
     -p 7474:7474 -p 7687:7687 \
     -e NEO4J_AUTH=neo4j/your_password_here \
     neo4j:5
   ```

2. **Set connection variables in `.env.local`**

   ```
   NEO4J_URI=bolt://localhost:7687
   NEO4J_USER=neo4j
   NEO4J_PASSWORD=your_password_here
   ```

3. **Verify connectivity** by starting the backend (`npm run server`) -- it logs Neo4j connection status on startup.

### Part D: Enable GCP APIs

1. **Run the API enablement script**

   ```bash
   bash scripts/enable-gcp-apis.sh
   ```

   This sets the project to `tatt-pro` and enables:
   - `aiplatform.googleapis.com` -- Vertex AI Platform (Imagen 3, Gemini, Vision, Embeddings)
   - `generativelanguage.googleapis.com` -- Generative Language API (Gemini 2.0)

2. **Verify APIs are enabled**

   ```bash
   gcloud services list --enabled | grep -E "aiplatform|generativelanguage"
   ```

   Expected:
   ```
   aiplatform.googleapis.com
   generativelanguage.googleapis.com
   ```

3. **Place the service account key**

   Download your GCP service account key JSON and save it as `gcp-service-account-key.json` in the project root. This file is gitignored.

## Expected Output

- Supabase: 4 tables, pgvector extension, `match_artists()` function, RLS policies all created
- Neo4j: Bolt connection on port 7687, web UI on port 7474
- GCP: Both Vertex AI and Generative Language APIs enabled in project `tatt-pro`
- `QUICKSTART.sh` passes all verification checks

## Edge Cases

- **"extension vector does not exist"**: Run `CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;` before the schema script
- **"index method hnsw does not exist"**: Use IVFFlat instead -- see troubleshooting in `scripts/SUPABASE_SETUP.md`
- **Neo4j auth failure**: Default password must be changed on first login via `http://localhost:7474`
- **GCP API enablement fails**: Ensure billing is enabled on the `tatt-pro` project
- **"insufficient privilege" in Supabase**: Use the service role key, not the anon key
- **RLS blocks test queries**: Temporarily disable RLS for testing, re-enable before production

## Cost

- **Supabase**: Free tier covers development (500MB database, 1GB storage)
- **Neo4j**: Free for local Docker; AuraDB free tier available for cloud
- **GCP APIs**: No cost to enable; usage charges apply per Vertex AI / Imagen call
- **Vertex AI Imagen 3**: ~$0.02-0.04 per image generation
- **Gemini API**: ~$0.001-0.01 per request depending on model

## Related Directives

- [setup-local-dev.md](./setup-local-dev.md) -- Run after database setup to start the app
- [deploy.md](./deploy.md) -- Production database credentials go in Vercel/Railway env vars
