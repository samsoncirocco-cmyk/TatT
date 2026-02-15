# Research Summary: TatTester GCP Migration

**Date:** 2026-02-15
**Status:** Complete

## 1. Auth & Storage

**Firebase Auth:** Use `firebase/auth` with `onAuthStateChanged` for session management in Next.js 16. Middleware route guards protect `/api/v1/*`. Session cookies for SSR. `useAuth()` hook wraps state globally via React Context.

**Firestore Data Model:**
```
users/{userId}
  └─ designs/{designId}
       ├─ layers: Layer[]
       ├─ metadata: { bodyPart, aspectRatio, createdAt, updatedAt }
       ├─ prompt, enhancedPrompt
       └─ versions/{versionId}
            ├─ layers, timestamp, branchedFrom, isFavorite
```

**Migration Strategy — Dual Write:**
1. Write to both localStorage and Firestore during transition
2. Read from Firestore when available, fallback to localStorage
3. Background sync existing localStorage designs on first auth
4. Delete localStorage entries after confirmed Firestore write

**Cloud Storage + CDN:** Upload to `{project}-tattester-images` bucket. Folder: `generated/{userId}/{designId}/{layerId}.png`. Cloud CDN: 24hr cache for generated, 7-day for portfolios. ~$20/month at MVP scale.

## 2. Infrastructure & Security

**Cloud Run:** Standalone Next.js output. Min instances=1, max=10, timeout=300s, concurrency=80, 2GB memory, 2 vCPU.

**API Gateway Rate Limits:**
- Generation: 20/hr per user
- Matching: 100/hr per user
- Council: 20/hr per user
- Health: unlimited

**Cloud Armor:** 100 req/min per IP global, OWASP CRS 3.0 baseline, automatic L3/L4 DDoS.

**Secret Manager Migration:** All tokens (Replicate, Firebase, Neo4j, OpenRouter) → Secret Manager. Inject via `gcloud run deploy --set-secrets`. Eliminate all hardcoded fallbacks.

**Cloud Tasks:** Max 3 concurrent generations per user, 120s timeout, dead letter after 3 retries.

**Neo4j from Cloud Run:** Session pooling (maxConnectionPoolSize: 50), 5s query timeout, LIMIT 50 on all Cypher queries.

## 3. Embeddings & Matching

**Vertex AI text-embedding-004:** 768 dimensions, ~$0.0001 per artist profile, batch 100 per request, ~200ms single / ~800ms batch.

**Storage Decision — Firestore for MVP:** At <10K artists, store embeddings as arrays in Firestore. Cosine similarity in Cloud Run (~50ms for 10K vectors). Vector Search minimum is $120/month — overkill for MVP. Upgrade path clear at 50K+ artists.

**CLIP Image Embeddings:** Vertex AI `multimodalembedding@001`, 1408 dimensions, $0.00015/image.

**Hybrid Matching Fix:** Replace `Math.sin(hash)` mock with real `text-embedding-004` calls. Cache embeddings 24hr. Make RRF weights configurable via Firestore config doc. A/B test via BigQuery.

**Artist Data Seeding:** Python script loads artist CSV → generates text embeddings → generates CLIP embeddings → writes Firestore + Neo4j (dual-write).

## 4. DOE Framework & Ops

**Directory Structure:**
```
pangyo/
├── src/                     # Existing Next.js app
├── directives/              # Markdown SOPs
│   ├── deploy.md, seed-artists.md, generate-embeddings.md
│   ├── migrate-data.md, monitor-budget.md, update-neo4j.md
│   └── rollback-deployment.md
├── execution/               # Deterministic Python scripts
│   ├── seed_artists.py, generate_embeddings.py, validate_env.py
│   ├── migrate_localStorage.py, check_budget.py, sync_neo4j.py
│   └── requirements.txt
└── .github/workflows/       # CI/CD
    ├── test-execution.yml, build-deploy.yml, monitor-budget.yml
```

**Self-Annealing:** Each directive has "Known Issues" section updated when scripts fail. Pattern: fail → fix script → test → update directive → system stronger.

**Onboarding:** New engineer reads directives/ → runs validate_env.py → follows deploy.md → productive in 2-3 hours.

**Monitoring:** Cloud Monitoring dashboards for latency, errors, budget. Alerts: budget >80% (critical), error rate >5% (warning), p95 latency >2s (warning).

## Confidence

| Area | Confidence | Notes |
|------|------------|-------|
| Auth & Storage | HIGH | Standard Firebase + Firestore pattern |
| Infrastructure | HIGH | Mature GCP services, well-documented |
| Embeddings | MEDIUM | Firestore cosine sim needs perf validation at scale |
| DOE Framework | MEDIUM | Self-annealing requires cultural adoption |

**Overall: HIGH (75%)**

---
*Research completed: 2026-02-15*
