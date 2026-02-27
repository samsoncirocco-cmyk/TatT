---
phase: 03-firestore-cloud-storage
plan: 02
subsystem: generation-storage-queue
tags: [cloud-storage, cloud-tasks, generation, serverless, nodejs]

# Dependency graph
requires:
  - 03-01-storage-abstraction
provides:
  - Cloud Storage image upload/download/delete service with CDN cache headers
  - Cloud Tasks queue sharding for generation requests (20 buckets)
  - Cloud Tasks callback handler for generation jobs
  - Permanent public image URLs for generated outputs
affects:
  - 03-04-migration-security-rules
  - Phase 4 matching + generation flow

# Tech tracking
tech-stack:
  added:
    - @google-cloud/storage (server-side Cloud Storage SDK)
    - @google-cloud/tasks (Cloud Tasks client)
  patterns:
    - Hash-bucket sharded queues (djb2 hash, 20 buckets)
    - Server-only storage service guard (no client-side use)
    - Public object URLs for immutable generated images

key-files:
  created:
    - src/services/storage/imageStorageService.ts
    - src/services/tasks/generationQueue.ts
    - src/app/api/v1/tasks/generate/route.ts

key-decisions:
  - "Use Cloud Storage server SDK with public objects for permanent URLs"
  - "Queue sharding into 20 buckets with maxConcurrentDispatches=3"
  - "Cloud Tasks callback writes imageUrl back to Firestore"
  - "Generation handler runs on nodejs runtime for server SDK support"

patterns-established:
  - "Image storage paths: generated/{userId}/{designId}/{versionId}/design.png"
  - "Cache-Control: public, max-age=31536000, immutable"
  - "Cloud Tasks queue name: generation-bucket-{hash % 20}"

# Metrics
duration: backfilled (execution time unknown)
completed: 2026-02-27
---

# Phase 3 Plan 02: Cloud Storage + Cloud Tasks Summary

**Cloud Storage image service and Cloud Tasks generation queue with hash-bucket sharding and per-user concurrency limits**

## Performance

- **Duration:** Backfilled from code review (execution time unknown)
- **Started:** 2026-02-27T14:20:34Z (backfill)
- **Completed:** 2026-02-27T14:20:34Z (backfill)
- **Tasks:** 2 (backfilled)
- **Files modified:** 3 (pre-existing in repo)

## Accomplishments
- Implemented server-side image storage service using `@google-cloud/storage`
- Uploaded images are immutable with `cacheControl: public, max-age=31536000, immutable`
- Generated images are made public and served via permanent `https://storage.googleapis.com/...` URLs
- Implemented Cloud Tasks queue sharding (20 buckets) with per-queue concurrency limits
- Created Cloud Tasks callback route to run generation, upload image, and update Firestore

## Task Commits

Each task was committed atomically:

1. **Task 1: Cloud Storage image service** - Previously committed (hash not captured in backfill)
   - Files: `src/services/storage/imageStorageService.ts`

2. **Task 2: Cloud Tasks generation queue and handler** - Previously committed (hash not captured in backfill)
   - Files: `src/services/tasks/generationQueue.ts`, `src/app/api/v1/tasks/generate/route.ts`

## Files Created/Modified
- `src/services/storage/imageStorageService.ts` - Server-side Cloud Storage uploads, public URLs, delete/get helpers
- `src/services/tasks/generationQueue.ts` - Hash-bucket Cloud Tasks queue (20 buckets) with concurrency limits
- `src/app/api/v1/tasks/generate/route.ts` - Cloud Tasks callback handler (Vertex AI → Cloud Storage → Firestore)

## Decisions Made
- Use `@google-cloud/storage` server SDK (not firebase/storage client SDK) for uploads
- Generate permanent public URLs by calling `file.makePublic()` after upload
- Use hash-bucket sharding for queues to avoid per-user queue explosion
- Enforce server-only usage for storage functions to avoid client credential leakage

## Deviations from Plan

### Implementation Variants

**1. Image storage uses server SDK instead of Firebase client SDK**
- **Planned:** `firebase/storage` client SDK with `getDownloadURL()` token URLs
- **Implemented:** `@google-cloud/storage` server SDK with `file.makePublic()` and stable public URLs
- **Impact:** Still satisfies permanent URL + CDN caching requirements, but uses GCP bucket permissions instead of Firebase download tokens

**2. Task handler uses Vertex AI generation + firebase-admin writes**
- **Planned:** Replicate generation and Firestore client SDK updates
- **Implemented:** `generateWithImagen()` (Vertex AI) and Firestore Admin SDK writes with generation metadata
- **Impact:** Aligns with Phase 4 adoption of Vertex AI and avoids client SDK in server runtime

**3. Cloud Tasks verification relies on header presence only**
- **Planned:** OIDC token verification in handler
- **Implemented:** Requires `x-cloudtasks-taskname` header; no explicit OIDC token validation
- **Impact:** Still blocks non-Cloud Tasks calls, but lacks explicit OIDC token verification step

## Issues Encountered
- None. This summary is a documentation backfill based on existing code.

## User Setup Required
- Configure Cloud Storage bucket and set `GCP_STORAGE_BUCKET` (or `GCS_BUCKET_NAME`) in runtime env
- Configure Cloud Tasks and set env vars: `GCP_PROJECT_ID`, `GCP_LOCATION`, `CLOUD_RUN_URL`, `TASK_SERVICE_ACCOUNT`
- Ensure Cloud Run service account has permission to invoke tasks and access the storage bucket

## Next Phase Readiness
- Cloud Storage and Cloud Tasks plumbing in place for generation → upload → Firestore update
- Ready for Phase 03-04 security rules and migration integration

## Self-Check: PASSED

Files verified present:
- src/services/storage/imageStorageService.ts: FOUND
- src/services/tasks/generationQueue.ts: FOUND
- src/app/api/v1/tasks/generate/route.ts: FOUND

Commits verified:
- Not captured in this backfill (files already present in repository)

Build: Not run (documentation backfill only)

---
*Phase: 03-firestore-cloud-storage*
*Completed: 2026-02-27*
