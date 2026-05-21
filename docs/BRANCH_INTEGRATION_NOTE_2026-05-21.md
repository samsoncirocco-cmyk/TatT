# Branch Integration Note - 2026-05-21

## Current state

- `manama/next` now contains PR #5: crawler port, audit cleanup, punk UI, Firebase-auth UI wiring, and green Vercel previews.
- `main` contains newer council/sleeve work, including `/api/v1/council/generate` and `docs/sleeve-forge-plan.md`.
- A local probe of `main <- manama/next` on 2026-05-21 was intentionally aborted because the merge is architectural, not mechanical.

## Why the merge is non-trivial

The branches disagree on several ownership boundaries:

- Pages Router / legacy Vite files were deleted on `main` but moved into `.legacy-pages/` or component wrappers on `manama/next`.
- Several services were renamed or migrated differently (`*.js` to `*.ts`, feature-local folders, match-pulse and generate services).
- Shared API routes changed on both branches, especially `/api/v1/*` generation, council, storage, layer, and matching endpoints.
- Build config differs: Tailwind/PostCSS cleanup on `manama/next` vs dependency/build fixes on `main`.
- UI direction differs: `manama/next` owns the punk App Router customer surface; `main` owns newer council/sleeve planning.

## Recommended integration order

1. Start from `manama/next` as the customer-facing UI branch because it is currently Vercel-green after PR #5.
2. Cherry-pick or manually port the small `main` deltas:
   - `docs/sleeve-forge-plan.md`
   - `docs/council-plan.md` if still relevant
   - `/api/v1/council/generate/route.ts`
   - dependency/build-placement fixes from `main` only if still needed after `npm run build`
3. Keep old Pages Router/Vite cleanup from `manama/next`; do not resurrect deleted legacy app entrypoints unless a route needs them.
4. Verify with:
   - `npm install`
   - `npm run build`
   - `npm test -- --run`
   - Vercel preview checks on the integration PR

## Do not do

- Do not direct-merge `manama/next` into `main` without a manual reconciliation pass.
- Do not resolve service rename conflicts by keeping both copies.
- Do not reintroduce `vercel.json` SPA rewrites or tracked `tsconfig.tsbuildinfo`.
