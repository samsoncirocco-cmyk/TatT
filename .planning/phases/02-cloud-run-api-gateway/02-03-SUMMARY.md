# Phase 2 Plan 03 Summary (OpenAPI + Cloud Armor + Route Enforcement + CORS)

## Changes
- Added API Gateway OpenAPI spec:
  - `openapi/api-spec.yaml` (OpenAPI 3.0.4, Firebase auth scheme placeholders, v1 endpoints, public `/api/health`)
- Added Cloud Armor WAF policy script:
  - `openapi/cloud-armor-policy.sh` (XSS, SQLi rules + IP rate limiting)
- Restricted browser origins via middleware:
  - `middleware.ts` blocks non-whitelisted `Origin` values (configurable via `ALLOWED_ORIGINS`, with dev defaults)
- Wired per-user rate limiting into all v1 API routes (post-auth) and added budget enforcement to generation:
  - `src/app/api/v1/*/route.ts` (11 routes call `checkRateLimit`)
  - `src/app/api/v1/generate/route.ts` calls `checkBudget()` before generation and `recordSpend()` on success

## Verification
- `grep -R "checkRateLimit" src/app/api/v1 | cut -d: -f1 | sort -u | wc -l` == 11.
- `npm run build` succeeds.

