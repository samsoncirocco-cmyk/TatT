# External Integrations

**Analysis Date:** 2026-02-15

## APIs & External Services

**Image Generation:**
- Replicate API - AI image generation via SDXL, Anime XL, DreamShaper XL, Classic Flash models
  - SDK/Client: `replicate` npm package
  - Implementation: `src/services/replicateService.ts`
  - Auth: Server-side token `REPLICATE_API_TOKEN` (never exposed to client)
  - Proxy: Backend at `/api/predictions` and `/api/predictions/{id}`
  - Cost tracking: $0.001-$0.03 per image, budget managed in localStorage

- Google Cloud Vertex AI - Image generation (Imagen 3) and prompt enhancement (Gemini 2.0)
  - SDK/Client: `@google-cloud/aiplatform`, `@google-cloud/vertexai`
  - Implementation: `src/services/vertex-ai-edge.ts`, `src/lib/vertex-imagen-client.js`
  - Auth: Service account credentials via `VERTEX_PROJECT_ID`, `VERTEX_LOCATION`
  - Endpoints: `/api/v1/generate` (Imagen), `/api/v1/council/enhance` (Gemini)
  - Model: `imagegeneration@006` (Imagen 3), `gemini-2.0-flash-exp` (prompts)
  - Cost tracking: Configurable via `VERTEX_IMAGEN_COST_PER_IMAGE`, daily limits via `VERTEX_DAILY_REQUEST_LIMIT`

**AI Council/Prompt Enhancement:**
- Vertex AI Gemini - Multi-agent prompt refinement for tattoo designs
  - Implementation: `src/services/vertex-ai-edge.ts`, `src/services/councilService.ts`
  - Auth: GCP service account credentials
  - Provides: Simple, detailed, and ultra-level prompt variants
  - Returns: Negative prompts, style-aware suggestions

## Data Storage

**Databases:**

**Supabase Vector Database:**
- Type: PostgreSQL with pgvector extension
- Connection: `SUPABASE_URL`, `SUPABASE_ANON_KEY` (client), `SUPABASE_SERVICE_KEY` (server)
- Default URL: `https://yfcmysjmoehcyszvkxsr.supabase.co` (configured in `src/config/vectorDbConfig.js`)
- Purpose: Artist portfolio embeddings for semantic similarity search
- Client: `@supabase/supabase-js`
- Implementation: `src/services/vectorDbService.ts`
- Table: `portfolio_embeddings` (1408-dimensional CLIP embeddings)
- Operations: Cosine similarity search via RPC `match_portfolio_embeddings`, store/retrieve embeddings
- Features: Batch embedding storage, similarity scoring, metadata tracking

**Neo4j Graph Database:**
- Type: Property graph database (managed via Aura or self-hosted)
- Connection: Configured via `/api/neo4j/query` proxy endpoint
- Auth: Bearer token from `NEXT_PUBLIC_FRONTEND_AUTH_TOKEN`
- Feature flag: `NEXT_PUBLIC_NEO4J_ENABLED` (must be `'true'` to activate)
- Purpose: Artist-relationship graph (styles, specialties, mentor chains, influences)
- Implementation: `src/services/neo4jService.ts`
- Query language: Cypher (executed server-side at `src/app/api/neo4j/query/route.ts`)
- Key entities: Artist nodes with properties (name, city, styles, hourlyRate, portfolio)
- Relationships: APPRENTICED_UNDER (mentor-apprentice), INFLUENCED_BY (style influences)
- Queries: `findMatchingArtists`, `findArtistMatchesForPulse`, `getArtistGenealogy`, `getInfluencedArtists`

**Firebase Realtime Database:**
- Type: NoSQL real-time database (Google)
- Connection: Browser-based via Firebase SDK
- Auth: API key from `NEXT_PUBLIC_FIREBASE_API_KEY`
- Configuration: `NEXT_PUBLIC_FIREBASE_DATABASE_URL`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- Admin access: `FIREBASE_DATABASE_URL` (server-side only), `firebase-admin` SDK
- Purpose: Real-time artist match updates for Match Pulse feature (<100ms sync latency)
- Implementation: `src/services/firebase-match-service.ts`
- Operations: Subscribe to match updates, push new matches, read artist data
- Data structure: Nested JSON with design IDs as keys, artist suggestions as values

## File Storage

**Google Cloud Storage:**
- Service: Cloud Storage bucket for generated tattoo images
- Connection: `GCS_BUCKET` (bucket name), `GCS_UPLOAD_PREFIX` (path prefix for uploads)
- Auth: Service account credentials (automatic via `@google-cloud/storage`)
- Implementation: `src/lib/vertex-imagen-client.js`
- Features: Signed URL generation for private image access
- TTL: Configurable via `GCS_SIGNED_URL_TTL_MS` (default 1 hour)
- Use case: Storing Vertex AI generated images with expiring access URLs

**Browser Storage (Client-side):**
- localStorage: Design library, API usage tracking, user preferences, saved placements (5-50MB limit)
- sessionStorage: Layer management, temporary design state
- IndexedDB: Large image blobs (Future expansion)
- Implementation: `src/services/storageService.ts`
- Limits: 50 designs max, 90-day auto-purge for non-favorites

## Authentication & Identity

**Auth Providers:**

**Custom Bearer Token Auth:**
- Implementation: `src/lib/api-auth.ts`
- Token sources: `NEXT_PUBLIC_FRONTEND_AUTH_TOKEN` (client), `FRONTEND_AUTH_TOKEN` (server)
- Dev default: `'dev-token-change-in-production'` (visible for prototyping)
- Applied to: All backend API endpoints requiring authentication
- Header format: `Authorization: Bearer {token}`

**Firebase Auth (Optional):**
- Implementation: `src/services/firebase-match-service.ts`
- Uses: NEXT_PUBLIC_FIREBASE_API_KEY for client auth
- Purpose: Real-time database access (Match Pulse)
- Admin: firebase-admin for server operations

**Google Cloud Auth:**
- Method: Service account JSON credentials
- Scopes: Vertex AI (predictions), Cloud Storage (image upload), Vision API
- Implementation: Transparent via `@google-cloud/` SDKs

## Monitoring & Observability

**Error Tracking:**
- Approach: Console logging with prefixed categories (`[Replicate]`, `[Neo4j]`, `[API]`)
- Implementation: Distributed across service files
- Client-side: Errors logged to browser console
- Server-side: Errors logged to Node.js stdout (visible in deployment logs)
- No external error tracking service detected (TODO for production)

**Logs:**
- Console.log statements with service prefixes
- Budget tracking via localStorage (client-side)
- Usage stats: API call counts, cost accumulation, rate limiting

**Cost/Usage Tracking:**
- Replicate: `src/services/replicateService.ts` tracks cost per request in localStorage
- Vertex AI: Usage tracking via `usageState` object in `src/lib/vertex-imagen-client.js`
- Budget: $500 Replicate limit enforced client-side (MVP only - not production-safe)

## CI/CD & Deployment

**Hosting:**
- Primary: Vercel (Next.js native, serverless, edge functions)
- Alternative: Railway, Render, AWS Lambda, Google Cloud Run
- Next.js configuration: `next.config.ts` with webpack aliases for server-only imports

**CI Pipeline:**
- Not detected in codebase - relies on platform (Vercel auto-deploys on git push)
- Environment variables configured per deployment platform

**Build Process:**
- Development: `npm run dev` (Next.js dev server)
- Production: `npm run build` (Next.js static export + serverless functions)
- Server: `npm run server` (Express proxy server for development)

## Environment Configuration

**Required env vars (Frontend - NEXT_PUBLIC_ prefix):**
- `NEXT_PUBLIC_FRONTEND_AUTH_TOKEN` - API authentication
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase public key for embeddings
- `NEXT_PUBLIC_FIREBASE_API_KEY` - Firebase client API key
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` - Firebase auth domain
- `NEXT_PUBLIC_FIREBASE_DATABASE_URL` - Firebase Realtime DB URL
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID` - Firebase project ID
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` - Firebase storage bucket
- `NEXT_PUBLIC_NEO4J_ENABLED` - Enable/disable Neo4j integration (default: false)
- `NEXT_PUBLIC_DEMO_MODE` - Demo mode without API calls (default: false)

**Required env vars (Backend/Server - NO prefix):**
- `REPLICATE_API_TOKEN` - Replicate API authentication (server-side only)
- `SUPABASE_SERVICE_KEY` - Supabase privileged key for embeddings operations
- `SUPABASE_URL` - Supabase project URL (server-side backup)
- `SUPABASE_ANON_KEY` - Supabase anon key (server-side backup)
- `FIREBASE_DATABASE_URL` - Firebase Realtime DB URL (server-side)
- `FRONTEND_AUTH_TOKEN` - Custom bearer token for internal APIs
- `VERTEX_PROJECT_ID` - GCP project ID for Vertex AI
- `VERTEX_LOCATION` - GCP region (default: us-central1)
- `VERTEX_IMAGEN_MODEL` - Model ID for Imagen (default: imagegeneration@006)
- `VERTEX_IMAGEN_COST_PER_IMAGE` - Cost tracking (default: 0.03)
- `VERTEX_DAILY_REQUEST_LIMIT` - Daily quota (default: 0 = unlimited)
- `GCS_BUCKET` - Google Cloud Storage bucket name
- `GCS_UPLOAD_PREFIX` - Path prefix in bucket (default: generated)
- `GCS_SIGNED_URL_TTL_MS` - Signed URL expiry (default: 3600000ms)

**Secrets location:**
- Development: `.env` and `.env.local` files (git-ignored)
- Production: Platform-specific secret managers (Vercel Secrets, Railway Secrets, etc.)
- CI/CD: GitHub Secrets or platform secrets manager

## Webhooks & Callbacks

**Incoming:**
- None detected - API is request/response only

**Outgoing:**
- Firebase Realtime DB: Real-time listeners (not webhooks, but bidirectional streaming)
- Implementation: `onValue` callbacks in `src/services/firebase-match-service.ts`
- Purpose: Push match updates to client as artists are scored

## API Endpoints (Internal/Proxy)

**Health & Status:**
- `GET /api/health` - Public health check endpoint

**Generation:**
- `POST /api/predictions` - Create Replicate prediction (image generation)
- `GET /api/predictions/{id}` - Poll prediction status

**Council/Enhancement:**
- `POST /api/v1/council/enhance` - Prompt enhancement via Gemini (edge runtime)

**Image Generation:**
- `POST /api/v1/generate` - Vertex AI Imagen generation (edge runtime)

**Storage:**
- `POST /api/v1/storage/upload` - Upload image to GCS
- `GET /api/v1/storage/get-signed-url` - Get signed URL for GCS image

**Matching:**
- `POST /api/v1/match/semantic` - Vector similarity search
- `POST /api/v1/match/update` - Update match results
- `POST /api/neo4j/query` - Execute Neo4j Cypher queries

**Embeddings:**
- `POST /api/v1/embeddings/generate` - Generate CLIP embeddings

**Layers/Decomposition:**
- `POST /api/v1/layers/decompose` - Layer decomposition via Vision API

**Stencil:**
- `POST /api/v1/stencil/export` - Export stencil for printing

**AR:**
- `POST /api/v1/ar/visualize` - AR preview generation

---

*Integration audit: 2026-02-15*
