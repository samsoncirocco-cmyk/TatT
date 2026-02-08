# Deploy to Production

> Directive for deploying the TatTester frontend to Vercel and the backend proxy to Railway

## Goal

Deploy the Next.js frontend to Vercel and the Express.js backend proxy (`server.js`) to Railway, with all environment variables configured and CORS origins aligned between the two services.

## When to Use

- Initial production deployment
- After merging features to `main` that need to go live
- When setting up a new environment (staging, preview)
- After changing environment variables that affect production

## Prerequisites

- **Vercel account** with the project linked (current URL: `https://tat-t-3x8t.vercel.app`)
- **Railway account** with the project created
- **All database infrastructure** provisioned (see `database-setup.md`)
- **Passing local build**: `npm run build` completes without errors
- **Environment variables** ready for both platforms (see Steps)

## Steps

### Part A: Deploy Frontend to Vercel

1. **Install the Vercel CLI (if not already)**

   ```bash
   npm i -g vercel
   ```

2. **Link the project (first time only)**

   ```bash
   vercel link
   ```

3. **Set environment variables in Vercel dashboard**

   Required variables for the frontend:

   | Variable | Value |
   |----------|-------|
   | `NEXT_PUBLIC_PROXY_URL` | Railway backend URL (e.g., `https://your-app.up.railway.app/api`) |
   | `NEXT_PUBLIC_FRONTEND_AUTH_TOKEN` | Shared auth token (must match Railway) |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
   | `NEXT_PUBLIC_DEMO_MODE` | `false` for production |
   | `NEXT_PUBLIC_COUNCIL_DEMO_MODE` | `false` for real council |
   | `NEXT_PUBLIC_USE_OPENROUTER` | `true` if using OpenRouter |
   | `NEXT_PUBLIC_OPENROUTER_API_KEY` | OpenRouter API key |

4. **Deploy**

   ```bash
   vercel --prod
   ```

   Or push to `main` if Git integration is configured -- Vercel auto-deploys on push.

5. **Verify the deployment**

   Open `https://tat-t-3x8t.vercel.app` and confirm the app loads.

### Part B: Deploy Backend to Railway

1. **Install the Railway CLI (if not already)**

   ```bash
   npm i -g @railway/cli
   railway login
   ```

2. **Link the project (first time only)**

   ```bash
   railway link
   ```

3. **Set environment variables in Railway dashboard**

   Required variables for the backend:

   | Variable | Value |
   |----------|-------|
   | `REPLICATE_API_TOKEN` | Replicate API token |
   | `FRONTEND_AUTH_TOKEN` | Shared auth token (must match Vercel) |
   | `ALLOWED_ORIGINS` | `https://tat-t-3x8t.vercel.app` (comma-separated if multiple) |
   | `NEO4J_URI` | Production Neo4j URI |
   | `NEO4J_USER` | Neo4j username |
   | `NEO4J_PASSWORD` | Neo4j password |
   | `SUPABASE_URL` | Supabase project URL |
   | `SUPABASE_ANON_KEY` | Supabase anon key |
   | `SUPABASE_SERVICE_KEY` | Supabase service role key |
   | `GOOGLE_APPLICATION_CREDENTIALS` | Path to GCP key (or use `GOOGLE_CREDENTIALS` with JSON content) |

   Railway sets `PORT` automatically -- do not set it manually.

4. **Deploy**

   ```bash
   railway up
   ```

   Railway uses the `railway.json` configuration:
   - Builder: Nixpacks
   - Start command: `npm run server`
   - Restart policy: on failure (max 10 retries)

5. **Verify the backend**

   ```bash
   curl https://your-app.up.railway.app/api/health
   ```

### Part C: Align CORS and Auth

1. **Ensure `FRONTEND_AUTH_TOKEN` matches** between Vercel and Railway
2. **Ensure `ALLOWED_ORIGINS` on Railway** includes the Vercel deployment URL
3. The backend automatically adds the `VERCEL_URL` env var to allowed origins if set

### Part D: Verify End-to-End

1. Open the production frontend URL
2. Generate a test design -- confirm it reaches the backend and returns an image
3. Test artist matching -- confirm vector search returns results
4. Check browser console for CORS errors

## Expected Output

- Vercel: Build succeeds, site accessible at `https://tat-t-3x8t.vercel.app`
- Railway: Service running, health endpoint returns 200
- End-to-end: Design generation, layer management, and artist matching all work from the production URL

## Edge Cases

- **Build fails on Vercel**: Check for missing `NEXT_PUBLIC_*` env vars; run `npm run build` locally first to catch issues
- **Railway deploy fails**: Check `railway logs` for startup errors; common cause is missing env vars
- **CORS errors**: Verify `ALLOWED_ORIGINS` on Railway includes the exact Vercel URL (no trailing slash)
- **502 on Railway**: The backend may need a moment to start; check `railway logs` for port binding issues
- **GCP auth on Railway**: You cannot upload a file directly; use the `GOOGLE_CREDENTIALS` env var with the JSON content as a string, or use Railway's secret file feature
- **`vercel.json` SPA rewrite**: The current `vercel.json` has a catch-all rewrite to `index.html` -- this may need updating for Next.js API routes

## Cost

- **Vercel**: Free tier covers hobby projects (100GB bandwidth, serverless functions)
- **Railway**: Free trial with $5 credit; Hobby plan at $5/month for always-on services
- **Per-request costs**: Same as local (Replicate, OpenRouter, Vertex AI charges apply)

## Related Directives

- [setup-local-dev.md](./setup-local-dev.md) -- Test locally before deploying
- [database-setup.md](./database-setup.md) -- Production databases must be provisioned first
- [docker-dev.md](./docker-dev.md) -- Test the production Docker image locally before Railway deploy
