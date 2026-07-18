# TatT — Shared TODO

Single source of truth for what needs doing next, across all sessions and
agents. **Every agent: read this before starting work, update it when you
finish or discover work.** Keep entries short; link PRs/issues; date your
changes. Newest state wins — resolve edit conflicts by merging both lists.

_Last updated: 2026-07-17 (roadmap-and-branch-triage session, post backlog-cleanup pass — PR #45, PR #39 closed as superseded by #44)_

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
7. ~~**`security-hardening-followups` (PR #39) needs re-targeting to
   `main`**~~ — **SUPERSEDED, closed 2026-07-17**: attempted the rebase;
   found PR #44 (merged, `a1c0d11`) independently solved the same three
   problems with a more complete implementation first — a full 27-route
   `api-route-security.ts` classification test (superset of #39's 26-route
   allowlist), a real `SignInPromptGate`/`AuthModal` on 401 (stronger than
   #39's bare `redirectToSignIn()` navigation), and a `CLOUD_TASKS_ENABLED`
   kill switch. Confirmed via scratch merge: #39 conflicts with `main`
   exactly on `client-api-auth.ts`/`fetchWithAbort.ts`, both files where #44
   already implements the same behavior better. Closed #39 without merging
   (see PR comment for the full comparison). Nothing lost — #44 covers it.

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
- ~~**Full-codebase review, medium/low-severity findings**~~ — **FIXED
  2026-07-17, PR #45** (all 6 items below, tests green: 226 passed unchanged,
  build succeeds): broken `share/[shareId]` route (Next.js 16 `params`
  Promise fix — was 404ing on every share-link view + failing
  `tsc --noEmit`); `/api/health` info leak removed
  (`hasReplicateToken`/etc.); `generate-neo4j-cypher.js`'s
  `MATCH (n) DETACH DELETE n;` made opt-in via `--wipe` (matches
  `import-to-neo4j.js`'s existing fix, smoke-tested both modes); `aria-label`
  added to `DesignLibrary.jsx`/`BookingModal.tsx` icon buttons + `alt` text
  on a `VisualizeContent.jsx` thumbnail; the real dead-code bug in
  `VisualizeContent.jsx` (`setSavedPlacements` after a `useEffect`'s cleanup
  `return`, so it never ran — saved placements now actually restore) and the
  unmount-leak in `startCamera()` (added `isMountedRef` guards on the
  setTimeout/depth-calibration async chain); deleted 1,445 lines of
  confirmed-dead code (`DesignGenerator.jsx`, `DesignGeneratorRefactored.jsx`,
  `DesignGeneratorWithCouncil.jsx` + test file — zero import sites anywhere,
  live flow is `src/features/Generate.jsx` via `next/dynamic`, and the
  deleted test file's own comment already said it targeted "a legacy React
  Router UI that isn't part of the current Next.js app flow"). PR:
  https://github.com/samsoncirocco-cmyk/TatT/pull/45 (not yet merged).
  - **Not done in this pass, still open**: the scraper cost/backoff/dedupe
    gaps in `parallel_crawler.js` (scrape for the current dataset is
    already finished, so no urgency — will matter if the dataset grows
    again) and the 4–5x duplication of the RRF/weighted-match-scoring
    formula across `neo4jService.ts`, `hybridMatchService.ts`,
    `matchService.js`, `demoMatchService.js` (consolidation candidate, not
    urgent, already-drifted `hourlyRate` null-handling constants across the
    copies).

## Working agreements (multi-agent hygiene)

- `git fetch && git reset --hard origin/<branch>` before ANY push — history
  was rewritten 2026-07-17 to remove committed credentials.
- Never commit credentials; `.env`/`.env.local` are gitignored on purpose.
- Dataset changes go through `data/` PRs with counts in the commit message.
- The live Aura instance holds real + seed data side by side; never run an
  importer with a wipe flag against it casually.
