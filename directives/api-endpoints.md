# API Endpoints

## Goal
Comprehensive reference for all TatT API routes, including request/response formats, authentication, rate limits, and error codes.

## Base URL
- **Development:** `http://localhost:3000/api`
- **Production:** `https://tatt.vercel.app/api` (or custom domain)

## Authentication
Most endpoints require API key authentication (optional, configurable):

**Header:**
```
X-API-Key: your-secret-api-key
```

**Error Response (if auth enabled and key missing/invalid):**
```json
{
  "error": "Unauthorized",
  "code": "INVALID_API_KEY",
  "status": 401
}
```

---

## Generation Endpoints

### `POST /api/v1/generate`
Generate tattoo design variations from text prompt.

**Request:**
```json
{
  "prompt": "dragon in traditional Japanese style",
  "negativePrompt": "blurry, low quality",
  "style": "traditional",
  "bodyPart": "arm",
  "sampleCount": 4,
  "width": 1024,
  "height": 1024,
  "seed": 12345,
  "useCouncil": true
}
```

**Parameters:**
- `prompt` (required, string, 3-500 chars): User's tattoo idea
- `negativePrompt` (optional, string): Things to avoid
- `style` (optional, string): Style preset (traditional, realism, watercolor, etc.)
- `bodyPart` (optional, string): Target placement (arm, chest, back, leg, etc.)
- `sampleCount` (optional, number, 1-4, default 4): Number of variations
- `width`, `height` (optional, number, multiples of 64, max 2048): Custom dimensions
- `seed` (optional, number): For reproducible generations
- `useCouncil` (optional, boolean, default true): Enable Council AI enhancement

**Response (200 OK):**
```json
{
  "images": [
    "https://storage.googleapis.com/tatt-pro/generations/xyz1.png",
    "https://storage.googleapis.com/tatt-pro/generations/xyz2.png"
  ],
  "prompt": "dragon in traditional Japanese style",
  "enhancedPrompt": "A fierce dragon in traditional Japanese Irezumi style...",
  "metadata": {
    "model": "sdxl",
    "style": "traditional",
    "bodyPart": "arm",
    "councilUsed": true,
    "estimatedCost": 0.042,
    "generationTime": 8.3,
    "seed": 12345
  }
}
```

**Errors:**
- `400 INVALID_PROMPT`: Prompt too short or empty
- `400 INVALID_SAMPLE_COUNT`: sampleCount out of range
- `400 CONTENT_POLICY_VIOLATION`: Prompt violates content policy
- `429 RATE_LIMIT_EXCEEDED`: Too many requests
- `500 GENERATION_FAILED`: All models failed

---

### `POST /api/v1/council/enhance`
Enhance user prompt using Council AI (can be called separately from generation).

**Request:**
```json
{
  "prompt": "dragon",
  "style": "traditional",
  "bodyPart": "arm"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "enhancedPrompt": "A fierce dragon in traditional Japanese Irezumi style...",
  "styleAdvice": "Use bold outlines (3-5px) for scales...",
  "placementAdvice": "Best on large canvas (back, thigh, full sleeve)...",
  "colorPalette": ["#000000", "#DC143C", "#FF4500"],
  "estimatedSessionTime": "6-8 hours",
  "technicalNotes": "Heavy blackwork foundation...",
  "councilUsed": true,
  "cost": 0.02,
  "processingTime": 2.8
}
```

**Errors:**
- `400 INVALID_PROMPT`: Prompt missing or invalid
- `500 COUNCIL_FAILED`: All council providers failed

---

## Artist Matching Endpoints

### `POST /api/v1/match/semantic`
Find artists matching design style using semantic search + graph enrichment.

**Request:**
```json
{
  "designUrl": "https://storage.googleapis.com/.../design.png",
  "prompt": "dragon in traditional style",
  "style": "traditional",
  "location": "Los Angeles",
  "budget": 200,
  "limit": 20
}
```

**Parameters:**
- `designUrl` (optional, string): URL of generated design (for visual similarity)
- `prompt` (optional, string): Text description (if no designUrl)
- `style` (optional, string): Filter by style
- `location` (optional, string): City or region preference
- `budget` (optional, number): Max hourly rate (USD)
- `limit` (optional, number, 1-100, default 20): Max results

**Response (200 OK):**
```json
{
  "matches": [
    {
      "id": "artist_123",
      "name": "Jane Doe",
      "city": "Los Angeles",
      "styles": ["traditional", "neo-traditional"],
      "hourlyRate": 150,
      "portfolioUrl": "https://...",
      "matchScore": 92,
      "breakdown": {
        "visual": 0.87,
        "style": 1.0,
        "location": 0.5,
        "budget": 0.8
      },
      "network": ["artist_456", "artist_789"],
      "isAvailable": true
    }
  ],
  "totalCount": 47,
  "searchDuration": 0.34
}
```

**Errors:**
- `400 INVALID_INPUT`: Missing both designUrl and prompt
- `500 SEARCH_FAILED`: Vector search or Neo4j failed

---

### `POST /api/v1/match/update`
Update match results in real-time (Firebase).

**Request:**
```json
{
  "userId": "user_abc",
  "matches": [
    { "id": "artist_123", "matchScore": 92 }
  ]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "updateCount": 1
}
```

---

## Stencil Export Endpoints

### `POST /api/v1/stencil/export`
Convert design to printable stencil (PDF or PNG).

**Request:**
```json
{
  "designUrl": "https://storage.googleapis.com/.../design.png",
  "format": "pdf",
  "widthInches": 6,
  "heightInches": 8,
  "dpi": 300
}
```

**Parameters:**
- `designUrl` (required, string): Source design image
- `format` (optional, string, "pdf" | "png", default "pdf"): Output format
- `widthInches`, `heightInches` (optional, number): Target print size
- `dpi` (optional, number, 200-600, default 300): Print resolution

**Response (200 OK):**
```json
{
  "stencilUrl": "https://storage.googleapis.com/.../stencil_abc.pdf",
  "format": "pdf",
  "dimensions": {
    "widthInches": 6,
    "heightInches": 8,
    "dpi": 300
  },
  "fileSize": 245678,
  "expiresAt": "2026-02-15T00:00:00Z"
}
```

**Errors:**
- `400 INVALID_URL`: designUrl missing or inaccessible
- `400 RESOLUTION_TOO_LOW`: Source image quality insufficient
- `500 EXPORT_FAILED`: Processing error

---

## Layer Management Endpoints

### `POST /api/v1/layers/decompose`
Split existing design into separate layers (outline, fill, shading).

**Request:**
```json
{
  "imageUrl": "https://storage.googleapis.com/.../design.png",
  "separateOutlines": true,
  "separateColors": true,
  "separateShading": true
}
```

**Response (200 OK):**
```json
{
  "layers": [
    {
      "id": "layer_outline",
      "name": "Outline",
      "type": "outline",
      "url": "https://storage.googleapis.com/.../layer_0.png",
      "opacity": 1.0,
      "blendMode": "normal"
    }
  ],
  "layerCount": 4,
  "processingTime": 6.7
}
```

**Errors:**
- `400 INVALID_URL`: imageUrl missing
- `500 SEGMENTATION_FAILED`: Vision API error

---

### `POST /api/v1/upload-layer`
Upload single layer to storage.

**Request (multipart/form-data):**
```
layerFile: <binary PNG data>
layerId: "layer_outline"
designId: "design_abc"
```

**Response (200 OK):**
```json
{
  "layerUrl": "https://storage.googleapis.com/.../layer_0.png",
  "layerId": "layer_outline",
  "fileSize": 123456
}
```

---

## Storage Endpoints

### `POST /api/v1/storage/upload`
Upload merged design or layer to GCS.

**Request (multipart/form-data):**
```
file: <binary image data>
filename: "design_abc.png"
contentType: "image/png"
```

**Response (200 OK):**
```json
{
  "url": "https://storage.googleapis.com/.../design_abc.png",
  "filename": "design_abc.png",
  "size": 567890,
  "uploadTime": 1.2
}
```

---

### `POST /api/v1/storage/get-signed-url`
Get temporary signed URL for private file access.

**Request:**
```json
{
  "filePath": "generations/design_abc.png",
  "expiresIn": 3600
}
```

**Response (200 OK):**
```json
{
  "signedUrl": "https://storage.googleapis.com/...?X-Goog-Signature=...",
  "expiresAt": "2026-02-08T13:34:56Z"
}
```

---

## AR Visualization Endpoints

### `POST /api/v1/ar/visualize`
(Future) Server-side AR processing (currently client-side only).

**Request:**
```json
{
  "designUrl": "https://storage.googleapis.com/.../design.png",
  "bodyPart": "arm",
  "videoFrameData": "data:image/jpeg;base64,..."
}
```

**Response (200 OK):**
```json
{
  "compositeImageUrl": "https://storage.googleapis.com/.../ar_composite.png",
  "landmarks": [
    { "point": "shoulder", "x": 320, "y": 120, "confidence": 0.89 }
  ],
  "transformMatrix": {
    "scale": 1.2,
    "rotation": 15,
    "translation": [320, 240]
  }
}
```

---

## Neo4j Query Endpoints

### `POST /api/neo4j/query`
Execute custom Cypher query (admin only, or restricted to safe queries).

**Request:**
```json
{
  "query": "MATCH (a:Artist) WHERE a.city = $city RETURN a LIMIT 10",
  "params": { "city": "Los Angeles" }
}
```

**Response (200 OK):**
```json
{
  "results": [
    {
      "a": {
        "id": "artist_123",
        "name": "Jane Doe",
        "city": "Los Angeles"
      }
    }
  ],
  "queryTime": 0.045
}
```

**Errors:**
- `400 INVALID_QUERY`: Cypher syntax error
- `403 FORBIDDEN_QUERY`: Query contains write operations (only read allowed)
- `500 NEO4J_ERROR`: Database connection or execution error

---

## Health & Debug Endpoints

### `GET /api/health`
Check service health (Supabase, Neo4j, Vertex AI, Firebase).

**Response (200 OK):**
```json
{
  "status": "healthy",
  "services": {
    "supabase": "connected",
    "neo4j": "connected",
    "vertexAI": "available",
    "firebase": "connected",
    "replicate": "available"
  },
  "timestamp": "2026-02-08T12:34:56Z"
}
```

---

### `GET /api/debug`
(Dev only) Debug information for troubleshooting.

**Response (200 OK):**
```json
{
  "environment": "development",
  "envVarsLoaded": {
    "REPLICATE_API_TOKEN": true,
    "NEO4J_URI": true,
    "SUPABASE_URL": true
  },
  "nodeVersion": "22.22.0",
  "nextVersion": "16.1.2"
}
```

---

## Predictions (Replicate Webhooks)

### `GET /api/predictions`
List recent predictions (Replicate generations).

**Response (200 OK):**
```json
{
  "predictions": [
    {
      "id": "pred_abc123",
      "status": "succeeded",
      "output": ["https://replicate.delivery/.../output.png"],
      "createdAt": "2026-02-08T12:30:00Z"
    }
  ]
}
```

---

### `GET /api/predictions/[id]`
Get single prediction status.

**Response (200 OK):**
```json
{
  "id": "pred_abc123",
  "status": "succeeded",
  "output": ["https://replicate.delivery/.../output.png"],
  "metrics": {
    "predict_time": 8.234
  }
}
```

---

## Rate Limits

| Endpoint | Rate Limit | Notes |
|----------|------------|-------|
| `/api/v1/generate` | 10 req/min per IP | Generation is expensive |
| `/api/v1/council/enhance` | 20 req/min per IP | Council API has quota |
| `/api/v1/match/*` | 30 req/min per IP | Vector search is fast |
| `/api/v1/stencil/export` | 30 req/min per IP | CPU-intensive |
| `/api/neo4j/query` | 60 req/min per IP | Database load |
| Other endpoints | 120 req/min per IP | General limit |

**Rate Limit Headers:**
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1644336000
```

**Rate Limit Error (429):**
```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 42
}
```

---

## Error Codes

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `INVALID_API_KEY` | 401 | Missing or invalid API key |
| `INVALID_PROMPT` | 400 | Prompt missing or too short |
| `INVALID_SAMPLE_COUNT` | 400 | sampleCount out of range |
| `INVALID_INPUT` | 400 | Generic validation error |
| `CONTENT_POLICY_VIOLATION` | 400 | Prompt violates content policy |
| `RESOLUTION_TOO_LOW` | 400 | Source image quality insufficient |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `GENERATION_FAILED` | 500 | All generation models failed |
| `COUNCIL_FAILED` | 500 | Council enhancement failed |
| `SEARCH_FAILED` | 500 | Vector search or Neo4j error |
| `EXPORT_FAILED` | 500 | Stencil export processing error |
| `SEGMENTATION_FAILED` | 500 | Vision API layer decomposition error |
| `NEO4J_ERROR` | 500 | Neo4j query execution error |

**Generic Error Format:**
```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": "Optional detailed explanation"
}
```

---

## Webhooks (Future)

### Replicate Completion Webhook
**Endpoint:** `POST /api/webhooks/replicate`  
**Trigger:** Replicate prediction completes  
**Payload:** Replicate prediction object

---

## Client Libraries

### JavaScript/TypeScript
```typescript
import { TattAPI } from '@tatt/client';

const client = new TattAPI({
  apiKey: 'your-api-key',
  baseUrl: 'https://tatt.vercel.app/api'
});

// Generate tattoo
const result = await client.generate({
  prompt: 'dragon in traditional style',
  sampleCount: 4
});

// Find artists
const matches = await client.matchArtists({
  designUrl: result.images[0],
  location: 'Los Angeles'
});
```

---

## Testing

### Example cURL Requests

**Generate Tattoo:**
```bash
curl -X POST https://tatt.vercel.app/api/v1/generate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "prompt": "dragon in traditional Japanese style",
    "sampleCount": 4
  }'
```

**Find Artists:**
```bash
curl -X POST https://tatt.vercel.app/api/v1/match/semantic \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "traditional dragon",
    "location": "Los Angeles",
    "limit": 10
  }'
```

---

## Related Directives
- `generate-tattoo.md` — `/api/v1/generate` workflow details
- `artist-matching.md` — `/api/v1/match/semantic` workflow details
- `stencil-export.md` — `/api/v1/stencil/export` workflow details
- `council-enhancement.md` — `/api/v1/council/enhance` workflow details
- `layer-management.md` — `/api/v1/layers/*` workflow details
- `neo4j-queries.md` — `/api/neo4j/query` usage patterns
