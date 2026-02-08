# Generate Design

> Directive for generating AI tattoo designs using Vertex AI Imagen 3.0

## Goal

Generate tattoo design images via the Imagen 3.0 API (`imagen-3.0-generate-001`) through the Next.js API route at `/api/v1/generate`. Each call produces one or more base64-encoded PNG images from a text prompt.

## When to Use

- Testing the full design generation pipeline end-to-end
- Generating tattoo designs from the UI or via direct API call
- Verifying Vertex AI credentials and quota are working
- Benchmarking generation speed and retry behavior

## Prerequisites

- **Google Cloud** project (`tatt-pro`) with Vertex AI API enabled
- **Imagen 3.0** access granted (may require allowlist approval from Google)
- GCP service account with `Vertex AI User` role
- Environment variables in `.env.local`:
  - `GCP_PROJECT_ID` (default: `tatt-pro`)
  - `GCP_REGION` (default: `us-central1`)
  - `GOOGLE_APPLICATION_CREDENTIALS_JSON` or `GCP_SERVICE_ACCOUNT_KEY` or `GCP_SERVICE_ACCOUNT_EMAIL` + `GCP_PRIVATE_KEY` (for edge runtime auth via `google-auth-edge`)
  - `NEXT_PUBLIC_AUTH_TOKEN` or `FRONTEND_AUTH_TOKEN` (for API auth)
- Next.js dev server running (`npm run dev`)

## Steps

1. Start the dev server if not running:

   ```bash
   npm run dev
   ```

2. Send a generation request via curl:

   ```bash
   curl -X POST http://localhost:3000/api/v1/generate \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
     -d '{
       "prompt": "A traditional Japanese dragon tattoo with bold lines and red accents, designed for forearm placement",
       "negativePrompt": "blurry, low quality, distorted, watermark, text",
       "aspectRatio": "1:1",
       "safetyFilterLevel": "block_only_high",
       "personGeneration": "allow_adult",
       "sampleCount": 1,
       "seed": 42
     }'
   ```

3. The API route (`src/app/api/v1/generate/route.ts`) will:
   - Validate auth via `verifyApiAuth`
   - Validate the prompt (minimum 3 characters)
   - Validate `sampleCount` is between 1 and 4
   - Call `generateWithRetry()` from `src/services/generationService.ts`

4. `generateWithRetry()` will:
   - Obtain a GCP access token via `getGcpAccessToken()` (edge-compatible)
   - POST to Vertex AI Imagen endpoint: `https://{REGION}-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/{REGION}/publishers/google/models/imagen-3.0-generate-001:predict`
   - On retryable errors (429, 500, 502, 503, 504): retry up to 2 times with exponential backoff (400ms base)
   - On exhausted retries with a fallback configured: attempt one more call with `safetyFilterLevel: block_only_high`
   - Return base64 data URIs (`data:image/png;base64,...`)

5. Successful response shape:

   ```json
   {
     "success": true,
     "images": ["data:image/png;base64,..."],
     "metadata": {
       "model": "imagen-3.0-generate-001",
       "provider": "vertex-ai",
       "durationMs": 3500,
       "attempts": 1,
       "safetyFilterLevel": "block_only_high",
       "personGeneration": "allow_adult",
       "seed": 42,
       "fallbackUsed": false
     }
   }
   ```

## Expected Output

- 1-4 PNG images returned as base64 data URIs
- Typical generation time: 2-8 seconds per image
- Response includes full metadata with timing, attempts, and safety settings

## Edge Cases

- **VERTEX_QUOTA_EXCEEDED (429)**: You hit the Imagen API rate limit. The service retries automatically up to 2 times. If it persists, wait 60 seconds and try again. Check quota at: `console.cloud.google.com/iam-admin/quotas`.
- **VERTEX_IMAGEN_ERROR (non-retryable)**: Usually a 400 for prompt safety violation. Try adjusting the prompt or `safetyFilterLevel`. The fallback mechanism will try with `block_only_high` automatically.
- **GCP auth failure**: Ensure the service account credentials are set. The edge runtime uses `google-auth-edge` (not the standard `google-auth-library`). Check that `GOOGLE_APPLICATION_CREDENTIALS_JSON` or `GCP_SERVICE_ACCOUNT_EMAIL` + `GCP_PRIVATE_KEY` are in `.env.local`.
- **Empty images array**: Imagen returned no predictions. This can happen with very restrictive safety filters. Lower `safetyFilterLevel` or adjust the prompt.
- **Seed behavior**: Setting `seed` enables deterministic output. Omit it for varied results across calls.
- **sampleCount > 1**: Generates multiple images in a single API call. Cost scales linearly.

## Cost

**This directive costs real money per execution.**

- **Imagen 3.0**: ~$0.02 per image generated (`IMAGEN_COST_PER_IMAGE` in `generationService.ts`)
- **Per request**: $0.02 x `sampleCount` (1-4 images)
- **With retries**: Failed attempts that get retryable errors (429/5xx) do not incur cost. Only successful predictions are billed.
- **Fallback attempt**: If the primary attempt fails and fallback fires, that is an additional $0.02 x `sampleCount`.
- **Estimate for testing**: 10 test generations x 1 image = ~$0.20

## Related Directives

- Run **council-enhance.md** first to generate an optimized prompt before calling generate
- The UI workflow typically calls council-enhance then generate-design in sequence
