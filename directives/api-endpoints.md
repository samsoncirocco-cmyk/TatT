# API Endpoints

## Goal
Complete reference for all TatT API routes with request/response examples.

## When to Use
- Building frontend integrations
- Debugging API issues
- Testing endpoints manually

## Prerequisites
- `FRONTEND_AUTH_TOKEN` for protected endpoints (sent as `Authorization: Bearer <token>`)
- Services configured per endpoint requirements

---

## Health & Debug

### GET `/api/health`
**Runtime:** edge | **Auth:** none

Returns service status and endpoint catalog.

```bash
curl https://manama-next.vercel.app/api/health
```

```json
{
  "status": "ok",
  "hasReplicateToken": true,
  "hasVertexConfig": true,
  "hasGcsConfig": true,
  "hasNeo4jConfig": true,
  "authRequired": true,
  "endpoints": { "v1": { "..." } }
}
```

### GET `/api/debug?limit=50`
**Runtime:** edge | **Auth:** none

Returns recent observability logs.

---

## Generation

### POST `/api/v1/generate`
**Runtime:** edge | **Auth:** Bearer token | **Rate limit:** 60 req/hr

Primary generation endpoint using Vertex AI Imagen 3.

```json
// Request
{
  "prompt": "Japanese dragon on forearm, traditional style",
  "negativePrompt": "blurry, low quality",
  "sampleCount": 2,
  "aspectRatio": "1:1",
  "size": "large",
  "safetyFilterLevel": "block_only_high",
  "seed": 42
}

// Response
{
  "success": true,
  "images": ["data:image/png;base64,..."],
  "metadata": {
    "model": "imagen-3.0-generate-001",
    "provider": "vertex-ai",
    "durationMs": 3200,
    "attempts": 1,
    "fallbackUsed": false
  }
}
```

### POST `/api/generate`
**Runtime:** nodejs | **Auth:** none

Legacy generation endpoint with GCS upload. Returns URLs instead of base64.

```json
// Response
{
  "success": true,
  "images": ["https://storage.googleapis.com/..."],
  "uploads": [...],
  "cost": { "perImage": 0.02, "total": 0.04, "currency": "USD" }
}
```

---

## Council

### POST `/api/v1/council/enhance`
**Runtime:** edge | **Auth:** Bearer token | **Rate limit:** 20 req/hr

Enhances a user prompt via the AI Council.

```json
// Request
{
  "user_prompt": "dragon fighting samurai",
  "style": "Japanese",
  "body_part": "sleeve",
  "complexity": "medium",
  "isStencilMode": false
}

// Response
{
  "success": true,
  "enhanced_prompts": [
    "A Japanese style tattoo of a dragon fighting a samurai...",
    "A detailed Japanese tattoo featuring...",
    "A photorealistic Japanese style tattoo masterfully composed..."
  ],
  "model_selections": { "primary": "gemini-2.0-flash-exp" },
  "metadata": {
    "council_members": ["Creative Director", "Technical Expert", "Style Specialist"],
    "enhancement_version": "3.0"
  },
  "performance": { "duration_ms": 1200 }
}
```

---

## Artist Matching

### POST `/api/v1/match/semantic`
**Runtime:** edge | **Auth:** Bearer token | **Rate limit:** 100 req/hr

Hybrid vector-graph semantic artist matching.

```json
// Request
{
  "query": "japanese dragon sleeve",
  "location": "Phoenix",
  "style_preferences": ["Japanese"],
  "budget": 200,
  "max_results": 10
}

// Response
{
  "success": true,
  "matches": [{ "id": "...", "name": "...", "compositeScore": 0.87, "reasons": [...] }],
  "total_candidates": 45,
  "performance": { "duration_ms": 320 }
}
```

### POST `/api/v1/match/update`
**Runtime:** nodejs | **Auth:** Bearer token | **Rate limit:** 300 req/hr

Updates match results in Firebase for real-time sync.

```json
// Request
{ "userId": "user123", "designId": "design456", "prompt": "...", "style": "Japanese" }

// Response
{ "matchId": "design456", "artists": [...], "firebasePath": "/matches/user123/current" }
```

---

## Layers & Decomposition

### POST `/api/v1/layers/decompose`
**Runtime:** nodejs | **Auth:** none | **Rate limit:** 60 req/hr

Decomposes an image into object layers using Vision API + SAM.

```json
// Request
{ "imageUrl": "https://... or data:image/png;base64,...", "designId": "design456", "userId": "user123" }

// Response
{
  "layers": [
    { "id": "lyr_abc", "name": "Background", "type": "background", "imageUrl": "...", "zIndex": 0 },
    { "id": "lyr_def", "name": "Dragon", "type": "subject", "imageUrl": "...", "zIndex": 1 }
  ],
  "processingTime": 2400
}
```

### POST `/api/v1/upload-layer`
**Runtime:** nodejs | **Auth:** none | **Rate limit:** 200 req/hr

Uploads a layer image to temp storage.

```json
// Request
{ "imageData": "data:image/png;base64,..." }

// Response
{ "url": "/uploads/layers/layer_abc123_1706000000.png", "size": 45000, "id": "abc123" }
```

---

## Storage

### POST `/api/v1/storage/upload`
**Runtime:** nodejs | **Auth:** Bearer token | **Rate limit:** 300 req/hr

Uploads file to GCS.

```json
// Request
{ "fileData": "data:image/png;base64,...", "contentType": "image/png", "destinationPath": "uploads/my-file.png" }

// Response
{ "success": true, "url": "https://storage.googleapis.com/...", "gcsPath": "uploads/my-file.png" }
```

### POST `/api/v1/storage/get-signed-url`
**Runtime:** nodejs | **Auth:** Bearer token

Generates a signed URL for GCS object access.

```json
// Request
{ "filePath": "uploads/my-file.png", "expirySeconds": 3600, "action": "read" }

// Response
{ "success": true, "url": "https://storage.googleapis.com/...?X-Goog-Signature=..." }
```

---

## AR & Stencil

### POST `/api/v1/ar/visualize`
**Runtime:** nodejs | **Rate limit:** 50 req/hr

AR visualization endpoint (currently mock).

```json
// Request
{ "design_id": "design123", "body_part": "forearm", "depth_map": null }

// Response
{ "success": true, "placement_accuracy": 0.75, "accuracy_cm": 5, "metadata": { "fallback_mode": true } }
```

### POST `/api/v1/stencil/export`
**Runtime:** nodejs | **Rate limit:** 30 req/hr

Export design as print-ready stencil.

```json
// Request
{ "design_id": "design123", "dimensions": { "width": 6, "height": 6 }, "format": "pdf" }

// Response (success)
{ "success": true, "stencil_url": "https://...", "metadata": { "dpi": 300, "format": "pdf" } }

// Response (queued)
{ "success": true, "queued": true, "queue_id": "q123", "hint": "Estimated time: 2-5 minutes" }
```

---

## Embeddings

### POST `/api/v1/embeddings/generate`
**Runtime:** nodejs | **Auth:** Bearer token | **Rate limit:** 200 req/hr

Generate and store portfolio embeddings for an artist.

```json
// Request
{ "artistId": "artist-042", "imageUrls": ["https://..."] }

// Response
{ "success": true, "artistId": "artist-042", "embeddingLength": 768 }
```

---

## Replicate (Legacy)

### POST `/api/predictions`
**Runtime:** edge | **Auth:** none

Proxy to Replicate API for creating predictions.

### GET `/api/predictions/[id]`
**Runtime:** edge | **Auth:** none

Check prediction status.

---

## Neo4j

### POST `/api/neo4j/query`
**Runtime:** nodejs | **Auth:** Bearer token

Execute arbitrary Cypher query.

```json
// Request
{ "query": "MATCH (a:Artist) RETURN a.name LIMIT 5", "params": {} }

// Response
{ "records": [{ "a.name": "Mike Tanaka" }, ...] }
```
