# API v1 Documentation

## Overview

TatTester API v1 provides RESTful endpoints for semantic artist matching, AR visualization, AI Council prompt enhancement, and professional stencil export.

**Base URL**: `http://localhost:3001/api/v1` (development)  
**Authentication**: Bearer token required for all endpoints  
**Rate Limiting**: Endpoint-specific limits (see below)

## Authentication

All API v1 endpoints require authentication via Bearer token:

```bash
Authorization: Bearer <your-token>
```

**401 Unauthorized** response if token is missing or invalid.

## Rate Limiting

Rate limits are enforced per IP address per hour:

| Endpoint | Limit | Window |
|----------|-------|--------|
| Semantic Match | 100 requests | 1 hour |
| AR Visualization | 50 requests | 1 hour |
| Council Enhancement | 20 requests | 1 hour |
| Stencil Export | 30 requests | 1 hour |

**429 Too Many Requests** response when limit is exceeded, with `Retry-After` header.

## Endpoints

### 1. Semantic Artist Matching

**POST** `/api/v1/match/semantic`

Find artists using hybrid vector-graph matching with semantic understanding.

#### Request Body

```json
{
  "query": "Cyberpunk Gohan",
  "location": "Austin, TX",
  "style_preferences": ["Anime", "Cyberpunk"],
  "budget": 200,
  "radius": 25,
  "max_results": 10
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `query` | string | ✅ | Search query (1-500 chars) |
| `location` | string | ❌ | City or zip code |
| `style_preferences` | string[] | ❌ | Array of style names (max 20) |
| `budget` | number | ❌ | Budget in dollars (positive) |
| `radius` | number | ❌ | Search radius in miles (1-500) |
| `max_results` | number | ❌ | Maximum results to return (1-50) |

#### Response (200 OK)

```json
{
  "success": true,
  "matches": [
    {
      "id": "artist-123",
      "name": "Artist Name",
      "city": "Austin",
      "styles": ["Anime", "Cyberpunk"],
      "compositeScore": 0.85,
      "score": 85,
      "reasons": [
        "Strong visual style match (92% similarity)",
        "Specializes in Anime, Cyberpunk",
        "Located in Austin",
        "Within your budget"
      ],
      "scoreBreakdown": {
        "visualSimilarity": 0.92,
        "styleAlignment": 1.0,
        "location": 1.0,
        "budget": 1.0,
        "randomVariety": 0.15
      }
    }
  ],
  "total_candidates": 45,
  "query_info": {
    "query": "Cyberpunk Gohan",
    "visualConcepts": ["cyberpunk", "gohan"],
    "keywords": ["cyberpunk", "gohan"],
    "vectorResultCount": 20,
    "graphResultCount": 30
  },
  "performance": {
    "duration_ms": 245
  }
}
```

#### Error Responses

- **400 Bad Request**: Invalid query or parameters
- **404 Not Found**: Resource not found
- **429 Too Many Requests**: Rate limit exceeded
- **500 Service Unavailable**: Matching service failed

---

### 2. AR Visualization

**POST** `/api/v1/ar/visualize`

Generate AR preview with depth-aware placement.

#### Request Body

```json
{
  "design_id": "design-abc123",
  "body_part": "forearm",
  "depth_map": "data:image/png;base64,iVBORw0KGgoAAAANS...",
  "placement_config": {
    "x": 0.5,
    "y": 0.3,
    "scale": 1.0,
    "rotation": 0
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `design_id` | string | ✅ | Design identifier |
| `body_part` | string | ✅ | Body part (arm, leg, back, chest, shoulder, forearm, calf, thigh) |
| `depth_map` | string | ❌ | Base64 encoded depth map image |
| `placement_config` | object | ❌ | Placement configuration |

#### Response (200 OK)

```json
{
  "success": true,
  "visualization_url": "https://storage.example.com/ar-previews/design-abc123_forearm.png",
  "placement_accuracy": 0.95,
  "accuracy_cm": 2,
  "metadata": {
    "design_id": "design-abc123",
    "body_part": "forearm",
    "depth_aware": true,
    "placement_config": { "x": 0.5, "y": 0.3, "scale": 1.0, "rotation": 0 },
    "generated_at": "2026-01-05T20:30:00Z",
    "fallback_mode": false
  },
  "performance": {
    "duration_ms": 1250
  }
}
```

#### Error Responses

- **400 Bad Request**: Invalid depth map format
- **404 Not Found**: Design not found
- **422 Unprocessable Entity**: Unsupported body part
- **429 Too Many Requests**: Rate limit exceeded
- **500 Service Unavailable**: Rendering failed

---

### 3. AI Council Enhancement

**POST** `/api/v1/council/enhance`

Enhance user prompt using AI Council with multi-model routing.

#### Request Body

```json
{
  "user_prompt": "Dragon wrapped around arm",
  "style": "japanese",
  "body_part": "forearm",
  "complexity": "complex"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `user_prompt` | string | ✅ | User's design description (3-1000 chars) |
| `style` | string | ✅ | Tattoo style (anime, traditional, fine-line, tribal, watercolor, blackwork, realism, geometric, japanese, minimalist) |
| `body_part` | string | ❌ | Target body part |
| `complexity` | string | ❌ | Design complexity (simple, medium, complex) |

#### Response (200 OK)

```json
{
  "success": true,
  "enhanced_prompts": [
    "Intricate Japanese dragon coiling around forearm, scales detailed in traditional irezumi style, dynamic pose with open mouth revealing fangs, surrounded by cherry blossoms and flowing water, bold black outlines with subtle color gradients"
  ],
  "model_selections": {
    "primary": "flux-dev",
    "reasoning": "Complex Japanese style requires high detail and traditional aesthetics"
  },
  "metadata": {
    "original_prompt": "Dragon wrapped around arm",
    "style": "japanese",
    "body_part": "forearm",
    "complexity": "complex",
    "council_members": ["technical", "artistic", "cultural"],
    "enhancement_version": "1.0",
    "generated_at": "2026-01-05T20:30:00Z"
  },
  "performance": {
    "duration_ms": 2800
  }
}
```

#### Error Responses

- **400 Bad Request**: Invalid style or parameters
- **404 Not Found**: Character or style not found
- **429 Too Many Requests**: Rate limit exceeded
- **500 Service Unavailable**: Enhancement failed

---

### 4. Stencil Export

**POST** `/api/v1/stencil/export`

Generate professional stencil with calibration markers.

#### Request Body

```json
{
  "design_id": "design-abc123",
  "dimensions": {
    "width": 6,
    "height": 8
  },
  "format": "pdf",
  "include_metadata": true,
  "artist_info": {
    "name": "Artist Name",
    "instagram": "@artistname",
    "studio": "Studio Name"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `design_id` | string | ✅ | Design identifier |
| `dimensions` | object | ✅ | Width and height in inches |
| `dimensions.width` | number | ✅ | Width (0-24 inches) |
| `dimensions.height` | number | ✅ | Height (0-36 inches) |
| `format` | string | ❌ | Export format (pdf, png, svg) |
| `include_metadata` | boolean | ❌ | Include metadata overlay |
| `artist_info` | object | ❌ | Artist information |

#### Response (200 OK)

```json
{
  "success": true,
  "stencil_url": "https://storage.example.com/stencils/design-abc123_6x8.pdf",
  "metadata": {
    "design_id": "design-abc123",
    "dimensions": {
      "width": 6,
      "height": 8,
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
    "artist_info": {
      "name": "Artist Name",
      "instagram": "@artistname",
      "studio": "Studio Name"
    },
    "overlay": {
      "qr_code": true,
      "design_info": true,
      "artist_credit": true,
      "timestamp": true
    },
    "generated_at": "2026-01-05T20:30:00Z",
    "version": "1.0"
  },
  "performance": {
    "duration_ms": 3200
  }
}
```

#### Error Responses

- **400 Bad Request**: Invalid dimensions
- **404 Not Found**: Design not found
- **422 Unprocessable Entity**: Unsuitable design or unsupported format
- **429 Too Many Requests**: Rate limit exceeded
- **500 Service Unavailable**: Export failed

---

## Error Response Format

All error responses follow this structure:

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "message": "Detailed error description",
  "hint": "Suggestion for resolving the error",
  "details": [
    {
      "field": "field_name",
      "message": "Field-specific error message"
    }
  ]
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Request validation failed |
| `INVALID_REQUEST` | Invalid request parameters |
| `NOT_FOUND` | Resource not found |
| `RATE_LIMIT_EXCEEDED` | Rate limit exceeded |
| `SERVICE_UNAVAILABLE` | Service temporarily unavailable |
| `RENDERING_FAILED` | AR rendering failed |
| `ENHANCEMENT_FAILED` | Prompt enhancement failed |
| `EXPORT_FAILED` | Stencil export failed |
| `UNSUPPORTED_BODY_PART` | Body part not supported |
| `UNSUITABLE_DESIGN` | Design not suitable for operation |
| `INVALID_DEPTH_MAP` | Depth map format invalid |

---

## Performance Targets

| Endpoint | Target Response Time |
|----------|---------------------|
| Semantic Match | < 500ms |
| AR Visualization | < 3s |
| Council Enhancement | < 3s |
| Stencil Export | < 10s |

---

## Example Usage

### cURL Example

```bash
# Semantic Match
curl -X POST http://localhost:3001/api/v1/match/semantic \
  -H "Authorization: Bearer dev-token-change-in-production" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Cyberpunk Gohan",
    "location": "Austin, TX",
    "style_preferences": ["Anime"],
    "max_results": 5
  }'
```

### JavaScript Example

```javascript
const response = await fetch('http://localhost:3001/api/v1/match/semantic', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer dev-token-change-in-production',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    query: 'Cyberpunk Gohan',
    location: 'Austin, TX',
    style_preferences: ['Anime'],
    max_results: 5
  })
});

const data = await response.json();
console.log(data.matches);
```

---

## Health Check

**GET** `/api/health`

Check API status and available endpoints.

```bash
curl http://localhost:3001/api/health
```

Response:
```json
{
  "status": "ok",
  "message": "Proxy server is running",
  "hasReplicateToken": true,
  "hasNeo4jConfig": true,
  "authRequired": true,
  "api_version": "v1",
  "endpoints": {
    "v1": {
      "semantic_match": "/api/v1/match/semantic (100 req/hr)",
      "ar_visualization": "/api/v1/ar/visualize (50 req/hr)",
      "council_enhancement": "/api/v1/council/enhance (20 req/hr)",
      "stencil_export": "/api/v1/stencil/export (30 req/hr)"
    }
  }
}
```
