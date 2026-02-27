---
phase: 03-firestore-cloud-storage
plan: 03
subsystem: storage-integration
tags: [firestore, zustand, storage-factory, version-history, react]

# Dependency graph
requires:
  - 03-01-storage-abstraction
provides:
  - StorageFactory for adapter selection (Firestore vs LocalStorage)
  - Firestore-backed Zustand persist storage for Forge state
  - VersionService refactored to use IDesignStorage
  - useVersionHistory hook wired to async storage-backed version service
  - Forge store context setter for dynamic persistence backend

affects:
  - 03-04-migration-security-rules
  - Generate page persistence and version timeline

# Tech tracking
tech-stack:
  added:
    - zustand/middleware StateStorage adapter for Firestore
    - firebase/firestore (client SDK for browser persistence)
  patterns:
    - StorageFactory caches adapter by userId
    - Debounced Firestore writes (1s) for state persistence
    - VersionService encapsulates all version CRUD and branching logic

key-files:
  created:
    - src/services/storage/StorageFactory.ts
    - src/services/storage/firestoreZustandStorage.ts
  modified:
    - src/stores/useForgeStore.ts
    - src/services/versionService.ts
    - src/hooks/useVersionHistory.ts

key-decisions:
  - "StorageFactory falls back to LocalStorageAdapter if Firebase app is unavailable"
  - "Forge store persistence uses Firestore when both userId + designId are set"
  - "VersionService is async and storage-agnostic via IDesignStorage"
  - "Debounce Forge store writes to Firestore by 1s"

patterns-established:
  - "setForgeStoreContext(userId, designId) rehydrates persist storage on context changes"
  - "useVersionHistory uses createStorageAdapter(user) and VersionService"
  - "VersionService bridges legacy localStorage history when no storage data exists"

# Metrics
duration: backfilled (execution time unknown)
completed: 2026-02-27
---

# Phase 3 Plan 03: Storage Integration Summary

**StorageFactory wiring, Firestore-backed Zustand persistence, and VersionService/useVersionHistory migration to IDesignStorage**

## Performance

- **Duration:** Backfilled from code review (execution time unknown)
- **Started:** 2026-02-27T14:20:34Z (backfill)
- **Completed:** 2026-02-27T14:20:34Z (backfill)
- **Tasks:** 3 (backfilled)
- **Files modified:** 5 (pre-existing in repo)

## Accomplishments
- Added StorageFactory to select Firestore vs LocalStorage adapter based on auth state
- Implemented Firestore Zustand StateStorage with 1s debounce for Forge persistence
- Updated Forge store to dynamically choose Firestore storage when userId + designId are present
- Refactored VersionService to use IDesignStorage for all version operations
- Updated useVersionHistory hook to use async VersionService with loading state

## Task Commits

Each task was committed atomically:

1. **Task 1: StorageFactory and Zustand Firestore adapter** - Previously committed (hash not captured in backfill)
   - Files: `src/services/storage/StorageFactory.ts`, `src/services/storage/firestoreZustandStorage.ts`, `src/stores/useForgeStore.ts`

2. **Task 2a: Refactor versionService to use IDesignStorage** - Previously committed (hash not captured in backfill)
   - Files: `src/services/versionService.ts`

3. **Task 2b: Migrate useVersionHistory to async storage** - Previously committed (hash not captured in backfill)
   - Files: `src/hooks/useVersionHistory.ts`

## Files Created/Modified
- `src/services/storage/StorageFactory.ts` - Adapter selection and caching by userId, LocalStorage fallback
- `src/services/storage/firestoreZustandStorage.ts` - Firestore-backed Zustand StateStorage with debounced writes
- `src/stores/useForgeStore.ts` - Dynamic storage selection + `setForgeStoreContext` with rehydrate
- `src/services/versionService.ts` - Async VersionService using IDesignStorage, branch/merge/compare support
- `src/hooks/useVersionHistory.ts` - Async hook integration with loading state

## Decisions Made
- Use Firebase client SDK (browser-only) for Firestore-backed Zustand storage
- Cache storage adapters in StorageFactory but refresh on auth changes
- Keep Forge store API unchanged; only persistence backend varies
- Add legacy fallback migration for old `tattester_version_history_*` histories

## Deviations from Plan

### Implementation Variants

**1. Backward-compatible wrappers remain async**
- **Planned:** Sync wrappers with cached last-result for legacy callers
- **Implemented:** Async wrappers that return Promises and delegate directly to VersionService
- **Impact:** Works with existing async callers; no synchronous cache layer implemented

**2. StorageFactory uses firebase-client app with fallback**
- **Planned:** Direct `getFirestore()` usage without fallback
- **Implemented:** Uses `firebaseApp` from `firebase-client` and falls back to LocalStorageAdapter if app not initialized
- **Impact:** Avoids SSR/runtime errors when Firebase app is unavailable

**3. Forge context set from Generate page**
- **Planned:** AuthContext would set Forge store context on auth state change
- **Implemented:** `Generate.jsx` sets `setForgeStoreContext(user?.uid, sessionId)`; auth hook only calls `setCurrentUser`
- **Impact:** Still correct because designId is only known on the Generate page

## Issues Encountered
- None. This summary is a documentation backfill based on existing code.

## User Setup Required
- None (all changes are internal and auto-wired based on auth + design context).

## Next Phase Readiness
- Storage adapter selection, Forge persistence, and version history are ready for migration + security rules (Plan 03-04).

## Self-Check: PASSED

Files verified present:
- src/services/storage/StorageFactory.ts: FOUND
- src/services/storage/firestoreZustandStorage.ts: FOUND
- src/stores/useForgeStore.ts: FOUND
- src/services/versionService.ts: FOUND
- src/hooks/useVersionHistory.ts: FOUND

Commits verified:
- Not captured in this backfill (files already present in repository)

Build: Not run (documentation backfill only)

---
*Phase: 03-firestore-cloud-storage*
*Completed: 2026-02-27*
