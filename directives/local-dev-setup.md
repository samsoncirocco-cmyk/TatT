# Local Development Setup

## Goal
Get the TatT development environment running locally from a fresh clone.

## When to Use
- First-time setup on a new machine
- Onboarding a new developer

## Prerequisites
- Node.js 18+ and npm
- Git
- Docker (optional, for Neo4j)
- GCP service account credentials
- Supabase project credentials

## Steps

1. **Clone and checkout**:
   ```bash
   git clone <repo-url> TatT
   cd TatT
   git checkout manama/next
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment** — Copy and fill in `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

   Minimum required for basic generation:
   ```env
   FRONTEND_AUTH_TOKEN=dev-token-change-in-production
   NEXT_PUBLIC_FRONTEND_AUTH_TOKEN=dev-token-change-in-production

   # GCP / Vertex AI
   GCP_PROJECT_ID=tatt-pro
   GCP_SERVICE_ACCOUNT_EMAIL=your-sa@tatt-pro.iam.gserviceaccount.com
   GCP_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   GCP_REGION=us-central1
   GCS_BUCKET=your-gcs-bucket

   # Supabase
   SUPABASE_URL=https://yfcmysjmoehcyszvkxsr.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-key
   NEXT_PUBLIC_SUPABASE_URL=https://yfcmysjmoehcyszvkxsr.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

   For demo mode (no external services):
   ```env
   NEXT_PUBLIC_COUNCIL_DEMO_MODE=true
   NEXT_PUBLIC_VERTEX_AI_ENABLED=false
   ```

4. **Start Neo4j** (optional, for artist matching):
   ```bash
   docker run -d --name neo4j-tatt \
     -p 7474:7474 -p 7687:7687 \
     -e NEO4J_AUTH=neo4j/tattester123 \
     neo4j:latest
   ```

   Add to `.env.local`:
   ```env
   NEO4J_URI=bolt://localhost:7687
   NEO4J_USERNAME=neo4j
   NEO4J_PASSWORD=tattester123
   ```

   Import artist data:
   ```bash
   node scripts/import-to-neo4j.js
   ```

5. **Setup Supabase schema** (if fresh project):
   ```bash
   # Run SQL from scripts/supabase-complete-schema.sql in Supabase SQL Editor
   node scripts/setup-supabase-vector-schema.js
   node scripts/generate-vertex-embeddings.js --limit=5  # Test with 5 artists
   ```

6. **Start development server**:
   ```bash
   npm run dev
   ```
   App runs at http://localhost:3000

7. **Verify services**:
   ```bash
   curl http://localhost:3000/api/health
   ```

## Expected Output
- Dev server running on port 3000
- Health endpoint shows which services are connected
- Forge page loads with generation UI
- In demo mode: mock prompts and images work without external services

## Edge Cases
- **Port 3000 in use**: Next.js auto-increments to 3001.
- **GCP auth fails**: Ensure `GCP_PRIVATE_KEY` has actual newlines or escaped `\n`. Check `GOOGLE_APPLICATION_CREDENTIALS` if using key file.
- **Neo4j connection refused**: Verify Docker container is running: `docker ps | grep neo4j`.
- **Supabase CORS**: Not an issue for server-side calls; client-side uses anon key.
- **Node native modules**: `sharp`, `@google-cloud/*` are server-only — client imports are aliased to `false` in `next.config.ts`.

## Cost
- Local development: $0 (all services have free tiers or local alternatives)
