# Embedding Migration Deployment Plan

**Migration**: Image embeddings (1408-dim multimodal) -> Text embeddings (768-dim text-embedding-005)
**Date prepared**: 2026-02-12
**Status**: Ready for execution

---

## Overview

This migration replaces the old Replicate CLIP / Vertex AI multimodal image embeddings (1408 dimensions) with Vertex AI `text-embedding-005` text embeddings (768 dimensions). The new approach embeds rich text descriptions of each artist (name, location, styles, tags, bio, experience, shop) rather than portfolio images, enabling semantic matching between natural-language user queries and artist profiles.

**What changes**:
- `portfolio_embeddings` table is dropped and recreated with `vector(768)` column
- New `description` TEXT column stores the source text for each embedding
- `match_portfolio_embeddings` RPC function updated for 768-dim queries
- `source_images` JSONB column removed (no longer image-based)
- IVFFlat index recreated for 768-dim cosine similarity

**What stays the same**:
- `vectorDbService.js` calls `match_portfolio_embeddings` RPC -- no code change needed
- `hybridMatchService.ts` calls `generateQueryEmbedding` which already uses `text-embedding-005`
- `VECTOR_DB_CONFIG.DIMENSIONS` is already set to `768`

---

## Pre-flight Checklist

### Environment Variables Required

Verify these are set in `.env.local`:

| Variable | Used By | How to Get |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | migrate script, connection test | Supabase Dashboard > Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | migrate script, connection test | Supabase Dashboard > Settings > API (service_role, NOT anon) |
| `GCP_PROJECT_ID` | migrate script (defaults to `tatt-pro`) | GCP Console |
| `GCP_REGION` | migrate script (defaults to `us-central1`) | GCP Console |
| `GOOGLE_APPLICATION_CREDENTIALS` | Vertex AI auth | Path to `gcp-service-account-key.json` |

**Verification command** (do NOT run migration scripts, only check env):
```bash
# Check env vars are set (prints Set/Missing, not values)
node -e "
  require('dotenv').config({ path: '.env.local' });
  const vars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'GCP_PROJECT_ID',
    'GOOGLE_APPLICATION_CREDENTIALS'
  ];
  vars.forEach(v => console.log(v + ':', process.env[v] ? 'Set' : 'MISSING'));
"
```

### Connectivity Tests

Run these BEFORE any migration steps:

```bash
# 1. Test Supabase network connectivity
curl -s -o /dev/null -w "%{http_code}" https://yfcmysjmoehcyszvkxsr.supabase.co
# Expected: 200 (or 3xx redirect)

# 2. Test GCP credentials
gcloud auth application-default print-access-token 2>/dev/null | head -c 20 && echo "...OK"
# Expected: truncated token ending with "...OK"

# 3. Test Supabase connection via script
node scripts/test-supabase-connection.js
# Expected:
#   Configuration:
#     URL: https://yfcmysjmoehcyszvkxsr.supabase.co
#     Anon Key: Set
#     Service Key: Set
#   Connected successfully to Supabase
#   Table "portfolio_embeddings" exists   <-- may show "does not exist" before schema migration
```

### Pre-migration Data Backup

Before running the SQL migration (which DROPs the existing table):

```sql
-- Run in Supabase SQL Editor to check current state
SELECT COUNT(*) as total_rows,
       MIN(created_at) as oldest,
       MAX(created_at) as newest
FROM portfolio_embeddings;
```

If there are existing embeddings you want to preserve:
```sql
-- Create backup table
CREATE TABLE portfolio_embeddings_backup AS
SELECT * FROM portfolio_embeddings;
```

---

## Step-by-Step Execution

### Step 1: Run Schema Migration SQL (Supabase Dashboard)

**Location**: https://supabase.com/dashboard/project/yfcmysjmoehcyszvkxsr/sql/new

**File**: `src/db/migrations/002_migrate_to_text_embeddings.sql`

Copy the full contents of that file and paste into the SQL Editor. Click "Run".

**What this does**:
1. Enables `pgvector` extension (idempotent)
2. DROPS existing `portfolio_embeddings` table (destructive)
3. Creates new table with `vector(768)`, `description TEXT`, `artist_id TEXT UNIQUE`
4. Creates IVFFlat index for cosine similarity
5. Creates `update_updated_at_column()` trigger
6. Creates/replaces `match_portfolio_embeddings(vector(768), int)` RPC function

**Expected output**: "Success. No rows returned" followed by NOTICE: "Migration complete: portfolio_embeddings table ready for 768-dim text embeddings"

**Verification query** (run immediately after):
```sql
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'portfolio_embeddings'
ORDER BY ordinal_position;
```

**Expected**:
| column_name | data_type | udt_name |
|---|---|---|
| id | uuid | uuid |
| artist_id | text | text |
| embedding | USER-DEFINED | vector |
| description | text | text |
| model_version | text | text |
| created_at | timestamp with time zone | timestamptz |
| updated_at | timestamp with time zone | timestamptz |

### Step 2: Verify Schema via Script

```bash
node scripts/test-supabase-connection.js
```

**Expected**:
```
Connected successfully to Supabase
Table "portfolio_embeddings" exists
```

### Step 3: Dry Run (No Database Changes)

```bash
node scripts/migrate-to-text-embeddings.js --dry-run
```

**Expected**: Processes all 100 artists, prints descriptions, but writes nothing. Confirms the script can read `artists.json` and generate descriptions. No Vertex AI calls, no Supabase writes.

### Step 4: Test with 5 Artists

```bash
node scripts/migrate-to-text-embeddings.js --limit=5
```

**Expected output**:
```
[1/5] Processing <ArtistName> (ID: 1)...
  Description: "<ArtistName>, tattoo artist in <City>, <State>..."
  Generating embedding...
  Generated 768-dim embedding
  Stored in Supabase
...
Summary
Processed:  5
Skipped:    0
Errors:     0
```

**Verification** (Supabase SQL Editor):
```sql
SELECT
  artist_id,
  model_version,
  length(description) as desc_length,
  substring(description, 1, 80) as preview
FROM portfolio_embeddings
ORDER BY created_at;
```

Confirm 5 rows, all with `model_version = 'text-embedding-005'`.

### Step 5: Full Migration (All 100 Artists)

```bash
node scripts/migrate-to-text-embeddings.js
```

**Timing estimate**: ~100 artists at 5 per batch with 1-second delays = ~25 seconds of delay + API time. Expect 1-3 minutes total.

**Expected final output**:
```
Summary
Processed:  100
Skipped:    0
Errors:     0
Total:      100

Migration complete!
```

### Step 6: Post-Migration Verification

**A. Row count and dimensions**:
```sql
SELECT COUNT(*) as total FROM portfolio_embeddings;
-- Expected: 100

SELECT
  model_version,
  COUNT(*) as count
FROM portfolio_embeddings
GROUP BY model_version;
-- Expected: text-embedding-005 | 100
```

**B. Similarity search test** (confirms IVFFlat index + RPC work):
```sql
-- Find artists similar to artist_id '1'
SELECT
  artist_id,
  substring(description, 1, 60) as preview,
  1 - (embedding <=> (SELECT embedding FROM portfolio_embeddings WHERE artist_id = '1')) as similarity
FROM portfolio_embeddings
WHERE artist_id != '1'
ORDER BY embedding <=> (SELECT embedding FROM portfolio_embeddings WHERE artist_id = '1')
LIMIT 5;
```

Expected: 5 rows returned with similarity scores between 0 and 1, semantically related artists scoring higher.

**C. RPC function test**:
```sql
-- Test the match_portfolio_embeddings RPC with a real embedding
SELECT artist_id, similarity, substring(description, 1, 60) as preview
FROM match_portfolio_embeddings(
  (SELECT embedding FROM portfolio_embeddings WHERE artist_id = '1'),
  5
);
```

Expected: 5 rows with similarity descending.

### Step 7: UI Validation

```bash
npm run dev
```

Open http://localhost:3000/match and test these queries:
- "japanese koi sleeve with cherry blossoms"
- "minimalist geometric line work"
- "realistic portrait in black and grey"
- "traditional american eagle"
- "watercolor floral design"

**Verify**:
- Results return in < 500ms
- Match scores are in 0-100 range
- Results are semantically relevant (not random)
- No console errors related to embeddings or vector search

---

## Cost Estimate

### One-time Migration Cost

| Item | Quantity | Unit Cost | Total |
|---|---|---|---|
| Vertex AI text-embedding-005 calls | 100 artists | Free (under 1,000/month free tier) | $0.00 |
| Supabase storage (100 rows x 768 floats) | ~300 KB | Included in free tier | $0.00 |
| **Total one-time cost** | | | **$0.00** |

### Ongoing Costs (Post-Launch)

| Item | Estimate | Cost |
|---|---|---|
| User query embeddings (50K searches/mo) | 50,000 API calls | ~$5-10/month |
| New artist onboarding embeddings | ~10-50/month | Free tier |
| Supabase vector storage + queries | Included in Pro plan | $0 incremental |
| **Estimated monthly total** | | **$5-10/month** |

Note: Vertex AI text-embedding-005 free tier is 1,000 requests/month. Beyond that, ~$0.00002 per 1,000 characters. At an average 200 chars per query, 50K queries = 10M chars = ~$0.20/month. The $5-10 estimate is conservative overhead.

---

## Rollback Plan

### If SQL Migration Fails

The SQL is atomic within the Supabase SQL Editor. If an error occurs mid-execution:

```sql
-- Check if the old table backup exists
SELECT COUNT(*) FROM portfolio_embeddings_backup;

-- If backup exists, restore
DROP TABLE IF EXISTS portfolio_embeddings;
ALTER TABLE portfolio_embeddings_backup RENAME TO portfolio_embeddings;
```

If no backup was created and the table was already dropped, re-run the OLD schema:

```sql
-- Restore 1408-dim schema from 001_update_embedding_dimensions.sql
-- Then re-run generate-vertex-embeddings.js or generate-portfolio-embeddings.js
```

### If Embedding Generation Fails Partway

The migration script is **idempotent** -- it deletes then re-inserts per artist_id. Safe to re-run:

```bash
# Re-run skipping already-migrated artists
node scripts/migrate-to-text-embeddings.js

# Or force regenerate all
node scripts/migrate-to-text-embeddings.js --force
```

### If Post-Migration App Breaks

1. Check `VECTOR_DB_CONFIG.DIMENSIONS` -- must be `768` (already set)
2. Check `vectorDbService.js` calls `match_portfolio_embeddings` -- must accept `vector(768)` (set by migration SQL)
3. Check `embeddingService.ts` generates 768-dim vectors -- already validated

If the app expects 1408-dim embeddings somewhere, the issue is in code not updated for the migration. Search for `1408` in the codebase:
```bash
grep -r "1408" src/
```

### Full Rollback to Image Embeddings

If text embeddings don't meet quality bar and you need to revert to image embeddings:

1. Run `001_update_embedding_dimensions.sql` in Supabase SQL Editor (restores 1408-dim schema)
2. Update `VECTOR_DB_CONFIG.DIMENSIONS` back to `1408`
3. Re-run `node scripts/generate-vertex-embeddings.js` (requires portfolio images in `public/portfolio/`)
4. Revert `embeddingService.ts` to use multimodal model

---

## Troubleshooting Quick Reference

| Error | Cause | Fix |
|---|---|---|
| `ENOTFOUND yfcmysjmoehcyszvkxsr.supabase.co` | Network/DNS issue | Check internet, disable VPN |
| `Expected 768 dimensions, got 1408` | Old embeddings in DB | Run with `--force` flag |
| `Vertex AI API error (403)` | Missing IAM role | `gcloud projects add-iam-policy-binding tatt-pro --member="serviceAccount:..." --role="roles/aiplatform.user"` |
| `Failed to get access token` | GCP creds not set | `export GOOGLE_APPLICATION_CREDENTIALS=./gcp-service-account-key.json` |
| `SUPABASE_SERVICE_ROLE_KEY not found` | Env var missing | Add to `.env.local` from Supabase Dashboard |
| Slow queries (> 500ms) | Missing IVFFlat index | Re-run CREATE INDEX from migration SQL |
| `relation "portfolio_embeddings" does not exist` | Schema not migrated | Run Step 1 SQL migration |

---

## Files Referenced

| File | Purpose |
|---|---|
| `src/db/migrations/002_migrate_to_text_embeddings.sql` | Schema DDL (768-dim table + RPC) |
| `scripts/migrate-to-text-embeddings.js` | Main migration script (generates embeddings, stores in Supabase) |
| `scripts/test-supabase-connection.js` | Pre-flight connectivity check |
| `scripts/verify-supabase-schema.js` | Post-migration schema verification |
| `src/services/embeddingService.ts` | Runtime embedding generation (text-embedding-005) |
| `src/services/vectorDbService.js` | Supabase vector search (calls `match_portfolio_embeddings` RPC) |
| `src/config/vectorDbConfig.js` | Config: `DIMENSIONS: 768` |
| `src/features/match-pulse/services/hybridMatchService.ts` | Consumer: hybrid vector+graph matching |
| `src/data/artists.json` | Source data: 100 artists |

---

## Sign-off Checklist

After deployment, confirm all boxes:

- [ ] SQL migration executed successfully in Supabase Dashboard
- [ ] `test-supabase-connection.js` reports table exists
- [ ] Dry run completes without errors
- [ ] 5-artist test batch succeeds with 768-dim embeddings
- [ ] Full 100-artist migration completes (0 errors)
- [ ] Row count = 100, all model_version = 'text-embedding-005'
- [ ] Similarity search SQL returns ranked results
- [ ] `match_portfolio_embeddings` RPC returns correct results
- [ ] UI at /match returns semantic results in < 500ms
- [ ] No console errors in browser or server logs
