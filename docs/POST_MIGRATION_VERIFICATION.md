# Post-Migration Verification Guide

**Purpose:** Comprehensive verification procedures to confirm the text embeddings migration is working correctly in production.

**When to Use:** After completing the database migration and data migration steps from [MIGRATION_STEPS.md](../MIGRATION_STEPS.md).

---

## Table of Contents

1. [Quick Health Check](#quick-health-check)
2. [Database Verification](#database-verification)
3. [API Verification](#api-verification)
4. [UI/UX Verification](#uiux-verification)
5. [Performance Verification](#performance-verification)
6. [Quality Verification](#quality-verification)
7. [Cost Verification](#cost-verification)
8. [Troubleshooting Common Issues](#troubleshooting-common-issues)

---

## Quick Health Check

Run these commands first to verify the basic setup is working:

```bash
# 1. Test Vertex AI connectivity and authentication
node scripts/test-text-embeddings.js

# Expected output:
# ✅ Dimension validation: PASS (768 dimensions)
# ✅ Semantic similarity: PASS (>85% for related queries)
# ✅ Consistency: PASS (100% for identical text)

# 2. Check Supabase connection
node scripts/test-supabase-connection.js

# Expected output:
# ✅ Connected successfully to Supabase
# ✅ Table "portfolio_embeddings" exists

# 3. Verify data completeness
node scripts/check-supabase-schema.js

# Expected output:
# ✅ Table exists with data
# Total records: 100 (or your artist count)
# Embedding dimensions: 768
```

**If all three tests pass, proceed to detailed verification below.**

---

## Database Verification

### 1. Schema Structure

Verify the table structure matches expectations:

```sql
-- Run in Supabase SQL Editor
SELECT
  table_name,
  column_name,
  data_type,
  character_maximum_length,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'portfolio_embeddings'
ORDER BY ordinal_position;
```

**Expected Columns:**
| column_name | data_type | is_nullable |
|-------------|-----------|-------------|
| id | uuid | NO |
| artist_id | text | NO |
| embedding | USER-DEFINED (vector) | YES |
| description | text | NO |
| model_version | text | YES |
| created_at | timestamp with time zone | YES |
| updated_at | timestamp with time zone | YES |

### 2. Data Completeness

Check all expected artists have embeddings:

```sql
-- Count total embeddings
SELECT COUNT(*) as total_embeddings
FROM portfolio_embeddings;

-- Should match your total artist count (e.g., 100)
```

```sql
-- Check for missing artists
SELECT a.id, a.name
FROM artists a
LEFT JOIN portfolio_embeddings pe ON a.id::text = pe.artist_id
WHERE pe.artist_id IS NULL;

-- Should return 0 rows (all artists have embeddings)
```

### 3. Embedding Dimensions

Verify all embeddings are 768-dimensional:

```sql
SELECT
  array_length(embedding::float[], 1) as dimensions,
  COUNT(*) as count
FROM portfolio_embeddings
GROUP BY dimensions;

-- Expected output:
-- dimensions | count
-- -----------|-------
--        768 |   100
```

### 4. Index Verification

Confirm the IVFFlat index exists and is being used:

```sql
-- Check index exists
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'portfolio_embeddings';

-- Should show: portfolio_embeddings_embedding_idx
-- Using: ivfflat (embedding vector_cosine_ops)
```

```sql
-- Verify index is being used in queries
EXPLAIN ANALYZE
SELECT artist_id, embedding <=> '[0.1, 0.2, ...]'::vector(768) as distance
FROM portfolio_embeddings
ORDER BY distance
LIMIT 10;

-- Look for "Index Scan using portfolio_embeddings_embedding_idx"
-- Query time should be < 50ms
```

### 5. Data Quality

Check description field has meaningful content:

```sql
SELECT
  artist_id,
  length(description) as desc_length,
  substring(description, 1, 100) as desc_preview
FROM portfolio_embeddings
ORDER BY RANDOM()
LIMIT 5;

-- Descriptions should be 50-500 characters
-- Should contain artist name, location, styles
```

---

## API Verification

### 1. Embedding Generation Test

Test that new embeddings can be generated on demand:

```bash
# Test query embedding generation
node -e "
const { generateQueryEmbedding } = require('./src/services/embeddingService');
(async () => {
  try {
    const embedding = await generateQueryEmbedding('japanese koi sleeve');
    console.log('✅ Embedding generated:', embedding.length, 'dimensions');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
})();
"
```

**Expected:** `✅ Embedding generated: 768 dimensions`

### 2. Vertex AI API Health

Check Vertex AI API is responding correctly:

```bash
# Test direct API call
curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  "https://us-central1-aiplatform.googleapis.com/v1/projects/tatt-pro/locations/us-central1/publishers/google/models/text-embedding-005:predict" \
  -d '{
    "instances": [{
      "content": "test query",
      "task_type": "RETRIEVAL_DOCUMENT"
    }]
  }'
```

**Expected:** JSON response with `predictions[0].embeddings.values` array of 768 floats

### 3. Rate Limiting Test

Verify batch processing handles rate limits gracefully:

```bash
# Run migration script with small limit to test rate limiting
node scripts/migrate-to-text-embeddings.js --limit=10 --dry-run

# Should show:
# - Batch processing (5 at a time)
# - No rate limit errors
# - Completion in ~10-15 seconds
```

---

## UI/UX Verification

### 1. Match Pulse Interface

Start the dev server and test the UI:

```bash
npm run dev
# Open: http://localhost:3000/match
```

### 2. Query Test Suite

Test these queries and verify results:

#### Test 1: Japanese Style
**Query:** "japanese koi sleeve with cherry blossoms"

**Expected Results:**
- Artists with "Japanese" or "Asian" in styles appear first
- Artists with "Traditional Japanese" tags ranked higher
- Visual similarity scores > 0.7 for top matches

#### Test 2: Minimalist Style
**Query:** "minimalist geometric line work"

**Expected Results:**
- Artists with "Geometric" or "Minimalist" styles appear first
- Black and grey specialists ranked higher than color artists
- Clean, simple portfolio styles ranked higher

#### Test 3: Realism
**Query:** "realistic portrait in black and grey"

**Expected Results:**
- Artists with "Realism" or "Portrait" specialties appear first
- Black and grey specialists appear before color artists
- Photo-realistic artists ranked highest

#### Test 4: Traditional American
**Query:** "traditional american eagle"

**Expected Results:**
- Artists with "Traditional" or "American Traditional" styles first
- Bold line work specialists ranked higher
- Artists with americana/patriotic work featured

#### Test 5: Watercolor
**Query:** "watercolor floral design"

**Expected Results:**
- Artists with "Watercolor" style appear first
- Soft color palette specialists ranked higher
- Floral work specialists featured

### 3. Edge Case Testing

**Empty Query:**
```
Query: ""
Expected: Return all artists or show error message
```

**Very Long Query:**
```
Query: [500+ word description]
Expected: Truncate gracefully, still return results
```

**Special Characters:**
```
Query: "japanese 龍 dragon with kanji 漢字"
Expected: Handle Unicode gracefully, return relevant results
```

**Numeric Query:**
```
Query: "123456"
Expected: Return results or show "no matches" gracefully
```

---

## Performance Verification

### 1. Query Latency

Measure end-to-end query performance:

```bash
# Add timing to hybrid match service
# src/features/match-pulse/services/hybridMatchService.ts
```

**Acceptance Criteria:**
- Vector search: < 100ms
- Graph query: < 200ms
- Total query time: < 500ms
- 95th percentile: < 700ms

### 2. Database Query Performance

Check vector similarity query performance:

```sql
-- Run multiple times and check consistency
EXPLAIN ANALYZE
SELECT
  artist_id,
  embedding <=> (SELECT embedding FROM portfolio_embeddings WHERE artist_id = '1') as distance,
  description
FROM portfolio_embeddings
ORDER BY distance
LIMIT 20;

-- Expected planning time: < 1ms
-- Expected execution time: < 50ms
```

### 3. Vertex AI API Latency

Monitor API call latency:

```bash
# Check logs for API timing
# Look for: "[EmbeddingService] Generated embedding" messages
# Should be < 200ms per call
```

### 4. Load Testing (Optional)

For production readiness, run load tests:

```bash
# Use Apache Bench or similar
ab -n 100 -c 10 http://localhost:3000/api/match?query=japanese+koi+sleeve

# Expected:
# - No timeouts
# - < 1% error rate
# - Average response time < 500ms
```

---

## Quality Verification

### 1. Semantic Similarity Test

Verify semantically similar queries return similar results:

**Test Pairs:**
| Query 1 | Query 2 | Expected Overlap |
|---------|---------|------------------|
| "japanese koi sleeve" | "asian style dragon sleeve" | > 60% |
| "minimalist line work" | "simple geometric tattoo" | > 70% |
| "realistic portrait" | "photo-realistic face" | > 80% |

**How to Test:**
```javascript
// Compare top 10 results from each query
const query1Results = await hybridMatch('japanese koi sleeve');
const query2Results = await hybridMatch('asian style dragon sleeve');

const overlap = query1Results.filter(a1 =>
  query2Results.some(a2 => a2.id === a1.id)
).length;

console.log(`Overlap: ${overlap}/10 (${overlap * 10}%)`);
```

### 2. Style Separation Test

Verify different styles return different artists:

**Test Cases:**
| Query A | Query B | Expected Overlap |
|---------|---------|------------------|
| "traditional american" | "minimalist geometric" | < 20% |
| "watercolor floral" | "blackwork tribal" | < 10% |
| "japanese style" | "realistic portrait" | < 30% |

### 3. Consistency Test

Verify same query returns consistent results:

```bash
# Run same query 10 times
for i in {1..10}; do
  curl "http://localhost:3000/api/match?query=japanese+koi+sleeve" | jq '.matches[0].id'
done

# Top result should be identical across all runs
```

### 4. Ranking Quality Test

Verify match scores correlate with actual relevance:

```javascript
// Top 10 results should have:
// - Descending scores
// - Reasonable score range (0.5 - 1.0)
// - Clear semantic relevance

const results = await hybridMatch('japanese koi sleeve');
console.log(results.map(r => ({
  id: r.id,
  name: r.name,
  score: r.matchScore,
  styles: r.styles
})));

// Expected:
// [
//   { id: 1, name: "Artist A", score: 0.92, styles: ["Japanese"] },
//   { id: 5, name: "Artist B", score: 0.87, styles: ["Asian"] },
//   { id: 8, name: "Artist C", score: 0.81, styles: ["Oriental"] },
//   ...
// ]
```

---

## Cost Verification

### 1. Vertex AI Usage Tracking

Monitor API usage in GCP Console:

1. Go to: https://console.cloud.google.com/vertex-ai
2. Navigate to: Vertex AI > Generative AI > Usage
3. Check:
   - Total API calls this month
   - Cost per 1K characters
   - Total cost to date

**Expected Monthly Costs:**
- One-time migration: 100 calls (FREE - within free tier)
- Ongoing queries: ~50,000/month = ~$5-10/month

### 2. Supabase Usage

Check Supabase usage dashboard:

1. Go to: https://supabase.com/dashboard/project/yfcmysjmoehcyszvkxsr
2. Navigate to: Settings > Usage
3. Check:
   - Database size (should increase by ~5-10 MB)
   - API requests (vector queries)
   - Data transfer

**Expected:**
- Database: +10 MB for embeddings
- Free tier sufficient for current usage

### 3. Cost Alerts

Set up cost alerts to catch unexpected usage:

```bash
# Set up GCP budget alert
gcloud billing budgets create \
  --billing-account=YOUR_BILLING_ACCOUNT \
  --display-name="Vertex AI Budget" \
  --budget-amount=20 \
  --threshold-rule=percent=80

# Alert at $16/month (80% of $20 budget)
```

---

## Troubleshooting Common Issues

### Issue 1: "Failed to get access token"

**Symptoms:** Embedding generation fails with auth error

**Solution:**
```bash
# Verify GCP credentials
export GOOGLE_APPLICATION_CREDENTIALS=./gcp-service-account-key.json

# Test authentication
gcloud auth application-default print-access-token

# If fails, re-authenticate
gcloud auth application-default login
```

### Issue 2: "Expected 768 dimensions, got 1408"

**Symptoms:** Old embeddings still in database

**Solution:**
```bash
# Force regenerate all embeddings
node scripts/migrate-to-text-embeddings.js --force

# Or truncate table and re-run
# (WARNING: Deletes all embeddings)
```

### Issue 3: Slow Query Performance (> 500ms)

**Symptoms:** Vector searches taking too long

**Solution:**
```sql
-- Check if index is being used
EXPLAIN ANALYZE
SELECT * FROM portfolio_embeddings
ORDER BY embedding <=> '[...]'::vector(768)
LIMIT 20;

-- If not using index, recreate:
DROP INDEX IF EXISTS portfolio_embeddings_embedding_idx;

CREATE INDEX portfolio_embeddings_embedding_idx
ON portfolio_embeddings
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

### Issue 4: Poor Match Quality

**Symptoms:** Results don't match query semantically

**Possible Causes:**
1. Artist descriptions too generic
2. Embedding dimension mismatch
3. Index not being used

**Solution:**
```bash
# Check a few descriptions
node -e "
const supabase = require('@supabase/supabase-js').createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
supabase.from('portfolio_embeddings')
  .select('artist_id, description')
  .limit(5)
  .then(({ data }) => console.log(data));
"

# If descriptions are poor, regenerate with better text
node scripts/migrate-to-text-embeddings.js --force
```

### Issue 5: Rate Limit Errors

**Symptoms:** "Quota exceeded" or 429 errors from Vertex AI

**Solution:**
```bash
# Migration script already handles rate limiting
# But if needed, reduce batch size:

# Edit migrate-to-text-embeddings.js:
# BATCH_SIZE = 3  // Reduce from 5
# DELAY_MS = 2000 // Increase from 1000
```

---

## Verification Checklist

Use this checklist to track verification completion:

### Database
- [ ] Schema structure matches expectations
- [ ] All artists have embeddings (0 missing)
- [ ] All embeddings are 768 dimensions
- [ ] IVFFlat index exists and is being used
- [ ] Descriptions are meaningful (> 50 chars)

### API
- [ ] Embedding generation works
- [ ] Vertex AI API responds correctly
- [ ] Rate limiting handled gracefully
- [ ] Error handling works properly

### UI
- [ ] All test queries return results
- [ ] Results are semantically relevant
- [ ] Match scores are reasonable
- [ ] Edge cases handled gracefully
- [ ] No console errors

### Performance
- [ ] Query latency < 500ms
- [ ] Vector search < 100ms
- [ ] Database queries < 50ms
- [ ] No timeouts under load

### Quality
- [ ] Similar queries return similar results (> 60% overlap)
- [ ] Different styles return different results (< 30% overlap)
- [ ] Same query is consistent (identical top result)
- [ ] Ranking correlates with relevance

### Cost
- [ ] Vertex AI usage within budget
- [ ] Supabase usage within free tier
- [ ] Cost alerts configured
- [ ] No unexpected charges

---

## Sign-off

**Verified By:** _________________
**Date:** _________________
**All Tests Passed:** ☐ Yes ☐ No
**Ready for Production:** ☐ Yes ☐ No

**Notes:**
_______________________________________________
_______________________________________________
_______________________________________________

---

## Next Steps After Verification

Once all verification steps pass:

1. ✅ Mark migration as complete in [EMBEDDING_MIGRATION_CHECKLIST.md](EMBEDDING_MIGRATION_CHECKLIST.md)
2. 📊 Set up ongoing monitoring for embedding quality
3. 📝 Document any issues encountered and their solutions
4. 👥 Notify team of successful migration
5. 🎉 Celebrate! You've successfully migrated to semantic embeddings!

---

*For detailed troubleshooting, see [TEXT_EMBEDDINGS_MIGRATION.md](TEXT_EMBEDDINGS_MIGRATION.md) or [MIGRATION_STEPS.md](../MIGRATION_STEPS.md)*
