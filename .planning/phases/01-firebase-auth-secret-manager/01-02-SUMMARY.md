# Plan 01-02 Summary: Edge Middleware + DAL + API Auth Migration

## Status: COMPLETE

## What Was Done

### Task 1: Middleware + DAL + API Auth Update
- **Created `middleware.ts`** (project root): Edge-compatible auth middleware using `next-firebase-auth-edge`
  - Protects `/api/v1/*`, `/dashboard/*`, `/generate/*`, `/smart-match/*`, `/visualize/*`
  - API routes get 401 JSON on invalid token; page routes redirect to `/login`
  - Login/logout endpoints at `/api/login` and `/api/logout`
  - Cookie-based sessions with 12-day expiry, httpOnly, secure in production

- **Updated `src/lib/api-auth.ts`**: Replaced shared bearer token with cookie-based Firebase auth
  - Removed `FRONTEND_AUTH_TOKEN` constant and `dev-token-change-in-production` fallback
  - `verifyApiAuth()` now checks for `AuthToken` cookie (defense-in-depth — middleware handles primary auth)
  - Added `getUserFromRequest()` to extract user uid/email from Firebase token
  - Maintains backward-compatible function signature

- **`src/lib/auth-dal.ts`** was already created in prior work: Firebase Admin token verification via `verifyFirebaseToken()` and `requireAuth()`

### Task 2: API Route Auth + Client-Side Token Cleanup
- **All 11 API v1 routes now have `verifyApiAuth` defense-in-depth**:
  - 7 already had it: generate, council/enhance, match/semantic, match/update, embeddings/generate, storage/upload, storage/get-signed-url
  - 4 were added: ar/visualize, layers/decompose, stencil/export, upload-layer
  - Fixed council/enhance route: replaced messy dynamic import with clean static import

- **Client-side services migrated from bearer token to cookie auth** (6 files):
  - `matchUpdateService.js` — removed AUTH_TOKEN, removed Authorization header
  - `multiLayerService.ts` — removed AUTH_TOKEN, removed Authorization header
  - `multiLayerService.js` — removed AUTH_TOKEN, removed Authorization header
  - `layerDecompositionService.js` — removed AUTH_TOKEN, removed Authorization header
  - `neo4jService.ts` — removed Authorization header with dev token
  - `fetchWithAbort.ts` — removed bearer token injection, now relies on cookies

- **Component pages updated** (2 files):
  - `src/pages/SmartMatch.tsx` — removed hardcoded dev token
  - `src/features/SmartMatch.jsx` — removed hardcoded dev token

## Verification
- `grep -r 'dev-token-change-in-production' src/` returns **zero results**
- All 11 `/api/v1/*` routes call `verifyApiAuth(req)` as first operation
- `middleware.ts` exports `middleware` and `config`
- `api-auth.ts` exports `verifyApiAuth` and `getUserFromRequest`
- `next-firebase-auth-edge` is in package.json dependencies

## Files Modified
- `middleware.ts` (CREATED)
- `src/lib/api-auth.ts` (UPDATED)
- `src/app/api/v1/ar/visualize/route.ts` (UPDATED — added auth)
- `src/app/api/v1/layers/decompose/route.ts` (UPDATED — added auth)
- `src/app/api/v1/stencil/export/route.ts` (UPDATED — added auth)
- `src/app/api/v1/upload-layer/route.ts` (UPDATED — added auth)
- `src/app/api/v1/council/enhance/route.ts` (UPDATED — cleaned up auth import)
- `src/services/matchUpdateService.js` (UPDATED — removed dev token)
- `src/services/multiLayerService.ts` (UPDATED — removed dev token)
- `src/services/multiLayerService.js` (UPDATED — removed dev token)
- `src/services/layerDecompositionService.js` (UPDATED — removed dev token)
- `src/services/neo4jService.ts` (UPDATED — removed dev token)
- `src/services/fetchWithAbort.ts` (UPDATED — removed bearer token injection)
- `src/pages/SmartMatch.tsx` (UPDATED — removed dev token)
- `src/features/SmartMatch.jsx` (UPDATED — removed dev token)

## Remaining (Wave 3 scope)
- `server.js` and `scripts/generate-portfolio-embeddings.js` still reference `dev-token-change-in-production` (Express proxy, not Next.js API routes)
- Secret Manager integration for all credentials
