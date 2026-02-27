---
phase: 03-firestore-cloud-storage
plan: 04
subsystem: migration-security-rules
tags: [firestore-rules, storage-rules, migration, auth, firestore]

# Dependency graph
requires:
  - 03-01-storage-abstraction
  - 03-02-storage-tasks
  - 03-03-storage-integration
provides:
  - Firestore security rules enforcing user-owned access
  - Cloud Storage rules (public read, owner write/delete)
  - Progressive migration service from localStorage to Firestore
  - Auth hook integration for adapter refresh + migration trigger
  - Storage barrel exports for migration service

affects:
  - Phase 4 matching (relies on Firestore data integrity)
  - Any authenticated user flows with legacy data

# Tech tracking
tech-stack:
  added:
    - firestore.rules (Firestore security rules)
    - storage.rules (Cloud Storage security rules)
  patterns:
    - Idempotent migration with completion marker
    - Server-only migration guarded by browser checks
    - Public read / owner write storage policy

key-files:
  created:
    - firestore.rules
    - storage.rules
    - src/services/storage/migrationService.ts
  modified:
    - src/services/storage/index.ts
    - src/hooks/useAuth.ts

key-decisions:
  - "Firestore rules restrict all user data to request.auth.uid == userId"
  - "Cloud Storage generated images are public-read, owner-write"
  - "Migration runs after auth, non-blocking, with completion marker"
  - "Migration leverages FirestoreAdapter in browser context"

patterns-established:
  - "hasPendingMigration() scans legacy keys and Forge persisted state"
  - "Migration only marks completion when at least one design migrates and no errors"
  - "Auth hook updates StorageFactory on auth changes"

# Metrics
duration: backfilled (execution time unknown)
completed: 2026-02-27
---

# Phase 3 Plan 04: Security Rules + Migration Summary

**Firestore and Cloud Storage security rules with progressive localStorage → Firestore migration on authentication**

## Performance

- **Duration:** Backfilled from code review (execution time unknown)
- **Started:** 2026-02-27T14:20:34Z (backfill)
- **Completed:** 2026-02-27T14:20:34Z (backfill)
- **Tasks:** 2 (backfilled)
- **Files modified:** 5 (pre-existing in repo)

## Accomplishments
- Added Firestore security rules to restrict all design/version/layer data to the owning user
- Added Cloud Storage rules allowing public reads and owner-only writes/deletes for generated images
- Implemented `migrationService.ts` to move legacy version histories and Forge state into Firestore
- Wired auth state changes to refresh storage adapter and trigger migration in `useAuth`
- Exported migration helpers via `src/services/storage/index.ts`

## Task Commits

Each task was committed atomically:

1. **Task 1: Firestore and Cloud Storage security rules** - Previously committed (hash not captured in backfill)
   - Files: `firestore.rules`, `storage.rules`

2. **Task 2: Progressive migration service and auth integration** - Previously committed (hash not captured in backfill)
   - Files: `src/services/storage/migrationService.ts`, `src/services/storage/index.ts`, `src/hooks/useAuth.ts`

## Files Created/Modified
- `firestore.rules` - Owner-only access for users/{userId}/designs and subcollections
- `storage.rules` - Public read for generated images; owner write/delete only
- `src/services/storage/migrationService.ts` - Legacy version + Forge state migration with completion marker
- `src/services/storage/index.ts` - Re-exports migration helpers
- `src/hooks/useAuth.ts` - Updates StorageFactory and triggers migration on auth change

## Decisions Made
- Enforce explicit deny-all in rules for defense in depth
- Make generated images publicly readable to enable sharing
- Run migration asynchronously after auth so it does not block login
- Keep localStorage data until migration completes successfully (safety net)

## Deviations from Plan

### Implementation Variants

**1. Auth integration lives in `useAuth` hook (not AuthContext)**
- **Planned:** `AuthContext.tsx` would call migration and setForgeStoreContext
- **Implemented:** `useAuth.ts` calls `setCurrentUser` and triggers migration; `Generate.jsx` sets Forge store context
- **Impact:** Equivalent behavior; Forge context remains tied to design session IDs

**2. Migration currently focuses on legacy histories + Forge state**
- **Planned:** Migrate `design_anonymous_*` and `versions_anonymous_*` records from LocalStorageAdapter
- **Implemented:** Migrates `tattester_version_history_*` and `canvas_layers` (Forge state) only
- **Impact:** Anonymous LocalStorageAdapter data is detected by `hasPendingMigration()` but not migrated yet

## Issues Encountered
- None. This summary is a documentation backfill based on existing code.

## User Setup Required
- Deploy Firestore rules (`firestore.rules`) to Firestore
- Deploy Storage rules (`storage.rules`) to Cloud Storage bucket
- Ensure authenticated users have access to Firestore and Storage via Firebase Auth

## Next Phase Readiness
- Security rules and migration infrastructure are ready for Phase 4 embedding and matching services

## Self-Check: PASSED

Files verified present:
- firestore.rules: FOUND
- storage.rules: FOUND
- src/services/storage/migrationService.ts: FOUND
- src/services/storage/index.ts: FOUND
- src/hooks/useAuth.ts: FOUND

Commits verified:
- Not captured in this backfill (files already present in repository)

Build: Not run (documentation backfill only)

---
*Phase: 03-firestore-cloud-storage*
*Completed: 2026-02-27*
