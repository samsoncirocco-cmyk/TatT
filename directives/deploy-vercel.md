# Deploy to Vercel

## Goal
Build, verify, and deploy the TatT application to Vercel with all required environment variables.

## When to Use
- Pushing changes to `manama/next` branch (auto-deploy if linked)
- Manual deployment via Vercel CLI or dashboard

## Prerequisites
- Vercel account linked to the repository
- All environment variables configured in Vercel project settings
- Node.js 18+ and npm installed locally

## Steps

1. **Local verification** — Run the build locally first:
   ```bash
   npm run build
   ```
   This catches TypeScript errors, missing imports, and build-time issues.

2. **Run tests** (if available):
   ```bash
   npm run lint
   node scripts/test-gcp-health.js         # Verify GCP connectivity
   node scripts/test-supabase-connection.js  # Verify Supabase
   ```

3. **Environment variables** — Ensure these are set in Vercel project settings:

   **Required:**
   | Variable | Purpose |
   |----------|---------|
   | `FRONTEND_AUTH_TOKEN` | API auth shared secret |
   | `NEXT_PUBLIC_FRONTEND_AUTH_TOKEN` | Client-side auth token |
   | `GCP_PROJECT_ID` | Vertex AI project |
   | `GCP_SERVICE_ACCOUNT_EMAIL` | GCP auth email |
   | `GCP_PRIVATE_KEY` | GCP auth private key |
   | `GCP_REGION` | GCP region (us-central1) |
   | `GCS_BUCKET` | Image storage bucket |
   | `SUPABASE_URL` | Supabase project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service key |
   | `NEO4J_URI` | Neo4j connection string |
   | `NEO4J_USERNAME` | Neo4j user |
   | `NEO4J_PASSWORD` | Neo4j password |

   **Optional:**
   | Variable | Purpose |
   |----------|---------|
   | `REPLICATE_API_TOKEN` | Legacy Replicate predictions |
   | `OPENROUTER_API_KEY` | OpenRouter council models |
   | `NEXT_PUBLIC_COUNCIL_DEMO_MODE` | `true` for mock council |
   | `NEXT_PUBLIC_VERTEX_AI_ENABLED` | `false` to disable Vertex |

4. **Deploy** — Either:
   - **Auto**: Push to `manama/next` → Vercel builds automatically.
   - **Manual**: `npx vercel --prod` from project root.

5. **Verify deployment**:
   ```bash
   curl https://manama-next.vercel.app/api/health
   ```
   Check all service flags are `true`.

6. **Vercel config** — `vercel.json` defines SPA rewrite:
   ```json
   { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
   ```

## Expected Output
- Successful build with no TypeScript errors
- Health endpoint returns `status: "ok"` with all service flags true
- Generation, council, and matching endpoints respond correctly

## Edge Cases
- **Build fails on `sharp`**: Sharp requires Node.js runtime; ensure routes using it have `export const runtime = 'nodejs'`.
- **GCP private key escaping**: The `GCP_PRIVATE_KEY` value contains `\n` characters — Vercel handles this if you paste the raw key.
- **Edge runtime errors**: Modules like `neo4j-driver`, `@google-cloud/*`, `firebase-admin` are excluded from client bundles via `next.config.ts` webpack aliases.
- **Cold starts**: Edge routes are fast; Node.js routes may have 1-3s cold start on Vercel.

## Cost
- Vercel Hobby plan: Free (100GB bandwidth, 100 hours serverless)
- Vercel Pro: $20/month for team features
