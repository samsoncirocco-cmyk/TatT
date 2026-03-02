# VERIFICATION.md — TatT Feature Verification Checklist

**Purpose:** This document lists every feature, endpoint, and component in the TatT codebase with step-by-step test procedures to verify each works correctly. Use this for pre-release QA, post-deploy smoke testing, and onboarding new engineers.

**Last Updated:** 2026-03-02  
**Codebase State:** Phase 3 complete (Firestore + Cloud Storage), build passing ✅

---

## HOW TO USE THIS DOCUMENT

Each section has:
- **What it does** — one-line description
- **Expected behavior** — what success looks like
- **Test steps** — exact curl commands or UI actions
- **Pass criteria** — what response/behavior confirms it's working
- **Status column** — [ ] = untested, [✅] = passed, [❌] = failed

---

## QUICK SMOKE TEST (run first, ~5 min)

These four checks tell you if the deployment is healthy before anything else:

```bash
BASE=http://localhost:3000  # or your deployed URL

# 1. Health check
curl -s "$BASE/api/health" | python3 -m json.tool

# 2. Auth required (should get 401)
curl -s -X POST "$BASE/api/v1/generate" -H "Content-Type: application/json" \
  -d '{"prompt": "test"}' | python3 -m json.tool

# 3. Startup health
curl -s "$BASE/api/health/startup" | python3 -m json.tool

# 4. App loads (200 HTML)
curl -s -o /dev/null -w "%{http_code}" "$BASE/"
```

**All four pass = deployment is alive.**

---

## PART 1 — API ENDPOINTS

### 1.1 Health Endpoints

#### `GET /api/health`
**What it does:** Returns service status and config presence (no auth required)  
**Status:** [ ]

**Test:**
```bash
curl -s http://localhost:3000/api/health | python3 -m json.tool
```

**Pass criteria:**
```json
{
  "status": "ok",
  "api_version": "v1",
  "endpoints": { ... }
}
```
- `status` must equal `"ok"`
- `endpoints.v1` object must contain all 10 route keys
- `authRequired: true` must be present
- `hasVertexConfig`, `hasGcsConfig`, `hasNeo4jConfig` show environment readiness (can be false in dev)

---

#### `GET /api/health/startup`
**What it does:** Startup liveness probe for Cloud Run  
**Status:** [ ]

**Test:**
```bash
curl -s http://localhost:3000/api/health/startup
```

**Pass criteria:** HTTP 200, JSON body with uptime/status fields

---

### 1.2 Image Generation

#### `POST /api/v1/generate`
**What it does:** Generates tattoo design images via Vertex AI Imagen or Replicate  
**Rate limit:** 60 req/hr  
**Auth:** Required (Firebase JWT Bearer token)  
**Status:** [ ]

**Test (unauthenticated — should fail):**
```bash
curl -s -X POST http://localhost:3000/api/v1/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt":"dragon sleeve"}'
```
**Pass:** HTTP 401 `{"error": "Unauthorized"}`

**Test (authenticated):**
```bash
TOKEN="<firebase-id-token>"
curl -s -X POST http://localhost:3000/api/v1/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Japanese dragon sleeve tattoo, watercolor",
    "style": "watercolor",
    "bodyPart": "arm",
    "size": "medium"
  }' | python3 -m json.tool
```

**Pass criteria:**
- HTTP 200 with `imageUrl` field containing a valid URL
- `imageUrl` points to a GCS-hosted image (`storage.googleapis.com/tattester-generated-images/...`)
- Response includes generation metadata (model, seed, dimensions)

**Rate limit test:**
```bash
# Hit the endpoint 61+ times — the 61st should return 429
for i in $(seq 1 62); do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/v1/generate \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"prompt":"test"}')
  echo "$i: $CODE"
done
```
**Pass:** Responses after quota exhaustion return `429` with `Retry-After` header

---

#### `POST /api/generate` (legacy route)
**What it does:** Legacy Replicate Stable Diffusion route (kept for backward compat)  
**Status:** [ ]

```bash
curl -s -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "simple tribal band tattoo"}'
```
**Pass:** Either returns image or returns redirect/deprecation notice pointing to `/api/v1/generate`

---

#### `POST /api/predictions` + `GET /api/predictions/[id]`
**What it does:** Async Replicate polling — create prediction, poll until done  
**Status:** [ ]

```bash
# Create prediction
PRED=$(curl -s -X POST http://localhost:3000/api/predictions \
  -H "Content-Type: application/json" \
  -d '{"prompt": "fine line botanical tattoo"}')
echo $PRED

# Poll prediction
PRED_ID=$(echo $PRED | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
curl -s http://localhost:3000/api/predictions/$PRED_ID | python3 -m json.tool
```
**Pass:** Prediction status cycles through `starting → processing → succeeded`, final response has `output` array with image URLs

---

### 1.3 Artist Matching

#### `POST /api/v1/match/semantic`
**What it does:** Hybrid semantic + keyword artist matching (embedding cosine similarity + Firestore filters)  
**Rate limit:** 100 req/hr  
**Auth:** Required  
**Status:** [ ]

```bash
curl -s -X POST http://localhost:3000/api/v1/match/semantic \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "realistic black and grey portrait tattoo",
    "location": "Phoenix, AZ",
    "style_preferences": ["realism", "blackwork"],
    "budget": 500,
    "radius": 50,
    "max_results": 5
  }' | python3 -m json.tool
```

**Pass criteria:**
- HTTP 200 with `matches` array
- Each match has: `artist_id`, `name`, `similarity_score` (0–1), `specialty_styles`, `location`
- Scores are sorted descending
- Empty array (not error) if no artists in DB

**Edge cases:**
```bash
# Missing required field 'query' — should get 400
curl -s -X POST http://localhost:3000/api/v1/match/semantic \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"location": "Phoenix"}' | python3 -m json.tool
```

---

#### `POST /api/v1/match/update`
**What it does:** Updates artist match scores, feedback loop for match quality improvement  
**Rate limit:** 300 req/hr  
**Auth:** Required  
**Status:** [ ]

```bash
curl -s -X POST http://localhost:3000/api/v1/match/update \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "artist_id": "artist_123",
    "user_id": "user_456",
    "action": "viewed",
    "design_context": "watercolor botanical"
  }' | python3 -m json.tool
```

**Pass:** HTTP 200 `{"status": "updated"}` or `{"status": "queued"}`

---

### 1.4 AI Enhancement (Council)

#### `POST /api/v1/council/enhance`
**What it does:** Gemini-powered prompt enhancement — takes user's simple prompt and returns a detailed, style-aware tattoo design brief  
**Rate limit:** 20 req/hr  
**Auth:** Required  
**Status:** [ ]

```bash
curl -s -X POST http://localhost:3000/api/v1/council/enhance \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_prompt": "dragon on my arm",
    "style": "neo-traditional",
    "body_part": "forearm",
    "complexity": "high",
    "isStencilMode": false
  }' | python3 -m json.tool
```

**Pass criteria:**
- HTTP 200 with `enhanced_prompt` field (string, 3–5 sentences of detailed description)
- `confidence` score present (0–1)
- Response length noticeably longer/richer than input prompt
- Respects `complexity` parameter (high complexity → more detailed result)

**Invalid prompt test:**
```bash
# Too short — should get 400
curl -s -X POST http://localhost:3000/api/v1/council/enhance \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"user_prompt": "x"}' | python3 -m json.tool
```
**Pass:** HTTP 400 `{"error": "Invalid prompt", "code": "INVALID_REQUEST"}`

---

### 1.5 Cost Estimation

#### `POST /api/v1/estimate`
**What it does:** AI-powered tattoo cost estimation with vision analysis  
**Rate limit:** Per user (more restrictive due to Gemini Vision cost)  
**Auth:** Required  
**Status:** [ ]

**Quick estimate (no AI, fast):**
```bash
curl -s -X POST http://localhost:3000/api/v1/estimate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "large tribal sleeve",
    "style": "tribal",
    "bodyPart": "arm",
    "size": "sleeve",
    "quick": true
  }' | python3 -m json.tool
```

**Pass criteria (quick):**
- HTTP 200 in < 200ms
- `priceRange.low`, `priceRange.mid`, `priceRange.high` all present
- `sessions` count estimate present

**AI estimate (with image):**
```bash
# Encode a small PNG to base64
IMG_B64=$(base64 -w0 /path/to/test-tattoo.png)
curl -s -X POST http://localhost:3000/api/v1/estimate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"imageDataUrl\": \"data:image/png;base64,$IMG_B64\",
    \"style\": \"realism\",
    \"bodyPart\": \"back\",
    \"size\": \"backpiece\"
  }" | python3 -m json.tool
```

**Pass criteria (AI):**
- HTTP 200 in < 30s (timeout is set to 30s)
- `complexity` breakdown object present: `linework`, `shading`, `color`, `detail`, `coverage`
- `priceRange` object with all three tiers
- `confidence` score (0–1)

**GET endpoint (service info):**
```bash
curl -s http://localhost:3000/api/v1/estimate | python3 -m json.tool
```
**Pass:** Returns service description with `sizes` array and `hourlyRates`

---

### 1.6 Layer Management

#### `POST /api/v1/upload-layer`
**What it does:** Uploads a design layer image to GCS, returns URL for use in ForgeCanvas  
**Rate limit:** 200 req/hr  
**Auth:** Required  
**Status:** [ ]

```bash
curl -s -X POST http://localhost:3000/api/v1/upload-layer \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/layer.png" \
  -F "layerName=dragon_body" \
  | python3 -m json.tool
```

**Pass:** HTTP 200 with `url` field pointing to GCS (or signed URL)

---

#### `POST /api/v1/layers/decompose`
**What it does:** Decomposes a flat tattoo design image into discrete layers (background, linework, shading, color fills) using segmentation  
**Rate limit:** 60 req/hr  
**Auth:** Required  
**Status:** [ ]

```bash
curl -s -X POST http://localhost:3000/api/v1/layers/decompose \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://storage.googleapis.com/tattester-generated-images/sample.png",
    "maxLayers": 4
  }' | python3 -m json.tool
```

**Pass:** HTTP 200 with `layers` array, each layer has `id`, `name`, `imageUrl`, `type` (linework/shading/color/base)

---

#### `GET /api/v1/storage/get-signed-url`
**What it does:** Returns a time-limited signed URL for accessing private GCS files  
**Rate limit:** 300 req/hr  
**Auth:** Required  
**Status:** [ ]

```bash
curl -s "http://localhost:3000/api/v1/storage/get-signed-url?path=users/uid123/designs/design456.png" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Pass:** HTTP 200 with `signedUrl` field, URL expires in <= 1 hour

---

#### `POST /api/v1/storage/upload`
**What it does:** Direct file upload to GCS via API  
**Rate limit:** 300 req/hr  
**Auth:** Required  
**Status:** [ ]

```bash
curl -s -X POST http://localhost:3000/api/v1/storage/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/design.png" \
  -F "path=users/uid123/designs/" \
  | python3 -m json.tool
```

**Pass:** HTTP 200 with `gcsUrl` and `publicUrl` fields

---

### 1.7 Embeddings

#### `POST /api/v1/embeddings/generate`
**What it does:** Generates Vertex AI text embeddings for artist/design semantic search indexing  
**Rate limit:** 200 req/hr  
**Auth:** Required  
**Status:** [ ]

```bash
curl -s -X POST http://localhost:3000/api/v1/embeddings/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "texts": ["Japanese dragon sleeve in watercolor style", "fine line botanical forearm"],
    "model": "text-embedding-005"
  }' | python3 -m json.tool
```

**Pass criteria:**
- HTTP 200 with `embeddings` array
- Each embedding is array of 768 floats (text-embedding-005 dimension)
- Length of embeddings array matches length of input texts

---

### 1.8 AR Visualization

#### `POST /api/v1/ar/visualize`
**What it does:** Composites a tattoo design onto a body part reference image using segmentation  
**Rate limit:** 50 req/hr  
**Auth:** Required  
**Status:** [ ]

```bash
curl -s -X POST http://localhost:3000/api/v1/ar/visualize \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "designUrl": "https://storage.googleapis.com/tattester-generated-images/sample.png",
    "bodyPartImage": "data:image/jpeg;base64,...",
    "placement": "forearm_inner",
    "scale": 0.3,
    "rotation": 0
  }' | python3 -m json.tool
```

**Pass:** HTTP 200 with `compositeUrl` pointing to result image

---

### 1.9 Stencil Export

#### `POST /api/v1/stencil/export`
**What it does:** Converts a color design to stencil-ready black outline format and queues delivery  
**Rate limit:** 30 req/hr  
**Auth:** Required  
**Status:** [ ]

```bash
curl -s -X POST http://localhost:3000/api/v1/stencil/export \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "design_id": "design_123",
    "dimensions": {"width": 4, "height": 6, "unit": "inches"},
    "format": "pdf",
    "include_metadata": true,
    "artist_info": {"name": "Test Artist", "email": "artist@test.com"}
  }' | python3 -m json.tool
```

**Pass:** HTTP 200 or 202 with `jobId` for async queue, or immediate `stencilUrl` for sync path

---

### 1.10 Design Sharing

#### `POST /api/v1/designs/share`
**What it does:** Creates a shareable public link for a design  
**Auth:** Required  
**Status:** [ ]

```bash
curl -s -X POST http://localhost:3000/api/v1/designs/share \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "designId": "design_123",
    "title": "My Dragon Sleeve",
    "expiresIn": 604800
  }' | python3 -m json.tool
```

**Pass:** HTTP 200 with `shareId` (UUID) and `shareUrl` (`/share/{shareId}`)

#### `GET /api/v1/designs/share/[shareId]`
**What it does:** Retrieves a shared design by ID (public, no auth)  
**Status:** [ ]

```bash
SHARE_ID="<shareId from above>"
curl -s http://localhost:3000/api/v1/designs/share/$SHARE_ID | python3 -m json.tool
```

**Pass:** HTTP 200 with design data (prompt, imageUrl, metadata)  
**Expired share:** HTTP 404 `{"error": "Share not found or expired"}`

---

### 1.11 Booking

#### `POST /api/v1/book`
**What it does:** Initiates artist booking flow  
**Auth:** Required  
**Status:** [ ]

```bash
curl -s -X POST http://localhost:3000/api/v1/book \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "artistId": "artist_123",
    "designId": "design_456",
    "requestedDate": "2026-04-15",
    "notes": "Forearm, 4 hours"
  }' | python3 -m json.tool
```

**Pass:** HTTP 200 or 202 with `bookingId` and status

---

### 1.12 Task Queue

#### `POST /api/v1/tasks/generate`
**What it does:** Queues async generation via Cloud Tasks (for long-running generations)  
**Auth:** Required  
**Status:** [ ]

```bash
curl -s -X POST http://localhost:3000/api/v1/tasks/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "photorealistic sleeve tattoo with Japanese motifs",
    "style": "realism",
    "priority": "normal"
  }' | python3 -m json.tool
```

**Pass:** HTTP 202 with `taskId` for polling

---

### 1.13 Neo4j Integration

#### `POST /api/neo4j/query`
**What it does:** Executes read-only Cypher queries against Neo4j artist graph  
**Auth:** Required  
**Status:** [ ]

```bash
curl -s -X POST http://localhost:3000/api/neo4j/query \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "MATCH (a:Artist) RETURN a.name LIMIT 5"}' | python3 -m json.tool
```

**Pass:** HTTP 200 with `records` array from Neo4j  
**No Neo4j config:** HTTP 503 `{"error": "Neo4j not configured"}`

---

## PART 2 — FRONTEND PAGES

### 2.1 Landing Page (`/`)
**File:** `src/app/page.tsx`  
**Status:** [ ]

**Test steps:**
1. Navigate to `http://localhost:3000`
2. Verify page loads without console errors
3. Verify hero section is visible with CTA button
4. Click "Get Started" → should navigate to `/generate`
5. On mobile (375px viewport): verify layout is responsive, no horizontal scroll

**Pass criteria:**
- [ ] Page loads in < 3s
- [ ] No console errors
- [ ] Hero text/CTA visible
- [ ] Navigation links work
- [ ] Mobile responsive (no overflow)

---

### 2.2 Generate Page (`/generate`)
**File:** `src/app/generate/page.tsx`  
**Status:** [ ]

**This is the core UI — test thoroughly.**

**Test steps:**
1. Navigate to `/generate`
2. Verify PromptInterface loads
3. Enter prompt "watercolor lotus forearm"
4. Click "Generate" button
5. Verify loading state appears (spinner/progress)
6. Verify generated image appears in result area
7. Verify VibeChips are clickable and modify prompt
8. Verify AdvancedOptions panel expands

**Pass criteria:**
- [ ] Prompt input accepts text
- [ ] VibeChips modify prompt on click
- [ ] Advanced options panel togglable
- [ ] Loading state shown during generation
- [ ] Generated image displays
- [ ] Error state shown if generation fails (not a blank screen)

---

### 2.3 Forge Canvas (within `/generate`)
**Component:** `src/components/generate/ForgeCanvas.tsx`  
**Status:** [ ]

**Test steps:**
1. Generate an image on `/generate`
2. After generation, verify canvas renders the result
3. Test layer panel (LayerStack) — add/remove/reorder layers
4. Test transform handles — click image, drag corners to resize
5. Test PlacementGrid — toggle body part overlay
6. Test VersionTimeline — generate multiple variants, compare

**Pass criteria:**
- [ ] Canvas renders generated image
- [ ] Layer reordering works (drag up/down)
- [ ] Transform handles visible on image selection
- [ ] Resize/rotate handles respond to drag
- [ ] Body silhouette overlay renders
- [ ] Version history preserved

---

### 2.4 Smart Match Page (`/smart-match`)
**File:** `src/app/smart-match/page.tsx`  
**Status:** [ ]

**Test steps:**
1. Navigate to `/smart-match`
2. Enter a style description
3. Click "Find Artists"
4. Verify artist cards appear in results

**Pass criteria:**
- [ ] Search form renders
- [ ] Results appear (or empty state if no artists in DB)
- [ ] Artist cards show name, specialty, match score
- [ ] Clicking artist card shows detail or opens booking modal

---

### 2.5 Swipe Page (`/swipe`)
**File:** `src/app/swipe/page.tsx`  
**Status:** [ ]

**Test steps:**
1. Navigate to `/swipe`
2. Verify tinder-style cards load
3. Swipe right on a design
4. Swipe left on a design
5. Verify match feedback recorded

**Pass criteria:**
- [ ] Card stack renders with tattoo images
- [ ] Swipe gesture works on mobile
- [ ] Right swipe = positive signal, left = skip
- [ ] Empty state shown when all designs seen

---

### 2.6 Artists Gallery (`/artists`)
**File:** `src/app/artists/page.tsx`  
**Status:** [ ]

**Test steps:**
1. Navigate to `/artists`
2. Verify artist grid/list renders
3. Filter by style
4. Click artist for detail view

**Pass criteria:**
- [ ] Artist cards render with photos, names, styles
- [ ] Filter by specialty style works
- [ ] No console errors

---

### 2.7 Gallery Page (`/gallery`)
**File:** `src/app/gallery/page.tsx`  
**Status:** [ ]

**Test steps:**
1. Navigate to `/gallery`
2. Verify design grid loads
3. Click a design for expanded view
4. Verify share button creates share link

**Pass criteria:**
- [ ] Design thumbnails load
- [ ] Click → lightbox or detail page
- [ ] Share button calls `/api/v1/designs/share`

---

### 2.8 Journey Page (`/journey`)
**File:** `src/app/journey/page.tsx`  
**Status:** [ ]

**Test steps:**
1. Navigate to `/journey`
2. Verify user's design history loads (requires auth)
3. Verify timeline of generated designs

**Pass criteria:**
- [ ] Redirects to auth if not logged in
- [ ] Shows design history for authenticated user

---

### 2.9 Share Page (`/share/[shareId]`)
**File:** `src/app/share/[shareId]/page.tsx`  
**Status:** [ ]

**Test steps:**
1. Create a share link via API (section 1.10)
2. Navigate to `/share/{shareId}`
3. Verify design loads without authentication
4. Verify "Book This Artist" CTA present

**Pass criteria:**
- [ ] Public access (no login required)
- [ ] Design title and image render correctly
- [ ] Booking CTA visible

---

### 2.10 Visualize Page (`/visualize`)
**File:** `src/app/visualize/page.tsx`  
**Status:** [ ]

**Test steps:**
1. Navigate to `/visualize`
2. Upload a body part photo
3. Select a generated design
4. Click "Visualize"
5. Verify composite renders

**Pass criteria:**
- [ ] File upload input works
- [ ] Design selector populates from user's gallery
- [ ] AR composite image renders
- [ ] Download composite button works

---

### 2.11 Demo Page (`/demo`)
**File:** `src/app/demo/page.tsx`  
**Status:** [ ]

**Test steps:**
1. Navigate to `/demo`
2. Walk through demo flow without authentication

**Pass criteria:**
- [ ] Demo flows work without real auth
- [ ] Showcases core generation + match features
- [ ] CTA to sign up visible at end

---

### 2.12 Dashboard (`/dashboard`)
**File:** `src/app/dashboard/page.tsx`  
**Status:** [ ]

**Test steps:**
1. Log in via Firebase Auth
2. Navigate to `/dashboard`
3. Verify usage stats visible
4. Verify design library present

**Pass criteria:**
- [ ] Authenticated access only (redirect if not logged in)
- [ ] Shows quota usage (generations remaining)
- [ ] Recent designs visible
- [ ] Links to generate/match/gallery work

---

## PART 3 — AUTH SYSTEM

### 3.1 Firebase Auth Flow
**Files:** `src/components/auth/AuthProvider.tsx`, `src/components/auth/LoginForm.tsx`, `src/components/auth/SignupForm.tsx`  
**Status:** [ ]

**Signup test:**
1. Navigate to `/` and click "Sign Up"
2. Enter email + password
3. Submit form
4. Verify user created in Firebase console
5. Verify redirect to dashboard

**Login test:**
1. Log out
2. Enter credentials
3. Submit
4. Verify `useAuth()` hook returns `user` object with `uid`
5. Verify Firebase ID token present in localStorage/session

**Pass criteria:**
- [ ] Signup creates Firebase user
- [ ] Login returns valid ID token
- [ ] `useAuth().user` populated after login
- [ ] Logout clears session
- [ ] Protected routes (`/dashboard`, `/journey`) redirect unauthenticated users

---

### 3.2 API Auth Middleware
**File:** `src/lib/api-auth.ts`  
**Status:** [ ]

**Test (missing auth):**
```bash
curl -s -X POST http://localhost:3000/api/v1/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "test"}'
```
**Pass:** HTTP 401 `{"error": "Unauthorized"}`

**Test (bad token):**
```bash
curl -s -X POST http://localhost:3000/api/v1/generate \
  -H "Authorization: Bearer not-a-real-token" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "test"}'
```
**Pass:** HTTP 401 `{"error": "Invalid or expired token"}`

**Test (valid token from Firebase):**  
Get a valid token via the Firebase JS SDK:
```javascript
const token = await firebase.auth().currentUser.getIdToken();
```
```bash
curl -s -X POST http://localhost:3000/api/v1/council/enhance \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"user_prompt": "geometric sleeve", "complexity": "medium"}' | python3 -m json.tool
```
**Pass:** HTTP 200 with enhancement result

---

## PART 4 — RATE LIMITING & QUOTA

### 4.1 Per-User Quota Tracking
**File:** `src/lib/quota-tracker.ts`  
**Status:** [ ]

**Test hourly quota enforcement:**
```bash
# For generation: limit is 20/hr per user. Exhaust it:
for i in $(seq 1 22); do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/v1/generate \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d '{"prompt":"test $i"}')
  echo "Request $i: HTTP $CODE"
done
```

**Pass:** 
- Requests 1–20: HTTP 200
- Request 21+: HTTP 429 with `{"error": "Rate limit exceeded", "retryAfter": N}`
- `Retry-After` header present

### 4.2 Budget Tracker
**File:** `src/lib/budget-tracker.ts`  
**Status:** [ ]

**Test:** Verify spend recorded in Firestore after each generation:
1. Open Firebase Console → Firestore → `budget/global`
2. Trigger a generation
3. Verify `spentCents` increments by expected Replicate/Vertex cost

**Pass:** Spend tracked and generation blocked when `spentCents >= budgetCents`

---

## PART 5 — STORAGE LAYER

### 5.1 Firestore Design Persistence
**Files:** `src/services/storage/FirestoreAdapter.ts`, `src/services/storage/StorageFactory.ts`  
**Status:** [ ]

**Test design survives refresh:**
1. Log in as authenticated user
2. Generate a design
3. Verify it saves (check Firestore: `users/{uid}/designs/{designId}`)
4. Hard refresh the page (`Cmd+Shift+R`)
5. Navigate to `/journey`
6. Verify design still in history

**Pass:** Design persists across browser sessions

**Test anonymous → authenticated migration:**
1. Generate designs without logging in (uses LocalStorageAdapter)
2. Sign up / log in
3. Verify designs migrate from localStorage to Firestore (check `migrationService.ts`)

**Pass:** Designs migrated, localStorage cleared after successful migration

---

### 5.2 Version History
**File:** `src/services/versionService.ts`, `src/components/generate/VersionTimeline.jsx`  
**Status:** [ ]

**Test steps:**
1. Generate design V1
2. Modify prompt, regenerate → V2
3. Open VersionTimeline component
4. Verify V1 and V2 thumbnails visible
5. Click V1 → canvas reverts to V1
6. Test "Compare" mode (VersionComparison component)

**Pass criteria:**
- [ ] Versions stored in Firestore subcollection
- [ ] Timeline shows all versions with thumbnails
- [ ] Clicking version restores canvas state
- [ ] Compare mode shows side-by-side diff

---

### 5.3 LocalStorage Fallback
**File:** `src/services/storage/LocalStorageAdapter.ts`  
**Status:** [ ]

**Test (dev/offline mode):**
1. Run app without Firestore credentials (`NEXT_PUBLIC_FIREBASE_API_KEY` unset)
2. Verify app still functions using localStorage
3. Generate a design, refresh page
4. Verify design persists (from localStorage)

**Pass:** App degrades gracefully to localStorage when Firestore unavailable

---

## PART 6 — INFRASTRUCTURE & DEPLOYMENT

### 6.1 Docker Build
**File:** `Dockerfile`  
**Status:** [ ]

```bash
cd repos/TatT
docker build -t tatt-test:latest .
docker run -p 3000:3000 --env-file .env tatt-test:latest
curl -s http://localhost:3000/api/health
```

**Pass:** 
- [ ] Docker build completes without errors
- [ ] Image size < 200MB (standalone build)
- [ ] Container starts and serves on port 3000
- [ ] Health endpoint responds from within container

---

### 6.2 Next.js Build (CI gate)
**Status:** [ ]

```bash
cd repos/TatT
npm run build 2>&1 | tail -20
```

**Pass:** Zero TypeScript errors, zero failed exports, `Build successful` message

---

### 6.3 Cloud Armor WAF
**File:** `openapi/cloud-armor-policy.sh`  
**Status:** [ ]

**XSS test:**
```bash
curl -s -X POST https://api.tatt.app/api/v1/council/enhance \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"user_prompt": "<script>alert(1)</script>"}' | python3 -m json.tool
```
**Pass:** Request blocked at WAF layer (HTTP 403 from Cloud Armor before hitting app)

**IP rate limit test:** >500 req/min from same IP should trigger 429 from Cloud Armor

---

### 6.4 CORS Enforcement
**File:** `middleware.ts`  
**Status:** [ ]

```bash
# Request from non-whitelisted origin
curl -s -X POST http://localhost:3000/api/v1/generate \
  -H "Origin: https://evil.example.com" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "test"}' -I
```

**Pass:** HTTP 403 with CORS rejection headers

```bash
# Request from whitelisted origin
curl -s -X POST http://localhost:3000/api/v1/generate \
  -H "Origin: https://tatt.app" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "test"}' -I
```

**Pass:** HTTP 200 with `Access-Control-Allow-Origin: https://tatt.app`

---

### 6.5 Cloud Run Deploy
**File:** `cloudbuild.yaml`  
**Status:** [ ]

```bash
# Trigger a deploy and verify it succeeds
gcloud builds submit --config cloudbuild.yaml --project tatt-pro
```

**Pass:**
- [ ] Cloud Build completes without errors
- [ ] New Cloud Run revision deployed
- [ ] Traffic shifted to new revision
- [ ] Health endpoint on production URL responds

---

## PART 7 — SERVICES (Unit/Integration)

### 7.1 Vertex AI Edge Service
**File:** `src/services/vertex-ai-edge.ts`  
**Status:** [ ]

```bash
# Test from Node.js REPL
node -e "
const { generateWithImagen } = require('./src/services/vertex-ai-edge');
generateWithImagen({ prompt: 'simple test tattoo', width: 512, height: 512 })
  .then(r => console.log('SUCCESS:', r.imageUrl ? 'HAS_URL' : 'NO_URL'))
  .catch(e => console.log('FAIL:', e.message));
"
```

**Pass:** Returns object with `imageUrl` pointing to GCS

---

### 7.2 Hybrid Match Service
**File:** `src/services/hybridMatchService.ts`  
**Status:** [ ]

The hybrid matcher combines:
1. Keyword/filter match (Firestore queries)
2. Semantic vector similarity (embedding cosine)
3. RRF (Reciprocal Rank Fusion) to merge both lists

**Test:**
```bash
node -e "
const { findMatchingArtists } = require('./src/services/hybridMatchService');
findMatchingArtists('black and grey realism', { location: 'AZ', styles: ['realism'] })
  .then(r => console.log(JSON.stringify(r.slice(0,2), null, 2)))
  .catch(e => console.log('FAIL:', e.message));
"
```

**Pass:** Returns sorted artist array with `similarity_score` values

---

### 7.3 Council Service (Gemini)
**File:** `src/services/councilService.ts`  
**Status:** [ ]

Tests the LLM Council — a multi-prompt Gemini chain that adds artistic context, style awareness, and technical detail to user prompts.

```bash
node -e "
const { enhancePromptWithGemini } = require('./src/services/vertex-ai-edge');
enhancePromptWithGemini({ userPrompt: 'rose on wrist', style: 'fine-line', bodyPart: 'wrist' })
  .then(r => console.log(r.enhancedPrompt))
  .catch(e => console.log('FAIL:', e.message));
"
```

**Pass:** Returns string longer than input, with artistic detail, placement specifics, and technique references

---

### 7.4 Generation Router
**File:** `src/services/generationRouter.ts`  
**Status:** [ ]

Routes generation requests between Replicate (SD) and Vertex AI (Imagen) based on style, quota, and availability.

**Test routing logic:**
- Realism style → Replicate (higher quality for photo-realistic)
- Blackwork style → Vertex Imagen
- Rate limit exceeded on Replicate → falls back to Vertex

**Verify in logs:** After a generation, check server logs for `[generationRouter]` entries showing which model was selected and why.

---

### 7.5 Cost Estimator Service
**File:** `src/services/costEstimatorService.ts`  
**Status:** [ ]

```bash
node -e "
const { quickEstimate } = require('./src/services/costEstimatorService');
const result = quickEstimate('realism', 'back', 'backpiece');
console.log(JSON.stringify(result, null, 2));
"
```

**Pass:**
- `priceRange.low < priceRange.mid < priceRange.high`
- All values are numbers, not undefined
- `sessions` is integer ≥ 1
- backpiece should have higher prices than small/medium

---

### 7.6 Stencil Service
**File:** `src/services/stencilService.ts`  
**Status:** [ ]

Tests the image processing pipeline that converts color tattoo images to high-contrast black stencils (used by tattoo artists to transfer designs to skin).

**Test (if image processing available):**
```bash
node -e "
const { convertToStencil } = require('./src/services/stencilService');
convertToStencil({ imageUrl: 'https://...', contrastLevel: 0.8 })
  .then(r => console.log('Stencil URL:', r.stencilUrl))
  .catch(e => console.log('FAIL:', e.message));
"
```

**Pass:** Returns `stencilUrl` pointing to high-contrast black/white image

---

## PART 8 — MOBILE APP

**Directory:** `mobile/`

### 8.1 Mobile Build
**Status:** [ ]

```bash
cd repos/TatT/mobile
npm install
npx expo start --no-dev
```

**Pass:** Expo bundler starts, QR code visible, app loads on device/simulator

### 8.2 Core Mobile Features
**Status:** [ ]

- [ ] Camera capture for body part photo
- [ ] AR overlay preview
- [ ] Artist browse/match
- [ ] Generation request (calls same `/api/v1/generate`)
- [ ] Design gallery (reads from Firestore)

---

## PART 9 — TESTS (Automated)

### 9.1 Vitest Unit Tests
**Config:** `vitest.config.js`  
**Status:** [ ]

```bash
cd repos/TatT
npm run test
```

**Pass:** All tests pass, 0 failures

---

### 9.2 Python Integration Tests
**Config:** `pytest.ini`, `conftest.py`  
**Status:** [ ]

```bash
cd repos/TatT
python3 -m pytest tests/ -v
```

**Pass:** All pytest fixtures and tests pass

---

### 9.3 TypeScript Type Check
**Status:** [ ]

```bash
cd repos/TatT
npx tsc --noEmit 2>&1 | grep -E "error|warning" | wc -l
```

**Pass:** 0 TypeScript errors (warnings acceptable)

---

## VERIFICATION SUMMARY SCORECARD

Run this after completing all checks. Count your ✅ / ❌ / [ ]:

| Section | Total Checks | Passed | Failed | Untested |
|---------|-------------|--------|--------|----------|
| 1. API Endpoints | ~25 | — | — | — |
| 2. Frontend Pages | ~50 | — | — | — |
| 3. Auth | ~8 | — | — | — |
| 4. Rate Limiting | ~6 | — | — | — |
| 5. Storage | ~10 | — | — | — |
| 6. Infrastructure | ~12 | — | — | — |
| 7. Services | ~15 | — | — | — |
| 8. Mobile | ~6 | — | — | — |
| 9. Tests | ~3 | — | — | — |
| **TOTAL** | **~135** | **—** | **—** | **—** |

**Definition of "Demo Ready":** All Part 1 (API), Part 2 (Frontend), Part 3 (Auth) checks pass. Parts 6–9 can have untested items.

**Definition of "Production Ready":** All 135 checks pass, or failing checks have documented known-issues with mitigations.

---

## KNOWN ISSUES / CAVEATS

| Issue | Severity | Workaround |
|-------|----------|------------|
| Stencil export uses `emailQueueService.js` which may be a mock | Medium | Check if `execution/email-queue-service.js` is implemented |
| AR Visualize requires a real body part image — hard to automate | Low | Manual test only |
| Neo4j checks will fail in dev without credentials | Low | Expected — skip in local dev |
| Cloud Armor tests require GCP deployment | Medium | Skip in local, run post-deploy |
| Budget tracker fallback allows requests when Firestore unreachable | Low | By design — dev convenience |

---

*Generated by OpenClaw Agent | 2026-03-02 | Phase 3 codebase*
