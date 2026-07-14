# Engineering Guidelines Audit — 2026-07-14

Five-agent review of TatT against the Claude Engineering Guidelines (Karpathy rules: think before coding, simplicity first, surgical changes, goal-driven execution; git/commit hygiene; code quality guardrails). Dimensions reviewed: simplicity/dead code, repo hygiene, git history, consistency/dependencies, code quality/correctness.

**TL;DR:** Good bones (PR-based flow, ~84% conventional commits, no leaked secrets, no hallucinated dependencies, uniform ESM) but three systemic violations: **(1)** money-burning API endpoints with missing/weak auth and a budget cap that never actually trips, **(2)** a fully duplicated architecture — two API backends, two configs, two store dirs, dead legacy trees — and **(3)** 324 MB of PNGs plus build artifacts committed to git.

**Cross-cutting note:** the repo runs Express (`server.js`, per `railway.json` and the Dockerfile) *and* reimplements the same `/api/v1/*` surface in Next.js App Router routes — and it also deploys to Vercel, where the App Router versions are live. The security holes below exist in the layer Vercel serves. Resolving the dual-backend issue (#5) determines how much of the rest applies.

## 🔴 Critical — spend & security (fix first)

1. **Budget cap is never enforced.** `checkBudget()` is called in `src/app/api/v1/generate/route.ts:131`, but `recordSpend()` only fires on the Replicate *fallback* path (`route.ts:241`, hardcoded 1¢). The primary Vertex success path records nothing; no other route records spend — the $500 cap in `budget-tracker.ts:12` will effectively never trip. → Record actual Vertex cost on every successful generation, in council/tasks routes too.
2. **`council/generate` has no auth, no rate limit, no budget check.** `src/app/api/v1/council/generate/route.ts` runs a 6-step paid pipeline (4 OpenRouter calls + Flux image gen + vision critic) and imports nothing but `NextResponse` and `OpenAI`. A `council` rate bucket exists in `rate-limit.ts:24` but is never used. Any anonymous POST burns paid spend. → Add auth + rate limit + budget check, mirroring `v1/generate`.
3. **`tasks/generate` auth is a spoofable header.** `src/app/api/v1/tasks/generate/route.ts:30-32` trusts the mere presence of `x-cloudtasks-taskname`, then generates paid images for a body-supplied `userId`. → Verify the Cloud Tasks OIDC bearer token.
4. **Stripe webhook fails open.** `src/app/api/webhooks/stripe/route.ts:48-55` skips signature verification whenever `STRIPE_WEBHOOK_SECRET` is unset or a placeholder — forged `checkout.session.completed` events would be accepted. → Fail closed unless an explicit demo flag is set.

## 🟠 High — architecture & auth model

5. **Two parallel API backends.** Express `server.js` mounts 10 routers from `src/api/routes/*.js` at `/api/v1/*`, while 27 `src/app/api/v1/*/route.ts` files reimplement the same surface. → Pick one server model and delete the other layer.
6. **One shared static bearer token guards paid endpoints.** `src/lib/api-auth.ts` compares a single `FRONTEND_AUTH_TOKEN` (non-constant-time); a `NEXT_PUBLIC_` variant suggests it ships to the browser. A real per-user Firebase verifier exists (`auth-dal.ts`) but is barely used. Related: `/api/debug` returns internal logs unauthenticated; `/api/neo4j/query` executes arbitrary client-supplied Cypher behind the same shared token. → Standardize on Firebase token auth; gate or delete `/api/debug`; replace raw Cypher with named server-defined queries. *(= GSD Phase 1 scope)*
7. **Budget is one global doc, not per-user.** `budget-tracker.ts:26,32` uses a single `budget/global` doc; the `_userId` param is ignored — one abuser exhausts everyone's cap. → Key budget by user.
8. **324 MB of portfolio PNGs = 96% of the repo.** 300 images under `public/portfolio/`. → Move to GCS/CDN (repo already has `gcs-cors.json` + gen scripts), then purge history with `git filter-repo`.
9. **`.gitignore` rules exist but files were tracked first**, so they don't apply: `build.log`, 3.1 MB of Lighthouse reports in `artifacts/`, 9 `.pyc` files, `tsconfig.tsbuildinfo` — plus 7 MB of crawler JSON under `src/scripts/data_acquisition/output/` that a mis-pathed ignore rule misses. → `git rm --cached` each; fix the pattern to `**/data_acquisition/output/`.
10. **Dead legacy code with live duplicates.** `src/_pages-legacy/`, root `.legacy-pages/` (9 files), and orphaned `src/features/{Visualize,Artists,ArtistProfile}.jsx` have zero importers (grep-verified). `SmartMatchContent.jsx:2` still imports `useNavigate` from `react-router-dom` — which throws at runtime with no Router in a Next app. → Delete the dead trees; replace `useNavigate` with `next/navigation`; drop `react-router-dom`.
11. **Duplicate configs with divergent settings.** `next.config.js` and `next.config.ts` both exist; Next loads only `.ts`, so the `.js` file's `@ → src` alias and `ignoreBuildErrors: true` are silently dead — and `ignoreBuildErrors` itself defeats the strict tsconfig (158 `any`s, 8 `@ts-ignore` in src). → Merge into `.ts`, delete `.js`, drop `ignoreBuildErrors` and fix the type errors.
12. **Non-atomic mega-commits on main.** Worst: `7b518ae` (381 files, +13,916), `2b514ee` — an explicit `WIP:` commit that is the single largest diff on main (+14,880), `b7d9dbc` (133 files). `0d8f46a`'s message admits main was undeployable for **71 days**. → One concern per commit; squash WIP before merge; CI gate blocking merge unless build+tests pass.

## 🟡 Medium

13. **Three databases, no boundary** — Firebase (32 files), Neo4j (3), Supabase (exactly 1 config file). → Decide the system of record; document or remove Supabase.
14. **State/services fragmentation** — `src/store/` vs `src/stores/` vs feature-level stores; duplicate `useMatchStore` (`.ts` used, `.js` orphaned); `src/services/` holds `.ts`+`.js` twins and 100-byte re-export shims into `src/features/*/services/`; duplicate `ErrorBoundary.jsx`/`.tsx` where resolution depends on bundler extension order. → One store dir, one canonical module per service, delete twins.
15. **False-confidence tests** — `tests/server.test.js` tests a mock Express app built inline, never the real `server.js`; zero tests exercise any App Router route. Python tests are real but share `tests/` with vitest confusingly. → Add integration tests against real handlers; separate JS/Python test roots.
16. **Env sprawl: 74 vars, ~4 alias sets, no boot validation** — `GCP_PROJECT_ID`/`VERTEX_PROJECT_ID`/`GCLOUD_PROJECT`/`FIREBASE_PROJECT_ID`, `REPLICATE_API_KEY`/`_TOKEN`, etc. Missing vars fail deep at runtime. → One boot-time validator (`execution/validate_env.py` exists); collapse aliases.
17. **Estimate route's error fallback re-reads a consumed body** — `estimate/route.ts:95` `req.json()` in the catch always yields `{}` (body already read), silently returning a default estimate as HTTP 200. → Capture the parsed body in an outer variable.
18. **Doc/root clutter** — 63 session/handoff/overnight markdown files (14 at root), one-off scripts (`test-segmentation.ts`, `generate-artists.py`, `verify-changes.sh`) at root, a stray `my-project/` dir, and an empty Expo stub in `mobile/` (no `package.json`, no source). → Consolidate transient docs into `docs/archive/`, move scripts to `scripts/`, delete `my-project/` and `mobile/` (or restore a real workspace).

## 🟢 Low

19. **Rate limiter fails open** for unknown types, keys on spoofable `x-forwarded-for`, and its in-memory fallback is useless in serverless. → Key on authenticated user id; fail closed for paid endpoints.
20. **Mixed extensions, no convention** — 62 `.js`/51 `.jsx` beside 120 `.ts`/106 `.tsx`; `StencilViewToggle.jsx` hardcodes `.ts` in an import. → Standardize on TS for new code, migrate stragglers opportunistically.
21. **Unused dep `@react-spring/web`** (zero imports; `framer-motion` is the animation lib); single-importer heavyweights (`@google-cloud/monitoring`, `@dnd-kit/*`) worth confirming. → Remove/verify.
22. **`src/utils` vs `src/lib` boundary undefined**; `archive/` mixes stale docs with config leftovers; `mobile/.expo/` cache tracked. → Fold, archive, ignore respectively.

## ✅ What's clean

No secrets in history (`.env.master` contains only truncated placeholders), no hallucinated dependencies, uniform ESM (zero `require` in src), PR-based branch flow with 22 PRs, and the Python `execution/` tests are real and runnable.

## Suggested attack order (mapped to GSD)

1. Items **1–4** (spend/security) — urgent, small, surgical. Insert as a decimal phase (e.g. `/gsd:insert-phase` "1.1 — Stop the bleeding: spend recording + endpoint lockdown") since Phase 1 is already in progress.
2. Items **6, 19** — already Phase 1/Phase 2 scope; fold the audit specifics into those phase plans.
3. Items **5, 11** (kill duplicate backend + config) — deletes half the surface area the other findings live in; a dedicated phase.
4. Items **8, 9** (repo slimming, one `git filter-repo` session) — coordinate with all clones before rewriting history.
5. Remainder opportunistically via `/gsd:quick`.
