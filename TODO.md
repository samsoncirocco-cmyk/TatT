# TatT — Shared TODO

Single source of truth for what needs doing next, across all sessions and
agents. **Every agent: read this before starting work, update it when you
finish or discover work.** Keep entries short; link PRs/issues; date your
changes. Newest state wins — resolve edit conflicts by merging both lists.

_Last updated: 2026-07-17 (roadmap-and-branch-triage session, post full-codebase review)_

## Now (in priority order)

1. **PR #40: address review feedback** — reviewed 2026-07-17 (see PR comment,
   the review of record): BLOCKER ~11 MB JSON in client bundle via
   `matches/page.tsx`; rebuild dataset from canonical clean file after item 4
   lands (drop the duplicate `isNonPerson()` cleaner); fix slug collisions
   (1,037 shadowed) + unstable ids. Owner: PR author session.
2. **Branch protection on `main` — BLOCKED by GitHub plan** (2026-07-17):
   both the protection and rulesets APIs 403 on private repos under the free
   plan. Options: GitHub Pro (~$4/mo, then it's one command), or keep relying
   on the working agreements below. Do NOT make the repo public — the old
   password is still in orphaned commits GitHub serves by SHA. Decision: Samson.
3. ~~**Reconcile `codex/tatt-security-hardening` with main**~~ — **DONE
   2026-07-17**: 5 conflicts reconciled (main behavior + hardening intent);
   `npm test` + `npm run build` green. Merged to main; unblocks draft PR #39.
4. ~~Final scrape run~~ — **DONE 2026-07-17** (PR #42 merged): 569 cities,
   0 failures, queue exhausted. Final dataset: **10,427 cleaned artists +
   11,017 shops** (audit: data/cleanup-report.json). Viz regenerated. Aura
   synced. Scraper/checkpoint launchd jobs retired. PR #40's rebuild
   (item 1) can now proceed against this final data.
5. **Cypher injection surfaces — 2 confirmed** (full-codebase review,
   2026-07-17, re-verified against current `main` post-security-merge, not
   just flagged): (a) `src/app/api/neo4j/query/route.ts` executes arbitrary
   client-supplied Cypher (`tx.run(query, params)` straight from the request
   body) gated only by the single shared bearer token — and that token is
   also shipped to the browser via `NEXT_PUBLIC_FRONTEND_AUTH_TOKEN`, so it's
   effectively a public constant, not real access control. Any caller can
   read the entire graph. Needs either a query allow-list/template
   restriction, or dropping the raw-query passthrough in favor of the
   specific parameterized queries `neo4jService.ts` actually needs. Also
   returns the raw driver `error.message` to the client on failure, which
   compounds this (leaks query/schema fragments back to a probing caller).
   (b) `execution/seed_artists.py`'s `create_artist_cypher()` builds Cypher
   via f-string interpolation with naive quote-escaping (backslashes aren't
   escaped before quotes are), unlike `import-to-neo4j.js` and
   `insert-artists-to-neo4j.js` which correctly use parameterized
   `UNWIND $rows`. Fix: parameterize `seed_artists.py`'s query the same way.
   Owner: unassigned.
6. **Rate limiting / input-validation gaps on 5 live API routes** — full-
   codebase review, 2026-07-17. Auth itself is already fixed on 2 of these by
   the recent security-hardening merge (`d5bb5b6`); these are the gaps that
   merge didn't cover, re-checked directly against current `main`:
   - `src/app/api/v1/layers/decompose/route.ts` — has auth now, but still no
     rate limiting despite calling billed Vision API + Replicate SAM per
     request; `imageUrl` is also caller-controlled with no validation (SSRF
     risk fetching arbitrary URLs server-side).
   - `src/app/api/v1/stencil/export/route.ts` — has auth now, still no rate
     limiting (low risk today since the handler is stub logic, but will
     become a real hole once real stencil generation lands behind it).
   - `src/app/api/v1/council/enhance/route.ts` — has auth, no rate limiting,
     unlike sibling `council/generate/route.ts` which rate-limits +
     budget-checks the same class of LLM call. Also has leftover AI
     self-narration comments ("Wait, I missed verifyApiAuth import...")
     that should be deleted regardless.
   - `src/app/api/v1/match/update/route.ts` — auth only, no rate limiting,
     despite driving hybrid-match computation + Firebase writes per call.
   - `src/app/api/v1/storage/upload/route.ts` — `destinationPath` is taken
     straight from the request body with no path-traversal/prefix check
     (unlike `upload-layer/route.ts`, which sanitizes and prefixes), and no
     rate limiting — a caller can overwrite arbitrary GCS objects.
   - `src/app/api/v1/storage/get-signed-url/route.ts` — `filePath` and
     `action` (read/write) are both caller-controlled with no validation, no
     rate limiting — a caller can mint write-capable signed URLs for
     arbitrary bucket paths.
   Owner: unassigned.
7. **`security-hardening-followups` (PR #39) needs re-targeting to `main`**
   — full-codebase review, 2026-07-17: `codex/tatt-security-hardening` (the
   branch PR #39 was based on) is now merged to `main` via PR #43 as a
   distinct ref, so PR #39's base branch is no longer an active target
   (`mergeable: UNKNOWN` on GitHub as of this check). PR #39 still has real,
   unmerged content — the centralized sign-in redirect
   (`redirectToSignIn`/`SignInRequiredError` in `src/lib/client-api-auth.ts`)
   and the route-auth-coverage guardrail test — confirmed **not** present on
   current `main` (`client-api-auth.ts` exists post-merge but is the older
   version without the redirect). Rebase PR #39 onto `main` and re-open
   against it. Owner: unassigned.

## Next

8. **Merge PR #35** (README truth sync) — after #39/#40 land, re-verify
   accuracy, then merge.
9. ~~100 synthetic AZ seed artists in Aura~~ — **DONE 2026-07-17**: Samson chose
   delete. Seed artists (float ids), their Tattoo/Instagram/State/Website nodes,
   null-placeId shops, and orphaned tags/cities removed. Live graph is now 100%
   real scraped data. Re-seeding (if ever needed): `scripts/import-to-neo4j.js`.

## Backlog

- **Artist enrichment sweep** — only ~1.5k of 8,949 real artists have style
  tags; enrich styles/portfolio/bio from each artist's `sourcePages`.
  Large fan-out job; good multi-agent/ultracode candidate.
- Ask GitHub Support to purge the orphaned pre-scrub commits (password
  history) if repo visibility ever changes.
- 99+ more cities can be queued in `~/tatt-scraper/data/queue.json` if the
  dataset should grow beyond this run.
- **Full-codebase review, medium/low-severity findings** (2026-07-17, all
  independently verified against actual code, not just flagged):
  - `src/app/api/v1/designs/share/[shareId]/route.ts` uses the pre-Next.js-15
    synchronous `params` type while the app is on Next.js 16 (where `params`
    is a `Promise`) — every sibling dynamic route awaits it correctly, this
    one doesn't. `params.shareId` reads off a Promise and is `undefined`, so
    every share-link GET 404s and `npx tsc --noEmit` fails on it. This is the
    single highest-value quick fix in this list — a one-line type change
    fixes a broken user-facing feature and a CI type error.
  - `src/app/api/health/route.ts` leaks `hasReplicateToken`/`hasVertexConfig`/
    `hasGcsConfig`/`hasNeo4jConfig` booleans to any unauthenticated caller —
    minor recon info; stop returning them publicly, or gate the route.
  - `scripts/generate-neo4j-cypher.js` unconditionally emits
    `MATCH (n) DETACH DELETE n;` in both generated `.cypher` files, with a
    comment claiming it's optional when it isn't — same destructive-by-
    default class of bug already fixed once in `import-to-neo4j.js`. Nothing
    currently auto-runs the generated file, but make the DELETE actually
    conditional before someone runs it via `cypher-shell` against the live
    10K-artist Aura instance.
  - `scripts/data_acquisition/parallel_crawler.js` — no dedupe against
    already-billed Places `place_id`s in `_getPlaceDetails` (billed
    endpoint), and no backoff on `OVER_QUERY_LIMIT` (just moves to the next
    city at the same fixed delay); also marks a city "completed" even when
    its Places pagination broke early on an API error, so partial data gets
    baked in permanently and never retried. The scrape for the current
    dataset is already done (item 4), so no urgency, but will bite the next
    scrape run if the dataset grows further.
  - Real 4–5x duplication of the same RRF/weighted-match-scoring formula
    across `neo4jService.ts`'s Cypher, `hybridMatchService.ts`,
    `matchService.js`, and `demoMatchService.js`, each with slightly
    different weights/null-handling constants for `hourlyRate` (already
    drifted). Same shape of duplication across the three Neo4j
    import/insert/generate scripts. Consolidation candidate, not urgent.
  - Several icon-only buttons with no `aria-label`
    (`DesignLibrary.jsx` favorite-toggle + close, `BookingModal.tsx` close,
    a thumbnail `<img>` in `VisualizeContent.jsx` with no `alt`) — the
    codebase already has the correct pattern elsewhere
    (`punk/OutputCard.tsx`), just wasn't applied consistently. Low severity,
    easy batch fix.
  - `src/components/VisualizeContent.jsx` has a real dead-code bug: a
    `setSavedPlacements(...)` call sits *after* the `return () =>
    clearInterval(interval)` inside the same `useEffect`, so it can never
    execute — saved placements never restore from localStorage on that path.
    Also has an uncancelled `setTimeout` + async chain in `startCamera()`
    that can call `setState` after unmount (no `isMounted`/`AbortController`
    guard).
  - `DesignGeneratorRefactored.jsx` (269 lines) and
    `DesignGeneratorWithCouncil.jsx` (748 lines) both appear to be dead code
    — no import sites found anywhere in `src/`; the live flow is
    `GenerateContent.jsx`. ~1,000 lines worth confirming-and-deleting if true.

## Working agreements (multi-agent hygiene)

- `git fetch && git reset --hard origin/<branch>` before ANY push — history
  was rewritten 2026-07-17 to remove committed credentials.
- Never commit credentials; `.env`/`.env.local` are gitignored on purpose.
- Dataset changes go through `data/` PRs with counts in the commit message.
- The live Aura instance holds real + seed data side by side; never run an
  importer with a wipe flag against it casually.
