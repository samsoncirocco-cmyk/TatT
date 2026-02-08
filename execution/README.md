# Execution Manifest

Maps each directive to the scripts, services, and API routes that implement it. No files were moved — this is a reference index.

## Directive → Implementation Map

### `directives/generate-tattoo.md`

| Step | Implementation |
|------|---------------|
| Council enhancement | `src/services/councilService.ts` |
| Image generation | `src/services/generationService.ts` |
| Legacy generation + upload | `src/lib/vertex-imagen-client.ts` |
| Multi-layer processing | `src/services/multiLayerService.js` |
| Canvas layer management | `src/services/canvasService.ts` |
| Layer management hook | `src/features/generate/hooks/useLayerManagement.ts` |
| Generation hook | `src/features/generate/hooks/useImageGeneration.js` |
| API: v1 generate | `src/app/api/v1/generate/route.ts` |
| API: legacy generate | `src/app/api/generate/route.ts` |
| GCP auth | `src/lib/google-auth-edge.ts` |

### `directives/council-enhancement.md`

| Step | Implementation |
|------|---------------|
| Council service | `src/services/councilService.ts` |
| Character database | `src/config/characterDatabase.js` |
| Council skill pack | `src/config/councilSkillPack.js` |
| Style-model mapping | `src/utils/styleModelMapping.js` |
| Prompt templates | `src/config/promptTemplates.js` |
| Model routing rules | `src/config/modelRoutingRules.js` |
| API: council enhance | `src/app/api/v1/council/enhance/route.ts` |

### `directives/artist-matching.md`

| Step | Implementation |
|------|---------------|
| Hybrid match service | `src/features/match-pulse/services/hybridMatchService.ts` |
| Embedding service | `src/services/embeddingService.ts` |
| Vector DB service | `src/services/vectorDbService.js` |
| Neo4j service | `src/features/match-pulse/services/neo4jService.ts` |
| Score aggregation | `src/utils/scoreAggregation.js` |
| Firebase match service | `src/services/firebase-match-service.js` |
| Match service (legacy) | `src/features/match-pulse/services/matchService.js` |
| Demo match service | `src/features/match-pulse/services/demoMatchService.js` |
| Match update service | `src/features/match-pulse/services/matchUpdateService.js` |
| Real-time hook | `src/features/match-pulse/hooks/useRealtimeMatchPulse.js` |
| Artist matching hook | `src/features/match-pulse/hooks/useArtistMatching.js` |
| MatchPulse UI | `src/features/match-pulse/components/Match/MatchPulse.tsx` |
| API: semantic match | `src/app/api/v1/match/semantic/route.ts` |
| API: match update | `src/app/api/v1/match/update/route.ts` |
| Vector DB config | `src/config/vectorDbConfig.js` |
| **Scripts** | |
| Import artists to Neo4j | `scripts/import-to-neo4j.js` |
| Generate embeddings | `scripts/generate-vertex-embeddings.js` |
| Setup vector schema | `scripts/setup-supabase-vector-schema.js` |
| Inject Supabase data | `scripts/inject-supabase-data.js` |
| Migrate embeddings | `scripts/migrate-to-text-embeddings.js` |
| Test vector DB | `scripts/test-vector-db.js` |
| Test Supabase | `scripts/test-supabase-connection.js` |
| Benchmark vector search | `scripts/benchmark-vector-search.js` |
| Add sample relationships | `scripts/add-sample-relationships.js` |

### `directives/stencil-export.md`

| Step | Implementation |
|------|---------------|
| Stencil service | `src/features/stencil/services/stencilService.js` |
| Edge detection | `src/features/stencil/services/stencilEdgeService.js` |
| PDF generator | `src/utils/pdfGenerator.js` |
| Stencil calibration | `src/utils/stencilCalibration.js` |
| DPI service | `src/services/pngDpiService.js` |
| Email queue service | `src/services/emailQueueService.js` |
| StencilExport UI | `src/features/stencil/components/StencilExport.jsx` |
| API: stencil export | `src/app/api/v1/stencil/export/route.ts` |

### `directives/ar-preview.md`

| Step | Implementation |
|------|---------------|
| AR service | `src/services/ar/arService.js` |
| Depth mapping | `src/services/ar/depthMappingService.js` |
| MindAR loader | `src/services/ar/mindarLoader.js` |
| MindAR session | `src/services/ar/mindarSession.js` |
| Anatomical mapping | `src/utils/anatomicalMapping.js` |
| Visualize UI | `src/features/Visualize.jsx` |
| API: AR visualize | `src/app/api/v1/ar/visualize/route.ts` |

### `directives/layer-management.md`

| Step | Implementation |
|------|---------------|
| Multi-layer service | `src/services/multiLayerService.js` |
| Canvas service | `src/services/canvasService.ts` |
| Image registry | `src/services/forgeImageRegistry.ts` |
| Image load manager | `src/services/imageLoadManager.ts` |
| Layer utilities | `src/lib/layerUtils.js` |
| Layer management hook | `src/features/generate/hooks/useLayerManagement.ts` |
| ForgeCanvas UI | `src/features/generate/components/ForgeCanvas.tsx` |
| TransformHandles | `src/features/generate/components/Forge/TransformHandles.tsx` |
| Segmentation (SAM) | `src/lib/segmentation.ts` |
| Segmentation (Vertex) | `src/lib/segmentation-vertex.ts` |
| GCS service | `src/services/gcs-service.ts` |
| API: decompose | `src/app/api/v1/layers/decompose/route.ts` |
| API: upload layer | `src/app/api/v1/upload-layer/route.ts` |
| API: storage upload | `src/app/api/v1/storage/upload/route.ts` |
| API: signed URL | `src/app/api/v1/storage/get-signed-url/route.ts` |

### `directives/neo4j-queries.md`

| Step | Implementation |
|------|---------------|
| Neo4j driver | `src/lib/neo4j.ts` |
| Neo4j service | `src/features/match-pulse/services/neo4jService.ts` |
| API: Neo4j query | `src/app/api/neo4j/query/route.ts` |
| **Scripts** | |
| Import artists | `scripts/import-to-neo4j.js` |
| Generate Cypher | `scripts/generate-neo4j-cypher.js` |
| Migrate schema | `scripts/migrate-neo4j-schema.js` |
| Add relationships | `scripts/add-sample-relationships.js` |
| Sample queries | `scripts/SAMPLE_QUERIES.cypher` |

### `directives/deploy-vercel.md`

| Step | Implementation |
|------|---------------|
| Build config | `next.config.ts` |
| Vercel config | `vercel.json` |
| TypeScript config | `tsconfig.json` |
| Docker (alt deploy) | `Dockerfile`, `docker-compose.yml` |
| Env reference | `TATT_ENV_REFERENCE.md`, `.env.example` |
| **Scripts** | |
| Verify changes | `verify-changes.sh` |
| Test Docker | `test-docker.sh` |
| Test GCP health | `scripts/test-gcp-health.js` |
| Test Supabase | `scripts/test-supabase-connection.js` |

### `directives/local-dev-setup.md`

| Step | Implementation |
|------|---------------|
| Env template | `.env.example` |
| Quick start | `QUICKSTART.sh` |
| Package config | `package.json` |
| **Scripts** | |
| Install skills | `scripts/install-skills.sh` |
| Update skills | `scripts/update-skills.sh` |
| Setup & migrate | `scripts/setup-and-migrate.sh` |
| Setup Supabase schema | `scripts/setup-supabase-vector-schema.js` |
| Quick start guide | `scripts/QUICKSTART.md` |
| Supabase setup guide | `scripts/SUPABASE_SETUP.md` |

### `directives/api-endpoints.md`

| Route Group | Implementation |
|-------------|---------------|
| Health | `src/app/api/health/route.ts` |
| Debug | `src/app/api/debug/route.ts` |
| Generate (v1) | `src/app/api/v1/generate/route.ts` |
| Generate (legacy) | `src/app/api/generate/route.ts` |
| Council | `src/app/api/v1/council/enhance/route.ts` |
| Match semantic | `src/app/api/v1/match/semantic/route.ts` |
| Match update | `src/app/api/v1/match/update/route.ts` |
| AR visualize | `src/app/api/v1/ar/visualize/route.ts` |
| Stencil export | `src/app/api/v1/stencil/export/route.ts` |
| Layer decompose | `src/app/api/v1/layers/decompose/route.ts` |
| Upload layer | `src/app/api/v1/upload-layer/route.ts` |
| Storage upload | `src/app/api/v1/storage/upload/route.ts` |
| Storage signed URL | `src/app/api/v1/storage/get-signed-url/route.ts` |
| Embeddings | `src/app/api/v1/embeddings/generate/route.ts` |
| Predictions | `src/app/api/predictions/route.ts` |
| Prediction status | `src/app/api/predictions/[id]/route.ts` |
| Neo4j query | `src/app/api/neo4j/query/route.ts` |
| Auth middleware | `src/lib/api-auth.ts` |
| Rate limiting | `src/lib/rate-limit.ts` |
| Observability | `src/lib/observability.ts` |

---

## Shared Infrastructure

| Module | Path | Used By |
|--------|------|---------|
| API Auth | `src/lib/api-auth.ts` | All protected routes |
| GCP Auth (Edge) | `src/lib/google-auth-edge.ts` | Council, generation, embeddings |
| Neo4j Driver | `src/lib/neo4j.ts` | Neo4j query route, match services |
| Observability | `src/lib/observability.ts` | All services (logEvent) |
| Rate Limiting | `src/lib/rate-limit.ts` | API routes |
| Performance Monitor | `src/utils/performanceMonitor.js` | Stencil, matching |
| Forge Store (Zustand) | `src/stores/useForgeStore` | All canvas/layer operations |
| Image Registry | `src/services/forgeImageRegistry.ts` | Layer image resolution |
