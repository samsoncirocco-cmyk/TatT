# Execution Manifest

Maps each directive (SOP) to its execution scripts. Scripts stay in their original locations to avoid breaking existing imports and references.

## Directive → Script Mapping

| Directive | Scripts | Type |
|-----------|---------|------|
| `setup-local-dev` | `QUICKSTART.sh`, `npm run dev`, `npm run server` | Shell + npm |
| `database-setup` | `scripts/enable-gcp-apis.sh`, `scripts/setup-supabase-vector-schema.js`, `scripts/setup-supabase-tattoo-artists.js`, `src/db/migrations/*.sql` | Shell + Node.js + SQL |
| `import-artists` | `scripts/generate-tattoo-artists-data.js`, `scripts/import-to-neo4j.js`, `scripts/insert-artists-to-supabase.js`, `generate-artists.py` | Node.js + Python |
| `generate-embeddings` | `scripts/generate-portfolio-embeddings.js`, `scripts/migrate-to-text-embeddings.js`, `scripts/generate-vertex-embeddings.js`, `scripts/setup-and-migrate.sh` | Node.js + Shell |
| `deploy` | `scripts/update-railway-env.js`, `git push`, `vercel.json`, `railway.json` | Node.js + Git |
| `generate-design` | `src/services/generationService.ts` via `/api/v1/generate` | API Route |
| `council-enhance` | `src/services/councilService.ts` via `/api/v1/council/enhance` | API Route |
| `docker-dev` | `test-docker.sh`, `docker-compose.yml`, `Dockerfile` | Shell + Docker |

## Verification Scripts

Run these to validate infrastructure is working correctly:

| Script | What it checks |
|--------|----------------|
| `scripts/test-neo4j-connection.js` | Neo4j bolt connectivity |
| `scripts/test-supabase-connection.js` | Supabase API connectivity and auth |
| `scripts/test-gcp-health.js` | Vertex AI, Vision, Storage availability |
| `scripts/verify-supabase-schema.js` | All tables, indexes, RLS policies, functions exist |
| `scripts/test-text-embeddings.js` | Embedding generation works (768 dimensions) |
| `scripts/benchmark-vector-search.js` | Vector search latency and match quality |
| `scripts/check-supabase-schema.js` | Column names and types for a specific table |

## Cost-Bearing Operations

These directives consume paid resources. Always confirm with the user first:

| Directive | Cost | Budget |
|-----------|------|--------|
| `generate-design` | ~$0.02 per image | $500 total (Phase 1) |
| `council-enhance` (OpenRouter path) | ~$0.08 per call | Prefer Vertex AI (free) |

## Why Scripts Stay in `scripts/`

The 3-layer framework normally puts scripts in `execution/`. In this project, 27+ scripts already live in `scripts/` with references throughout `package.json`, documentation, and CI/CD configs. Moving them would break things for no benefit. This manifest serves as the bridge between the directive layer and the execution layer.
