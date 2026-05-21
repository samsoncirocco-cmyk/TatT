# Followup Report — Tier A Cleanup + Tier B1 Firebase Auth

**Branch:** `samson/port-artist-crawler`
**Vercel preview:** https://manama-next-lh3rt0oz6-samsoncirocco-cmyks-projects.vercel.app
**Inspect:** https://vercel.com/samsoncirocco-cmyks-projects/manama-next/9H5GDvyEUhsX6bzPBDQQeeG45X61
**Build status:** ✅ green (`npm run build`, all 18 routes, zero warnings)

---

## Tier A — Cleanup (all 8 items shipped)

| # | Task | Commit | Notes |
|---|------|--------|-------|
| A1 | Delete duplicate tailwind config | `1c3311b` | Removed stale `tailwind.config.ts` (Ducks Green theme with rounded radii + Outfit font from Vite era). `.js` with punk tokens is now the only config. |
| A2 | Fix TS errors in stencil/export route | `2bd97ef` | Replaced both `@ts-ignore` lines with proper `.d.ts` declarations beside `emailQueueService.js` and `performanceMonitor.js`. Dropped unused `OP_NAME`/`startTimer`/`endTimer` references. Tightened `error: any` to `instanceof Error` narrowing. Typed the request body via the new `StencilExportRequest` interface. |
| A3 | CLAUDE.md version drift | `596e877` | Next.js 14 → 16. Added Tailwind 3.4. Bumped last-updated. |
| A4 | Redesign pitch/error + generate/error | `58c7195` | Both legacy purple-gradient boundaries now delegate to `PunkErrorBoundary`. Forge gets headline "Forge jammed." with "Start From Stencil" recovery; Pitch gets "Pitch broke." with "Go Home". |
| A5 | Extract ArtistCard shared component | `ba2c364` | New `src/components/punk/ArtistCard.tsx` with `default` / `compact` / `match` variants. /artists and /matches adopted with zero visual diff. Home grid intentionally deferred — its DOM order differs subtly (`mb-4` on tile vs wrapper-with-`mt-3`). |
| A6 | Adopt SlashHeadline + TapeCTA across pages | `48aab85` | SlashHeadline adopted on 10 sites (/, /about ×2, /artists, /matches ×2, /book, /bookings, /designs, /signup, /login, /generate/stencil). Added `sizeClassName` prop to support zero-diff adoption on pages whose original h1 didn't match a preset. TapeCTA adopted on the 4 sites whose dimensions matched the `lg` preset exactly. |
| A7 | Forge BACK TO STENCIL TapeCTA | `acb02bb` | Sticker-style ghost TapeCTA in the Forge chrome top-left. Also turned StudioShell footer off for the Forge route. |
| A8 | Real-device 375px viewport check | (no code commit) | Spun up `next dev --webpack`, ran a Playwright headless sweep across 13 routes at 375×812 viewport. Zero horizontal overflow on every route. Visual spot-checks of /, /artists, /artists/[slug], /matches, /book, /pricing, /generate/stencil all look clean. Screenshots saved to `/tmp/tatt-mobile/`. |

---

## Tier B — Real API wiring (B1 only)

| # | Task | Commit | Notes |
|---|------|--------|-------|
| B1 | Firebase auth replaces tatt:user | `b2f3f07` | `useDemoUser` → `useUser` (alias kept for back-compat). Source of truth is Firebase Auth via `firebase/auth.onAuthStateChanged`. `tatt:user` localStorage is now a hydration cache. Async `signIn`/`signUp`/`signOut`/`updateUser`, plus `error` field. /login, /signup, /settings updated to await + surface errors + show "Signing in…"/"Creating…" submit states. /settings email is read-only (Firebase requires re-auth for email change). |

Not attempted in Tier B:
- **B2 Neo4j artist queries** — would replace the 12 inline mocks with a real `/api/v1/artists` endpoint querying Neo4j, then update /artists, /matches, /artists/[slug] to fetch. Bigger surface area (3 pages × loading/empty/error states), defer to a focused session.
- **B3 Replicate generation** — the Forge already calls real generation (see `src/services/replicateService.js` + `src/features/Generate.jsx` `useImageGeneration` hook). The brief's premise ("currently does a fake delay + placeholder") is out of date. Worth a separate audit pass before touching anything.
- **B4 Stripe pricing** — needs B1 done (✅) and a real account model in Firebase (basic auth ✅, but plan/billing fields not yet modeled). Reasonable next step after B2.

---

## Files added

```
src/components/punk/ArtistCard.tsx
src/services/emailQueueService.d.ts
src/utils/performanceMonitor.d.ts
FOLLOWUP_REPORT.md
```

## Files removed

```
tailwind.config.ts
```

## Files modified (top-touched)

- `src/lib/tattStorage.ts` (Firebase auth bridge)
- `src/components/punk/PunkErrorBoundary.tsx`, `SlashHeadline.tsx` (new `sizeClassName` prop)
- 10+ page files under `src/app/` adopting shared components
- `src/app/api/v1/stencil/export/route.ts` (TS hygiene)
- `CLAUDE.md` (version drift)

---

## Known followups

- **Firebase email change flow** — `updateUser` here only updates `displayName`. Real email change needs `verifyBeforeUpdateEmail` + re-auth. Out of scope for this pass.
- **postcss config duplication** — `postcss.config.cjs` + `postcss.config.mjs` both exist. Scope here was tailwind only; postcss dedupe is a sibling task.
- **Home grid + login forms** could adopt ArtistCard (home) / TapeCTA (login/signup submit) once a `sizeClassName` is added to TapeCTA (mirroring SlashHeadline). Skipped now to keep adoption zero-diff per the brief.
- **Iterate CTA prompt prefill** — already shipped in an earlier session (`d45aae0`); flagged here only because the FOLLOWUP brief might have expected it as part of B work.
- **/artists/[slug] meta line at 375px** — Brooklyn/style/years line wraps tightly. Not broken, but borderline cramped. Worth a focused mobile polish if user testing flags it.

---

## How to test

1. `git pull` `samson/port-artist-crawler` → `npm install` → `npm run build` (must succeed).
2. Open the Vercel preview URL above (it builds straight from the branch HEAD `b2f3f07`).
3. Sign up via `/signup` with a real email + password ≥ 6 chars; verify the Firebase project receives the user (Firebase console → tatt-pro → Authentication → Users).
4. Refresh; nav should show the email + Account dropdown immediately (cache), then Firebase confirms after onAuthStateChanged.
5. Settings → change display name → Save → reload; new name persists from Firebase.
6. Log out → nav reverts to Sign In.
7. Visit `/designs/[id]` of any generated design → click Iterate → stencil page prefills with the saved prompt.
