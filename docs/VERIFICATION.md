# TatT Production Verification Guide

> Comprehensive end-to-end verification procedures, API key requirements, testing instructions, known issues, and production readiness checklist.

**Last Updated:** 2026-03-01
**Document Version:** 1.0.0
**Status:** Phase 4 Complete

---

## Table of Contents

1. [Quick Start Verification](#quick-start-verification)
2. [API Keys & Environment Variables](#api-keys--environment-variables)
3. [Feature Verification Matrix](#feature-verification-matrix)
4. [End-to-End Feature Tests](#end-to-end-feature-tests)
5. [Running Tests](#running-tests)
6. [Known Issues](#known-issues)
7. [Production Readiness Checklist](#production-readiness-checklist)
8. [Troubleshooting Guide](#troubleshooting-guide)

---

## Quick Start Verification

Before diving into detailed verification, run this quick sanity check:

```bash
cd /home/samson/.openclaw/workspace/repos/TatT

# 1. Check environment is configured
python3 execution/validate_env.py --skip secrets --skip firestore --skip neo4j --skip storage

# 2. Install dependencies (if not already)
npm install

# 3. Start dev server
npm run dev &

# 4. Run health checks (once server is up)
python3 execution/run_health_checks.py --base-url http://localhost:3000

# 5. Run JavaScript tests
npm test

# 6. Run Python tests (requires pytest)
pip install -e . && python3 -m pytest tests/ -v
```

**Expected Results:**
- ✅ Environment validation passes for required env vars
- ✅ Dev server starts on port 3000
- ✅ Health checks return `200 OK`
- ✅ Vitest tests pass
- ✅ Pytest tests pass (50/65 minimum)

---

## API Keys & Environment Variables

### Required API Keys

| Service | Variable | Where to Get | Cost |
|---------|----------|--------------|------|
| **Replicate** | `REPLICATE_API_TOKEN` | [replicate.com/account](https://replicate.com/account/api-tokens) | ~$0.02/generation |
| **Firebase** | `NEXT_PUBLIC_FIREBASE_*` | [Firebase Console](https://console.firebase.google.com) | Free tier |
| **GCP Project** | `GCP_PROJECT_ID` | [GCP Console](https://console.cloud.google.com) | Pay-as-you-go |

### Optional API Keys (Feature-dependent)

| Service | Variable | Feature | Cost |
|---------|----------|---------|------|
| **OpenRouter** | `VITE_OPENROUTER_API_KEY` | LLM Council (real models) | ~$0.01-0.03/enhancement |
| **Neo4j** | `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD` | Graph-based artist matching | Self-hosted or AuraDB |
| **Supabase** | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY` | Vector search, auth fallback | Free tier available |
| **Vertex AI** | `VITE_VERTEX_AI_PROJECT_ID` | Imagen 3 generation | ~$0.02/image |

### Environment Configuration

Create `.env` from template:

```bash
cp .env.example .env
```

**Minimum viable `.env` for local development:**

```bash
# Core
VITE_PROXY_URL=http://localhost:3002/api
VITE_DEMO_MODE=false

# Image Generation (REQUIRED)
REPLICATE_API_TOKEN=r8_your_token_here

# Auth Token (generate with: openssl rand -hex 32)
FRONTEND_AUTH_TOKEN=your_secure_token_here
VITE_FRONTEND_AUTH_TOKEN=your_secure_token_here

# Server
HOST=127.0.0.1
PORT=3002
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Firebase (client-side, safe to expose)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# Council (set to true to enable AI enhancement)
VITE_USE_COUNCIL=true
VITE_COUNCIL_DEMO_MODE=true
VITE_USE_OPENROUTER=false
```

### Verifying API Keys

```bash
# Test Replicate token
curl -s -H "Authorization: Bearer $REPLICATE_API_TOKEN" \
  https://api.replicate.com/v1/models | jq '.results[0].name'

# Test Firebase (via app)
npm run dev
# Navigate to /login and attempt sign up

# Test Neo4j
python3 -c "
from neo4j import GraphDatabase
import os
driver = GraphDatabase.driver(
    os.environ.get('NEO4J_URI'),
    auth=(os.environ.get('NEO4J_USER'), os.environ.get('NEO4J_PASSWORD'))
)
with driver.session() as session:
    print(session.run('RETURN 1 AS test').single()['test'])
driver.close()
"
```

---

## Feature Verification Matrix

| Feature | Status | Dependencies | Verification Route |
|---------|--------|--------------|-------------------|
| **AI Design Generation** | ✅ Production | Replicate | `/generate` |
| **LLM Council Enhancement** | ✅ Production | OpenRouter OR demo mode | `/generate` |
| **Multi-Model Routing** | ✅ Production | Replicate | `/generate` |
| **Neural Ink Matching** | ✅ Production | Supabase/Neo4j | `/smart-match` |
| **Forge Canvas (Layers)** | ✅ Production | None | `/generate` |
| **Version History** | ✅ Production | LocalStorage | `/generate` |
| **AR Visualization** | ⚠️ Limited | MindAR, Camera | `/visualize` |
| **Stencil Export** | ✅ Production | None | `/generate` |
| **Firebase Auth** | ✅ In Progress | Firebase | `/login`, `/signup` |
| **Artist Profiles** | ✅ Production | Neo4j/Supabase | `/artists` |
| **Swipe Match** | ✅ Production | None | `/swipe` |
| **Design Library** | ✅ Production | LocalStorage | Dashboard |

---

## End-to-End Feature Tests

### Test 1: Design Generation Flow

**Objective:** Verify complete generation pipeline from prompt to saved design.

**Prerequisites:**
- `REPLICATE_API_TOKEN` configured
- Dev server running (`npm run dev`)

**Steps:**

1. Navigate to `http://localhost:3000/generate`
2. Verify page loads with "THE FORGE" header
3. Select style: "Traditional"
4. Enter prompt: "wolf howling at moon"
5. Select body part: "Forearm"
6. Click "Generate Design"
7. Wait 10-30 seconds for generation

**Expected Results:**
- ✅ Loading spinner appears
- ✅ 4 image variations generated
- ✅ Images display in grid
- ✅ "Save to Library" button on each
- ✅ Budget tracker updates

**Budget Impact:** ~$0.02

---

### Test 2: LLM Council Enhancement

**Objective:** Verify AI prompt enhancement with council.

**Prerequisites:**
- `VITE_USE_COUNCIL=true` in `.env`
- `VITE_COUNCIL_DEMO_MODE=true` OR `VITE_OPENROUTER_API_KEY` set

**Steps:**

1. Navigate to `/generate`
2. Enter basic prompt: "dragon"
3. Click "✨ Enhance with AI Council" button
4. Observe loading animation (4 colored circles)
5. Wait for 3 prompt variants to appear

**Expected Results:**
- ✅ Council loading animation displays
- ✅ 3 prompt cards appear: Simple, Detailed, Ultra
- ✅ Each card shows enhanced, style-aware prompt
- ✅ "Use Prompt" button selects enhanced version
- ✅ "AI Enhanced" badge appears after selection

---

### Test 3: Artist Matching (Neural Ink)

**Objective:** Verify semantic artist matching with vector search.

**Prerequisites:**
- Neo4j OR Supabase configured with artist data
- At least 10 artists seeded with embeddings

**Steps:**

1. Navigate to `/smart-match`
2. Enter style preferences: "Anime"
3. Enter location: "Phoenix, AZ"
4. Set budget: $200
5. Click "Find Artists"

**Expected Results:**
- ✅ Loading indicator appears
- ✅ Artist cards display with match scores
- ✅ Score breakdown visible (style, location, budget)
- ✅ "Reasons" explain why artist matched
- ✅ Response time < 500ms

---

### Test 4: Forge Canvas Operations

**Objective:** Verify layer management and transform controls.

**Prerequisites:**
- Dev server running
- At least one generated design

**Steps:**

1. Generate a design OR load from library
2. In layer panel, click layer to select
3. Test transform handles:
   - Drag center to move
   - Drag corners to resize
   - Drag rotation handle to rotate
4. Test keyboard shortcuts:
   - Arrow keys: move layer
   - `Delete`: remove layer
   - `Cmd+Z` / `Ctrl+Z`: undo
   - `Cmd+Shift+Z` / `Ctrl+Shift+Z`: redo
   - `Cmd+D` / `Ctrl+D`: duplicate
5. Test blend modes (if available)

**Expected Results:**
- ✅ Layer selection highlights correctly
- ✅ Transform handles appear at corners + rotation
- ✅ 60fps performance during transforms
- ✅ Undo/redo works correctly
- ✅ Version history shows timeline

---

### Test 5: Version History

**Objective:** Verify design version snapshots and navigation.

**Steps:**

1. On `/generate`, make several edits to a design
2. Click "Version History" button
3. Observe timeline of snapshots
4. Click an older version to preview
5. Click "Restore" to rollback

**Expected Results:**
- ✅ Each edit creates a version snapshot
- ✅ Timeline shows visual thumbnails
- ✅ Clicking version shows preview
- ✅ Restore replaces current state
- ✅ Restored state can be re-edited

---

### Test 6: Stencil Export

**Objective:** Verify professional stencil generation.

**Steps:**

1. Load or generate a design
2. Click "Export" dropdown
3. Select "Stencil (300 DPI)"
4. Choose dimensions (e.g., 6" x 8")
5. Download exported file

**Expected Results:**
- ✅ Export dialog shows dimension options
- ✅ PDF/PNG generates successfully
- ✅ File downloads to browser
- ✅ Resolution is 300 DPI
- ✅ Calibration markers present (if enabled)

---

### Test 7: Firebase Authentication

**Objective:** Verify user signup, login, and session persistence.

**Prerequisites:**
- Firebase project configured
- `NEXT_PUBLIC_FIREBASE_*` variables set

**Steps:**

1. Navigate to `/signup`
2. Enter email and password
3. Click "Create Account"
4. Observe redirect to dashboard
5. Close browser completely
6. Reopen and navigate to `/`
7. Verify still logged in

**Expected Results:**
- ✅ Signup creates Firebase user
- ✅ Redirect to authenticated area
- ✅ Session persists across browser close
- ✅ Login page redirects authenticated users
- ✅ Logout clears session

---

### Test 8: AR Visualization (Limited)

**Objective:** Verify basic AR preview functionality.

**Prerequisites:**
- Camera access enabled in browser
- HTTPS or localhost

**Steps:**

1. Load a design
2. Navigate to `/visualize` or click AR preview
3. Grant camera permission
4. Point camera at arm/body
5. Observe design overlay

**Expected Results:**
- ⚠️ Camera feed displays
- ⚠️ Design overlays on camera (may require MindAR target)
- ⚠️ Position adjustable
- ⚠️ Quality depends on lighting/camera

**Note:** AR is marked "Limited" — full functionality requires MindAR training data.

---

### Test 9: Budget Tracking

**Objective:** Verify API usage and spend tracking.

**Steps:**

1. Check Home page for budget stats
2. Generate 3 designs
3. Verify budget updates
4. Check localStorage for `tattester_api_usage`

**Expected Results:**
- ✅ Budget tracker shows current spend
- ✅ Spend increases ~$0.066 after 3 generations
- ✅ Daily/total limits enforced
- ✅ Warning appears near budget limit

---

### Test 10: Mobile Responsiveness

**Objective:** Verify mobile-first design on various screen sizes.

**Steps (Chrome DevTools):**

1. Open DevTools (F12)
2. Toggle device toolbar (Cmd+Shift+M)
3. Test viewports:
   - iPhone 12 Pro (390x844)
   - iPad (768x1024)
   - Desktop (1920x1080)
4. Verify all pages:
   - `/` (Home)
   - `/generate` (Forge)
   - `/artists` (Artists)
   - `/smart-match` (Match)

**Expected Results:**
- ✅ No horizontal scrolling on mobile
- ✅ Touch targets ≥ 44x44px
- ✅ Bottom navigation always visible
- ✅ Modal/drawers go full-screen on mobile
- ✅ Canvas/layers usable on tablet+

---

## Running Tests

### JavaScript Tests (Vitest)

```bash
# Run all tests once
npm test

# Watch mode for development
npm run test:watch

# With coverage
npm run test:coverage
```

**Test Location:** `tests/` (Vitest) and `src/**/*.test.ts(x)`

### Python Tests (pytest)

```bash
# Install package in editable mode
pip install -e .

# Install test dependencies
pip install -r execution/requirements.txt
pip install pytest pytest-cov

# Run all tests
python3 -m pytest tests/ -v

# Run specific test file
python3 -m pytest tests/execution/test_validate_env.py -v

# Run with coverage
python3 -m pytest tests/ --cov=execution --cov-report=html
```

**Test Location:** `tests/execution/`

### Test Files Reference

| File | Purpose | Tests |
|------|---------|-------|
| `test_validate_env.py` | Environment validation | 10 |
| `test_run_health_checks.py` | API health checks | 10 |
| `test_seed_artists.py` | Artist data seeding | 8 |
| `test_generate_embeddings.py` | Embedding generation | 12 |
| `test_check_budget.py` | Budget monitoring | 10 |
| `test_migrate_localStorage.py` | Data migration | 10 |
| `test_log_incident.py` | Incident logging | 5 |

**Expected Results:** 50/65 tests passing minimum (some cosmetic failures acceptable)

### Health Check Scripts

```bash
# Full health check (requires running server)
python3 execution/run_health_checks.py --base-url http://localhost:3000

# Specific check only
python3 execution/run_health_checks.py --check health

# Production health check
python3 execution/run_health_checks.py --base-url https://tat-t-3x8t.vercel.app

# Environment validation
python3 execution/validate_env.py

# Skip external services
python3 execution/validate_env.py --skip secrets --skip firestore --skip neo4j

# JSON output for CI
python3 execution/validate_env.py --json
```

---

## Known Issues

### KI-001: Zustand Infinite Loop (RESOLVED)

**Symptom:** Generate page crashes with "getSnapshot should be cached" warning.

**Cause:** `useLayerManagement` hook returns new object reference every render.

**Resolution:** Wrap return value in `useMemo`:

```typescript
return useMemo(() => ({
    layers,
    sortedLayers,
    selectedLayerId,
    ...actions
}), [layers, sortedLayers, selectedLayerId, actions]);
```

**Status:** ✅ Fixed in commit `5a2da12`

---

### KI-002: AR Limited Functionality

**Symptom:** AR preview shows camera but design doesn't overlay correctly.

**Cause:** MindAR requires trained target images for accurate tracking.

**Workaround:** Use basic overlay mode without depth mapping.

**Status:** ⚠️ Known limitation — full AR requires MindAR training data

---

### KI-003: Replicate URL Expiration

**Symptom:** Generated images fail to load after ~1 hour.

**Cause:** Replicate-hosted URLs expire.

**Workaround:** 
- Download important designs immediately
- Enable GCS upload for permanent storage

**Status:** ⚠️ By design — use GCS for production

---

### KI-004: localStorage 50-Design Limit

**Symptom:** Cannot save more than 50 designs; oldest non-favorite removed.

**Cause:** Browser localStorage quota (~5-10MB).

**Workaround:**
- Favorite important designs (protected from auto-removal)
- Enable Firestore storage for unlimited designs
- Export library as JSON backup

**Status:** ⚠️ Known limitation — Firestore migration in progress

---

### KI-005: Council Demo Mode Limitations

**Symptom:** Enhanced prompts are generic/repetitive in demo mode.

**Cause:** Demo mode uses hardcoded prompt templates, not real LLMs.

**Resolution:** 
- Set `VITE_USE_OPENROUTER=true`
- Add `VITE_OPENROUTER_API_KEY`

**Status:** ⚠️ Expected behavior in demo mode

---

### KI-006: Neo4j Optional but Degraded

**Symptom:** Artist matching works but graph-based recommendations missing.

**Cause:** Neo4j not configured.

**Resolution:** Configure Neo4j credentials OR use Supabase-only mode.

**Status:** ⚠️ Graceful degradation by design

---

### KI-007: CORS Errors on Railway

**Symptom:** `Origin not allowed` errors in browser console.

**Cause:** Frontend origin not in `ALLOWED_ORIGINS` env var.

**Resolution:** 
1. Add your Vercel domain to Railway's `ALLOWED_ORIGINS`
2. Format: `https://tat-t-3x8t.vercel.app` (comma-separated)
3. Include both www and non-www if applicable
4. Railway auto-restarts after env changes

**Status:** ⚠️ Configuration issue — follow DEPLOYMENT_QUICK_REFERENCE.md

---

### KI-008: TypeScript Migration Incomplete

**Symptom:** Mixed `.js` and `.ts` files; some type errors on strict mode.

**Cause:** 40% TypeScript migration complete (Phases 0-2c).

**Resolution:** Phase 3 will migrate remaining files and enable `strict: true`.

**Status:** ⚠️ In progress — see CHANGELOG.md for migration status

---

## Production Readiness Checklist

### ✅ GO Criteria (All Must Pass)

#### Infrastructure
- [ ] `npm run build` completes without errors
- [ ] `npm test` passes (Vitest)
- [ ] `python3 -m pytest tests/ -v` passes (50/65 minimum)
- [ ] Health check endpoint returns `200 OK`
- [ ] Environment validation passes for production

#### Security
- [ ] `REPLICATE_API_TOKEN` is server-side only
- [ ] `FRONTEND_AUTH_TOKEN` matches between frontend/backend
- [ ] CORS `ALLOWED_ORIGINS` configured for production domains
- [ ] Rate limiting enabled (30 req/min default)
- [ ] Firebase Auth configured (or fallback auth ready)

#### Core Features
- [ ] Design generation works end-to-end
- [ ] Generated images display correctly
- [ ] Save to library works
- [ ] Budget tracking functional
- [ ] At least one matching backend (Neo4j or Supabase) configured

#### Performance
- [ ] Page load < 2 seconds
- [ ] Design generation < 60 seconds
- [ ] Artist matching < 500ms
- [ ] 60fps on Forge canvas operations
- [ ] No memory leaks on extended use

#### Deployment
- [ ] Vercel environment variables configured
- [ ] Railway environment variables configured
- [ ] `VITE_PROXY_URL` points to production backend
- [ ] GCS bucket configured for image persistence (optional but recommended)
- [ ] SSL certificates valid

### ⚠️ CAUTION Items (Review Before Launch)

- [ ] AR visualization limited without MindAR training
- [ ] localStorage has 50-design limit
- [ ] Demo mode council uses mock responses
- [ ] TypeScript migration incomplete (40%)
- [ ] Some test failures are cosmetic (error message mismatches)

### ❌ NO-GO Criteria (Block Launch If Any)

- [ ] `npm run build` fails
- [ ] Health checks fail on production URL
- [ ] Design generation returns errors
- [ ] Auth tokens exposed in client bundle
- [ ] CORS blocks frontend requests
- [ ] Budget tracking broken (uncontrolled spend risk)

---

## Troubleshooting Guide

### "Cannot connect to proxy server"

```bash
# Check backend is running
curl http://localhost:3002/api/health

# Verify VITE_PROXY_URL
grep VITE_PROXY_URL .env

# Check CORS
curl -X OPTIONS http://localhost:3002/api/health \
  -H "Origin: http://localhost:3000" -v
```

### "Authorization header required" (401)

```bash
# Verify tokens match
echo "Frontend: $VITE_FRONTEND_AUTH_TOKEN"
echo "Backend: $FRONTEND_AUTH_TOKEN"

# Test with token
curl -H "Authorization: Bearer $FRONTEND_AUTH_TOKEN" \
  http://localhost:3002/api/health
```

### "Rate limit exceeded" (429)

- Wait 60 seconds
- Check `x-ratelimit-remaining` header
- Increase limit in `server.js` line 30 if needed

### "Generation timeout"

- Check Replicate dashboard for queue status
- Verify model is available (some models have cold starts)
- SDXL typically takes 10-30 seconds

### Tests Failing

```bash
# Clear caches
rm -rf node_modules/.vitest
rm -rf .pytest_cache

# Reinstall dependencies
npm ci
pip install -e .

# Run with verbose output
npm test -- --reporter=verbose
python3 -m pytest tests/ -v --tb=long
```

### Build Errors

```bash
# Clear Next.js cache
rm -rf .next

# Check TypeScript errors
npx tsc --noEmit

# Check for missing dependencies
npm ls | grep "UNMET"
```

---

## Verification Sign-Off

| Area | Verified By | Date | Status |
|------|-------------|------|--------|
| Core Generation | | | ⬜ Pending |
| LLM Council | | | ⬜ Pending |
| Artist Matching | | | ⬜ Pending |
| Forge Canvas | | | ⬜ Pending |
| Authentication | | | ⬜ Pending |
| Mobile UI | | | ⬜ Pending |
| Security | | | ⬜ Pending |
| Performance | | | ⬜ Pending |
| Deployment | | | ⬜ Pending |

---

## Appendix: Quick Commands Reference

```bash
# Development
npm run dev              # Start Next.js dev server
npm run server           # Start Express proxy (separate terminal)
npm run build            # Production build
npm run lint             # ESLint check

# Testing
npm test                 # Vitest run
npm run test:watch       # Vitest watch mode
python3 -m pytest tests/ # Python tests

# Health Checks
python3 execution/run_health_checks.py
python3 execution/validate_env.py

# Data Operations
python3 execution/seed_artists.py --count 50
python3 execution/generate_embeddings.py --batch-size 10
python3 execution/check_budget.py --threshold 0.9

# Deployment
vercel --prod            # Deploy to Vercel
railway up               # Deploy to Railway
```

---

*This document is part of the TatT Phase 4 deliverables. For architecture details, see [ARCHITECTURE.md](../ARCHITECTURE.md). For deployment, see [DEPLOYMENT_QUICK_REFERENCE.md](DEPLOYMENT_QUICK_REFERENCE.md).*
