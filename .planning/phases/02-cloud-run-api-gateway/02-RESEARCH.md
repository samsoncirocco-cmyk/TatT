# Phase 2: Cloud Run + API Gateway - Research

**Researched:** 2026-02-15
**Domain:** Google Cloud Run, API Gateway, Next.js containerization, API security
**Confidence:** MEDIUM-HIGH

## Summary

Phase 2 migrates from the current Express.js proxy server and scattered Next.js API routes to a unified Cloud Run deployment with API Gateway providing rate limiting, CORS enforcement, and DDoS protection. The research reveals that Google Cloud provides robust support for Next.js deployment via Cloud Run with official documentation, and API Gateway can enforce per-user rate limits when combined with Firebase Auth JWT validation.

**Critical findings:**
- Next.js standalone output mode creates optimized Docker images (significantly smaller than full builds)
- Cloud Run supports min instances=1 to eliminate cold starts for critical apps (with predictable billing)
- API Gateway supports Firebase Auth JWT validation natively via OpenAPI spec extensions
- Per-user rate limiting requires implementing quota tracking in Firestore (not built into API Gateway)
- Cloud Armor provides pre-configured WAF rules for OWASP Top 10, including recent CVE coverage
- The current Express proxy (server.js) rate limiters are IP-based, not per-user—need redesign for authenticated rate limiting

**Primary recommendation:** Use Cloud Run with standalone Next.js build + API Gateway with Firebase Auth validation. Implement per-user rate limiting via custom quota tracking in Firestore (API Gateway quotas are per-project, not per-user). Use min instances=1 with committed use discount to avoid cold start latency for image generation polling.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **Cloud Run** | Gen 2 | Managed container runtime | Official Google serverless platform for containers, supports long-running requests (up to 60min), automatic scaling |
| **API Gateway** | v1 | API management layer | Lightweight GCP-native gateway for serverless backends, supports OpenAPI 3.x, Firebase Auth integration |
| **Next.js standalone** | 16.x | Optimized build output | Copies only necessary files for production, reduces Docker image size by ~70% |
| **Docker multi-stage** | 20.x+ | Container build pattern | Industry standard for minimizing final image size, separates build-time from runtime dependencies |
| **Cloud Armor** | Standard tier | WAF + DDoS protection | GCP-native protection, pre-configured OWASP rules, works seamlessly with API Gateway/Cloud Run |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `next-firebase-auth-edge` | 1.11.1 | Firebase Auth middleware | Already in package.json, handles auth cookie validation in middleware |
| `firebase-admin` | 13.6.0 | Server-side Firebase SDK | Token verification in API routes, already in use |
| `next-swagger-doc` | 4.x | OpenAPI spec generation | Generate API Gateway config from JSDoc comments in API routes |
| `express-rate-limit` | 8.2.1 | Fallback rate limiting | Already in server.js, can be reused as reference for Firestore quota logic |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| API Gateway | Cloud Endpoints | Endpoints requires self-managed ESPv2 proxy, more operational overhead; API Gateway is fully managed |
| API Gateway | Apigee | Apigee is enterprise-grade with developer portal, overkill for MVP; API Gateway is lightweight for project-level APIs |
| Cloud Run | Cloud Functions | Functions have 9-minute timeout (too short for 120s polling), Cloud Run supports 60min |
| Standalone mode | Full Next.js build | Full build copies entire node_modules (~500MB), standalone is ~50MB, 10x smaller images |

**Installation:**
```bash
# Already have Next.js, Firebase Admin, next-firebase-auth-edge
npm install next-swagger-doc --save-dev  # For OpenAPI generation
```

**Cloud Setup:**
```bash
# Enable required GCP services
gcloud services enable run.googleapis.com
gcloud services enable apigateway.googleapis.com
gcloud services enable servicemanagement.googleapis.com
gcloud services enable servicecontrol.googleapis.com
gcloud services enable compute.googleapis.com  # For Cloud Armor
```

## Architecture Patterns

### Recommended Project Structure
```
pangyo/
├── Dockerfile                    # Multi-stage build for Cloud Run
├── .dockerignore                 # Exclude dev files from context
├── next.config.ts                # Add output: 'standalone'
├── openapi/
│   ├── api-spec.yaml             # Generated OpenAPI 3.0 spec
│   └── gateway-config.yaml       # API Gateway deployment config
├── src/
│   ├── app/api/v1/               # Existing Next.js API routes
│   ├── lib/
│   │   ├── api-auth.ts           # Existing auth verification
│   │   └── quota-tracker.ts      # NEW: Firestore-based per-user quotas
│   └── middleware.ts             # Existing Firebase auth middleware
└── server.js                     # DEPRECATED: Remove after migration
```

### Pattern 1: Multi-Stage Dockerfile with Standalone Build

**What:** Build Next.js in one stage, copy only standalone output to final runtime image.

**When to use:** Always for production Cloud Run deployments. Minimizes image size, attack surface, and cold start time.

**Example:**
```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
```

**Source:** [GitHub - kristiyan-velkov/nextjs-prod-dockerfile](https://github.com/kristiyan-velkov/nextjs-prod-dockerfile), [Standalone Next.js Application in Docker](https://datawookie.dev/blog/2024/02/standalone-next-js-application-in-docker/)

### Pattern 2: API Gateway OpenAPI Spec with Firebase Auth

**What:** Define API routes in OpenAPI 3.x spec with `x-google-backend` extension pointing to Cloud Run, and `x-google-jwt-locations` for Firebase Auth validation.

**When to use:** For all public-facing API endpoints that require per-user authentication and rate limiting.

**Example:**
```yaml
openapi: 3.0.4
info:
  title: TatTester API
  version: 1.0.0
servers:
  - url: https://tattester-gateway-PROJECT_ID.uc.gateway.dev
x-google-backend:
  address: https://tattester-HASH-uc.a.run.app
  jwt_audience: PROJECT_ID
security:
  - firebase: []
securitySchemes:
  firebase:
    authorizationUrl: ""
    flow: "implicit"
    type: "oauth2"
    x-google-issuer: "https://securetoken.google.com/PROJECT_ID"
    x-google-jwks_uri: "https://www.googleapis.com/service_accounts/v1/metadata/x509/securetoken@system.gserviceaccount.com"
    x-google-audiences: "PROJECT_ID"

paths:
  /api/v1/generate:
    post:
      summary: Generate tattoo design with Imagen
      operationId: generateDesign
      security:
        - firebase: []
      x-google-quota:
        metricCosts:
          "generation-quota": 1
      responses:
        '200':
          description: Generated images
        '429':
          description: Rate limit exceeded
```

**Source:** [Using Firebase to authenticate users | API Gateway | Google Cloud](https://cloud.google.com/api-gateway/docs/authenticating-users-firebase), [Enabling CORS support for Endpoints | Cloud Endpoints with OpenAPI](https://cloud.google.com/endpoints/docs/openapi/support-cors)

### Pattern 3: Per-User Quota Tracking in Firestore

**What:** Since API Gateway quotas are per-project (not per-user), implement custom quota tracking using Firestore documents with atomic increments and TTL.

**When to use:** For all rate-limited endpoints when quotas must be enforced per authenticated user.

**Example:**
```typescript
// src/lib/quota-tracker.ts
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

interface QuotaConfig {
  maxRequests: number;
  windowMs: number;
}

const QUOTA_CONFIGS: Record<string, QuotaConfig> = {
  'generation': { maxRequests: 20, windowMs: 60 * 60 * 1000 }, // 20/hr
  'matching': { maxRequests: 100, windowMs: 60 * 60 * 1000 },  // 100/hr
  'council': { maxRequests: 20, windowMs: 60 * 60 * 1000 },    // 20/hr
};

export async function checkQuota(
  userId: string,
  endpoint: string
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const db = getFirestore();
  const config = QUOTA_CONFIGS[endpoint];
  const windowStart = Date.now() - config.windowMs;

  const quotaRef = db.collection('quotas')
    .doc(userId)
    .collection('endpoints')
    .doc(endpoint);

  const snapshot = await quotaRef.get();
  const data = snapshot.data();

  // Clean expired requests
  const activeRequests = (data?.requests || [])
    .filter((ts: number) => ts > windowStart);

  if (activeRequests.length >= config.maxRequests) {
    const oldestRequest = Math.min(...activeRequests);
    const retryAfter = Math.ceil((oldestRequest + config.windowMs - Date.now()) / 1000);
    return { allowed: false, retryAfter };
  }

  // Record this request
  await quotaRef.set({
    requests: FieldValue.arrayUnion(Date.now()),
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });

  return { allowed: true };
}
```

**Source:** Pattern derived from [Fireship.io - Firestore Rate Limiting](https://fireship.io/lessons/how-to-rate-limit-writes-firestore/), [firebase-functions-rate-limiter - npm](https://www.npmjs.com/package/firebase-functions-rate-limiter)

### Pattern 4: Cloud Run with Min Instances for Long-Running Requests

**What:** Configure Cloud Run with min instances=1 and request timeout=300s to avoid cold starts for image generation polling (which can take 120s).

**When to use:** For production deployments where sub-second response time is critical, and budget allows for idle instance costs.

**Example:**
```yaml
# cloud-run.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: tattester-api
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/minScale: "1"
        autoscaling.knative.dev/maxScale: "10"
        run.googleapis.com/startup-cpu-boost: "true"
    spec:
      timeoutSeconds: 300
      containerConcurrency: 80
      containers:
      - image: gcr.io/PROJECT_ID/tattester:latest
        env:
        - name: NODE_ENV
          value: production
        resources:
          limits:
            cpu: "2"
            memory: 1Gi
```

**Cost note:** Min instances=1 with 1 CPU costs ~$13/month idle ([Cloud Run pricing](https://cloud.google.com/run/pricing)). Use committed use discount for predictable savings.

**Source:** [Set minimum instances for services | Cloud Run](https://docs.cloud.google.com/run/docs/configuring/min-instances), [3 Ways to optimize Cloud Run response times](https://cloud.google.com/blog/topics/developers-practitioners/3-ways-optimize-cloud-run-response-times)

### Anti-Patterns to Avoid

- **Don't use NEXT_PUBLIC_ for server secrets:** Next.js bundles these into client JavaScript during build. Use Secret Manager environment variables instead.
- **Don't rely on API Gateway quotas for per-user limits:** API Gateway quotas are per-project or per-IP, not per-authenticated-user. Must implement custom Firestore tracking.
- **Don't copy entire .next folder to Docker:** Use standalone output only. Full .next includes dev artifacts and increases image size by 10x.
- **Don't skip USER directive in Dockerfile:** Running as root in container is a security risk. Always create a non-root user (see Pattern 1).
- **Don't use Edge Runtime for GCP libraries:** Current codebase uses `@google-cloud/*` packages which require Node.js runtime. The `export const runtime = 'edge'` in API routes will break when deployed to Cloud Run (which is full Node.js, so this is fine).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OpenAPI spec from routes | Manual YAML with 40+ endpoints | `next-swagger-doc` or `next-openapi-gen` | Auto-generates from JSDoc comments, stays in sync with code, supports Zod schemas |
| JWT validation | Custom token verification | API Gateway `x-google-jwt-locations` extension | Performant (caches JWKS for 5min), battle-tested, handles key rotation |
| DDoS protection | Custom IP blocking | Cloud Armor with Adaptive Protection | Detects L7 attacks via ML, auto-generates mitigation rules, OWASP Top 10 coverage |
| CORS preflight | Custom OPTIONS handlers | API Gateway `allowCors: true` in OpenAPI spec | Handles preflight automatically, supports complex CORS scenarios |
| Rate limit storage | In-memory counters | Firestore with atomic operations | Distributed, survives restarts, atomic increments prevent race conditions |

**Key insight:** Cloud Run + API Gateway is a managed stack—don't reinvent infrastructure primitives. Focus custom code on business logic (quota policies, budget tracking) where GCP doesn't provide the exact behavior needed.

## Common Pitfalls

### Pitfall 1: Cold Starts Break Image Generation Polling

**What goes wrong:** Cloud Run scales to zero by default. If idle for 15 minutes, next request triggers cold start (2-5s). For image generation that polls Replicate API every 2s for up to 120s, a mid-poll cold start loses state and fails the request.

**Why it happens:** Default Cloud Run autoscaling has `minScale: 0`. Cold start includes pulling Docker image, starting Node.js, initializing Firebase Admin SDK.

**How to avoid:** Set `autoscaling.knative.dev/minScale: "1"` to keep one warm instance. Enable `run.googleapis.com/startup-cpu-boost: "true"` to speed up cold starts when scaling beyond min instances.

**Warning signs:**
- Users report "generation timed out" after periods of low traffic
- Cloud Monitoring shows request latency spikes to 3-5s after idle periods
- Cold start logs in Cloud Logging: `"This request caused a new container instance to be started"`

**Cost trade-off:** Min instances=1 costs ~$13/month for 1 CPU instance idle. This is acceptable for MVP budget ($500 Replicate budget means ~$15/month infra is <5% overhead).

**Sources:** [General development tips | Cloud Run](https://docs.cloud.google.com/run/docs/tips/general), [3 solutions to mitigate the cold-starts on Cloud Run](https://medium.com/google-cloud/3-solutions-to-mitigate-the-cold-starts-on-cloud-run-8c60f0ae7894)

### Pitfall 2: API Gateway Quotas Are Not Per-User

**What goes wrong:** Developers configure `x-google-quota` in OpenAPI spec expecting per-user rate limiting, but API Gateway enforces quotas per-project or per-API-key, not per-authenticated-user. A single power user can exhaust the quota for all users.

**Why it happens:** API Gateway quota system is designed for API key-based usage (B2B APIs), not per-end-user limits. The `quotaUser` parameter in GCP APIs is for Google Workspace admin quotas, not custom app quotas.

**How to avoid:** Implement custom quota tracking in Firestore using Firebase Auth user ID. Check quota in middleware before forwarding to backend. Return 429 with `Retry-After` header when limit exceeded (see Pattern 3).

**Warning signs:**
- Single user exhausts quota, blocking all other users
- Rate limit errors correlate with one user's activity in logs
- `x-google-quota` metric costs in API Gateway don't match expected per-user limits

**Alternative approach:** Use Firestore security rules to enforce quotas at database level for write operations, but this doesn't help with computation-heavy API calls (generation, matching).

**Sources:** [Rate Limiting | Service Infrastructure](https://docs.cloud.google.com/service-infrastructure/docs/rate-limiting), [Capping API usage | Cloud APIs](https://docs.cloud.google.com/apis/docs/capping-api-usage)

### Pitfall 3: Edge Runtime vs Node.js Runtime Mismatch

**What goes wrong:** Current codebase uses `export const runtime = 'edge'` in several API routes (e.g., `src/app/api/v1/generate/route.ts`). Edge runtime doesn't support `@google-cloud/*` libraries (require full Node.js). When migrating to Cloud Run (which is full Node.js), Edge runtime declaration can cause confusion or be left as dead config.

**Why it happens:** Vercel's Edge Runtime is for global edge deployment with minimal APIs. Cloud Run is full Node.js. The `runtime = 'edge'` declaration is a Next.js optimization hint that's ignored in self-hosted deployments.

**How to avoid:** Remove `export const runtime = 'edge'` from all API routes during migration. Cloud Run always uses Node.js runtime, so this declaration is misleading. Audit all routes:

```bash
grep -r "export const runtime = 'edge'" src/app/api/
```

**Warning signs:**
- Build succeeds but runtime errors with "module not found" for Node.js APIs
- TypeScript errors about incompatible types when using `fs`, `crypto`, etc.
- Inconsistent behavior between local dev (Node.js) and deployed (Edge expectations)

**Migration action:** Replace `export const runtime = 'edge'` with:
```typescript
// Cloud Run uses full Node.js runtime - no edge constraints
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // Disable static optimization for API routes
```

**Sources:** [Runtime: nodejs vs edge · vercel/next.js](https://github.com/vercel/next.js/discussions/69486), [Edge Runtime](https://vercel.com/docs/functions/runtimes/edge)

### Pitfall 4: Secrets in Environment Variables Instead of Mounted Volumes

**What goes wrong:** Developers set secrets as environment variables in Cloud Run. Secrets are fetched once at instance startup and cached. If secret is rotated in Secret Manager, running instances continue using old value until redeployed.

**Why it happens:** Environment variable mode is easier to configure (one-line command), but doesn't support automatic rotation.

**How to avoid:** For production, mount secrets as volumes in Cloud Run. Secrets are refreshed periodically without redeployment. For MVP, environment variable mode is acceptable if you have a manual secret rotation process.

**Warning signs:**
- API calls fail with "authentication error" after rotating API keys in Secret Manager
- Manual Cloud Run redeployment required after every secret update
- Secrets visible in Cloud Run revision environment variables (security audit finding)

**Recommended approach:**
```bash
# Mount secret as volume (auto-refreshes)
gcloud run services update tattester-api \
  --update-secrets=/secrets/replicate-token=REPLICATE_API_TOKEN:latest

# Access in code:
const token = fs.readFileSync('/secrets/replicate-token', 'utf-8');
```

**Sources:** [Configure secrets for services | Cloud Run](https://cloud.google.com/run/docs/configuring/services/secrets), [Improving the security of your Cloud Run environment](https://cloud.google.com/blog/products/serverless/improving-the-security-of-your-cloud-run-environment)

## Code Examples

Verified patterns from official sources:

### Example 1: Cloud Run Service Deployment

```bash
# Build and deploy to Cloud Run
gcloud builds submit --tag gcr.io/PROJECT_ID/tattester:latest

gcloud run deploy tattester-api \
  --image gcr.io/PROJECT_ID/tattester:latest \
  --platform managed \
  --region us-central1 \
  --min-instances 1 \
  --max-instances 10 \
  --timeout 300 \
  --cpu 2 \
  --memory 1Gi \
  --concurrency 80 \
  --set-env-vars NODE_ENV=production \
  --update-secrets REPLICATE_API_TOKEN=REPLICATE_API_TOKEN:latest \
  --update-secrets FIREBASE_PRIVATE_KEY=FIREBASE_PRIVATE_KEY:latest \
  --allow-unauthenticated  # API Gateway handles auth
```

**Source:** [Quickstart: Build and deploy a Next.js web app to Google Cloud with Cloud Run](https://docs.cloud.google.com/run/docs/quickstarts/frameworks/deploy-nextjs-service)

### Example 2: API Gateway CORS Configuration

```yaml
# openapi/api-spec.yaml
openapi: 3.0.4
info:
  title: TatTester API
  version: 1.0.0
servers:
  - url: https://tattester-gateway-PROJECT_ID.uc.gateway.dev
    x-google-endpoint:
      allowCors: true  # Enables CORS with default settings

# For custom CORS headers (if needed):
x-google-endpoints:
  - name: tattester-gateway-PROJECT_ID.uc.gateway.dev
    allowCors: true
```

**Note:** When `allowCors: true`, API Gateway automatically handles OPTIONS preflight requests and adds CORS headers to responses. For production, restrict origins using Cloud Armor WAF rules instead of OpenAPI spec (more flexible).

**Source:** [Enabling CORS support for Endpoints | Cloud Endpoints with OpenAPI](https://cloud.google.com/endpoints/docs/openapi/support-cors)

### Example 3: Cloud Armor Security Policy

```bash
# Create Cloud Armor policy
gcloud compute security-policies create tattester-waf \
  --description "WAF for TatTester API"

# Add OWASP Top 10 rules
gcloud compute security-policies rules create 1000 \
  --security-policy tattester-waf \
  --expression "evaluatePreconfiguredExpr('xss-stable')" \
  --action "deny-403" \
  --description "Block XSS attacks"

gcloud compute security-policies rules create 1001 \
  --security-policy tattester-waf \
  --expression "evaluatePreconfiguredExpr('sqli-stable')" \
  --action "deny-403" \
  --description "Block SQL injection"

# Rate limiting rule (500 req/min per IP)
gcloud compute security-policies rules create 2000 \
  --security-policy tattester-waf \
  --expression "true" \
  --action "rate-based-ban" \
  --rate-limit-threshold-count 500 \
  --rate-limit-threshold-interval-sec 60 \
  --ban-duration-sec 600 \
  --conform-action "allow" \
  --exceed-action "deny-429" \
  --enforce-on-key "IP"

# Attach to backend service (API Gateway creates this automatically)
gcloud compute backend-services update BACKEND_SERVICE_NAME \
  --security-policy tattester-waf \
  --global
```

**Source:** [Security policy overview | Cloud Armor](https://docs.cloud.google.com/armor/docs/security-policy-overview), [Cloud Armor WAF: web-application firewall protection](https://cloud.google.com/blog/products/identity-security/new-waf-capabilities-in-cloud-armor)

### Example 4: Next.js Config for Standalone Output

```typescript
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone', // Enable standalone build for Docker

  // Existing webpack config for client-side
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        // ... other fallbacks
      };
    }
    return config;
  },

  // Optional: Configure static file caching
  async headers() {
    return [
      {
        source: '/uploads/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }
        ]
      }
    ];
  }
};

export default nextConfig;
```

**Source:** [next.config.js Options: output](https://nextjs.org/docs/pages/api-reference/config/next-config-js/output)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Express.js proxy for API routes | Next.js API routes directly on Cloud Run | Next.js 13+ (2023) | Eliminates dual server architecture, simpler deployment |
| IP-based rate limiting | Per-user JWT-based quotas | Firebase Auth integration (2024) | Prevents single user from exhausting global quota |
| Full Next.js build in Docker | Standalone output mode | Next.js 12+ (2022) | 70% smaller Docker images, faster deployments |
| Manual CORS handling | API Gateway `allowCors` extension | API Gateway GA (2021) | Automatic preflight handling, consistent CORS behavior |
| Cloud Endpoints | API Gateway for serverless | API Gateway GA (2021) | Fully managed (no ESPv2 proxy), better for Cloud Run/Functions |
| VM-based deployment | Cloud Run Gen 2 | Cloud Run Gen 2 GA (2023) | Scales to zero, pay-per-use, 60min timeout support |

**Deprecated/outdated:**
- **Cloud Endpoints for Cloud Run backends:** API Gateway is the recommended managed solution. Cloud Endpoints requires self-managed ESPv2 proxy, which adds operational overhead. Use Endpoints only for gRPC or private networking requirements.
- **express-rate-limit for per-user limits:** Library is IP-based by default. For authenticated APIs, custom Firestore quota tracking is more reliable (survives restarts, distributed across instances).
- **NEXT_PUBLIC_ env vars for secrets:** These are bundled into client JavaScript at build time. Use Secret Manager with server-side access only.

## Open Questions

1. **How should we handle API Gateway + Cloud Armor integration?**
   - What we know: API Gateway creates a managed backend service automatically. Cloud Armor policies attach to backend services.
   - What's unclear: Whether API Gateway's auto-created backend service supports Cloud Armor attachment, or if we need to create a custom backend service with NEG (Network Endpoint Group) pointing to Cloud Run.
   - Recommendation: Test in staging first. If API Gateway backend service doesn't support Cloud Armor, create a Load Balancer (HTTPS) → Cloud Run instead, which fully supports Cloud Armor but requires more configuration.

2. **Should we use API Gateway or direct Cloud Run + Load Balancer?**
   - What we know: API Gateway is simpler (OpenAPI spec → deployed), but has limitations (can't modify backend path, quotas are per-project). Load Balancer + Cloud Run gives full control but requires managing URL maps, backend services, health checks.
   - What's unclear: Whether the per-user quota requirement justifies the extra complexity of Load Balancer setup.
   - Recommendation: Start with API Gateway for MVP (simpler), implement per-user quotas in application layer (Firestore). Migrate to Load Balancer + Cloud Armor in Phase 5 if quota enforcement needs to be at infrastructure level (e.g., block abusive IPs before hitting Cloud Run).

3. **How to migrate from Express server.js to Cloud Run without downtime?**
   - What we know: Current architecture has Express on port 3001/3002, Next.js dev server on port 3000. Both must be running in development.
   - What's unclear: Whether Cloud Run deployment can coexist with Vercel deployment during migration, or if we need a hard cutover.
   - Recommendation: Deploy to Cloud Run as a separate backend (`api-v2.tattester.com`), proxy from Vercel to Cloud Run for testing, then swap DNS/API endpoint once validated.

4. **Is min instances=1 necessary, or can we optimize cold starts instead?**
   - What we know: Min instances=1 costs ~$13/month idle. Cold starts with startup CPU boost are ~2-3s. Image generation polling takes 120s.
   - What's unclear: Whether lazy initialization + startup CPU boost can reduce cold start to <1s, making min instances=0 acceptable.
   - Recommendation: Benchmark cold start with optimized Dockerfile (minimal base image, lazy-load Firebase Admin). If cold start <1s, min instances=0 is viable. Otherwise, min instances=1 with committed use discount.

## Sources

### Primary (HIGH confidence)
- [Google Cloud Run Documentation](https://cloud.google.com/run/docs) - Official Cloud Run features, configuration, best practices
- [API Gateway Documentation](https://cloud.google.com/api-gateway/docs) - OpenAPI spec, Firebase Auth, quotas
- [Cloud Armor Documentation](https://cloud.google.com/armor/docs) - WAF rules, DDoS protection, security policies
- [Next.js Official Docs - Output Configuration](https://nextjs.org/docs/pages/api-reference/config/next-config-js/output) - Standalone mode
- [Firebase Auth with Next.js Middleware](https://next-firebase-auth-edge-docs.vercel.app/docs/usage/middleware) - next-firebase-auth-edge library docs

### Secondary (MEDIUM confidence)
- [Quickstart: Build and deploy a Next.js web app to Cloud Run](https://docs.cloud.google.com/run/docs/quickstarts/frameworks/deploy-nextjs-service) - Official Google tutorial (Feb 2026)
- [Using Firebase to authenticate users | API Gateway](https://cloud.google.com/api-gateway/docs/authenticating-users-firebase) - Official integration guide
- [Configure secrets for services | Cloud Run](https://cloud.google.com/run/docs/configuring/services/secrets) - Secret Manager integration (updated Feb 2026)
- [Set minimum instances for services | Cloud Run](https://cloud.google.com/run/docs/configuring/min-instances) - Min instances configuration
- [Choosing between Apigee, API Gateway, and Cloud Endpoints](https://cloud.google.com/blog/products/application-modernization/choosing-between-apigee-api-gateway-and-cloud-endpoints) - Official comparison

### Tertiary (LOW confidence - community sources)
- [Dockerizing a Next.js Application in 2025](https://medium.com/front-end-world/dockerizing-a-next-js-application-in-2025-bacdca4810fe) - Community tutorial on multi-stage builds
- [GitHub - kristiyan-velkov/nextjs-prod-dockerfile](https://github.com/kristiyan-velkov/nextjs-prod-dockerfile) - Production Dockerfile examples
- [3 solutions to mitigate the cold-starts on Cloud Run](https://medium.com/google-cloud/3-solutions-to-mitigate-the-cold-starts-on-cloud-run-8c60f0ae7894) - Community patterns
- [Fireship.io - Firestore Rate Limiting](https://fireship.io/lessons/how-to-rate-limit-writes-firestore/) - Community tutorial on quota tracking

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** - Official Google Cloud docs, recent updates (Feb 2026), multiple authoritative sources
- Architecture patterns: **MEDIUM-HIGH** - Patterns verified in official docs + community implementations, some gaps in API Gateway + Cloud Armor integration
- Pitfalls: **MEDIUM** - Derived from community experiences and Google Cloud support articles, not all tested in TatTester context
- Per-user rate limiting: **MEDIUM** - Firestore pattern is community-derived, not an official GCP solution (API Gateway doesn't natively support per-user quotas)

**Research date:** 2026-02-15
**Valid until:** ~2026-04-15 (60 days for stable infrastructure APIs, GCP services change slowly)

**Next steps for planning:**
1. Decide API Gateway vs Load Balancer + Cloud Run (see Open Question #2)
2. Design Firestore quota schema for per-user rate limiting
3. Create Dockerfile with multi-stage build + standalone output
4. Generate OpenAPI spec from existing API routes using next-swagger-doc
5. Plan migration strategy (parallel deployment vs cutover)
