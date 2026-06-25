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

4. **Set GCP credentials (if using Vertex AI)**

   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS=./gcp-service-account-key.json
   ```

5. **Run the quick start verification**

   ```bash
   bash QUICKSTART.sh
   ```

   This script:
   - Checks that `GOOGLE_APPLICATION_CREDENTIALS` is set
   - Verifies `.env` file exists
   - Runs `npm run supabase:verify` to confirm Supabase schema
   - Runs `npm run gcp:health` to test GCP connectivity

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
- `QUICKSTART.sh` shows green checkmarks for env vars, Supabase schema (4/4 tables), and GCP health
- The app loads in the browser showing The Forge design interface

## Edge Cases

- **`--legacy-peer-deps` errors**: If `npm install` fails even with the flag, delete `node_modules` and `package-lock.json`, then re-run
- **Port 3000 already in use**: Kill the process or set `PORT=3001` before `npm run dev`
- **Port 3002 already in use**: Set `PORT=3003` in `.env.local` and update `VITE_PROXY_URL` accordingly
- **CORS errors in browser**: Ensure `ALLOWED_ORIGINS` in `.env.local` includes `http://localhost:3000`
- **GCP auth fails**: Verify the service account JSON file path is correct and the file is valid
- **Supabase verify fails**: Run the schema SQL manually (see `database-setup.md`)
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
