# Deploy to Production

> Directive for deploying TatT to Vercel

> **Note:** The legacy Railway Express proxy (`server.js`) was retired on
> 2026-07-20. Next.js API routes under `src/app/api/` are the only backend;
> Vercel is the only deploy target.

## Goal

Deploy the Next.js app (frontend + API routes) to Vercel with all environment
variables configured.

## When to Use

- Initial production deployment
- After merging features to `main` that need to go live
- When setting up a new environment (staging, preview)
- After changing environment variables that affect production

## Prerequisites

- **Vercel account** with the project linked (current URL: `https://tatt-app.vercel.app`)
- **All database infrastructure** provisioned (see `database-setup.md`)
- **Passing local build**: `npm run build` completes without errors
- **Environment variables** ready (see Steps)

## Steps

1. **Install the Vercel CLI (if not already)**

   ```bash
   npm i -g vercel
   ```

2. **Link the project (first time only)**

   ```bash
   vercel link
   ```

3. **Set environment variables in Vercel dashboard**

   Required variables:

   | Variable | Value |
   |----------|-------|
   | `REPLICATE_API_TOKEN` | Replicate API token |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
   | `NEO4J_URI` / `NEO4J_USERNAME` / `NEO4J_PASSWORD` | Production Neo4j credentials |
   | `GOOGLE_APPLICATION_CREDENTIALS` | GCP service account (or JSON via `GOOGLE_CREDENTIALS`) |
   | `NEXT_PUBLIC_DEMO_MODE` | `false` for production |
   | `NEXT_PUBLIC_COUNCIL_DEMO_MODE` | `false` for real council |
   | `NEXT_PUBLIC_USE_OPENROUTER` | `true` if using OpenRouter |
   | `NEXT_PUBLIC_OPENROUTER_API_KEY` | OpenRouter API key |
   | Stripe vars | `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_WEBHOOK_SECRET`, `CRON_SECRET`, etc. — see `CLAUDE.md` |

   `vercel.json` schedules a daily cron (`0 9 * * *`) hitting `/api/cron/expire-deposits` to refund unclaimed deposits — it fails without `CRON_SECRET` set in the Vercel environment.

4. **Deploy**

   ```bash
   vercel --prod
   ```

   Or push to `main` if Git integration is configured -- Vercel auto-deploys on push. `tatt-app` is the only Vercel project linked to this repo; any non-`main` branch pushed to the repo gets a preview deployment (`https://tatt-<random>.vercel.app`), so open a PR and share its preview URL for testing before merging to `main`.

   GitHub Actions (`.github/workflows/ci-cd.yml`) runs a secret scan, advisory lint, JS + Python tests, and a demo-env build on every push/PR to `main`. The Cloud Run build/deploy jobs in that workflow are manual-dispatch-only — Vercel is the active deploy surface.

5. **Verify the deployment**

   Open `https://tatt-app.vercel.app` and confirm the app loads.

6. **Verify end-to-end**

   1. Generate a test design -- confirm the API routes return an image
   2. Test artist matching -- confirm vector search returns results
   3. Check browser console for errors

## Expected Output

- Vercel: Build succeeds, site accessible at `https://tatt-app.vercel.app`
- End-to-end: Design generation, layer management, and artist matching all work from the production URL

## Edge Cases

- **Build fails on Vercel**: Check for missing `NEXT_PUBLIC_*` env vars; run `npm run build` locally first to catch issues
- **"Module not found" only in production**: Usually a case-sensitive import (works on macOS, fails on Vercel's Linux builders) -- fix the import casing
- **Function timeout on Vercel**: Hobby tier caps serverless functions at 10s; long LLM/generation calls need the Pro tier (60s) or an async pattern

## Useful Vercel Commands

```bash
vercel ls                    # list deployments
vercel env pull .env.local   # pull env vars locally
vercel logs <deployment-url> # view logs
vercel rollback <deployment-url>  # roll back (or "Promote to Production" on a previous deployment in the dashboard)
```

## Cost

- **Vercel**: Free tier covers hobby projects (100GB bandwidth, serverless functions)
- **Per-request costs**: Same as local (Replicate, OpenRouter, Vertex AI charges apply)

## Related Directives

- [setup-local-dev.md](./setup-local-dev.md) -- Test locally before deploying
- [database-setup.md](./database-setup.md) -- Production databases must be provisioned first
- [docker-dev.md](./docker-dev.md) -- Test the production Docker image locally
