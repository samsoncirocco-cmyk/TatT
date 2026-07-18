# TatT — Shared TODO

Single source of truth for what needs doing next, across all sessions and
agents. **Every agent: read this before starting work, update it when you
finish or discover work.** Keep entries short; link PRs/issues; date your
changes. Newest state wins — resolve edit conflicts by merging both lists.

_Last updated: 2026-07-17 (roadmap-and-branch-triage session, post backlog-cleanup pass — PR #45, PR #39 closed as superseded by #44)_

## Now (in priority order) — THE JOURNEY QUEUE

**North star (Samson, 2026-07-17): one real user journey — idea → design →
real matching artists → booked appointment. Work not on this path is frozen.**
**Cross-cutting rule: every user-facing change lands in the punk/StudioShell
design system (src/components/punk/, studio/). Never resurrect old-theme
(ducks-yellow) pages — port their logic, not their look. Aesthetic cohesion
is an acceptance criterion, not a nice-to-have.**

J1. **Generation for real** — provision Vertex creds or REPLICATE_API_TOKEN,
    configure budget-tracker, NEXT_PUBLIC_DEMO_MODE=off. (Needs Samson for keys.)
J2. **Matching backend against live Neo4j** — reconcile
    match-pulse Cypher with the live graph (dual-schema), set
    NEXT_PUBLIC_NEO4J_ENABLED=true, graceful degradation when vector
    embeddings are absent. Owner: house-brain session (in progress).
J3. **Wire live /matches to /api/v1/match/semantic** — replace hardcoded
    top-12 + dead filter pills with real query; real scores, punk aesthetic
    intact. Owner: house-brain session (in progress).
J4. **Design→artist signal** — pass the chosen design's styles/tags into the
    match query so results reflect the design.
J5. **Real booking path** — artist profile → booking WITH artistId → existing
    /api/checkout (Stripe) + /api/v1/book (Firestore), replacing the
    localStorage demo. Port /book/[artistId] logic into the punk /book flow.
J6. **Minimal availability model** — replace Math.random() availability;
    Firestore rules + artist notification.
J7. **One deploy target, auto-deploy, live URL** — decide Vercel vs Cloud Run,
    un-gate the deploy job, verify reachable URL.

(Prior items now secondary: PR #40 feedback folds into J2/J3 scope; security
reconciliation continues in parallel; enrichment sweep PARKED after two
pilot-gate failures — resume only after J3 ships, with deterministic
fetch/validation. Branch protection still blocked on GitHub plan.)

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
