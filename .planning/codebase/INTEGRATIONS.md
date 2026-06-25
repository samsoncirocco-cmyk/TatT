# External Integrations

**Analysis Date:** 2026-01-31

## APIs & External Services

**Google Cloud Platform (Vertex AI):**
- Imagen 3 (`imagen-3.0-generate-001`) - AI tattoo design generation via REST API
  - SDK/Client: `@google-cloud/vertexai`, `@google-cloud/aiplatform`
  - Auth: `GOOGLE_APPLICATION_CREDENTIALS` (service account key path)
  - Project: `GCP_PROJECT_ID` (tatt-pro)
  - Region: `GCP_REGION` (us-central1)
  - Implementation: `src/services/vertex-ai-edge.ts`, `src/services/generationService.ts`

- Gemini 2.0 Flash (`gemini-2.0-flash-exp`) - LLM for prompt enhancement
  - SDK/Client: `@google-cloud/vertexai`
  - Auth: Same GCP service account
  - Implementation: `src/services/councilService.ts`

- Vision AI (`imagetext@001`) - Image analysis and layer decomposition
  - SDK/Client: `@google-cloud/vision` (ImageAnnotatorClient)
  - Auth: Same GCP service account
  - Implementation: `src/app/api/v1/layers/decompose/route.ts`

- Multimodal Embeddings (`multimodalembedding@001`) - 4096-dim CLIP embeddings for semantic search
  - SDK/Client: REST API via fetch with GCP access tokens
  - Auth: `google-auth-library` for edge-compatible token generation
  - Implementation: `src/services/vertex-ai-edge.ts` (generateEmbedding), `src/features/match-pulse/services/embeddingService.ts`

**Replicate:**
- Segment Anything Model (SAM) - Image segmentation for layer extraction
  - SDK/Client: `replicate` npm package
  - Auth: `REPLICATE_API_TOKEN` (server-side only)
  - Model: `cjwbw/segment-anything:07788b48270c1953bb4d28929e3776ac7639537f71e1641f9d2757529452b414`
  - Implementation: `src/lib/segmentation.ts`
  - Note: Fallback option when Vertex AI segmentation unavailable

**OpenRouter (Optional):**
- LLM Council - Multi-model prompt enhancement via OpenRouter API
  - SDK/Client: Custom fetch calls to OpenRouter REST API
  - Auth: `OPENROUTER_API_KEY`
  - Models: Claude 3.5 Sonnet, GPT-4 Turbo, Gemini Pro 1.5
  - Implementation: `src/services/councilService.ts`
  - Usage: Feature flag `NEXT_PUBLIC_USE_OPENROUTER` (default: false)

## Data Storage

**Databases:**
- Google Cloud Storage (GCS)
  - Bucket: `GCS_BUCKET_NAME` (tatt-pro-assets)
  - Connection: `GOOGLE_APPLICATION_CREDENTIALS`
  - Client: `@google-cloud/storage` SDK
  - Purpose: Store designs, layers, stencils (300dpi), portfolio images
  - Implementation: `src/services/gcs-service.ts`
  - Structure:
    - `designs/` - Generated tattoo designs
    - `layers/` - Decomposed design layers + thumbnails
    - `stencils/` - High-res 300dpi stencil exports
    - `portfolios/` - Artist portfolio images

- Supabase (PostgreSQL + pgvector)
  - Connection: `NEXT_PUBLIC_SUPABASE_URL` (https://yfcmysjmoehcyszvkxsr.supabase.co)
  - Auth (client): `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Auth (server): `SUPABASE_SERVICE_ROLE_KEY`
  - Client: `@supabase/supabase-js`
  - Purpose: Artist profiles, vector embeddings (4096-dim CLIP), semantic search
  - Tables: `portfolio_embeddings` with pgvector extension
  - Implementation: `src/features/match-pulse/services/vectorDbService.ts`, `src/features/match-pulse/services/hybridMatchService.ts`

- Neo4j (Graph Database)
  - Connection: `NEO4J_URI` (neo4j+s://36767c9d.databases.neo4j.io)
  - Auth: `NEO4J_USERNAME`, `NEO4J_PASSWORD`
  - Client: `neo4j-driver`
  - Purpose: Artist genealogy, mentorship networks, relationship-based matching
  - Implementation: `src/lib/neo4j.ts`, `src/features/match-pulse/services/neo4jService.ts`
  - Endpoint: `/api/neo4j/query`

- Firebase Realtime Database
  - Connection: `FIREBASE_DATABASE_URL` (https://tatt-pro-default-rtdb.firebaseio.com)
  - Auth (client): Firebase config with `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, etc.
  - Auth (server): `firebase-admin` with service account from `GOOGLE_APPLICATION_CREDENTIALS`
  - Client: `firebase/database` (client), `firebase-admin` (server)
  - Purpose: Real-time artist match updates (Match Pulse <100ms sync)
  - Schema: `matches/{userId}/current` - live artist recommendations
  - Implementation: `src/services/firebase-match-service.js`

**File Storage:**
- Google Cloud Storage (see above)

**Caching:**
- In-memory query cache in `src/features/match-pulse/services/hybridMatchService.ts`
  - TTL: 5 minutes
  - Purpose: Cache semantic match results to reduce Vertex AI API calls

## Authentication & Identity

**Auth Provider:**
- Custom token-based authentication
  - Implementation: Bearer token verification
  - Token: `FRONTEND_AUTH_TOKEN` / `NEXT_PUBLIC_FRONTEND_AUTH_TOKEN`
  - Middleware: `src/lib/api-auth.ts` (verifyApiAuth function)
  - Applied to: All `/api/v1/*` routes

**GCP Service Account:**
- File-based authentication
  - Key file: `GOOGLE_APPLICATION_CREDENTIALS` → `./gcp-service-account-key.json`
  - Used for: Vertex AI, GCS, Vision AI
  - Edge-compatible: `src/lib/google-auth-edge.ts` generates access tokens via `google-auth-library`

**Firebase Auth:**
- Client SDK initialized but primarily used for database access
  - Config: Multiple `NEXT_PUBLIC_FIREBASE_*` environment variables
  - Implementation: `src/services/firebase-match-service.js`

## Monitoring & Observability

**Error Tracking:**
- Custom logging utility
  - Implementation: `src/lib/observability.ts` (logEvent function)
  - Destinations: Console logs

**Logs:**
- Console-based logging with structured prefixes:
  - `[Firebase]` - Firebase operations
  - `[GCS]` - Google Cloud Storage operations
  - `[Neo4j]` - Graph database operations
  - `[HybridMatch]` - Semantic matching pipeline
  - `[PERF]` - Performance metrics
  - `[Segmentation]` - Image segmentation operations
  - `[CouncilService]` - LLM council operations

## CI/CD & Deployment

**Hosting:**
- Vercel
  - Project: manama-next
  - Project ID: `prj_avt0C5zThGOVeEhZl6VgwuOEQF3o`
  - Org ID: `team_J8oAAeW3ck0OxWkCMRALUdTE`
  - Config: `.vercel/project.json`
  - Supports: Edge runtime, Node.js runtime, serverless functions

**CI Pipeline:**
- Vercel Git integration (auto-deploy on push)
- Manual trigger: `.vercel-deploy-trigger` file

**Docker Support:**
- Multi-stage Dockerfile with Node 20-alpine
- Stages: deps, development, builder, production
- Compose: `docker-compose.yml` present
- Dev server: Port 3000

## Environment Configuration

**Required env vars:**

GCP/Vertex AI:
- `GCP_PROJECT_ID` - tatt-pro
- `GCP_REGION` - us-central1
- `GOOGLE_APPLICATION_CREDENTIALS` - ./gcp-service-account-key.json
- `GCS_BUCKET_NAME` - tatt-pro-assets

Firebase:
- `FIREBASE_DATABASE_URL` - https://tatt-pro-default-rtdb.firebaseio.com
- `NEXT_PUBLIC_FIREBASE_*` - Client SDK configuration (8 vars)

Supabase:
- `NEXT_PUBLIC_SUPABASE_URL` - https://yfcmysjmoehcyszvkxsr.supabase.co
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public key for client access
- `SUPABASE_SERVICE_ROLE_KEY` - Secret key for server operations

Neo4j:
- `NEO4J_URI` - neo4j+s://36767c9d.databases.neo4j.io
- `NEO4J_USERNAME` - neo4j
- `NEO4J_PASSWORD` - Database password

Authentication:
- `FRONTEND_AUTH_TOKEN` - Shared secret for API authentication
- `NEXT_PUBLIC_FRONTEND_AUTH_TOKEN` - Client-side auth token

Optional:
- `REPLICATE_API_TOKEN` - Replicate API for SAM fallback
- `OPENROUTER_API_KEY` - OpenRouter LLM council
- `VERTEX_SEGMENTATION_ENDPOINT_ID` - Custom Vertex AI segmentation endpoint

**Secrets location:**
- `.env.local` (gitignored)
- Service account keys in project root (gitignored)
  - `gcp-service-account-key.json`
  - `firebase-admin-key.json`

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- None detected

## API Endpoints

**Internal API Routes:**

Image Generation:
- `POST /api/v1/generate` - Generate tattoo designs with Imagen 3
- `POST /api/generate` - Legacy generate endpoint
- `POST /api/predictions` - Replicate predictions
- `GET /api/predictions/[id]` - Poll prediction status

Matching & Search:
- `POST /api/v1/match/update` - Update artist matches for design
- `POST /api/v1/match/semantic` - Semantic artist search
- `POST /api/neo4j/query` - Graph database queries

Image Processing:
- `POST /api/v1/layers/decompose` - Decompose design into layers
- `POST /api/v1/embeddings/generate` - Generate image embeddings
- `POST /api/v1/stencil/export` - Export high-res stencil

Storage:
- `POST /api/v1/storage/upload` - Upload to GCS
- `POST /api/v1/storage/get-signed-url` - Get GCS signed URL
- `POST /api/v1/upload-layer` - Upload layer image

Enhancement:
- `POST /api/v1/council/enhance` - LLM prompt enhancement

AR/Preview:
- `POST /api/v1/ar/visualize` - AR body placement preview

Health:
- `GET /api/health` - System health check
- `GET /api/debug` - Debug endpoint

---

*Integration audit: 2026-01-31*
