# Directive: Generate Vertex AI Embeddings

**ID:** DIR-003
**Owner:** Data Team
**Last Updated:** 2026-02-16
**Last Tested:** Not yet tested
**Risk Level:** Medium
**Estimated Duration:** 20-90 minutes (depends on data volume)

## Purpose

Generate text and image embeddings using Google Vertex AI's `text-embedding-004` and `multimodal-embedding` models for portfolio descriptions, style tags, and images stored in Firestore. These embeddings power the semantic similarity component of TatTester's hybrid matching system.

While Neo4j provides relationship-based matching (e.g., "artists specializing in Japanese style"), vector embeddings enable semantic discovery (e.g., "artists with portfolios visually similar to this dragon design even if not tagged as Japanese").

## Prerequisites

- [ ] GCP project has Vertex AI API enabled
- [ ] `GCP_PROJECT_ID` environment variable set
- [ ] GCP credentials available (`gcloud auth application-default login` or service account)
- [ ] Firestore populated with portfolio data (see DIR-004: Migrate Data)
- [ ] Python dependencies installed: `pip install -r execution/requirements.txt`
- [ ] Budget awareness: Embedding generation costs ~$0.025 per 1,000 text embeddings, ~$0.0025 per image

## Procedure

### Step 1: Estimate Cost and Volume

```bash
# Count documents needing embeddings
python execution/count_embedding_targets.py
```

**Expected output:**
```
📊 Embedding targets:
   - Portfolio descriptions: 1,832 (text)
   - Portfolio images: 1,832 (multimodal)
   - Style tags: 47 (text)

💰 Estimated cost:
   - Text embeddings: 1,879 × $0.000025 = $0.047
   - Image embeddings: 1,832 × $0.0025 = $4.58
   - Total: ~$4.63

⏱️  Estimated duration: ~35 minutes (at 60 req/min limit)
```

**Review costs before proceeding.** If cost exceeds budget, consider filtering to high-priority items only.

### Step 2: Run Embedding Generation (Dry Run First)

```bash
cd execution/
python generate_embeddings.py \
  --target portfolios \
  --batch-size 10 \
  --delay 1.0 \
  --dry-run
```

**Expected output (dry run):**
```
🔍 DRY RUN MODE - No embeddings will be generated
🔄 Connecting to Firestore...
✅ Connected
🔄 Scanning portfolios collection...
✅ Found 1,832 portfolio items needing embeddings
📋 Batch plan:
   - 184 batches of 10 items
   - Estimated time: 31 minutes (1.0s delay between batches)
   - Rate: ~59 requests/minute (within 60/min limit)
```

### Step 3: Run Actual Embedding Generation

```bash
python generate_embeddings.py \
  --target portfolios \
  --batch-size 10 \
  --delay 1.0
```

**Parameters:**
- `--target`: What to embed (`portfolios`, `styles`, or `all`)
- `--batch-size`: Items per batch (default: 10, max: 50)
- `--delay`: Seconds between batches (default: 1.0, min: 0.5)
- `--dry-run`: Preview without generating embeddings
- `--filter`: Only process items matching filter (e.g., `--filter "style=Japanese"`)
- `--force`: Regenerate embeddings even if they already exist

**Expected output:**
```
🔄 Connecting to Firestore...
✅ Connected
🔄 Connecting to Vertex AI...
✅ Connected to textembedding-gecko@004
🔄 Generating embeddings for 1,832 portfolios
   ├─ Batch 1/184: 10 embeddings generated ✅
   ├─ Batch 2/184: 10 embeddings generated ✅
   ├─ Batch 3/184: 10 embeddings generated ✅
   ...
   ├─ Batch 183/184: 10 embeddings generated ✅
   └─ Batch 184/184: 2 embeddings generated ✅

✅ Total: 1,832 embeddings generated
💰 Cost: ~$4.63
⏱️  Completed in 32m 47s
```

**If generation fails:** Script checkpoints progress every 10 batches. Re-running will skip already-embedded items.

### Step 4: Verify Embeddings

```bash
# Check that embeddings were written to Firestore
python -c "
from google.cloud import firestore
db = firestore.Client()

# Sample a few portfolio documents
docs = db.collection('portfolios').limit(5).stream()
for doc in docs:
    data = doc.to_dict()
    has_text_emb = 'textEmbedding' in data
    has_img_emb = 'imageEmbedding' in data
    print(f'{doc.id}: text={has_text_emb}, image={has_img_emb}')
"
```

**Expected output:**
```
portfolio-uuid-1: text=True, image=True
portfolio-uuid-2: text=True, image=True
portfolio-uuid-3: text=True, image=True
...
```

**If embeddings missing:** Check logs for rate limit errors or API failures. May need to re-run with `--filter` to target missing items.

### Step 5: Test Semantic Search

```bash
# Run a sample similarity search
python execution/test_vector_search.py --query "dragon sleeve color"
```

**Expected output:**
```
🔍 Searching for: "dragon sleeve color"

📊 Top 5 matches:
   1. portfolio-uuid-42 (similarity: 0.87)
      "Full sleeve dragon piece with vibrant colors"
   2. portfolio-uuid-128 (similarity: 0.82)
      "Japanese dragon forearm in traditional color palette"
   ...
```

**Look for:** High similarity scores (> 0.7) for relevant results. Low scores may indicate poor embedding quality or need for more training data.

## Rollback

Embeddings are additive (write-only). To rollback:

### Option 1: Delete Embedding Fields

```bash
# Remove embeddings from all portfolios
python execution/generate_embeddings.py --clear --target portfolios
```

**Warning:** This does NOT refund API costs. Only use if embeddings are corrupted or schema changed.

### Option 2: Restore Firestore from Backup

```bash
# Restore from yesterday's backup
gcloud firestore import gs://[BACKUP_BUCKET]/firestore-[timestamp]/
```

See DIR-004: Migrate Data for full backup/restore procedures.

## Known Issues

No known issues yet. Update this section when issues are discovered during embedding generation.

## Post-Operation

- [ ] Verify embedding count matches target count
- [ ] Test semantic search returns relevant results
- [ ] Check GCP billing for actual cost vs estimated
- [ ] Monitor Vertex AI quota usage in Cloud Console
- [ ] If any issues occurred, update this directive's "Known Issues" section
- [ ] If rate limits encountered, update `--delay` recommendation in this directive

## Related Directives

- **DIR-002: Seed Artists** - Run this directive after seeding Neo4j to embed portfolio data
- **DIR-004: Migrate Data** - Embeddings are stored in Firestore alongside source data
- **DIR-005: Monitor Budget** - Track embedding generation costs against Vertex AI budget

## Appendix: Batch Size and Rate Limit Guidance

Vertex AI has a default quota of **60 requests per minute** for text-embedding-004.

| Batch Size | Delay (sec) | Effective Rate | Est. Time (1,832 items) | Notes |
|------------|-------------|----------------|-------------------------|-------|
| 10 | 1.0 | 60/min | 31 minutes | Recommended default |
| 20 | 2.0 | 60/min | 31 minutes | Same rate, fewer requests, higher memory |
| 10 | 0.5 | 120/min | 15 minutes | **Exceeds quota - will fail** |
| 5 | 1.0 | 30/min | 61 minutes | Conservative, good for shared projects |

**Cost breakdown (per 1,000 embeddings):**
- Text embedding (text-embedding-004): $0.025
- Image embedding (multimodal-embedding): $2.50 (100x more expensive)

**Recommendation:** Start with text-only embeddings for MVP, add image embeddings only for high-value portfolios (e.g., artists with 4.5+ ratings).

## Appendix: Embedding Dimensions

| Model | Dimensions | Use Case | Cost per 1K |
|-------|------------|----------|-------------|
| text-embedding-004 | 768 | Portfolio descriptions, style tags, artist bios | $0.025 |
| text-embedding-gecko | 768 | Older model, lower quality but slightly cheaper | $0.020 |
| multimodal-embedding | 1408 | Portfolio images, supports text + image input | $2.50 |

**Storage impact:** Each 768-dim embedding is ~3KB (as float32 array). 1,832 text embeddings = ~5.5MB total.

## Appendix: Quota Increase Request

If you need to embed large datasets (> 10,000 items):

1. Navigate to [GCP Quotas page](https://console.cloud.google.com/iam-admin/quotas)
2. Filter: Service = "Vertex AI API", Metric = "Generate text embeddings requests per minute"
3. Click quota → Request increase
4. Justification: "Generating embeddings for tattoo portfolio matching system (one-time batch)"
5. Request: 300 requests/minute (5x increase)

Approval typically takes 1-2 business days.
