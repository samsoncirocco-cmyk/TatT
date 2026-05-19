# Text Embeddings Migration - Execution Steps

## ⚠️ Current Status

**Network Issue Detected:** Cannot connect to Supabase (`yfcmysjmoehcyszvkxsr.supabase.co`)

This could be due to:
- No internet connection
- VPN/firewall blocking Supabase
- Local DNS issues

**Resolution:** Check your network connection, disable VPN if active, then follow the steps below.

---

## 🚀 Complete Migration Process

### Prerequisites Checklist

```bash
# 1. Test network connectivity
curl -I https://yfcmysjmoehcyszvkxsr.supabase.co

# 2. Verify environment variables
cat .env.local | grep SUPABASE

# 3. Test GCP credentials
gcloud auth application-default print-access-token
```

All should succeed before proceeding.

---

### Step 1: Update Supabase Schema (5 minutes)

**Option A: Supabase Dashboard (Recommended)**

1. Open: https://supabase.com/dashboard/project/yfcmysjmoehcyszvkxsr/sql/new

2. Copy the entire contents of:
   ```bash
   cat src/db/migrations/002_migrate_to_text_embeddings.sql
   ```

3. Paste into SQL Editor and click **"Run"**

4. Verify success:
   ```sql
   SELECT
     table_name,
     column_name,
     data_type
   FROM information_schema.columns
   WHERE table_name = 'portfolio_embeddings';
   ```

   Expected output should show:
   - `embedding` column with type `vector(768)`
   - `description` column with type `text`

**Option B: Using Supabase CLI** (if installed)

```bash
# Install Supabase CLI if needed
npm install -g supabase

# Login
supabase login

# Run migration
supabase db push --db-url postgresql://postgres:[YOUR-PASSWORD]@db.yfcmysjmoehcyszvkxsr.supabase.co:5432/postgres \
  --file src/db/migrations/002_migrate_to_text_embeddings.sql
```

---

### Step 2: Test Connection

```bash
# Run connection test
node scripts/test-supabase-connection.js
```

Expected output:
```
✅ Connected successfully to Supabase
✅ Table "portfolio_embeddings" exists
```

If this fails, **stop here** and fix connectivity before proceeding.

---

### Step 3: Test with Sample Artists (2 minutes)

```bash
# Generate embeddings for first 5 artists
node scripts/migrate-to-text-embeddings.js --limit=5
```

**Expected Output:**
```
✅ Processed:  5
⏭️  Skipped:    0
❌ Errors:     0
```

**Verify in Supabase:**

1. Go to: https://supabase.com/dashboard/project/yfcmysjmoehcyszvkxsr/editor

2. Query:
   ```sql
   SELECT
     artist_id,
     model_version,
     array_length(embedding::float[], 1) as dimensions,
     substring(description, 1, 50) as description_preview
   FROM portfolio_embeddings
   LIMIT 5;
   ```

3. Confirm:
   - 5 rows returned
   - `dimensions` = 768
   - `model_version` = 'text-embedding-005'
   - `description_preview` shows artist details

---

### Step 4: Full Migration (3-5 minutes for ~100 artists)

```bash
# Generate embeddings for all artists
node scripts/migrate-to-text-embeddings.js
```

**Expected Output:**
```
======================================================================
Summary
======================================================================
✅ Processed:  100
⏭️  Skipped:    0
❌ Errors:     0
📊 Total:      100
======================================================================

🎉 Migration complete!
```

**Monitor Progress:**

The script will show real-time progress:
```
[1/100] Processing Felix Young (ID: 1)...
  📝 Description: "Felix Young, tattoo artist in Phoenix, AZ..."
  🧮 Generating embedding...
  ✓ Generated 768-dim embedding
  ✅ Stored in Supabase
```

**Rate Limiting:**

The script automatically throttles to avoid API limits:
- Batch size: 5 artists
- Delay between batches: 1 second
- Auto-retry on transient errors

---

### Step 5: Verify Results

```bash
# Run test suite
node scripts/test-text-embeddings.js
```

**Expected Output:**
```
✅ Dimension validation: PASS (768 dimensions)
✅ Semantic similarity: PASS (87.90% for related queries)
✅ Consistency: PASS (100% for identical text)
```

**Database Verification:**

```sql
-- Check total count
SELECT COUNT(*) FROM portfolio_embeddings;
-- Should return: 100 (or your total artist count)

-- Check dimensions
SELECT
  array_length(embedding::float[], 1) as dim,
  COUNT(*)
FROM portfolio_embeddings
GROUP BY dim;
-- Should return: 768 | 100

-- Test similarity search
SELECT
  artist_id,
  description,
  embedding <=> (SELECT embedding FROM portfolio_embeddings WHERE artist_id = '1') as distance
FROM portfolio_embeddings
WHERE artist_id != '1'
ORDER BY distance
LIMIT 5;
-- Should return similar artists to artist 1
```

---

### Step 6: Test in UI

1. Start the application:
   ```bash
   npm run dev
   ```

2. Open Match Pulse UI: http://localhost:3000/match

3. Test semantic queries:
   - "japanese koi sleeve with cherry blossoms"
   - "minimalist geometric line work"
   - "realistic portrait in black and grey"
   - "traditional american eagle"
   - "watercolor floral design"

4. Verify:
   - Results return in < 500ms
   - Match scores are reasonable (0-100 range)
   - Results are semantically relevant (not just keyword matches)
   - Artists with similar styles rank higher

---

## 🔧 Troubleshooting

### Error: "ENOTFOUND yfcmysjmoehcyszvkxsr.supabase.co"

**Cause:** Network connectivity issue

**Fix:**
```bash
# Test connection
ping yfcmysjmoehcyszvkxsr.supabase.co

# Check VPN (disable if active)
# Check firewall settings
# Try different network
```

### Error: "Expected 768 dimensions, got 1408"

**Cause:** Old embeddings still in database

**Fix:**
```bash
# Force regenerate all embeddings
node scripts/migrate-to-text-embeddings.js --force
```

### Error: "Vertex AI API error (403): Permission denied"

**Cause:** Service account lacks Vertex AI permissions

**Fix:**
```bash
# Grant required role
gcloud projects add-iam-policy-binding tatt-pro \
  --member="serviceAccount:$(cat gcp-service-account-key.json | jq -r .client_email)" \
  --role="roles/aiplatform.user"
```

### Error: "Failed to get access token"

**Cause:** GCP credentials not configured

**Fix:**
```bash
# Set credentials
export GOOGLE_APPLICATION_CREDENTIALS=./gcp-service-account-key.json

# Verify
gcloud auth application-default print-access-token
```

### Slow Performance (> 500ms queries)

**Cause:** Missing vector index

**Fix:**
```sql
-- Recreate index
CREATE INDEX IF NOT EXISTS portfolio_embeddings_embedding_idx
ON portfolio_embeddings
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

---

## 📋 Quick Command Reference

```bash
# Test everything works
node scripts/test-text-embeddings.js

# Test Supabase connection
node scripts/test-supabase-connection.js

# Dry run (no database changes)
node scripts/migrate-to-text-embeddings.js --dry-run

# Migrate first 10 artists
node scripts/migrate-to-text-embeddings.js --limit=10

# Full migration
node scripts/migrate-to-text-embeddings.js

# Force regenerate all
node scripts/migrate-to-text-embeddings.js --force

# View migration SQL
cat src/db/migrations/002_migrate_to_text_embeddings.sql
```

---

## ✅ Success Criteria

After completing all steps, you should have:

- [x] Supabase schema updated (768-dim embeddings)
- [x] All artists have text embeddings generated
- [x] Test suite passing (100% consistency)
- [x] UI search working with semantic matching
- [x] Query performance < 500ms

---

## 📊 Expected Costs

**Vertex AI text-embedding-005:**
- Free tier: 1,000 requests/month
- Beyond free: ~$0.00002 per 1,000 characters

**Your Migration:**
- One-time: 100 artists × 1 embedding = 100 API calls (FREE)
- Ongoing: 50,000 searches/month = ~$5-10/month

**Total: $0 for migration, ~$5-10/month ongoing**

---

## 📚 Additional Resources

- [Full Documentation](docs/TEXT_EMBEDDINGS_MIGRATION.md)
- [Embedding Service Code](src/services/embeddingService.ts)
- [Migration Script](scripts/migrate-to-text-embeddings.js)
- [Test Suite](scripts/test-text-embeddings.js)
- [Vertex AI Docs](https://cloud.google.com/vertex-ai/generative-ai/docs/embeddings/get-text-embeddings)

---

## 🆘 Need Help?

If you encounter issues:

1. Check network connectivity first
2. Verify all environment variables are set
3. Review error messages carefully
4. Check [troubleshooting section](#-troubleshooting) above
5. Review [TEXT_EMBEDDINGS_MIGRATION.md](docs/TEXT_EMBEDDINGS_MIGRATION.md)

---

**Migration Ready!** When network connectivity is restored, start with Step 1.

*Last Updated: 2026-01-31*
