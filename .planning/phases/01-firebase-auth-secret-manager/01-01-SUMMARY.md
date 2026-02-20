---
phase: 01-firebase-auth-secret-manager
plan: 01
subsystem: auth
tags: [firebase, firebase-auth, react-context, nextjs, typescript, localstorage-migration]

# Dependency graph
requires: []
provides:
  - Firebase client SDK initialized with browserLocalPersistence (survives tab close)
  - useAuth hook with signUp/logIn/logOut/getIdToken + error handling
  - AuthProvider React context wrapping the entire app
  - /login page with LoginForm (email + password, redirect on success)
  - /signup page with SignupForm (email + password + confirm, validation, redirect on success)
  - useOptionalAuthContext for legacy embedded pages without AuthProvider
  - StorageFactory integration on auth state change
  - One-time localStorage→Firestore migration trigger on login
affects:
  - 01-02-secret-manager
  - any plan that uses user identity or auth state

# Tech tracking
tech-stack:
  added:
    - firebase/app (initializeApp, getApps)
    - firebase/auth (getAuth, setPersistence, browserLocalPersistence, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut)
  patterns:
    - AuthProvider context pattern for app-wide auth state
    - useAuth hook encapsulates Firebase auth operations
    - getApps().length === 0 guard prevents duplicate Firebase initialization
    - Error codes mapped to user-friendly messages in getAuthErrorMessage()
    - setSessionCookie() called after login/signup for server-side session cookie

key-files:
  created:
    - src/lib/firebase-client.ts
    - src/hooks/useAuth.ts
    - src/components/auth/AuthProvider.tsx
    - src/components/auth/LoginForm.tsx
    - src/components/auth/SignupForm.tsx
    - src/app/(auth)/login/page.tsx
    - src/app/(auth)/signup/page.tsx
  modified:
    - src/app/layout.tsx (AuthProvider wraps children)

key-decisions:
  - "browserLocalPersistence for auth (survives tab close, satisfies AUTH-02)"
  - "getApps() guard prevents duplicate Firebase init alongside firebase-match-service.ts"
  - "setSessionCookie via /api/login after signup/login (server-side session cookie for middleware)"
  - "useOptionalAuthContext exported for legacy/embedded pages that don't mount AuthProvider"
  - "StorageFactory.setCurrentUser called on auth state change (enables per-user Firestore storage)"
  - "One-time migration from localStorage to Firestore triggers on first login with pending data"

patterns-established:
  - "AuthProvider pattern: wrap children in layout.tsx, any component calls useAuthContext()"
  - "Firebase error code → user-friendly message mapping in getAuthErrorMessage()"
  - "Auth pages: show loading spinner while auth state resolves, redirect if already authenticated"
  - "Form validation: client-side before Firebase call (password length, match)"

# Metrics
duration: 15min
completed: 2026-02-20
---

# Phase 1 Plan 01: Firebase Auth Client Infrastructure Summary

**Firebase Authentication SDK with browserLocalPersistence, email/password signup and login pages, AuthProvider context, and storage migration integration using onAuthStateChanged**

## Performance

- **Duration:** ~15 min (files were pre-built; committed enhancements and created summary)
- **Started:** 2026-02-20T12:47:05Z
- **Completed:** 2026-02-20T12:52:00Z
- **Tasks:** 2 (both complete)
- **Files modified:** 2 committed in this execution (useAuth.ts, AuthProvider.tsx); 6 previously committed

## Accomplishments
- Firebase client SDK initialized with `browserLocalPersistence` — auth sessions survive tab close (AUTH-02)
- Complete signup (`/signup`) and login (`/login`) pages with validation, loading states, and error display
- `AuthProvider` context wraps the entire app via `layout.tsx` — any component can call `useAuthContext()`
- `useOptionalAuthContext` added for legacy embedded pages that don't mount `AuthProvider`
- `setCurrentUser` called on auth state change to keep `StorageFactory` in sync with Firebase user
- One-time `migrateLocalStorageToFirestore` trigger fires on first login when pending migration exists

## Task Commits

Each task was committed atomically:

1. **Task 1: Firebase client initialization and auth hooks** - `8ba6e28` (feat)
   - Files: `src/hooks/useAuth.ts`, `src/components/auth/AuthProvider.tsx`
   - Previously committed (earlier sessions): `src/lib/firebase-client.ts`

2. **Task 2: Signup/login pages with AuthProvider integration** - Previously committed
   - Files: `src/components/auth/LoginForm.tsx`, `src/components/auth/SignupForm.tsx`
   - Files: `src/app/(auth)/login/page.tsx`, `src/app/(auth)/signup/page.tsx`
   - Files: `src/app/layout.tsx`

## Files Created/Modified
- `src/lib/firebase-client.ts` - Firebase SDK init with getApps() guard and browserLocalPersistence
- `src/hooks/useAuth.ts` - Auth state hook (signUp, logIn, logOut, getIdToken, migration trigger)
- `src/components/auth/AuthProvider.tsx` - Context provider; exports AuthProvider, useAuthContext, useOptionalAuthContext
- `src/components/auth/LoginForm.tsx` - Login form with email/password, loading state, error display
- `src/components/auth/SignupForm.tsx` - Signup form with email/password/confirm, client validation
- `src/app/(auth)/login/page.tsx` - Login page; redirects authenticated users to /dashboard
- `src/app/(auth)/signup/page.tsx` - Signup page; redirects authenticated users to /dashboard
- `src/app/layout.tsx` - Root layout wrapping children with `<AuthProvider>`

## Decisions Made
- `browserLocalPersistence` chosen over `browserSessionPersistence` — satisfies AUTH-02 (survives tab close)
- `getApps().length === 0` guard added so `firebase-client.ts` coexists with `firebase-match-service.ts`
- `setSessionCookie` via `/api/login` POST after successful Firebase auth — enables server-side session cookie for middleware
- `useOptionalAuthContext` added alongside `useAuthContext` for gradual migration of legacy embedded pages
- StorageFactory integration in `useAuth` — `setCurrentUser` keeps the storage layer synchronized with Firebase auth state changes

## Deviations from Plan

### Auto-added enhancements (Rule 2 — Missing Critical)

**1. [Rule 2 - Missing Critical] StorageFactory.setCurrentUser on auth state change**
- **Found during:** Task 1 (useAuth hook review)
- **Issue:** Without calling `setCurrentUser`, the `StorageFactory` would remain unaware of the authenticated user, causing all storage reads/writes to go to localStorage instead of Firestore for authenticated users
- **Fix:** Added `useEffect` that calls `setCurrentUser(user ? { uid: user.uid } : null)` whenever auth state changes
- **Files modified:** `src/hooks/useAuth.ts`
- **Verification:** Build passes, no TypeScript errors
- **Committed in:** `8ba6e28`

**2. [Rule 2 - Missing Critical] One-time localStorage migration trigger**
- **Found during:** Task 1 (useAuth hook review)
- **Issue:** Users with existing localStorage designs need a migration path to Firestore when they first log in; without this, their data remains inaccessible in authenticated sessions
- **Fix:** Added migration trigger in the same `useEffect` guarded by `hasPendingMigration()` and `isMigrationComplete(uid)` checks
- **Files modified:** `src/hooks/useAuth.ts`
- **Verification:** Build passes, no TypeScript errors
- **Committed in:** `8ba6e28`

---

**Total deviations:** 2 auto-added (both Rule 2 — missing critical for storage correctness)
**Impact on plan:** Both additions are essential for data integrity when Firestore storage is active. No scope creep beyond auth infrastructure.

## Issues Encountered
- All plan files were already created in earlier work sessions. The execution committed the pending enhancements to `useAuth.ts` and `AuthProvider.tsx` that were in the working tree.

## User Setup Required
- Firebase Authentication must be enabled in Firebase Console
- Email/Password sign-in provider must be enabled: Firebase Console → Authentication → Sign-in method → Email/Password → Enable
- Required environment variables:
  - `NEXT_PUBLIC_FIREBASE_API_KEY`
  - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
  - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
  - Optional: `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`

## Next Phase Readiness
- Firebase Auth client infrastructure is complete and verified (`npm run build` passes)
- `/login` and `/signup` routes render with correct form fields and glass-panel styling
- `AuthProvider` is live in `layout.tsx` — all downstream components can call `useAuthContext()`
- Ready for Phase 01-02: Secret Manager integration (server-side Firebase Admin SDK, protected API routes)

## Self-Check: PASSED

Files verified present:
- src/lib/firebase-client.ts: FOUND
- src/hooks/useAuth.ts: FOUND
- src/components/auth/AuthProvider.tsx: FOUND
- src/components/auth/LoginForm.tsx: FOUND
- src/components/auth/SignupForm.tsx: FOUND
- src/app/(auth)/login/page.tsx: FOUND
- src/app/(auth)/signup/page.tsx: FOUND

Commits verified:
- 8ba6e28 (Task 1 auth hook enhancements): FOUND

Build: PASSED (npm run build successful, /login and /signup routes present)

---
*Phase: 01-firebase-auth-secret-manager*
*Completed: 2026-02-20*
