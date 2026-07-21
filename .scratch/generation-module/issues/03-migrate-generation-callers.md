# 03 — Migrate generation API routes and UI callers

**What to build:** All generation traffic flows through `generate()`. The three
generation API routes (`/api/generate`, `/api/v1/generate`,
`/api/v1/tasks/generate`) become thin adapters; the Edge route keeps working via
injected Edge auth; UI/feature code imports the module entry point instead of
old service files. API response shapes unchanged.

**Blocked by:** 02 — Routing + Replicate provider + fallback chain.

**Status:** done

- [x] All three routes call `generate()`; response shapes verified unchanged
- [x] `/api/generate` keeps its GCS upload behavior in the route adapter (module returns images; upload is composed by the route, not absorbed into the module)
- [x] Edge-safe auth verified through the module (NOTE: no injection seam was built — the edge token helper works in both runtimes and is used directly; recorded as a spec deviation)
- [x] Feature/UI imports (`useImageGeneration`, `useSmartPreview`, stencil page, DesignForm) point at the module
- [x] Seam tests for at least the primary `/api/v1/generate` adapter
- [x] `npm test` and `npm run build` pass

## Outcome notes (2026-07-20)

- `/api/v1/generate` is now a thin adapter over `generate({..., modelId: 'imagen3', retry: {maxRetries: 2, baseDelayMs: 400}, fallback: {safetyFilterLevel: 'block_only_high'}})`. The route's inline `REPLICATE_MODELS` + `generateWithReplicate` are deleted — the module owns the vertex→replicate-sdxl fallback (same `REPLICATE_API_TOKEN` gating). Spend recording reads `result.metadata.provider`: vertex results record `VERTEX_IMAGEN_COST_CENTS * images`, replicate-fallback results record a flat 1 cent, as before. All error branches preserved (quota 429, not-configured 500, INVALID_PROMPT 400, generic 500).
- `/api/generate` calls `generate()` for images and composes the GCS upload in the route via a route-local helper (`src/app/api/generate/imagen-upload.ts`, ported verbatim from `lib/vertex-imagen-client`: upload, signed URLs, usage snapshot, daily-quota enforcement). Module stays upload-free. `allowProviderFallback: false` (this route never had a replicate fallback, and its upload step expects data-URL output).
- `/api/v1/tasks/generate` swapped `vertex-ai-edge.generateWithImagen` for the module's `generate()` with `modelId: 'imagen3'` and `allowProviderFallback: false` (the task handler decodes data URLs for its own upload; replicate returns hosted URLs). Module's vertex provider uses the edge-safe `getGcpAccessToken`; `npm run build` green confirms the import chain.
- Last two importers of the `src/services/replicateService` shim repointed to `@/features/generate/services/replicateService` (DesignForm.jsx, replicateService.test.js). Shim and old service files left in place for ticket 05.
- Seam tests added: `src/app/api/v1/generate/__tests__/route.test.ts` (vertex success shape + spend, replicate-fallback shape + flat spend, quota-429 mapping, invalid-prompt 400) with `vi.mock('@/services/generation')`.
- Known small deviations (noted, accepted): `/api/generate` metadata now reports the module's actual model (`imagen-3.0-generate-001`) instead of the old hardcoded `imagegeneration@006`; `imageSize` width/height are no longer forwarded (the module's Imagen 3 provider drives dimensions via aspectRatio); when both vertex and the replicate fallback fail on `/api/v1/generate`, the module surfaces the replicate error rather than the original vertex error (module-owned behavior from ticket 02).
