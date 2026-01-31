# External Integrations

**Analysis Date:** 2026-01-31

## APIs & External Services

**AI & Image Generation:**
- **Replicate** - SDXL and anime model inference for tattoo design generation
  - SDK/Client: `replicate@1.4.0`
  - Auth: `REPLICATE_API_TOKEN` (backend) and `VITE_REPLICATE_API_TOKEN` (frontend)
  - Services: `src/services/replicateService.js` handles all Replicate API calls via proxy
  - Cost: ~$0.003-0.03 per generation depending on model
  - Budget controls: `VITE_MAX_DAILY_SPEND` and `VITE_TOTAL_BUDGET` environment variables

- **Google Vertex AI** - Gemini models for LLM Council and prompt enhancement
  - SDK/Client: `@google-cloud/vertexai@1.10.0`
  - Auth: GCP service account (`gcp-service-account-key.json`)
  - Services: `src/services/vertex-ai-service.js` - Gemini 2.0 Flash (60 RPM free tier)
  - Also provides: Imagen 3 image generation, Vision API for layer decomposition, Multimodal embeddings
  - Project ID: `GCP_PROJECT_ID` (default: 'tatt-pro'), Region: `GCP_REGION` (default: 'us-central1')

- **Google Vision API** - Image analysis and layer decomposition
  - SDK/Client: `@google-cloud/vision@5.3.4`
  - Auth: GCP service account
  - Usage: Stencil edge detection and layer decomposition in `src/services/stencilEdgeService.js`

- **Google Cloud Storage (GCS)** - Asset storage for designs, stencils, and layers
  - SDK/Client: `@google-cloud/storage@7.18.0`
  - Auth: GCP service account
  - Bucket: `tatt-pro.firebasestorage.app`
  - Service: `src/services/gcs-service.ts` handles uploads, signed URLs, and deletions
  - CORS configuration: `gcs-cors.json`
  - Upload endpoints: `/api/v1/storage/upload`, `/api/v1/upload-layer`

- **OpenRouter (Optional)** - Multi-model LLM API for council enhancement
  - SDK/Client: Custom HTTP client
  - Auth: `OPENROUTER_API_KEY`
  - Service: `src/services/openRouterCouncil.js`
  - Models: Claude 3.5 Sonnet, GPT-4 Turbo, Gemini Pro 1.5
  - Estimated cost: $0.01-0.03 per enhancement
  - Feature flag: `VITE_USE_OPENROUTER`

## Data Storage

**Databases:**

- **Neo4j** - Graph database for artist networks, genealogy, and relationships
  - Connection: `neo4j-driver@6.0.1`
  - URI: `NEO4J_URI` (environment variable, default: `bolt://localhost:7687`)
  - Auth: `NEO4J_USER` and `NEO4J_PASSWORD`
  - Service: `src/services/neo4jService.ts` and `src/lib/neo4j.ts`
  - API Route: `/api/neo4j/query` (server.js line 334)
  - Used for: Artist matching, mentorship networks, genealogical queries

- **Supabase (PostgreSQL + pgvector)** - Relational database with vector search
  - Connection: `@supabase/supabase-js@2.90.1`
  - URL: `NEXT_PUBLIC_SUPABASE_URL` (https://yfcmysjmoehcyszvkxsr.supabase.co)
  - Keys: `NEXT_PUBLIC_SUPABASE_ANON_KEY` (client) and `SUPABASE_SERVICE_KEY` (server)
  - Extensions: pgvector for semantic similarity search
  - Table: `portfolio_embeddings` (4096-dimensional CLIP embeddings)
  - Service: `src/services/vectorDbService.js` and config `src/config/vectorDbConfig.js`
  - Used for: Semantic artist matching via cosine similarity

- **Firebase Realtime Database** - Real-time match updates for Match Pulse feature
  - Connection: `firebase@12.8.0`, `firebase-admin@13.6.0`
  - Database URL: `NEXT_PUBLIC_FIREBASE_DATABASE_URL` and `FIREBASE_DATABASE_URL`
  - Project ID: `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
  - Service: `src/services/firebase-match-service.js`
  - Latency: <100ms for live artist suggestions
  - Used for: Match Pulse real-time updates as users design

**File Storage:**
- **Google Cloud Storage** - Primary storage for designs, layers, stencils, portfolio images
- **Local filesystem** - `/uploads/layers` directory for temporary layer storage (served via Express static middleware)

**Caching:**
- **In-memory cache** - Query result caching in `src/services/hybridMatchService.ts` (5-minute TTL)
- No Redis or external cache layer currently configured

## Authentication & Identity

**Auth Provider:**
- **Custom token-based authentication** - Bearer token verification
  - Implementation: `src/lib/api-auth.ts` verifies `FRONTEND_AUTH_TOKEN` header
  - Backend proxy server checks token for all protected endpoints
  - Token shared between Vercel (frontend) and Railway (backend) via environment variables

- **Google Service Account** - For GCP services (Vertex AI, Cloud Storage, Vision)
  - File: `gcp-service-account-key.json`
  - Credentials: `GOOGLE_APPLICATION_CREDENTIALS` environment variable

- **Firebase Authentication** - Optional for future client-side auth
  - Not currently used for user authentication, only for Realtime Database access
  - Config: `src/services/firebase-match-service.js` (lines 17-26)

## Monitoring & Observability

**Error Tracking:**
- Not detected - Consider Sentry or similar (commented in `.env.example` as `VITE_SENTRY_DSN`)

**Logs:**
- Console logging throughout services (console.log, console.error)
- Server logs via Express middleware
- No centralized logging service configured

**Webhooks & Callbacks:**
- Not detected - No webhook endpoints currently implemented

## CI/CD & Deployment

**Hosting:**
- **Frontend**: Vercel (Next.js deployment)
  - URL: `https://tat-t-3x8t.vercel.app`
  - Auto-deploys from git commits

- **Backend**: Railway (Node.js/Express server)
  - Runs `server.js` with auto-configured `PORT` environment variable
  - Configuration: `railway.json`

**CI Pipeline:**
- Vercel auto-deployment (build and deploy on push)
- No GitHub Actions or explicit CI service detected

## Environment Configuration

**Required env vars (Critical):**
- `REPLICATE_API_TOKEN` - Image generation (backend)
- `GCP_PROJECT_ID` - Vertex AI access
- `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD` - Graph database
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Vector search
- `SUPABASE_SERVICE_KEY` - Server-side vector operations
- `NEXT_PUBLIC_FIREBASE_*` - Realtime match updates
- `FRONTEND_AUTH_TOKEN` - API authentication

**Optional env vars:**
- `OPENROUTER_API_KEY` - Alternative LLM Council provider
- `VITE_USE_OPENROUTER` - Enable OpenRouter (default: false)
- `VITE_COUNCIL_API_URL` - Custom council backend endpoint
- `VITE_COUNCIL_DEMO_MODE` - Test without backend (default: true)
- `VITE_ENABLE_INPAINTING`, `VITE_ENABLE_STENCIL_EXPORT`, `VITE_ENABLE_AR_PREVIEW` - Feature flags
- `VITE_ANALYTICS_ID`, `VITE_SENTRY_DSN` - Analytics (not implemented)

**Secrets location:**
- `.env.local` - Development (git-ignored)
- `.env.example` - Template with safe defaults
- Railway/Vercel environment variables - Production
- GCP Service Account keys stored as files (git-ignored)
- Firebase Admin key stored as file (git-ignored)

## Request Flow & Rate Limiting

**API Proxy Server (server.js):**
- Express server listens on `PORT` (Railway default) or 3002 (local)
- All API routes require `FRONTEND_AUTH_TOKEN` Bearer token verification
- CORS whitelist: `ALLOWED_ORIGINS` with Vercel domain support

**Rate Limiters:**
- Global: 30 requests/minute
- Semantic match: 100 requests/hour
- Council enhancement: 20 requests/hour
- AR visualization: TBD (configured in server.js)
- Configured via `express-rate-limit@8.2.1`

**Main API Routes in server.js:**
- `/api/v1/match/semantic` - Hybrid vector-graph matching
- `/api/v1/council/enhance` - LLM prompt enhancement
- `/api/v1/ar/visualize` - AR preview generation
- `/api/v1/stencil/export` - Stencil export
- `/api/v1/layers/decompose` - Image layer analysis
- `/api/v1/embeddings/generate` - Embedding generation
- `/api/v1/generate` - Imagen 3 generation
- `/api/v1/storage/upload` - GCS upload
- `/api/v1/storage/get-signed-url` - GCS signed URL
- `/api/neo4j/query` - Neo4j graph queries

## Configuration Files

**Next.js:**
- `next.config.ts` - Disables Node.js module resolution for browser build (fs, net, GCP SDKs)
- Entry points: `src/app/page.tsx` (home), `src/app/generate/page.tsx` (design tool)

**API Routes:**
- `src/app/api/` - Next.js API routes (supersede some server.js routes)
- Critical routes: `/api/v1/match/update`, `/api/v1/embeddings/generate`, `/api/v1/council/enhance`

---

*Integration audit: 2026-01-31*
