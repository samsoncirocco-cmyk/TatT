# Session Recap — 2026-05-19

Long Claude Code session on the TatT repo. The headline: the Vercel deploy had been silently broken for 71 days, and we shipped the first green build today alongside 8 audit fixes and the first pass of the punk design system across the customer-facing pages.

This is the honest version, including the wrong turns.

## Setup & discovery

Started by sanity-checking the migration. Pulled up Vercel and discovered that every build of `manama-next` had been failing since March 9, 2026 — 71 days of silent red. No deploy had succeeded since the project was migrated from Vite. The dashboard was a wall of `ERESOLVE` errors that nobody had been triaging.

Kicked off `/code-upgrade` Deep audit. Three specialist sub-agents (Duplicate / Fail-Fast / Bloat / Retry) produced findings in `~/audit/`: `AUDIT-REPORT.md`, `DEEP-INSIGHTS.md`, `TATT-REALITY.md`. The audit caught real bugs (silent mock fallbacks, hardcoded passwords, Math.random() in a "validator"), but the bloat-audit also grabbed a bunch of reference docs and flagged them as dead code — had to read carefully and not just blindly delete.

Before touching anything: pushed all unpushed Vite-era work to a safety branch. Three commits on the old Vite repo were Mac-only and would have been at risk if anything went sideways during the port.

## Audit fixes shipped

Eight items, landed across five commits:

- **`c728d6a` — merged duplicate firebase-match-service.ts/.js.** Two implementations existed; the demo-mode `.ts` was silently shadowing the real-Firebase `.js` because of resolution order. Consolidated to a single `.ts` with the real impl as canonical and demo-mode preserved.
- **`0d467a2` — fail-closed API auth.** `src/lib/api-auth.ts` had `'dev-token-change-in-production'` as its fallback Bearer token; if `FRONTEND_AUTH_TOKEN` was unset, protected routes silently accepted that string as valid. Now returns 503 `AUTH_NOT_CONFIGURED` if the env var is missing.
- **`0d467a2` — removed orphan firebase shim.** `src/features/match-pulse/services/firebase-match-service.js` was a re-export of a file that no longer existed post-merge. Zero callers. Deleted.
- **`499a072` — killed silent Council mock fallback.** `councilService` had a 4-tier fallback chain that ended in hardcoded `MOCK_RESPONSES` if all real providers failed. Users were getting canned mock data with no signal anything was broken. Now throws a structured `CouncilProviderError`. Added a Map-based 1h TTL / 500-entry LRU cache and a `/api/health/council` endpoint to probe both providers. `DEMO_MODE` path is preserved as the only legitimate way to reach mock data.
- **`f2588b9` — deduped TARGET_CITIES.** Roseville, CA was listed twice in the parallel crawler's city array. Without dedupe-on-load, that would have doubled Google Places API spend on every Roseville run. Added a `[...new Set()]` strip-at-load safety net so future copy-paste mistakes can't double-bill.
- **`4febacd` — removed `Math.random()` fake-AI in artist validator.** The ported `artist_validator.js` had a "simulated AI verification" step that returned `Math.random() > 0.3` to label production data. Replaced with real Vertex Gemini calls. (Was randomly mislabeling artists as verified/unverified.)
- **`4febacd` — atomic file writes in crawler.** `parallel_crawler.js` wrote campaign state (7.5MB JSON) directly to disk; a crash mid-write would corrupt the entire campaign. Switched to write-tmp-then-rename atomic pattern.
- **`4febacd` — removed hardcoded Neo4j `'password'` default.** `import_to_neo4j.js` defaulted the Neo4j password to the literal string `'password'` if env was unset. Now throws on missing env.

## The deploy saga

The 71-day break needed four incremental fixes, in order:

1. **`.npmrc` with `legacy-peer-deps=true`** (`0d8f46a`). Every Vercel build since March was hitting `ERESOLVE: react-tinder-card@1.6.4 needs @react-spring/web@^9.5.5, root has ^10.0.3`. Strict resolution refused. `legacy-peer-deps` unblocks the install; proper fix is upgrading or replacing `react-tinder-card`.
2. **Removed Vite-era `vercel.json`** (same commit). The file was an SPA rewrite-all-to-`index.html` config — correct for the old Vite build, broken for Next App Router. Vercel auto-detects Next.js; the file was overriding that.
3. **`export const dynamic = 'force-dynamic'` on `/pitch`** (`6147d76`). After npm and routing were fixed, the build crashed because `/pitch` imports Firebase at module-load time and there was no `FIREBASE_API_KEY` available during static generation. Forcing dynamic rendering skips that path at build time.
4. **Pushed 43 env vars into Vercel via CLI** (`5926627`). The previous build had been failing too long for anyone to have populated env vars; even with the build green, runtime would have crashed. Re-deployed after the env var push.

First green Ready deploy in 71 days landed after step 4. Verified `/generate/stencil` renders on the preview URL.

A note for honesty: I sent the wrong preview URL at one point during this loop. The right URL only surfaced after a clean `vercel ls --yes`.

## Design iteration

Three rejected directions before landing the final. Each direction was a full pass on `/generate/stencil`:

1. **Generic neon-green-on-black hacker aesthetic.** Rejected as "too AI-default" — the kind of thing every LLM produces when asked for "punk" or "edgy".
2. **Tattoo flash-zine** (`190d9f2`). Cluttered, ransom-note typography, screenprint everything. Rejected as too chaotic; the studio needs to feel like a tool, not a fanzine.
3. **Apple-Karpathy editorial in bone + oxblood** (`1f78838`). Refined, restrained, beige paper. Rejected: "I hate the colors." Too vintage, not enough teeth.
4. **Machine Gun Kelly *Tickets to My Downfall*** (`f84c05c`). Accepted. Hot pink `#ff1f6b` on pitch black `#0a0a0a`, Anton crashing through Space Mono, hard edges, halftone screenprint dots, diagonal slashes, sharpie marks, sticker-tape pricetags. Loud, deliberate, monochromatic with one screaming accent. The aesthetic matches TatT's craft audience better than any of the prior directions.

Documented in `DESIGN_SYSTEM.md` at the repo root (`4bdf5e6`).

## Pages built

After the design system landed, scaffolded 13+ customer-facing routes in the punk system (`b85b8fa` and follow-ups):

- `/` — marketing landing, rebuilt around hero + slash headline
- `/about` — company / mission
- `/artists` — directory grid
- `/artists/[slug]` — artist profile
- `/book` — 3-step booking flow
- `/bookings` — user's booking list (`a2690f2`)
- `/designs` — saved designs, localStorage-backed (`986799c`)
- `/generate` — studio entry, wraps existing Forge
- `/generate/stencil` — reference implementation of the design system
- `/legal/terms`, `/legal/privacy` — static legal
- `/login`, `/signup` — auth UI (mock-localStorage, no Firebase Auth yet)
- `/matches` — swipe matching UI
- `/pricing` — tiered pricing
- `/settings` — account settings

Also: `PunkFooter` component, `StudioShell` updated with halftone + grain + RGB-glitch logo, favorites heart toggle persisted to `tatt:favorites` (`cd8bea4`).

## What's still mock or pending

Honest list. Don't ship the recap without this section.

- **Auth is mock-localStorage.** `/login` and `/signup` write a fake session to `localStorage`. Firebase Auth wiring not done.
- **Artist directory is hardcoded.** `/artists` and `/artists/[slug]` use inline mock arrays. No Supabase / Neo4j calls.
- **No real Replicate calls from the new pages.** The Forge studio still uses real generation, but the new `/generate` wrapper and any of the customer pages that imply generation are not yet hitting the API routes.
- **`/matches` swipe UI uses mock data.** The hybrid RRF matching service exists and works; the new UI doesn't call it yet.
- **`/designs` is localStorage-only.** No Firestore sync.
- **Forge double-header bug.** The new `StudioShell` and the existing Forge layout both render a header in some flows; depending on whether a parallel agent has fixed it, you'll see two stacked headers on `/generate`. Check `git log --oneline -10` for a recent commit on Forge work before duplicating effort.
- **Pre-existing TS errors** in `src/app/api/v1/stencil/export/route.ts`, `src/app/api/v1/council/enhance/route.ts`, `src/app/api/v1/layers/decompose/route.ts`, `src/app/api/v1/match/semantic/route.ts`, `src/app/page.tsx`. Don't block the build but should be cleaned up.
- **Mobile nav.** `StudioShell` is a desktop two-sidebar layout. Mobile collapse not designed.
- **`/pricing` payments wiring.** No Stripe / payment processor integration.

## Tomorrow's priorities

1. Wire `/artists` and `/artists/[slug]` to the real Supabase + Neo4j services. Mock data → live data.
2. Fix Forge double-header (if not already fixed by the parallel agent).
3. Wire `/login` and `/signup` to Firebase Auth. Replace the localStorage shim.
4. Address the `react-tinder-card` peer-dep conflict properly — upgrade or replace.
5. Resolve the 5 pre-existing TypeScript errors. Each is small and isolated.

## Known risks

- The Vercel build is green but fragile. Any new Firebase module-import at build time will crash unless guarded with `force-dynamic` or moved into a client component.
- The Council cache is in-memory only — does not survive Vercel cold starts. Cache hit rate will be low until / unless we move to Upstash Redis (already in deps).
- `--legacy-peer-deps` is a workaround, not a fix. The underlying React Spring version mismatch could surface again with future upgrades.
- 43 Vercel env vars are populated, but there is no automated audit that they're still valid. Tokens rotate; we'll find out the hard way.
- The crawler dedupe-on-load is a safety net, not a structural fix. A real fix would lint the cities array at CI time.
- The audit reports (`~/audit/`) are not in the repo. If someone needs to reproduce the findings, they'll need to re-run `/code-upgrade`.
