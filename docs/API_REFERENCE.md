# TatT API Reference

**Version:** v1  
**Base URL:** `/api`  
**Last Updated:** 2026-03-01

---

## Table of Contents

- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Health Endpoints](#health-endpoints)
  - [GET /api/health](#get-apihealth)
  - [GET /api/health/startup](#get-apihealthstartup)
- [Image Generation](#image-generation)
  - [POST /api/generate](#post-apigenerate)
  - [POST /api/v1/generate](#post-apiv1generate)
- [Replicate Predictions](#replicate-predictions)
  - [POST /api/predictions](#post-apipredictions)
  - [GET /api/predictions/:id](#get-apipredictionsid)
- [Artist Matching](#artist-matching)
  - [POST /api/v1/match/semantic](#post-apiv1matchsemantic)
  - [POST /api/v1/match/update](#post-apiv1matchupdate)
- [Council Enhancement](#council-enhancement)
  - [POST /api/v1/council/enhance](#post-apiv1councilenhance)
- [Layer Operations](#layer-operations)
  - [POST /api/v1/upload-layer](#post-apiv1upload-layer)
  - [POST /api/v1/layers/decompose](#post-apiv1layersdecompose)
- [Embeddings](#embeddings)
  - [POST /api/v1/embeddings/generate](#post-apiv1embeddingsgenerate)
- [Storage](#storage)
  - [POST /api/v1/storage/upload](#post-apiv1storageupload)
  - [POST /api/v1/storage/get-signed-url](#post-apiv1storageget-signed-url)
- [AR Visualization](#ar-visualization)
  - [POST /api/v1/ar/visualize](#post-apiv1arvisualize)
- [Stencil Export](#stencil-export)
  - [POST /api/v1/stencil/export](#post-apiv1stencilexport)
- [Neo4j Query](#neo4j-query)
  - [POST /api/neo4j/query](#post-apineo4jquery)
- [Cloud Tasks](#cloud-tasks)
  - [POST /api/v1/tasks/generate](#post-apiv1tasksgenerate)
- [Error Codes](#error-codes)

---

## Authentication

All v1 API endpoints require authentication via **Firebase Authentication**.

### Methods

1. **Cookie-based (Recommended)**
   - Cookie name: `AuthToken`
   - Set automatically by Firebase Auth on the client

2. **Bearer Token (Fallback)**
   - Header: `Authorization: Bearer <firebase-id-token>`

### Unauthenticated Response

```json
{
  "error": "Authentication required",
  "code": "AUTH_REQUIRED"
}
```

**Status:** `401 Unauthorized`  
**Headers:** `WWW-Authenticate: Bearer realm="TatT API"`

---

## Rate Limiting

All v1 endpoints are rate-limited by user ID (authenticated) or IP address (fallback).

### Limit Types

| Endpoint Type | Approx. Limit |
|---------------|---------------|
| `generation`  | 60 req/hr     |
| `matching`    | 100 req/hr    |
| `council`     | 20 req/hr     |
| `upload`      | 200 req/hr    |
| `default`     | 300 req/hr    |

### Rate Limit Response

**Status:** `429 Too Many Requests`

```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 3600
}
```

**Headers:** `Retry-After: <seconds>`

---

## Health Endpoints

### GET /api/health

Basic health check endpoint. Returns service status and configuration.

**Auth Required:** No

#### Response

**Status:** `200 OK`

```json
{
  "status": "ok",
  "message": "Next.js API is running",
  "hasReplicateToken": true,
  "hasVertexConfig": true,
  "hasGcsConfig": true,
  "hasNeo4jConfig": true,
  "authRequired": true,
  "api_version": "v1",
  "endpoints": {
    "v1": {
      "semantic_match": "/api/v1/match/semantic (100 req/hr)",
      "ar_visualization": "/api/v1/ar/visualize (50 req/hr)",
      "council_enhancement": "/api/v1/council/enhance (20 req/hr)",
      "stencil_export": "/api/v1/stencil/export (30 req/hr)",
      "layer_upload": "/api/v1/upload-layer (200 req/hr)",
      "layer_decompose": "/api/v1/layers/decompose (60 req/hr)",
      "embeddings_generate": "/api/v1/embeddings/generate (200 req/hr)",
      "match_update": "/api/v1/match/update (300 req/hr)",
      "storage": "/api/v1/storage (300 req/hr)",
      "imagen_generate": "/api/v1/generate (60 req/hr)"
    }
  }
}
```

---

### GET /api/health/startup

Comprehensive startup probe that checks all dependent services.

**Auth Required:** No  
**Use Case:** Kubernetes/Cloud Run startup probes

#### Response

**Status:** `200 OK` (all healthy) or `503 Service Unavailable` (any unhealthy)

```json
{
  "status": "healthy",
  "checks": [
    {
      "service": "environment",
      "healthy": true,
      "message": "All required environment variables present"
    },
    {
      "service": "secret-manager",
      "healthy": true,
      "message": "Secret Manager secrets injected"
    },
    {
      "service": "firestore",
      "healthy": true,
      "message": "Firestore connected and writable"
    },
    {
      "service": "neo4j",
      "healthy": true,
      "message": "Neo4j connected"
    }
  ],
  "timestamp": "2026-03-01T20:53:00.000Z",
  "duration_ms": 1250
}
```

#### Service Checks

| Service | What It Checks |
|---------|----------------|
| `environment` | Required env vars: `GCP_PROJECT_ID`, `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`, `GCS_BUCKET_NAME` |
| `secret-manager` | GCP Secret Manager connectivity |
| `firestore` | Firestore write capability |
| `neo4j` | Neo4j database connectivity |

---

## Image Generation

### POST /api/generate

Generate tattoo images using Vertex AI Imagen. Direct endpoint with cost tracking.

**Auth Required:** No (use `/api/v1/generate` for authenticated access)

#### Request Body

```json
{
  "prompt": "Japanese dragon sleeve tattoo with cherry blossoms",
  "negativePrompt": "blurry, low quality",
  "style": "traditional japanese",
  "bodyPart": "arm",
  "size": "large",
  "sampleCount": 2,
  "aspectRatio": "1:1",
  "safetyFilterLevel": "block_some",
  "personGeneration": "allow_adult",
  "outputFormat": "png",
  "seed": 12345
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `prompt` | string | ✅ | Generation prompt (min 3 chars) |
| `negativePrompt` | string | ❌ | What to avoid |
| `style` | string | ❌ | Tattoo style |
| `bodyPart` | string | ❌ | Target body part |
| `size` | string | ❌ | `small` (512), `medium` (768), `large` (1024) |
| `width` | number | ❌ | Explicit width (overrides size) |
| `height` | number | ❌ | Explicit height (overrides size) |
| `sampleCount` | number | ❌ | Number of images (1-4, default: 1) |
| `aspectRatio` | string | ❌ | Aspect ratio (default: `1:1`) |
| `safetyFilterLevel` | string | ❌ | Safety filter level |
| `personGeneration` | string | ❌ | Person generation mode |
| `outputFormat` | string | ❌ | Output format |
| `seed` | number | ❌ | Random seed for reproducibility |

#### Response

**Status:** `200 OK`

```json
{
  "success": true,
  "images": ["https://storage.googleapis.com/...", "..."],
  "uploads": [
    { "url": "...", "gcsPath": "..." }
  ],
  "metadata": {
    "generatedAt": "2026-03-01T20:53:00.000Z",
    "prompt": "Japanese dragon sleeve tattoo...",
    "negativePrompt": null,
    "model": "imagegeneration@006",
    "provider": "vertex-ai",
    "style": "traditional japanese",
    "bodyPart": "arm",
    "size": "large",
    "aspectRatio": "1:1",
    "outputFormat": "png"
  },
  "cost": {
    "perImage": 0.02,
    "total": 0.04,
    "currency": "USD"
  },
  "usage": {
    "totalImages": 100,
    "costToDate": 2.00
  }
}
```

#### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 400 | `INVALID_PROMPT` | Prompt missing or too short |
| 429 | `VERTEX_QUOTA_EXCEEDED` | Vertex AI quota exceeded |
| 500 | `GENERATION_FAILED` | Generation failed |

---

### POST /api/v1/generate

Authenticated image generation endpoint with rate limiting and budget tracking.

**Auth Required:** Yes  
**Rate Limit:** `generation` (60 req/hr)

#### Request Body

Same as `/api/generate`

#### Additional Features

- Budget checking via `checkBudget()`
- Cost recording via `recordSpend()`
- Structured logging

#### Budget Exceeded Response

**Status:** `402 Payment Required`

```json
{
  "error": "Budget limit reached",
  "spentCents": 5000
}
```

---

## Replicate Predictions

Proxy endpoints for Replicate API (used for SAM segmentation, etc.).

### POST /api/predictions

Create a new Replicate prediction.

**Auth Required:** No (server-side token)

#### Request Body

Pass-through to Replicate API. Example:

```json
{
  "version": "sam-model-version-id",
  "input": {
    "image": "https://...",
    "box": [100, 100, 200, 200]
  }
}
```

#### Response

**Status:** `200 OK` (or Replicate error status)

```json
{
  "id": "prediction-id",
  "status": "starting",
  "urls": {
    "get": "https://api.replicate.com/v1/predictions/..."
  }
}
```

---

### GET /api/predictions/:id

Get the status of a Replicate prediction.

**Auth Required:** No (server-side token)

#### Path Parameters

| Parameter | Description |
|-----------|-------------|
| `id` | Replicate prediction ID |

#### Response

**Status:** `200 OK`

```json
{
  "id": "prediction-id",
  "status": "succeeded",
  "output": ["https://..."]
}
```

---

## Artist Matching

### POST /api/v1/match/semantic

Find matching tattoo artists using hybrid semantic + vector search.

**Auth Required:** Yes  
**Rate Limit:** `matching` (100 req/hr)

#### Request Body

```json
{
  "query": "Looking for a realism artist who does portraits",
  "location": "Phoenix, AZ",
  "style_preferences": ["realism", "portrait"],
  "budget": {
    "min": 500,
    "max": 2000
  },
  "radius": 50,
  "max_results": 10
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `query` | string | ❌ | Natural language search query |
| `location` | string | ❌ | Location for geo-filtering |
| `style_preferences` | string[] | ❌ | Preferred tattoo styles |
| `budget` | object | ❌ | Budget range |
| `radius` | number | ❌ | Search radius in miles (default: 25) |
| `max_results` | number | ❌ | Max results to return (default: 10) |

#### Response

**Status:** `200 OK`

```json
{
  "success": true,
  "matches": [
    {
      "artistId": "artist-123",
      "name": "Jane Doe",
      "score": 0.95,
      "styles": ["realism", "portrait"],
      "location": "Scottsdale, AZ",
      "priceRange": "$150-300/hr",
      "portfolio": ["https://..."]
    }
  ],
  "total_candidates": 45,
  "query_info": {
    "sources": ["neo4j", "vector-db"],
    "query_embedding_dim": 768
  },
  "performance": {
    "duration_ms": 350
  }
}
```

---

### POST /api/v1/match/update

Update artist matches for a specific design.

**Auth Required:** Yes  
**Rate Limit:** `matching` (100 req/hr)

#### Request Body

```json
{
  "userId": "user-123",
  "designId": "design-456",
  "prompt": "Dragon sleeve tattoo",
  "style": "japanese",
  "bodyPart": "arm",
  "location": "Phoenix, AZ",
  "budget": 2000,
  "embeddingVector": [0.1, 0.2, ...]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | string | ✅ | User ID |
| `designId` | string | ✅ | Design ID |
| `prompt` | string | ❌ | Design prompt |
| `style` | string | ❌ | Tattoo style |
| `bodyPart` | string | ❌ | Body part |
| `location` | string | ❌ | User location |
| `budget` | number | ❌ | Budget amount |
| `embeddingVector` | number[] | ❌ | Pre-computed embedding |

#### Response

**Status:** `200 OK`

```json
{
  "matchId": "design-456",
  "artists": [
    {
      "artistId": "artist-123",
      "name": "Jane Doe",
      "score": 0.92
    }
  ],
  "firebasePath": "/matches/user-123/current",
  "processingTime": 450
}
```

---

## Council Enhancement

### POST /api/v1/council/enhance

Enhance a user prompt using the AI Council (multiple AI perspectives).

**Auth Required:** Yes  
**Rate Limit:** `council` (20 req/hr)

#### Request Body

```json
{
  "user_prompt": "dragon tattoo",
  "style": "japanese",
  "body_part": "sleeve",
  "complexity": "high",
  "isStencilMode": false
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `user_prompt` | string | ✅ | User's original prompt (min 3 chars) |
| `style` | string | ❌ | Tattoo style |
| `body_part` | string | ❌ | Target body part |
| `complexity` | string | ❌ | `low`, `medium`, `high` (default: `medium`) |
| `isStencilMode` | boolean | ❌ | Optimize for stencil output |

#### Response

**Status:** `200 OK`

```json
{
  "success": true,
  "enhanced_prompts": [
    "A majestic Japanese dragon with flowing scales...",
    "Traditional irezumi-style dragon with wind bars...",
    "Highly detailed Japanese dragon sleeve design..."
  ],
  "model_selections": {
    "primary": "gemini-2.0-flash-exp",
    "reasoning": "Standard enhancement"
  },
  "metadata": {
    "original_prompt": "dragon tattoo",
    "style": "japanese",
    "body_part": "sleeve",
    "complexity": "high",
    "council_members": ["technical", "artistic", "cultural"],
    "enhancement_version": "2.0",
    "generated_at": "2026-03-01T20:53:00.000Z"
  },
  "performance": {
    "duration_ms": 1200
  }
}
```

#### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 400 | `INVALID_REQUEST` | Prompt too short or missing |
| 404 | `ENHANCEMENT_FAILED` | Resource not found |
| 429 | `ENHANCEMENT_FAILED` | Rate limit hit |

---

## Layer Operations

### POST /api/v1/upload-layer

Upload a single image layer (base64 encoded).

**Auth Required:** Yes  
**Rate Limit:** `upload` (200 req/hr)

#### Request Body

```json
{
  "imageData": "data:image/png;base64,iVBORw0KGgo..."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `imageData` | string | ✅ | Base64 image data (with or without data URL prefix) |

#### Response

**Status:** `200 OK`

```json
{
  "url": "/uploads/layers/layer_abc123_1709312345.png",
  "size": 125430,
  "id": "abc123_1709312345"
}
```

---

### POST /api/v1/layers/decompose

Decompose an image into semantic layers using Vision AI + SAM segmentation.

**Auth Required:** Yes  
**Rate Limit:** `default` (300 req/hr)

#### Request Body

```json
{
  "imageUrl": "https://storage.googleapis.com/...",
  "designId": "design-123",
  "userId": "user-456"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `imageUrl` | string | ✅ | Image URL (HTTPS, GCS `gs://`, or data URL) |
| `designId` | string | ✅ | Design identifier |
| `userId` | string | ❌ | User ID for storage organization |

#### Response

**Status:** `200 OK`

```json
{
  "layers": [
    {
      "id": "layer-001",
      "name": "Background",
      "type": "background",
      "imageUrl": "https://storage.googleapis.com/.../background.png",
      "thumbnailUrl": "https://storage.googleapis.com/.../background_thumb.png",
      "transform": {
        "x": 0,
        "y": 0,
        "scaleX": 1,
        "scaleY": 1,
        "rotation": 0
      },
      "blendMode": "normal",
      "visible": true,
      "zIndex": 0
    },
    {
      "id": "layer-002",
      "name": "Dragon",
      "type": "subject",
      "imageUrl": "https://storage.googleapis.com/.../subject_dragon.png",
      "thumbnailUrl": "https://storage.googleapis.com/.../subject_dragon_thumb.png",
      "transform": {
        "x": 150,
        "y": 200,
        "scaleX": 1,
        "scaleY": 1,
        "rotation": 0
      },
      "blendMode": "normal",
      "visible": true,
      "zIndex": 1
    }
  ],
  "processingTime": 3500,
  "metadata": {
    "detectedObjects": 5,
    "returnedLayers": 3
  }
}
```

#### Layer Types

| Type | Description |
|------|-------------|
| `background` | Base image layer |
| `subject` | Primary subjects (people, animals, main elements) |
| `effect` | Decorative elements, textures |

#### Edge Cases

- Objects with confidence < 0.6 are filtered out
- Maximum 5 objects processed per image
- Falls back to local temp storage if GCS upload fails

---

## Embeddings

### POST /api/v1/embeddings/generate

Generate and store embeddings for artist portfolio images.

**Auth Required:** Yes  
**Rate Limit:** `default` (300 req/hr)

#### Request Body

```json
{
  "artistId": "artist-123",
  "imageUrls": [
    "https://storage.googleapis.com/.../image1.png",
    "https://storage.googleapis.com/.../image2.png"
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `artistId` | string | ✅ | Artist identifier |
| `imageUrls` | string[] | ✅ | Array of image URLs (non-empty) |

#### Response

**Status:** `200 OK`

```json
{
  "success": true,
  "artistId": "artist-123",
  "embeddingLength": 768,
  "record": {
    "id": "emb-456",
    "storedAt": "2026-03-01T20:53:00.000Z"
  }
}
```

---

## Storage

### POST /api/v1/storage/upload

Upload a file to Google Cloud Storage.

**Auth Required:** Yes  
**Rate Limit:** `upload` (200 req/hr)

#### Request Body

```json
{
  "fileData": "data:image/png;base64,iVBORw0KGgo...",
  "contentType": "image/png",
  "destinationPath": "designs/user-123/image.png"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fileData` | string | ✅ | Base64 file data (with or without data URL prefix) |
| `contentType` | string | ❌ | MIME type (default: `image/png`) |
| `destinationPath` | string | ❌ | Custom GCS path (auto-generated if omitted) |

#### Response

**Status:** `200 OK`

```json
{
  "success": true,
  "url": "https://storage.googleapis.com/bucket/designs/user-123/image.png",
  "gcsPath": "gs://bucket/designs/user-123/image.png",
  "path": "designs/user-123/image.png"
}
```

---

### POST /api/v1/storage/get-signed-url

Generate a signed URL for temporary access to a GCS file.

**Auth Required:** Yes  
**Rate Limit:** `default` (300 req/hr)

#### Request Body

```json
{
  "filePath": "designs/user-123/image.png",
  "expirySeconds": 3600,
  "action": "read"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `filePath` | string | ✅ | GCS file path |
| `expirySeconds` | number | ❌ | URL expiry time in seconds |
| `action` | string | ❌ | `read` or `write` (default: `read`) |

#### Response

**Status:** `200 OK`

```json
{
  "success": true,
  "url": "https://storage.googleapis.com/...?X-Goog-Signature=...",
  "filePath": "designs/user-123/image.png",
  "action": "read"
}
```

---

## AR Visualization

### POST /api/v1/ar/visualize

Generate an AR visualization preview of a tattoo on a body part.

**Auth Required:** Yes  
**Rate Limit:** `default` (300 req/hr)

#### Request Body

```json
{
  "design_id": "design-123",
  "body_part": "arm",
  "depth_map": "base64-depth-data...",
  "placement_config": {
    "scale": 1.2,
    "rotation": 15
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `design_id` | string | ✅ | Design identifier |
| `body_part` | string | ✅ | Target body part (see supported list) |
| `depth_map` | string | ❌ | Depth map data for improved accuracy |
| `placement_config` | object | ❌ | Placement adjustments |

#### Supported Body Parts

`arm`, `leg`, `back`, `chest`, `shoulder`, `forearm`, `calf`, `thigh`

#### Response

**Status:** `200 OK`

```json
{
  "success": true,
  "visualization_url": "https://storage.example.com/ar-previews/design-123_arm.png",
  "placement_accuracy": 0.95,
  "accuracy_cm": 2,
  "metadata": {
    "design_id": "design-123",
    "body_part": "arm",
    "depth_aware": true,
    "placement_config": {},
    "generated_at": "2026-03-01T20:53:00.000Z",
    "fallback_mode": false
  },
  "performance": {
    "duration_ms": 850
  }
}
```

#### Edge Cases

| Condition | Result |
|-----------|--------|
| No depth map provided | `fallback_mode: true`, accuracy ±5cm |
| With depth map | `depth_aware: true`, accuracy ±2cm |
| Unsupported body part | `422 UNSUPPORTED_BODY_PART` |

---

## Stencil Export

### POST /api/v1/stencil/export

Export a design as a print-ready stencil.

**Auth Required:** Yes  
**Rate Limit:** `default` (300 req/hr)

#### Request Body

```json
{
  "design_id": "design-123",
  "dimensions": {
    "width": 8,
    "height": 10
  },
  "format": "pdf",
  "include_metadata": true,
  "artist_info": {
    "name": "Jane Doe",
    "studio": "Ink Masters"
  },
  "force_queue": false
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `design_id` | string | ✅ | Design identifier |
| `dimensions` | object | ✅ | Width and height in inches |
| `format` | string | ❌ | `pdf` or `png` (default: `pdf`) |
| `include_metadata` | boolean | ❌ | Include QR code overlay (default: `true`) |
| `artist_info` | object | ❌ | Artist details for metadata |
| `force_queue` | boolean | ❌ | Force async queue processing |

#### Response

**Status:** `200 OK`

```json
{
  "success": true,
  "stencil_url": "https://storage.example.com/stencils/design-123_8x10.pdf",
  "metadata": {
    "design_id": "design-123",
    "dimensions": {
      "width": 8,
      "height": 10,
      "unit": "inches"
    },
    "format": "pdf",
    "dpi": 300,
    "color_mode": "grayscale",
    "calibration": {
      "markers": true,
      "grid": true,
      "ruler": true
    },
    "artist_info": {},
    "generated_at": "2026-03-01T20:53:00.000Z",
    "version": "1.0",
    "overlay": {
      "qr_code": true
    }
  },
  "performance": {
    "duration_ms": 1500
  }
}
```

#### Queued Response

**Status:** `202 Accepted` (when `force_queue: true` or service busy)

```json
{
  "success": true,
  "queued": true,
  "queue_id": "queue-abc123",
  "message": "Stencil export service is currently busy. Your request has been queued.",
  "hint": "Estimated time: 2-5 minutes"
}
```

---

## Neo4j Query

### POST /api/neo4j/query

Execute a Cypher query against the Neo4j database.

**Auth Required:** Yes  
**Runtime:** Node.js (not Edge compatible)

#### Request Body

```json
{
  "query": "MATCH (a:Artist)-[:SPECIALIZES_IN]->(s:Style) WHERE s.name = $style RETURN a LIMIT 10",
  "params": {
    "style": "realism"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `query` | string | ✅ | Cypher query |
| `params` | object | ❌ | Query parameters |

#### Response

**Status:** `200 OK`

```json
{
  "records": [
    {
      "a": {
        "identity": 123,
        "labels": ["Artist"],
        "properties": {
          "name": "Jane Doe",
          "location": "Phoenix, AZ"
        }
      }
    }
  ]
}
```

#### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 500 | - | Neo4j driver not initialized |
| 504 | - | Query timeout (default: 30s) |

---

## Cloud Tasks

### POST /api/v1/tasks/generate

Internal endpoint for Cloud Tasks to process async image generation.

**Auth Required:** Cloud Tasks header (`x-cloudtasks-taskname`)  
**Not for direct client use**

#### Request Headers

| Header | Required | Description |
|--------|----------|-------------|
| `x-cloudtasks-taskname` | ✅ | Cloud Tasks task name |

#### Request Body

```json
{
  "userId": "user-123",
  "prompt": "Dragon tattoo",
  "parameters": {
    "negativePrompt": "blurry",
    "aspectRatio": "1:1",
    "sampleCount": 1
  },
  "designId": "design-456",
  "versionId": "version-789"
}
```

#### Response

**Status:** `200 OK`

```json
{
  "success": true,
  "imageUrl": "https://storage.googleapis.com/.../generated.png"
}
```

#### Error Responses

| Status | Description |
|--------|-------------|
| 400 | Invalid JSON or missing required fields |
| 401 | Missing Cloud Tasks headers |
| 500 | Generation failed |

---

## Error Codes

### Standard Error Response Format

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "message": "Detailed technical message",
  "details": {}
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `AUTH_REQUIRED` | 401 | Authentication required |
| `INVALID_PROMPT` | 400 | Prompt missing or invalid |
| `INVALID_REQUEST` | 400 | Request body validation failed |
| `INVALID_SAMPLE_COUNT` | 400 | Sample count must be 1-4 |
| `UNSUPPORTED_BODY_PART` | 422 | Body part not supported for AR |
| `VERTEX_QUOTA_EXCEEDED` | 429 | Vertex AI quota exhausted |
| `VERTEX_NOT_CONFIGURED` | 500 | Vertex AI not configured |
| `GCS_NOT_CONFIGURED` | 500 | Google Cloud Storage not configured |
| `GENERATION_FAILED` | 500 | Image generation failed |
| `ENHANCEMENT_FAILED` | 500 | Council enhancement failed |

---

## Runtime Information

All endpoints use Node.js runtime (`export const runtime = 'nodejs'`) due to dependencies on:
- Neo4j driver (TCP connections)
- Firebase Admin SDK
- Google Cloud Vision API
- Sharp image processing

---

## Changelog

### 2026-03-01
- Initial API reference documentation
- Documented all 18 API endpoints
- Added authentication, rate limiting, and error code reference
