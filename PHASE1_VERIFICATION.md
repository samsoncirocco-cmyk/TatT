# Phase 1 Feature Verification Report

**Date**: 2026-02-07
**Reviewer**: Code Agent (automated review)
**Method**: Static code review (vitest not installed in package.json; tests exist but cannot run)

---

## 1. Council Token Validation

### Files Reviewed
- `src/services/councilService.ts` (976 lines) -- consolidated council service
- `src/app/api/v1/council/enhance/route.ts` -- Next.js API route
- `src/lib/api-auth.ts` -- shared auth verification helper

### Findings

**Auth token validation: IMPLEMENTED**

The API route at `src/app/api/v1/council/enhance/route.ts:19-21` dynamically imports and calls `verifyApiAuth(req)` before processing the request. The `verifyApiAuth` function in `src/lib/api-auth.ts`:

- Checks for `Authorization` header presence (returns 401 if missing)
- Extracts the Bearer token and compares against `FRONTEND_AUTH_TOKEN` env var (returns 403 if mismatch)
- Returns `null` on success, allowing the route to proceed

**Minor issue**: The import is dynamic (`await import('@/lib/api-auth')`) rather than a static top-level import. This works but adds a small overhead per request and suggests the import was added as an afterthought (the route comments confirm this). No functional problem.

**Fallback chain: IMPLEMENTED**

The `enhancePrompt()` function in `councilService.ts:592-855` implements the full fallback chain:

1. **Vertex AI Gemini** (free) -- tried first if `NEXT_PUBLIC_VERTEX_AI_ENABLED !== 'false'` and credentials are configured (`isVertexAIConfigured()` checks for project ID + service account)
2. **OpenRouter** (paid, ~$0.08) -- tried if Vertex fails and `NEXT_PUBLIC_USE_OPENROUTER === 'true'` and API key is present
3. **Demo mode** -- if `NEXT_PUBLIC_COUNCIL_DEMO_MODE === 'true'`, returns mock responses with simulated discussion updates
4. **External Council API** -- falls back to `COUNCIL_API_URL` endpoint
5. **Mock fallback** -- if the external API also fails, the catch block at line 808 returns MOCK_RESPONSES

Each fallback is wrapped in try/catch so failures cascade gracefully. The `applyCouncilSkillPack` hardening is applied to results from every path.

**Prompt validation: IMPLEMENTED**

- Token count estimation at line 50-53 (word count * 1.3 heuristic)
- `validatePromptLength()` enforces a 450-token max (line 56-70)
- Called at the top of `enhancePrompt()` (line 606-613), throws with code `PROMPT_TOO_LONG`

### Test Coverage

Two test files exist:
- `src/services/councilService.test.js` -- 14 tests covering skill pack integration, stencil detection, anatomical flow, aesthetic anchors, multi-character positioning, error handling, model selection, and result structure
- `src/services/__tests__/councilService.test.js` -- 18 tests covering character database, character enhancement logic, multi-character detection, description quality, and performance

**Cannot run**: `vitest` is not listed in `package.json` dependencies. Tests were authored but the test runner is missing from the project.

### Verdict: PASS (with minor notes)

- Auth validation works correctly
- Fallback chain is complete: Vertex AI -> OpenRouter -> Demo -> API -> Mock
- Prompt validation with token budget is in place
- Note: dynamic import of api-auth should be refactored to static import

---

## 2. RGBA Layer Separation

### Files Reviewed
- `src/features/generate/services/canvasService.ts` (471 lines) -- canvas layer management
- `src/features/generate/services/multiLayerService.ts` (279 lines) -- RGBA separation and multi-layer processing

### Findings

**Alpha channel detection: IMPLEMENTED**

`multiLayerService.ts:55-80` (`hasAlphaChannel`) loads an image, reads pixel data via canvas `getImageData`, and checks if any pixel has alpha < 255. Returns boolean.

**RGBA channel separation: IMPLEMENTED**

`multiLayerService.ts:82-139` (`separateRGBAChannels`):
- Loads image and reads raw RGBA pixel data
- Creates RGB layer: copies all pixel data, forces alpha channel to 255 (fully opaque) for every pixel
- Creates Alpha layer: extracts alpha values and writes them as grayscale (R=G=B=alpha, A=255)
- Uploads both layers to server via `uploadLayer()` (returns persistent URLs, not data URLs)
- Returns `{ rgbUrl, alphaUrl, width, height }`

**Blend modes with alpha: IMPLEMENTED**

`canvasService.ts:322-331` (`getCompositeOperation`) maps blend modes to CSS `GlobalCompositeOperation` values:
- `normal` -> `source-over` (standard alpha compositing)
- `multiply` -> `multiply`
- `screen` -> `screen`
- `overlay` -> `overlay`

The `compositeLayers` function at line 337-392 applies blend modes during rendering via `ctx.globalCompositeOperation`. Since `source-over` is the default, alpha transparency is preserved naturally during compositing. Each layer's transform is applied via canvas save/restore.

**Multi-layer processing pipeline: IMPLEMENTED**

`processGenerationResult()` at line 177-245:
- Checks `metadata.rgbaReady` flag to decide if RGBA processing should occur
- If enabled and alpha is detected, calls `separateRGBAChannels` to create separate RGB + Alpha mask layers
- Falls back to direct layer creation if RGBA processing fails or is not needed

**Layer type inference: IMPLEMENTED**

`inferLayerType()` uses metadata hints if available, otherwise defaults to index-based assignment (0=subject, 1=background, 2+=effect).

### Test Coverage

`src/services/multiLayerService.test.js` -- 12 tests covering:
- `inferLayerType` (4 tests: index-based defaults, metadata hints)
- `generateLayerName` (3 tests: basic names, prompt extraction, empty prompt)
- `shouldUseMultiLayer` (4 tests: multiple images, RGBA-ready, single non-RGBA, empty)
- `processGenerationResult` (3 tests: multiple images, no images, missing metadata)
- RGBA persistence tests (4 tests: server URL verification, persistence across reloads, alpha detection for transparent/opaque images)

**Cannot run**: vitest not installed.

### Verdict: PASS

- RGBA channel separation correctly isolates RGB and Alpha into separate layers
- Alpha detection checks individual pixel values
- Blend modes map to standard canvas composite operations that handle alpha correctly
- Separated layers are uploaded to server (not stored as bloated data URLs)

---

## 3. Inpainting Workflow

### Files Reviewed
- `src/features/inpainting/services/inpaintingService.js` (197 lines) -- core inpainting service
- `src/features/inpainting/components/InpaintingEditor.jsx` (429 lines) -- UI component
- `src/features/inpainting/index.ts` -- barrel exports

### Findings

**Mask creation: IMPLEMENTED**

- `createMaskCanvas()` at inpaintingService.js:168-179 creates a black-filled canvas (black = preserve)
- In `InpaintingEditor.jsx`, the mask canvas is initialized to all-black in the `useEffect` at line 63-68
- User paints white circles on the mask via brush tool (white = areas to modify)

**Brush painting: IMPLEMENTED**

`InpaintingEditor.jsx:109-126`:
- Draws white circles on hidden mask canvas (for the API)
- Draws semi-transparent red circles on visible overlay canvas (visual feedback for user)
- Touch and mouse events both supported (lines 246-254)
- Brush size is adjustable 10-100px via range slider

**API integration: IMPLEMENTED**

`inpaintTattooDesign()` at inpaintingService.js:60-160:
1. Converts mask canvas to data URL via `canvasToBlob` -> `blobToDataURL`
2. Converts image URL to data URL if not already one
3. POSTs to `/api/predictions` with auth token, image, mask, prompt, negative prompt, guidance scale, and inference steps
4. Polls for completion every 2 seconds, up to 60 attempts (2 min timeout)
5. Returns the output image URL on success

**Compositing result: PARTIALLY IMPLEMENTED**

The `InpaintingEditor` calls `onSave(result)` with the output URL. However, there is no visible integration between the inpainting result and the layer system (canvasService/multiLayerService). The `onSave` callback relies on the parent component to handle compositing the inpainted image back into the layer stack. This is a design choice (component receives callback), but the actual wiring to the Forge layer system is not visible in the inpainting module itself.

**Model configuration: PRESENT BUT USING LEGACY API**

The inpainting service targets Replicate's Stable Diffusion inpainting model (`stability-ai/stable-diffusion-inpainting`) via the proxy at `/api/predictions`. This is a **different backend** from the primary generation pipeline which uses Vertex AI Imagen 3.0. The Replicate prediction polling pattern is consistent with the Replicate API.

### Issues Found

1. **No inpainting tests**: There are no test files for the inpainting feature. Neither the service nor the component has test coverage.

2. **No integration with generation pipeline**: The `generationService.ts` (Vertex AI Imagen) has no inpainting mode. The inpainting service uses Replicate directly via `/api/predictions`, bypassing the main generation service and its retry/observability infrastructure.

3. **Cost model mismatch**: The inpainting cost estimate uses per-second billing (`$0.0014/sec`), which is the Replicate pricing model. The main generation pipeline uses per-image billing (`$0.02/image` via Vertex AI). These are separate cost tracking systems.

4. **Error handling gap**: `inpaintingService.js:158` wraps errors with template literal `\`Inpainting failed: ${error.message}\`` but `error.message` could be undefined if a non-Error object is thrown, which would produce `"Inpainting failed: undefined"`.

5. **No observability**: The inpainting service does not call `logEvent()` like the generation and council services do.

### Verdict: PARTIAL PASS

- Core workflow is functional: select region (brush paint) -> create mask -> send to API -> return result
- UI is polished with mobile touch support, brush size control, advanced options, cost estimates
- Missing: test coverage, integration with main Forge layer system, observability/logging, and the backend route handler for `/api/predictions` was not found in the Next.js routes (may be proxied via `server.js`)

---

## Summary

| Feature | Status | Notes |
|---------|--------|-------|
| Council Token Validation | PASS | Auth validated via `verifyApiAuth`, full 5-level fallback chain works |
| RGBA Layer Separation | PASS | Correct pixel-level separation, server-persisted URLs, blend modes handle alpha |
| Inpainting Workflow | PARTIAL | Service + UI complete, but no tests, no layer integration, uses legacy Replicate API separately from main pipeline |

## Recommendations

1. **Install vitest**: Add `vitest` to devDependencies and add a `test` script to `package.json` so existing tests can actually run
2. **Add inpainting tests**: The inpainting feature has zero test coverage -- at minimum, test `createMaskCanvas`, `getInpaintingCost`, and mock the API flow
3. **Integrate inpainting with generation pipeline**: Consider routing inpainting through `generationService.ts` for consistent retry, logging, and cost tracking
4. **Static import for api-auth**: Change the dynamic `await import('@/lib/api-auth')` in the council route to a static top-level import
5. **Add observability to inpainting**: Call `logEvent()` for inpainting requests/results like the other services do
