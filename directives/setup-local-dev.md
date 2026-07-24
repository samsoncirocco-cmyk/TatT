# Setup Local Development

> Directive for bootstrapping the full TatTester local development stack

## Goal

Get the Next.js frontend and Express.js backend proxy running locally with all required environment variables configured, so a developer can generate tattoo designs, manage layers, and match artists.

## When to Use

- First-time setup on a new machine
- After a fresh clone of the repository
- When onboarding a new developer
- After a major dependency or config change (e.g., Node upgrade)

## Prerequisites

- **Node.js 20+** installed (`node -v`)
- **npm 10+** installed (`npm -v`)
- **Git** installed
- **GCP service account key** file (`gcp-service-account-key.json`) in project root
- Access to Supabase project dashboard (project ID: `yfcmysjmoehcyszvkxsr`)
- `.env.local` file with valid credentials (see Steps below)

## Steps

1. **Clone and enter the repo**

   ```bash
   git clone <repo-url> manama-next
   cd manama-next
   ```

2. **Install dependencies**

   ```bash
   npm install --legacy-peer-deps
   ```

   The `--legacy-peer-deps` flag is required due to React 19 peer dependency conflicts.

3. **Create `.env.local` from the example**

   ```bash
   cp .env.example .env.local
   ```

   Fill in the required values. At minimum you need:

   | Variable | Source |
   |----------|--------|
   | `SUPABASE_URL` | Supabase project settings |
   | `SUPABASE_ANON_KEY` | Supabase API settings |
   | `SUPABASE_SERVICE_KEY` | Supabase API settings (service role) |
   | `NEO4J_URI` | Your Neo4j instance (default: `bolt://localhost:7687`) |
   | `NEO4J_USER` | Neo4j username (default: `neo4j`) |
   | `NEO4J_PASSWORD` | Your Neo4j password |
   | `FRONTEND_AUTH_TOKEN` | Shared secret between frontend and backend |

   For image generation, set one of:
   - `REPLICATE_API_TOKEN` for Replicate
   - `GOOGLE_APPLICATION_CREDENTIALS` for Vertex AI / Imagen 3

   **Where to get keys:**
   - **Replicate:** https://replicate.com/account/api-tokens
   - **Google Cloud:** GCP Console → IAM & Admin → Service Accounts
   - **Supabase:** https://app.supabase.com → Project Settings → API
   - **Neo4j:** https://console.neo4j.io → Database → Connect
   - **Firebase:** https://console.firebase.google.com → Project Settings → General
   - **OpenRouter:** https://openrouter.ai/keys

   > **Zero-credential alternative:** `bash QUICKSTART.sh` runs the app entirely in demo mode — it installs dependencies, copies `env.demo` to `.env.local`, and starts the dev server with mock data. No external services needed. Use it to try the app; use the steps below for a real credentialed setup.

4. **Set GCP credentials (if using Vertex AI)**

   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS=./gcp-service-account-key.json
   ```

5. **Initialize and verify the databases** (first run only — see `database-setup.md` for details)

   ```bash
   node scripts/setup-supabase-vector-schema.js   # pgvector schema for artist embeddings
   node scripts/import-to-neo4j.js                # seed the artist graph
   node scripts/generate-vertex-embeddings.js     # optional: populate embeddings (~$0.10 / 100 artists)
   ```

   Then confirm connectivity:

   ```bash
   node scripts/test-supabase-connection.js
   node scripts/test-gcp-health.js
   node scripts/test-vector-db.js
   ```

6. **Start the Next.js dev server (port 3000)**

   ```bash
   npm run dev
   ```

7. **Start the Express backend proxy (port 3002) in a separate terminal**

   ```bash
   npm run server
   ```

   The backend proxies Replicate API calls, handles Neo4j queries, layer uploads, and semantic matching.

8. **Open the app**

   Navigate to `http://localhost:3000` in your browser.

## Expected Output

- `npm run dev` prints `ready - started server on 0.0.0.0:3000`
- `npm run server` prints listening on the configured port (default 3002)
- The verification scripts report successful Supabase, GCP, and vector search connections
- The app loads in the browser showing The Forge design interface

## Edge Cases

- **`--legacy-peer-deps` errors**: If `npm install` fails even with the flag, delete `node_modules` and `package-lock.json`, then re-run
- **Port 3000 already in use**: Kill the process or set `PORT=3001` before `npm run dev`
- **Port 3002 already in use**: Set `PORT=3003` in `.env.local` and update `VITE_PROXY_URL` accordingly
- **CORS errors in browser**: Ensure `ALLOWED_ORIGINS` in `.env.local` includes `http://localhost:3000`
- **GCP auth fails**: Verify the service account JSON file path is correct and the file is valid
- **Supabase verify fails**: Run the schema SQL manually (see `database-setup.md`); also check that a firewall or VPN isn't blocking the connection
- **Neo4j connection timeout**: Aura free tier auto-pauses after inactivity — resume the instance in the Neo4j console
- **Module not found errors**: Delete `node_modules` and `package-lock.json`, then re-run `npm install --legacy-peer-deps`
- **TypeScript errors only in VS Code**: CMD+Shift+P → "TypeScript: Select TypeScript Version" → "Use Workspace Version"
- **VITE_ prefixed vars not working**: This is a Next.js project; use `NEXT_PUBLIC_` prefix for client-side vars. Legacy `VITE_` vars are read by `server.js` only

## Cost

- No direct costs for local development
- API calls to Replicate (~$0.01-0.05 per image generation)
- API calls to OpenRouter for council (~$0.01-0.03 per enhancement)
- Supabase free tier covers development usage

## Related Directives

- [database-setup.md](./database-setup.md) -- Set up Supabase schema and Neo4j before first run
- [docker-dev.md](./docker-dev.md) -- Alternative: run in Docker instead of native Node
- [deploy.md](./deploy.md) -- Deploy to Vercel + Railway after local testing
