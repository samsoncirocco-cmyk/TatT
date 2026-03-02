# TatT Phase 3: Firestore + Cloud Storage — Feature Summary

**Phase:** 3 — Persistent Cloud Storage (`03-firestore-cloud-storage`)
**Status:** ✅ Complete (7/7 verifications passed)
**Date Completed:** ~2026-02-27
**Branch/Commit baseline:** Post-Phase-2 (Cloud Run + API Gateway, per-user rate limiting, OpenAPI spec)

---

## Overview

Phase 3 migrated TatT's design persistence from ephemeral browser storage (localStorage/sessionStorage) to a production-grade cloud persistence layer backed by Google Firestore and Cloud Storage. The primary goals were:

1. Eliminate data loss on browser refresh — user designs now survive sessions
2. Enable cross-device access for authenticated users
3. Build a clean storage abstraction layer (Interface + Adapters) so UI code is decoupled from storage backend
4. Handle anonymous users gracefully (localStorage fallback + migration on sign-up)
5. Support async generation queuing via Cloud Tasks with per-user concurrency limits
6. Establish security rules that enforce user-owned data isolation

---

## Features Built

### Plan 03-01 — Storage Abstraction Layer

**What was done:**

Designed a full storage abstraction using TypeScript interfaces and swappable adapters:

#### `src/services/storage/types.ts` (84 lines)
Shared TypeScript types consumed by all storage adapters:
- `DesignVersion` — Full version snapshot including prompt, enhanced prompt, imageUrl, layers array, branchedFrom, mergedFrom, isFavorite flag
- `DesignMetadata` — Top-level design document (title, createdAt, updatedAt, thumbnail)
- `UserPreferences` — User configuration persisted across devices
- Re-exports `Layer` from `canvasService.ts` to avoid type duplication

#### `src/services/storage/IDesignStorage.ts` (36 lines)
Abstract interface defining all 12 async storage operations:
- `saveDesign(userId, design)` / `loadDesign(userId, designId)`
- `listDesigns(userId, options)` — Paginated design listing
- `deleteDesign(userId, designId)`
- `saveVersion(userId, designId, version)` / `getVersionHistory(userId, designId)`
- `deleteVersion(userId, designId, versionId)`
- `getPreferences(userId)` / `savePreferences(userId, prefs)`
- `exportDesign(userId, designId)` / `importDesign(userId, data)`

#### `src/services/storage/LocalStorageAdapter.ts` (249 lines)
Full localStorage implementation of `IDesignStorage`:
- Serializes/deserializes all design data to `localStorage` keys with namespaced prefixes
- Synchronous browser API wrapped in async interface
- Handles JSON parse errors gracefully (corrupt data returns null, not throws)
- Used for anonymous users and as fallback when Firestore is unavailable

#### `src/services/storage/FirestoreAdapter.ts` (337 lines)
Full Firestore implementation of `IDesignStorage`:
- Subcollection architecture: `users/{userId}/designs/{designId}/versions/{versionId}/layers/{layerId}`
- Avoids the Firestore 1MiB document limit by keeping parent documents metadata-only
- Uses `writeBatch` for multi-document writes (versions + layers atomically)
- Pagination via Firestore cursors (`startAfter`, `limit`)
- Firebase client SDK (`firebase/firestore`) — runs in the browser

#### `src/services/storage/index.ts`
Barrel exports — single import point for the entire storage module.

**Why:** The old code mixed `localStorage.getItem()` calls directly into React components and the Zustand store. Any storage backend change would require touching dozens of files. The IDesignStorage interface decouples the UI from the storage implementation completely.

---

### Plan 03-02 — Generation Pipeline (Cloud Storage + Cloud Tasks)

**What was done:**

#### `src/services/storage/imageStorageService.ts` (177 lines)
Server-side Cloud Storage service for generated images:
- Uploads image blobs from Replicate/Vertex AI to GCS bucket `tattester-generated-images`
- Sets CDN-ready metadata on every upload:
  ```
  Cache-Control: public, max-age=31536000, immutable
  Content-Type: image/png
  ```
- Calls `file.makePublic()` to generate permanent public URLs (not Firebase token URLs that expire)
- Returns stable `https://storage.googleapis.com/tattester-generated-images/{filename}` URLs
- Handles download → upload pipeline (Replicate returns URLs, not blobs)

#### `src/services/tasks/generationQueue.ts` (127 lines)
Cloud Tasks queue management with hash-bucket sharding:
- 20 queues pre-created: `queue-generation-bucket-0` through `queue-generation-bucket-19`
- djb2 hash function maps `userId` → bucket index: `bucket = djb2Hash(userId) % 20`
- Each queue has `maxConcurrentDispatches: 3` (max 3 simultaneous generations per 5% of users)
- Dispatches OIDC-authenticated HTTP tasks to Cloud Run endpoint (`/api/v1/tasks/generate`)
- Returns `taskName` for tracking/cancellation

#### `src/app/api/v1/tasks/generate/route.ts` (99 lines)
Cloud Tasks callback handler:
- Validates `X-CloudTasks-TaskName` header (only Cloud Tasks can call this)
- Receives generation job payload from queue
- Calls Replicate API, polls for completion
- Uploads result to Cloud Storage via `imageStorageService`
- Writes completed design to Firestore via `FirestoreAdapter`
- Returns 200 on success, 500 (with retry) on failure

**Why:** The old generation flow ran synchronously in the API route — if the server timed out (120s Replicate polling), the entire generation was lost. Cloud Tasks makes generation async and retriable. The hash-bucket approach avoids GCP's 1,000-queue-per-project limit while still providing per-user fairness.

---

### Plan 03-03 — Integration Layer (Zustand + StorageFactory)

**What was done:**

#### `src/services/storage/StorageFactory.ts` (53 lines)
Adapter selection based on Firebase Auth state:
- `StorageFactory.getAdapter(userId)` → returns `FirestoreAdapter` if authenticated, `LocalStorageAdapter` otherwise
- Lazy initialization — adapters created on first request, cached thereafter
- `StorageFactory.reset()` — clears cached adapters (used after logout)

#### `src/services/storage/firestoreZustandStorage.ts` (67 lines)
Custom Zustand `StateStorage` adapter that bridges sync Zustand persist API → async Firestore:
- 1-second debounce on writes (prevents hammering Firestore on every keypress)
- Async buffering: `getItem` returns a Promise resolved to stored JSON
- `setForgeStoreContext(userId)` — called on auth state change to rehydrate store from Firestore

#### `src/services/versionService.ts` (280+ lines)
Async `VersionService` refactored to use `IDesignStorage` abstraction:
- All version CRUD operations now go through the storage interface
- `getVersionHistory()` returns paginated results with loading state
- `createVersion()` auto-generates thumbnail before saving
- Branch/merge operations preserved from original sync implementation

#### `src/hooks/useVersionHistory.ts`
React hook exposing version history with loading/error state:
- Returns `{ versions, loading, error, createVersion, deleteVersion }`
- Handles pagination via `loadMore()` callback

#### `src/stores/useForgeStore.ts` (275 lines)
Zustand store with dynamic Firestore/localStorage persistence:
- Uses `firestoreZustandStorage` adapter when authenticated
- Falls back to standard localStorage `persist` when anonymous
- Switches adapters on auth state change without losing in-memory state

**Why:** Zustand's built-in `persist` middleware is synchronous — incompatible with Firestore's async API. The custom `StateStorage` adapter with debounce solves this without blocking UI renders.

---

### Plan 03-04 — Security Rules + Migration

**What was done:**

#### `firestore.rules` (29 lines)
Firestore security rules enforcing user-owned data isolation:
```javascript
match /users/{userId}/{document=**} {
  allow read, write: if request.auth.uid == userId;
}
```
- All user data paths require matching Firebase Auth UID
- Admin read paths blocked (no admin bypass in client rules)
- Deployed via `firebase deploy --only firestore:rules`

#### `storage.rules` (17 lines)
Cloud Storage rules for split public/private access:
```javascript
match /generated/{allPaths=**} { allow read: if true; }
match /users/{userId}/{allPaths=**} { allow read, write: if request.auth.uid == userId; }
```
- Generated tattoo images: public read (permanent CDN sharing)
- User-uploaded assets: owner-only

#### `src/services/storage/migrationService.ts` (158 lines)
Progressive localStorage → Firestore migration on authentication:
- `hasPendingMigration(userId)` — scans localStorage for unmigrated design keys
- `migrateLocalStorageToFirestore(userId, adapter)` — copies all found designs to Firestore
- Completion marker (`localStorage.setItem('migration_complete_' + userId, '1')`) only written on zero-error migration
- Idempotent — safe to call repeatedly (skips already-migrated keys)
- localStorage data preserved until user manually clears it (safety net)

#### `src/hooks/useAuth.ts`
Auth state change hook that triggers migration:
- On `onAuthStateChanged` → fires `migrationService.migrateLocalStorageToFirestore()`
- Calls `StorageFactory.reset()` to swap adapters from localStorage → Firestore
- Calls `setForgeStoreContext(userId)` to rehydrate Zustand store from Firestore

**Why:** Progressive migration ensures anonymous users never lose designs. The completion marker prevents double-migration. Running migration in the background (not blocking the auth flow) keeps the sign-up experience instant.

---

## Architecture Decisions

### Decision 1: Subcollection Data Model (Not Embedded Arrays)
Firestore has a hard 1MiB document limit. Embedding 20+ layers with metadata would hit this quickly. Subcollections (`versions/{id}/layers/{id}`) don't count toward parent document size. Result: unlimited version/layer counts, paginated loading.

### Decision 2: IDesignStorage Interface + Adapters
Single interface, two implementations (localStorage + Firestore). UI components call `IDesignStorage` methods — they never know which backend is active. Zero UI changes required to swap implementations. New backends (e.g., IndexedDB, S3) can be added by implementing the interface.

### Decision 3: Public Cloud Storage URLs (Not Firebase Token URLs)
Firebase client `getDownloadURL()` returns time-limited token URLs that expire. Generated tattoo images should be permanently shareable (artists/clients sharing links). Server SDK + `file.makePublic()` gives stable `storage.googleapis.com` public URLs with 1-year CDN cache. Trade-off: no access control on generated images (accepted — designs are meant to be shared).

### Decision 4: Hash-Bucket Queue Sharding (20 buckets, not per-user queues)
GCP limits projects to 1,000 Cloud Tasks queues. Per-user queues would exhaust this at scale. djb2 hash sharding distributes users across 20 buckets. Each bucket handles ~5% of users with `maxConcurrentDispatches: 3`. Fair resource allocation without queue explosion.

### Decision 5: Debounced Zustand Persistence (1-second)
Every Zustand state change (cursor position, tool selection, prompt text) would trigger a Firestore write without debouncing. At 60fps canvas interactions, that's 60 writes/second. 1-second debounce collapses bursts into single writes, keeping Firestore costs negligible ($0.10/million writes).

### Decision 6: Progressive Migration (Migrate on Sign-Up, Not on App Load)
Don't block the app startup waiting for a migration check. Don't run migration on every page load. Only migrate once, at the moment the user creates an account. Completion marker prevents re-running. localStorage preserved as safety net (user can manually clear).

---

## API Endpoints

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/v1/tasks/generate` | POST | Cloud Tasks header | Async generation callback — receives job from queue, generates image, stores result |
| `/api/v1/storage/upload` | POST | Firebase JWT | Upload arbitrary file to GCS (returns public URL) |
| `/api/v1/storage/get-signed-url` | POST | Firebase JWT | Get signed GCS URL for private asset access |

---

## Data Models

### Firestore: `users/{userId}/designs/{designId}`
```typescript
interface DesignMetadata {
  id: string;
  title: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  thumbnail?: string;       // URL to latest version thumbnail
  versionCount: number;
  isShared: boolean;
}
```

### Firestore: `users/{userId}/designs/{designId}/versions/{versionId}`
```typescript
interface DesignVersion {
  id: string;
  versionNumber: number;
  timestamp: string;
  prompt?: string;
  enhancedPrompt?: string;
  parameters?: Record<string, any>;
  imageUrl?: string;
  layers?: Layer[];
  branchedFrom?: { sessionId?; versionId?; versionNumber? } | null;
  mergedFrom?: { version1?; version2?; mergeOptions? } | null;
  isFavorite?: boolean;
}
```

### Firestore: `users/{userId}/designs/{designId}/versions/{versionId}/layers/{layerId}`
```typescript
interface Layer {
  id: string;
  name: string;
  visible: boolean;
  transform: { x: number; y: number; scale: number; rotation: number; };
  imageUrl?: string;
  blendMode?: string;
  opacity: number;
}
```

### Cloud Storage: `tattester-generated-images/{userId}/{timestamp}-{uuid}.png`
```
Cache-Control: public, max-age=31536000, immutable
Content-Type: image/png
x-goog-meta-userId: {userId}
x-goog-meta-designId: {designId}
x-goog-meta-versionId: {versionId}
```

---

## New Files Added in Phase 3

```
src/services/storage/
  types.ts                         # Shared DesignVersion/DesignMetadata/UserPreferences types
  IDesignStorage.ts                # 12-method async storage interface
  LocalStorageAdapter.ts           # localStorage implementation (249 lines)
  FirestoreAdapter.ts              # Firestore subcollection implementation (337 lines)
  imageStorageService.ts           # Cloud Storage upload + CDN metadata service (177 lines)
  StorageFactory.ts                # Auth-based adapter selection (53 lines)
  firestoreZustandStorage.ts       # Zustand persist adapter for async Firestore (67 lines)
  migrationService.ts              # Progressive localStorage→Firestore migration (158 lines)
  index.ts                         # Barrel exports

src/services/tasks/
  generationQueue.ts               # Cloud Tasks hash-bucket queue management (127 lines)

src/app/api/v1/tasks/generate/
  route.ts                         # Cloud Tasks generation callback handler (99 lines)

(root)
  firestore.rules                  # Firestore user-owned access control rules
  storage.rules                    # Cloud Storage public/private split rules
```

---

## Modified Files in Phase 3

```
src/services/versionService.ts     # Refactored to use IDesignStorage abstraction
src/stores/useForgeStore.ts        # Added dynamic Firestore/localStorage persistence
src/hooks/useAuth.ts               # Added migration trigger on auth state change
```

---

## Known Issues

### 1. Cloud Tasks IAM Not Auto-Provisioned
`generationQueue.ts` assumes the Cloud Tasks service account `tatt-tasks@tatt-pro.iam.gserviceaccount.com` has `cloudtasks.tasks.create` and `iam.serviceAccounts.actAs` roles. These must be manually granted in GCP IAM — no Terraform/deployment script provisions them. **Mitigation:** Document in `docs/DEPLOYMENT_CHECKLIST.md`. Add to pre-deploy checklist.

### 2. Firestore Security Rules Not Auto-Deployed
`firestore.rules` and `storage.rules` are in the repo but require manual deployment:
```bash
firebase deploy --only firestore:rules
firebase deploy --only storage
```
The Cloud Run deployment scripts do not deploy Firebase rules. **Mitigation:** Add Firebase rules deploy step to CI/CD pipeline.

### 3. Zustand Debounce vs. Browser Close Race
1-second write debounce means if the user closes the browser tab within 1 second of a change, the latest state may not be persisted to Firestore. localStorage has the latest state (updated synchronously) but the cloud copy lags. **Mitigation:** Add `beforeunload` event handler to flush the debounce buffer immediately on tab close.

### 4. Migration Service: No Progress Indicator
`migrateLocalStorageToFirestore()` runs silently in the background. For users with large design libraries (100+ designs), migration can take 10-30 seconds. No progress toast/modal is shown. **Mitigation:** Add migration progress state to `useAuth.ts` and expose it to the UI for a non-blocking progress indicator.

### 5. Public Images Have No Access Revocation
Once `file.makePublic()` is called, there is no mechanism to make an image private again (short of GCS ACL manipulation). If a user deletes a design, the image URL remains publicly accessible. **Mitigation:** Acceptable at MVP — generated images are not personally identifiable. Add cleanup job for Phase 5+.

### 6. Anonymous Sessions Not Linked Across Devices
localStorage is browser/device-local. An anonymous user on their laptop and phone have separate design histories. Migration only triggers on account creation — there is no way to merge anonymous sessions from multiple devices. **Mitigation:** Out of scope for MVP. Multi-device anonymous sync would require a temporary session ID tied to anonymous Firebase Auth UID.

---

## Verification Checklist

- [x] `IDesignStorage.ts` defines all 12 CRUD operations
- [x] Both `LocalStorageAdapter` and `FirestoreAdapter` implement all 12 methods
- [x] `FirestoreAdapter` uses subcollection architecture (not embedded arrays)
- [x] Generated images uploaded to GCS with `Cache-Control: public, max-age=31536000, immutable`
- [x] `generationQueue.ts` uses djb2 hash-bucket sharding (20 buckets)
- [x] `versionService.ts` calls `IDesignStorage` methods (not direct localStorage/Firestore calls)
- [x] `firestore.rules` restricts reads/writes to `request.auth.uid == userId`
- [x] `storage.rules` sets public read on generated images, owner-only on user uploads
- [x] `migrationService.ts` only writes completion marker on zero errors
- [ ] Firebase rules deployed to production (`firebase deploy --only firestore:rules,storage`)
- [ ] Cloud Tasks service account IAM roles verified in GCP Console
- [ ] Storage bucket CORS configured for frontend domain

---

## Cost Implications

| Item | Cost | Notes |
|---|---|---|
| Firestore (reads) | $0.06/100K reads | ~1 read per page load (design list), 1 per version history fetch |
| Firestore (writes) | $0.18/100K writes | ~1-2 writes per generation (design + version doc) |
| Cloud Storage (storage) | $0.020/GB/month | 1,000 generated images ≈ 500MB ≈ $0.01/month |
| Cloud Storage (egress) | $0.12/GB | CDN-cached after first request; repeat loads free |
| Cloud Tasks | $0.40/million tasks | 1 task per generation; negligible at MVP scale |
| **Total estimated overhead** | **~$2-5/month** | At MVP scale (100 active users, 1,000 generations/month) |

---

## Relationship to Other Phases

| Phase | Dependency on Phase 3 |
|---|---|
| Phase 2 (Cloud Run + Rate Limits) | Phase 3 builds on Phase 2's Firestore quota collections; shares the same Firestore project |
| Phase 4 (Real Embeddings) | Phase 3 Firestore persistence stores design embeddings generated in Phase 4 for personalized recommendations |
| Phase 5 (Analytics) | Phase 3's Cloud Tasks task names and Firestore document IDs are used as event keys in Phase 5's analytics pipeline |
| Phase 6 (DOE + CI/CD) | Phase 6 CI must include `firebase deploy --only firestore:rules,storage` as a deploy step |

---

*Generated: 2026-03-02 | Source: `src/services/storage/`, `src/services/tasks/`, `firestore.rules`, `storage.rules`, `docs/PHASE3_SUMMARY.md`, direct codebase inspection*
