# Generate Tattoo

## Goal
Transform a user's text prompt into a set of AI-generated tattoo design variations, enhanced by the Council AI for artistic quality and technical feasibility.

## When to Use
- User submits a tattoo idea via the main generation UI
- API endpoint: `POST /api/v1/generate`
- Trigger: User clicks "Generate" button after entering prompt + optional parameters

## Prerequisites
- Valid Replicate API token or Vertex AI credentials
- (Optional) OpenRouter API key for Council enhancement
- User prompt (minimum 3 characters)
- Style selection (optional): `traditional`, `realism`, `watercolor`, `tribal`, etc.
- Body part (optional): `arm`, `chest`, `back`, `leg`, etc.
- Size/dimensions (optional): `small` (512px), `medium` (768px), `large` (1024px)

## Steps

### 1. Validate Input
**Location:** `src/app/api/v1/generate/route.ts`
- Check prompt is at least 3 characters
- Validate `sampleCount` (1-4, default 4)
- Validate dimensions if custom width/height provided

### 2. Council Enhancement (Optional)
**Location:** `src/services/councilService.ts`
- If Council is enabled (not demo mode):
  - Build council prompt with character database context
  - Detect stencil mode (keywords: `outline`, `stencil`, `linework`)
  - Detect characters (e.g., "Spider-Man", "Batman")
  - Call Vertex AI Gemini 2.0 Flash with 3-agent simulation:
    - **Creative Director:** Focus on artistic vision, composition
    - **Technical Expert:** Tattoo-specific details, feasibility
    - **Style Specialist:** Style authenticity, cultural accuracy
  - Parse JSON response: `{ enhancedPrompt, styleAdvice, placementAdvice, colorPalette, estimatedSessionTime }`
  - Fallback to OpenRouter if Vertex fails
  - Fallback to original prompt if all fail

### 3. Route to Generation Service
**Location:** `src/services/generationService.ts` → `generateWithRetry()`
- Determine model based on style/mode:
  - **Vertex Imagen 3:** RGBA layers, stencil mode, or `USE_VERTEX_ONLY=true`
  - **Replicate SDXL:** Default for most styles (cheaper)
- Build final prompt:
  - Add style-specific prefixes (e.g., `"A TOK tattoo drawing style of"`)
  - Append negative prompt defaults
  - Add character-specific enhancements if detected

### 4. Generate with Model
**Replicate Path:** `src/features/generate/services/replicateService.js`
- Select model variant:
  - `tattoo`: Classic flash (old-school bold lines)
  - `animeXL`: Animated ink (vibrant characters)
  - `dreamshaper`: Speed sketch (fastest, cheapest)
  - `sdxl`: Studio grade (most versatile)
- Call Replicate API via prediction endpoint
- Poll for completion (max 60s timeout)
- Return array of image URLs

**Vertex Path:** `src/lib/vertex-imagen-client.ts`
- Call Vertex AI Imagen 3 API
- Configure for RGBA output if stencil mode
- Set safety filters: `BLOCK_ONLY_HIGH` (allow artistic nudity)
- Return array of GCS URLs

### 5. Post-Process Results
**Location:** `src/services/generationService.ts`
- Upload images to GCS for persistence (if Replicate URLs)
- Generate metadata:
  - Original prompt
  - Enhanced prompt (if Council used)
  - Model used
  - Generation timestamp
  - Cost estimate
- Store in generation history (local state or Firebase)

### 6. Return to Client
**Response Format:**
```json
{
  "images": [
    "https://storage.googleapis.com/tatt-pro/generations/xyz1.png",
    "https://storage.googleapis.com/tatt-pro/generations/xyz2.png",
    "https://storage.googleapis.com/tatt-pro/generations/xyz3.png",
    "https://storage.googleapis.com/tatt-pro/generations/xyz4.png"
  ],
  "prompt": "Original user prompt",
  "enhancedPrompt": "Council-enhanced prompt (if used)",
  "metadata": {
    "model": "sdxl",
    "style": "traditional",
    "bodyPart": "arm",
    "councilUsed": true,
    "estimatedCost": 0.045,
    "generationTime": 8.3
  }
}
```

## Expected Output
- **4 image variations** (or user-specified count 1-4)
- **1024x1024 resolution** (or custom dimensions)
- **PNG format** with transparency (RGBA) if stencil mode
- **Council metadata** if enhancement was used
- **Generation time:** 5-15 seconds (Replicate), 8-20 seconds (Vertex)

## Edge Cases

### Council Enhancement Fails
- **Fallback:** Use original prompt without enhancement
- **Log:** Record failure reason for debugging
- **User Impact:** Still get generations, just without council refinement

### All Models Fail (Rate Limit / API Down)
- **Fallback:** Demo mode (return mock images from Unsplash)
- **UI Message:** "Service temporarily unavailable, showing sample designs"
- **Retry:** Suggest user try again in a few minutes

### Stencil Mode but Model Doesn't Support RGBA
- **Fallback:** Force route to Vertex Imagen (supports RGBA)
- **If Vertex unavailable:** Generate normal image + warn user about transparency

### Invalid Dimensions
- **Fallback:** Default to 1024x1024
- **Validation:** Width/height must be multiples of 64, max 2048px

### Prompt Contains Forbidden Content
- **Detection:** Check against safety filters
- **Response:** 400 error with code `CONTENT_POLICY_VIOLATION`
- **User Message:** "Please revise your prompt to comply with content policy"

## Cost (per request)

| Model | Cost per 4 Images | Speed | Quality |
|-------|-------------------|-------|---------|
| Replicate SDXL (default) | ~$0.022 | 8s | High |
| Vertex Imagen 3 | ~$0.16 | 12s | Highest |
| Council Enhancement | +$0.02 | +3s | N/A |

**Average Full Workflow:** $0.042 (SDXL + Council)

## Related Directives
- `council-enhancement.md` — Deep dive into Council AI
- `layer-management.md` — Multi-layer generation for complex designs
- `stencil-export.md` — Converting generated images to printable stencils
