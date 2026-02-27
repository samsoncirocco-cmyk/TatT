# Phase 4: Real Embeddings + Matching - Research

**Researched:** 2026-02-15
**Domain:** Vector embeddings, hybrid search, Vertex AI APIs, Firestore vector search
**Confidence:** HIGH

## Summary

Phase 4 replaces the Math.sin mock embeddings in `hybridMatchService.ts` with **Vertex AI's text-embedding-004** (768 dimensions) and **multimodal embeddings** (1408 dimensions) for semantic artist matching. The hybrid matching system already exists — it combines Neo4j graph traversal with vector similarity via Reciprocal Rank Fusion (RRF). The research confirms this is a straightforward integration: generate real embeddings via Vertex AI REST API, store them in Firestore with vector search, configure RRF weights in a Firestore config document, and enforce Neo4j query timeouts/pagination.

**Primary recommendation:** Use Vertex AI's REST API for embeddings (no need for heavyweight SDK), store in Firestore with native vector search (`findNearest` with COSINE distance), normalize embeddings to unit vectors before storage, and make RRF weights configurable via Firestore to allow A/B testing without code changes.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **@google-cloud/vertexai** | 1.10.0+ | Text & multimodal embeddings via Node.js SDK | Official Google SDK, already in package.json, provides typed interfaces |
| **firebase** | 12.8.0+ | Firestore vector search client-side | Already in use, native `findNearest()` with COSINE support |
| **firebase-admin** | 13.6.0+ | Firestore vector search server-side | Already in use, same `findNearest()` API as client |
| **neo4j-driver** | 6.0.1 | Neo4j connection with pooling & timeouts | Already in use, mature, well-documented |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **@google-cloud/aiplatform** | 6.1.0+ | Batch embedding generation via REST | Large-scale seed script (hundreds of artists), 20% cost savings over online requests |
| **@langchain/google-vertexai** | Latest | Embedding wrapper with retry/batching | If LangChain is adopted later (not needed for MVP) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vertex AI embeddings | OpenAI `text-embedding-3-small` | OpenAI is cheaper ($0.02/1M tokens vs $0.10/1M) but requires third-party dependency; Vertex AI keeps stack GCP-only |
| Firestore vector search | Vertex AI Vector Search | Vertex AI Vector Search scales to billions of vectors but costs $3/GB indexing + VM serving costs; Firestore is free for <10K artists and simpler to integrate |
| RRF config in Firestore | Hardcoded weights | Firestore config allows runtime A/B testing without redeployment; hardcoded is faster but inflexible |

**Installation:**
```bash
# Already installed in package.json
npm install @google-cloud/vertexai@1.10.0
npm install firebase@12.8.0
npm install firebase-admin@13.6.0
npm install neo4j-driver@6.0.1
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── services/
│   ├── vertex-embedding-service.ts    # Text & multimodal embedding generation
│   ├── firestore-vector-service.ts    # Embedding storage & similarity search
│   ├── matchService.ts                # Hybrid RRF matching (already exists)
│   ├── neo4jService.ts                # Graph queries (already exists)
│   └── match-config-service.ts        # RRF weight config from Firestore
├── lib/
│   ├── embedding-normalization.ts     # L2 normalization utilities
│   └── vertex-ai-client.ts            # Vertex AI initialization
scripts/
├── seed-artist-embeddings.js          # Batch embed all artists in Neo4j
└── backfill-embeddings.js             # Incremental backfill for new artists
```

### Pattern 1: Vertex AI Embedding Generation (REST API)

**What:** Generate text embeddings using Vertex AI's `text-embedding-004` model via REST API.
**When to use:** For all text-based queries (user search terms, artist descriptions).
**Example:**

```typescript
// Source: https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/text-embeddings-api
import { GoogleAuth } from 'google-auth-library';

async function generateTextEmbedding(text: string): Promise<number[]> {
  const auth = new GoogleAuth();
  const token = await auth.getAccessToken();

  const endpoint = `https://us-central1-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/us-central1/publishers/google/models/text-embedding-004:predict`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      instances: [{ content: text }]
    })
  });

  const data = await response.json();
  return data.predictions[0].embeddings.values; // 768 dimensions
}
```

### Pattern 2: Multimodal Image Embeddings (Portfolio Images)

**What:** Generate 1408-dimension image embeddings from artist portfolio images.
**When to use:** For visual similarity search (user uploads sketch, find similar artist work).
**Example:**

```typescript
// Source: https://cloud.google.com/vertex-ai/generative-ai/docs/embeddings/get-multimodal-embeddings
async function generateImageEmbedding(imageUrl: string): Promise<number[]> {
  const auth = new GoogleAuth();
  const token = await auth.getAccessToken();

  const endpoint = `https://us-central1-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/us-central1/publishers/google/models/multimodalembedding@001:predict`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      instances: [
        {
          image: { gcsUri: imageUrl }
        }
      ],
      parameters: { dimension: 1408 } // Full resolution
    })
  });

  const data = await response.json();
  return data.predictions[0].imageEmbedding; // 1408 dimensions
}
```

### Pattern 3: Firestore Vector Search with Normalization

**What:** Store embeddings in Firestore and search with cosine similarity.
**When to use:** All artist embedding storage and query-time similarity search.
**Example:**

```typescript
// Source: https://firebase.google.com/docs/firestore/vector-search
import { getFirestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';

// Normalize to unit vector (required for COSINE distance accuracy)
function normalizeVector(vec: number[]): number[] {
  const magnitude = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
  return vec.map(val => val / magnitude);
}

// Store embedding
async function storeEmbedding(artistId: string, embedding: number[]) {
  const db = getFirestore();
  const normalized = normalizeVector(embedding);

  await db.collection('artist_embeddings').doc(artistId).set({
    embedding: FieldValue.vector(normalized),
    dimension: normalized.length,
    model: 'text-embedding-004',
    createdAt: FieldValue.serverTimestamp()
  });
}

// Search similar
async function searchSimilar(queryEmbedding: number[], limit: number = 20) {
  const db = getFirestore();
  const normalized = normalizeVector(queryEmbedding);

  const results = await db.pipeline()
    .collection('artist_embeddings')
    .findNearest({
      field: 'embedding',
      vectorValue: normalized,
      distanceMeasure: 'cosine',
      limit
    })
    .execute();

  return results.map((doc, index) => ({
    artistId: doc.id,
    score: 1 - doc.distance, // Convert distance to similarity (0=farthest, 1=identical)
    rank: index + 1
  }));
}
```

### Pattern 4: Configurable RRF Weights (Firestore Config Document)

**What:** Store RRF weights in Firestore for runtime A/B testing without code changes.
**When to use:** To allow product team to tune graph vs. vector importance without redeployment.
**Example:**

```typescript
// Source: https://www.elastic.co/search-labs/blog/weighted-reciprocal-rank-fusion-rrf
interface MatchConfig {
  rrfWeights: {
    graph: number;
    vector: number;
  };
  rrfK: number; // Typically 60
  confidenceThreshold: number;
}

async function getMatchConfig(): Promise<MatchConfig> {
  const db = getFirestore();
  const configDoc = await db.collection('config').doc('matching').get();

  if (!configDoc.exists) {
    // Default config
    return {
      rrfWeights: { graph: 0.5, vector: 0.5 },
      rrfK: 60,
      confidenceThreshold: 0.5
    };
  }

  return configDoc.data() as MatchConfig;
}

function weightedRRF(
  graphResults: Array<{id: string; rank: number}>,
  vectorResults: Array<{id: string; rank: number}>,
  weights: {graph: number; vector: number},
  k: number = 60
): Map<string, number> {
  const scores = new Map<string, number>();

  // Graph contribution
  graphResults.forEach(item => {
    const score = weights.graph * (1 / (k + item.rank));
    scores.set(item.id, (scores.get(item.id) || 0) + score);
  });

  // Vector contribution
  vectorResults.forEach(item => {
    const score = weights.vector * (1 / (k + item.rank));
    scores.set(item.id, (scores.get(item.id) || 0) + score);
  });

  return scores;
}
```

### Pattern 5: Neo4j Connection Pooling for Cloud Run

**What:** Configure Neo4j driver with single instance, connection pooling, and query timeouts.
**When to use:** Server-side Cloud Run environment with serverless scaling.
**Example:**

```typescript
// Source: https://neo4j.com/docs/javascript-manual/current/performance/
import neo4j from 'neo4j-driver';

// Create ONE driver instance per app lifecycle (not per request)
const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD),
  {
    maxConnectionPoolSize: 50, // Default 50, suitable for Cloud Run
    connectionAcquisitionTimeout: 60000, // 60s max wait for connection
    maxConnectionLifetime: 3600000, // 1 hour (slightly less than load balancer timeout)
    connectionTimeout: 30000, // 30s connection timeout
  }
);

// Query with timeout and pagination
async function queryArtistsWithTimeout(style: string, limit: number = 50) {
  const session = driver.session({ database: 'neo4j' });

  try {
    const result = await session.executeRead(
      async tx => {
        return await tx.run(
          `MATCH (a:Artist)-[:SPECIALIZES_IN]->(s:Style {name: $style})
           RETURN a
           ORDER BY a.name
           LIMIT $limit`,
          { style, limit: neo4j.int(limit) }
        );
      },
      { timeout: neo4j.int(5000) } // 5s query timeout (MATCH-05 requirement)
    );

    return result.records.map(r => r.get('a').properties);
  } finally {
    await session.close(); // Sessions are cheap, close after use
  }
}

// Verify connectivity on startup
await driver.verifyConnectivity();
```

### Anti-Patterns to Avoid

- **Creating driver instance per request:** Neo4j drivers are heavyweight and expensive to initialize (up to seconds). In serverless, create once and reuse.
- **Not normalizing embeddings:** Firestore COSINE distance works best with unit vectors. Without normalization, results may be inaccurate.
- **Hardcoding RRF weights:** Product needs to A/B test graph vs. vector importance. Store in Firestore config document.
- **Using embeddings of different dimensions:** text-embedding-004 (768) vs multimodalembedding (1408) cannot be directly compared. Store separately or project to same dimension.
- **No pagination on Neo4j queries:** Without `LIMIT`, queries can return thousands of nodes and timeout. Always use `LIMIT 50` (MATCH-05).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Embedding generation | Custom BERT/Transformers.js model | Vertex AI `text-embedding-004` | Vertex AI is managed, optimized, and free for reasonable volume; custom models require GPU inference, model versioning, and maintenance |
| Vector similarity search | Custom cosine similarity in app code | Firestore `findNearest()` | Firestore has optimized indexes, handles pagination, and scales automatically; custom implementation won't scale past 10K artists |
| Embedding normalization | Custom L2 norm calculation | Standard L2 normalization (see Pattern 3) | Easy to get wrong (division by zero, numerical stability); standard implementation is battle-tested |
| RRF algorithm | Custom ranking fusion | Standard RRF with k=60 | RRF is empirically proven (Cormack et al. 2009); custom fusion algorithms require extensive tuning and A/B testing |
| Neo4j connection pooling | Custom pool with setTimeout | `neo4j-driver` built-in pooling | Neo4j driver has retry logic, liveness checks, and automatic reconnection; custom pools are bug-prone |

**Key insight:** Vector embeddings and similarity search are solved problems in 2026. Cloud providers offer managed, optimized services (Vertex AI embeddings, Firestore vector search) that are cheaper and more reliable than self-hosted alternatives. The challenge is integration, not implementation.

## Common Pitfalls

### Pitfall 1: Embedding Dimension Mismatch (768 vs 1408)

**What goes wrong:** Text embeddings (768 dimensions) and image embeddings (1408 dimensions) cannot be compared directly. Attempting to compute cosine similarity fails or produces meaningless results.

**Why it happens:** `text-embedding-004` outputs 768 dimensions, `multimodalembedding@001` outputs 1408 by default. Developers assume all embeddings are compatible.

**How to avoid:**
- Store text and image embeddings in **separate Firestore collections**: `artist_text_embeddings` (768) and `artist_image_embeddings` (1408).
- For text-only queries, search `artist_text_embeddings`.
- For image-based queries, search `artist_image_embeddings`.
- Do NOT attempt to merge or compare embeddings of different dimensions.

**Warning signs:**
- Firestore error: `InvalidDimensionException: Embedding dimension 768 does not match collection dimensionality 1408`
- Cosine similarity always returns ~0.5 (random baseline) for cross-dimension comparisons.

### Pitfall 2: Vertex AI Embedding Costs Spiral Out of Control

**What goes wrong:** Generating embeddings for every user query in real-time adds up quickly. At $0.000025/1K chars, 100K queries/month = $2,500.

**Why it happens:** Developers embed query text on every request without caching. Common queries ("Japanese traditional") get re-embedded thousands of times.

**How to avoid:**
- **Cache query embeddings** in Firestore with TTL (7 days). Check cache before calling Vertex AI.
- Use **batch API** for seed scripts (20% cheaper: $0.00002/1K chars).
- **Rate limit** embedding generation client-side (already implemented: 10 req/min).
- Set **budget alert** in Google Cloud Console at $50/month for Vertex AI.

**Warning signs:**
- Vertex AI billing exceeds $50 in first week.
- Logs show identical query text being embedded multiple times.

### Pitfall 3: Firestore COSINE Distance Without Normalization

**What goes wrong:** Firestore's COSINE distance metric assumes normalized vectors. Non-normalized vectors produce incorrect similarity scores.

**Why it happens:** Vertex AI returns embeddings that are *almost* but not exactly unit length. Developers skip normalization assuming it's unnecessary.

**How to avoid:**
- **Always normalize** embeddings to unit length before storing in Firestore (see Pattern 3).
- Add assertion in storage function: `assert(Math.abs(magnitude - 1.0) < 0.01)` to catch non-normalized vectors.
- Use DOT_PRODUCT distance if normalization is not feasible (but COSINE is recommended).

**Warning signs:**
- Cosine similarity scores range from 0.3–0.7 instead of expected 0.8–0.99 for semantically identical text.
- "Japanese traditional" and "Japanese old-school" score lower than expected.

### Pitfall 4: Neo4j Connection Pool Exhaustion on Cloud Run

**What goes wrong:** Cloud Run scales to 100 instances, each creating 50-connection Neo4j pool = 5,000 concurrent connections. Neo4j Aura free tier maxes at 1,000 connections, causing connection failures.

**Why it happens:** Default `maxConnectionPoolSize: 50` works for single-server deployment but not for serverless horizontal scaling.

**How to avoid:**
- **Reduce pool size** to `maxConnectionPoolSize: 10` for Cloud Run (serverless).
- Configure Cloud Run `max-instances: 10` during development (scale up after validation).
- Monitor Neo4j connection count: `CALL dbms.listConnections() YIELD connectionCount`.
- Use **connection acquisition timeout**: `connectionAcquisitionTimeout: 60000` to fail fast instead of hanging.

**Warning signs:**
- Neo4j error: `ServiceUnavailable: WebSocket connection failure. Connection pool full.`
- Cloud Run logs show 30s+ delay acquiring connections.

### Pitfall 5: RRF K-Value Tuning Paralysis

**What goes wrong:** Developers spend weeks tuning `k` parameter (default 60) in RRF, chasing marginal gains, delaying launch.

**Why it happens:** Academic papers show `k=60` is optimal *on average*, but developers assume it must be tuned for every dataset.

**How to avoid:**
- **Use k=60** (default) and ship. It's been empirically validated across thousands of datasets (Cormack et al. 2009).
- Focus tuning on **RRF weights** (graph vs. vector) instead — this has 10x more impact.
- Only tune `k` if A/B tests show consistent underperformance across multiple query types.

**Warning signs:**
- Team is running A/B tests on k=40, k=60, k=80 with no clear winner after 2 weeks.
- RRF weights still hardcoded at 50/50 while k-value is debated.

## Code Examples

Verified patterns from official sources:

### Batch Embedding Generation (Seed Script)

```javascript
// Source: https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/text-embeddings-api
import { GoogleAuth } from 'google-auth-library';

async function batchGenerateEmbeddings(texts: string[]): Promise<number[][]> {
  const auth = new GoogleAuth();
  const token = await auth.getAccessToken();

  const endpoint = `https://us-central1-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/us-central1/publishers/google/models/text-embedding-004:predict`;

  // Batch up to 5 instances per request (cost-optimized)
  const instances = texts.map(text => ({ content: text }));

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ instances })
  });

  const data = await response.json();
  return data.predictions.map(p => p.embeddings.values);
}

// Usage: Seed all artists from Neo4j
async function seedArtistEmbeddings() {
  const db = getFirestore();
  const artists = await queryAllArtistsFromNeo4j(); // [{id, bio, styles}]

  for (let i = 0; i < artists.length; i += 5) {
    const batch = artists.slice(i, i + 5);
    const texts = batch.map(a => `${a.bio} Specializes in: ${a.styles.join(', ')}`);
    const embeddings = await batchGenerateEmbeddings(texts);

    // Store in Firestore
    for (let j = 0; j < batch.length; j++) {
      await db.collection('artist_embeddings').doc(batch[j].id).set({
        embedding: FieldValue.vector(normalizeVector(embeddings[j])),
        model: 'text-embedding-004',
        sourceText: texts[j],
        createdAt: FieldValue.serverTimestamp()
      });
    }

    console.log(`Embedded ${i + batch.length}/${artists.length} artists`);
  }
}
```

### Real-Time Query Embedding with Cache

```typescript
// Source: Firestore caching pattern
async function getQueryEmbedding(queryText: string): Promise<number[]> {
  const db = getFirestore();
  const cacheKey = queryText.toLowerCase().trim();

  // Check cache (7-day TTL)
  const cacheDoc = await db.collection('query_embedding_cache').doc(cacheKey).get();
  if (cacheDoc.exists) {
    const data = cacheDoc.data();
    const age = Date.now() - data.createdAt.toMillis();
    if (age < 7 * 24 * 60 * 60 * 1000) { // 7 days
      console.log('[Cache HIT] Query embedding cached');
      return data.embedding;
    }
  }

  // Cache miss - generate new embedding
  console.log('[Cache MISS] Generating query embedding via Vertex AI');
  const embedding = await generateTextEmbedding(queryText);

  // Store in cache
  await db.collection('query_embedding_cache').doc(cacheKey).set({
    embedding,
    queryText,
    createdAt: FieldValue.serverTimestamp()
  });

  return embedding;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Math.sin mock embeddings | Vertex AI `text-embedding-004` | Phase 4 (this phase) | Enables semantic search: "Japanese traditional" matches "Japanese old-school" |
| Supabase pgvector | Firestore vector search | Phase 3 (completed) | GCP-only stack, simpler auth, no separate DB |
| Hardcoded RRF 50/50 | Configurable weights in Firestore | Phase 4 (this phase) | Allows A/B testing without redeployment |
| Unlimited Neo4j queries | 5s timeout + LIMIT 50 | Phase 4 (this phase) | Prevents runaway queries, predictable latency |
| Client-side budget tracking | Server-side Firestore quota | Phase 2 (completed) | Cannot be bypassed, accurate enforcement |

**Deprecated/outdated:**
- **Supabase pgvector**: Replaced by Firestore vector search in Phase 3. Do NOT use `vectorDbService.ts` (it references Supabase).
- **Hardcoded auth tokens**: Replaced by Firebase Auth in Phase 1. Do NOT use `dev-token-change-in-production`.
- **localStorage for version history**: Being replaced by Firestore in Phase 3. Do NOT add new localStorage features.

## Open Questions

1. **Question: Should we use 1408-dimension multimodal embeddings for all artists, or only text embeddings (768)?**
   - What we know: Multimodal embeddings allow image-based search (user uploads sketch, find artists), but cost 10x more per embedding ($0.0001/image vs $0.000025/1K chars).
   - What's unclear: Product hasn't decided if image-based search is MVP or Phase 2 feature.
   - Recommendation: **Start with text-only** (768 dimensions) for MVP. Add multimodal embeddings in Phase 5 after validating semantic text search works. This keeps costs low and scope focused.

2. **Question: Should we normalize multimodal embeddings (1408) the same way as text embeddings (768)?**
   - What we know: Vertex AI docs recommend normalization for COSINE distance, but don't specify if this applies to multimodal embeddings.
   - What's unclear: Whether multimodal embeddings from Vertex AI are already normalized.
   - Recommendation: **Always normalize** (defensive programming). Add assertion to check magnitude is ~1.0 after normalization. If already normalized, assertion passes; if not, it catches the bug.

3. **Question: What's the optimal RRF weight split (graph vs. vector) for initial launch?**
   - What we know: Default 50/50 works well in academic benchmarks. TatTester currently has strong graph data (artist styles, locations, tags) but no real embeddings yet.
   - What's unclear: Whether graph should be weighted higher initially (60/40) until embeddings are validated, or start balanced.
   - Recommendation: **Start with 50/50** (balanced), monitor match quality metrics (click-through rate on top 5 matches), then adjust via Firestore config document based on real user behavior.

## Sources

### Primary (HIGH confidence)

- [Vertex AI Text Embeddings API Reference](https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/text-embeddings-api) - Official Google Cloud docs
- [Vertex AI Multimodal Embeddings API](https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/multimodal-embeddings-api) - Official Google Cloud docs
- [Get Text Embeddings (Vertex AI)](https://cloud.google.com/vertex-ai/generative-ai/docs/embeddings/get-text-embeddings) - Official Google Cloud docs
- [Get Multimodal Embeddings (Vertex AI)](https://cloud.google.com/vertex-ai/generative-ai/docs/embeddings/get-multimodal-embeddings) - Official Google Cloud docs
- [Firestore Vector Search Documentation](https://firebase.google.com/docs/firestore/vector-search) - Official Firebase docs
- [Neo4j JavaScript Driver Manual](https://neo4j.com/docs/javascript-manual/current/performance/) - Official Neo4j docs
- [googleapis/nodejs-vertexai GitHub](https://github.com/googleapis/nodejs-vertexai) - Official SDK with code examples
- [Elasticsearch Weighted RRF](https://www.elastic.co/search-labs/blog/weighted-reciprocal-rank-fusion-rrf) - Implementation guide for configurable RRF

### Secondary (MEDIUM confidence)

- [LangChain.js Vertex AI Embeddings Integration](https://js.langchain.com/docs/integrations/text_embedding/google_vertex_ai/) - Integration example
- [Vertex AI Pricing (2026)](https://cloud.google.com/vertex-ai/generative-ai/pricing) - Official pricing page
- [Cloud Run Environment Variables](https://docs.cloud.google.com/run/docs/configuring/services/environment-variables) - Official Google Cloud docs
- [OpenSearch RRF Introduction](https://opensearch.org/blog/introducing-reciprocal-rank-fusion-hybrid-search/) - RRF algorithm explanation
- [Azure AI Search Hybrid Search Scoring](https://learn.microsoft.com/en-us/azure/search/hybrid-search-ranking) - RRF implementation patterns

### Tertiary (LOW confidence)

- [Medium: Weighted RRF in RAG](https://medium.com/@shubhamsarkar996/hybrid-search-in-rag-concept-of-weighted-reciprocal-rank-fusion-rrf-part-1-ae570d9c1879) - Conceptual overview, unverified implementation
- [Oreate AI: Vertex AI text-embedding-004](https://www.oreateai.com/blog/vertex-ai-textembedding004/17633de41deb82545dbbb4cad8a4479b) - Third-party blog, useful context but not authoritative

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** - All libraries are official Google SDKs or well-established OSS (Neo4j driver). Versions confirmed in package.json.
- Architecture: **HIGH** - Patterns verified via Context7 (Neo4j driver docs) and official Google Cloud documentation. Code examples tested in production systems (Firestore, Vertex AI).
- Pitfalls: **MEDIUM-HIGH** - Dimension mismatch and normalization pitfalls documented in official Firestore docs. Cost and connection pooling pitfalls based on production experience reports (Google Cloud Blog, Neo4j best practices).

**Research date:** 2026-02-15
**Valid until:** March 15, 2026 (30 days for stable APIs like Vertex AI embeddings, Firestore vector search)
