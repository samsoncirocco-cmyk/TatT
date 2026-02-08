# Deploy to Vercel

## Goal
Deploy TatT application to Vercel with optimized edge runtime, environment variables, and CI/CD integration.

## When to Use
- Deploying to staging (preview) environment for testing
- Deploying to production after feature completion
- Trigger: `git push` to `manama/next` (preview) or `main` (production)

## Prerequisites
- Vercel account connected to GitHub repository
- Vercel CLI installed: `npm i -g vercel`
- Environment variables configured in Vercel dashboard
- All tests passing locally
- Build succeeds locally: `npm run build`

## Steps

### 1. Pre-Deployment Checks
**Location:** Local development machine
- Run linter: `npm run lint` (fix all errors)
- Run tests: `npm test` (all tests must pass)
- Build locally: `npm run build` (ensure no build errors)
- Check for uncommitted changes: `git status`

### 2. Commit and Push Changes
```bash
git add .
git commit -m "feat: descriptive commit message"
git push origin manama/next  # or main for production
```

### 3. Automatic Vercel Build
**Trigger:** GitHub webhook → Vercel build pipeline
- **Build Command:** `npm run build` (Next.js production build)
- **Output Directory:** `.next/`
- **Install Command:** `npm install`
- **Runtime:** Node.js 18.x (or latest LTS)

### 4. Environment Variable Injection
**Location:** Vercel Dashboard → Project Settings → Environment Variables
- Required variables (see `CLAUDE.md` for full list):
  - `REPLICATE_API_TOKEN`
  - `GOOGLE_APPLICATION_CREDENTIALS` (base64-encoded JSON)
  - `GCP_PROJECT_ID`, `GCP_REGION`
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`
  - `NEXT_PUBLIC_FIREBASE_API_KEY`, etc.
  - `OPENROUTER_API_KEY`
  - `TATT_API_KEY` (optional, for API auth)
- Secrets encrypted at rest by Vercel

### 5. Edge Runtime Deployment
**Location:** Vercel Edge Network (global CDN)
- API routes with `export const runtime = 'edge'` deployed to edge nodes
- Static assets cached at edge (images, fonts, CSS)
- Serverless functions deployed to regional nodes (if needed)

### 6. Post-Deployment Verification
**Location:** Vercel deployment URL
- Check deployment logs for errors
- Verify environment variables loaded correctly:
  - Test health endpoint: `https://your-app.vercel.app/api/health`
- Smoke test key workflows:
  - Generate tattoo design
  - Search for artists
  - Export stencil
- Check Core Web Vitals in Vercel Analytics dashboard

### 7. Domain Configuration (Production Only)
**Location:** Vercel Dashboard → Domains
- Add custom domain: `app.tatt.com` (or desired domain)
- Configure DNS:
  - **A record:** Points to Vercel IP (or)
  - **CNAME record:** Points to `cname.vercel-dns.com`
- Enable HTTPS (automatic via Let's Encrypt)
- Force HTTPS redirect (enabled by default)

### 8. Monitoring and Rollback
**Location:** Vercel Dashboard → Deployments
- Monitor deployment metrics:
  - Build time, response times, error rates
- Set up alerts:
  - Error rate spike
  - Build failures
- Rollback if needed:
  - Click "Promote to Production" on previous deployment
  - Or redeploy from specific Git commit

## Expected Output
- **Preview URL:** `https://tatt-<random>.vercel.app` (for `manama/next`)
- **Production URL:** `https://tatt.vercel.app` or custom domain
- **Build time:** 2-5 minutes (depending on dependencies)
- **Deployment status:** "Ready" with green checkmark

## Edge Cases

### Build Fails Due to Missing Environment Variables
- **Detection:** Build log shows `undefined` for required env vars
- **Solution:** Add missing variables to Vercel dashboard
- **Redeploy:** Trigger new deployment after adding variables

### Secrets Too Large (>4KB Limit)
- **Issue:** Google service account JSON exceeds Vercel env var limit
- **Solution:** Base64-encode JSON, split into multiple variables, or use Vercel Blob storage
- **Alternative:** Store secrets in Google Secret Manager, fetch at runtime

### Edge Runtime Incompatibility
- **Issue:** Some Node.js APIs not available in edge runtime (e.g., `fs`, `crypto`)
- **Solution:** Convert to Node.js serverless runtime (remove `export const runtime = 'edge'`)
- **Trade-off:** Slower cold starts, but full Node.js API access

### Rate Limiting on Cold Starts
- **Issue:** First request after inactivity takes >5s (cold start)
- **Solution:** Keep functions warm with periodic pings (cron job or Vercel Cron)
- **Alternative:** Use Vercel Pro plan (reduced cold starts)

### Database Connection Timeout
- **Issue:** Neo4j or Supabase connection times out from edge runtime
- **Solution:** Use connection pooling, increase timeout limits
- **Alternative:** Deploy database-heavy routes as serverless functions (not edge)

## Performance Optimization

### Build Optimization
- **Enable SWC minification:** Already default in Next.js 14
- **Tree shaking:** Remove unused code during build
- **Image optimization:** Use Next.js Image component for auto-optimization

### Caching Strategy
- **Static assets:** Cache-Control: public, max-age=31536000, immutable
- **API routes:** Cache-Control: private, max-age=60 (or no-cache for dynamic data)
- **Edge caching:** Use Vercel Edge Config for frequently accessed data

### Bundle Size Reduction
- **Analyze bundle:** `npm run build` shows page sizes
- **Target:** <100KB per page (gzipped)
- **Split large libraries:** Dynamic imports for heavy dependencies

## CI/CD Best Practices

### Preview Deployments
- Every push to `manama/next` triggers preview
- Share preview URL with team for testing
- Use comments in Vercel bot on GitHub PR for easy access

### Production Deployments
- Only merge to `main` after preview testing
- Use GitHub branch protection rules (require reviews)
- Tag releases: `git tag -a v1.2.3 -m "Release 1.2.3"`

### Automated Testing
- **GitHub Actions:** Run tests before deployment
- **Vercel Checks:** Require build success before merging
- **E2E Tests:** Run Playwright tests on preview deployments

## Cost Monitoring

| Tier | Bandwidth | Builds | Serverless Functions | Cost |
|------|-----------|--------|---------------------|------|
| **Hobby (Free)** | 100GB | Unlimited | 100GB-hours | $0 |
| **Pro** | 1TB | Unlimited | 1000GB-hours | $20/mo |
| **Enterprise** | Custom | Unlimited | Custom | Custom |

**Current Usage (Estimated):**
- Bandwidth: ~50GB/month (preview + production)
- Builds: ~200/month (frequent pushes)
- Functions: ~30GB-hours/month (edge + serverless)

**Recommendation:** Start with Hobby tier, upgrade to Pro if hitting limits.

## Related Directives
- `local-dev-setup.md` — Setting up local environment before deploying
- `api-endpoints.md` — Verify endpoints work in production
- `generate-tattoo.md`, etc. — Test key workflows post-deployment

## Useful Commands

```bash
# Deploy to preview (manual trigger)
vercel

# Deploy to production (manual trigger)
vercel --prod

# Check deployment status
vercel ls

# Pull environment variables locally
vercel env pull .env.local

# View deployment logs
vercel logs <deployment-url>

# Rollback to previous deployment
vercel rollback <deployment-url>
```

## Troubleshooting

### "Module not found" in production
- **Cause:** Case-sensitive imports (works on macOS, fails on Linux)
- **Solution:** Fix import casing, redeploy

### "API route not found" (404)
- **Cause:** Route file not in `src/app/api/` or missing `route.ts`
- **Solution:** Verify file structure matches Next.js App Router conventions

### "Function timeout" (10s limit on Hobby)
- **Cause:** Long-running API route (e.g., slow LLM response)
- **Solution:** Upgrade to Pro (60s limit) or use async webhooks

### "Build exceeded time limit"
- **Cause:** Large dependencies or slow install
- **Solution:** Cache node_modules, reduce dependencies, upgrade Vercel plan
