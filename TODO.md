# TatT — Shared TODO

Single source of truth for what needs doing next, across all sessions and
agents. **Every agent: read this before starting work, update it when you
finish or discover work.** Keep entries short; link PRs/issues; date your
changes. Newest state wins — resolve edit conflicts by merging both lists.

_Last updated: 2026-07-20 (journey session — prod matching turned ON at tatt-app.vercel.app; J7 mostly discovered-done)_

## Now (in priority order) — THE JOURNEY QUEUE

**North star (Samson, 2026-07-17): one real user journey — idea → design →
real matching artists → booked appointment. Work not on this path is frozen.**
**Cross-cutting rule: every user-facing change lands in the punk/StudioShell
design system (src/components/punk/, studio/). Never resurrect old-theme
(ducks-yellow) pages — port their logic, not their look. Aesthetic cohesion
is an acceptance criterion, not a nice-to-have.**

J1. ~~**Generation for real**~~ — **DONE 2026-07-20**: keys were already in
    tatt-app's Vercel prod env (Vertex + Replicate fallback). Budget cap now
    env-configurable (`BUDGET_MAX_SPEND_CENTS`, commit be63366); prod set to
    5000 = **$50/mo (Samson's number — the earlier $10 was for demo only)**.
    Demo mode confirmed off. End-to-end verified in the live UI: prompt →
    /api/v1/generate 200 → four real Vertex Imagen cuts rendered on
    /generate/stencil (PNGs carry C2PA TrainedAlgorithmicMedia metadata —
    provably not mocks). Vertex spend records at 4¢/image via budget-tracker.
J2+J3. ~~Real matching wired into live /matches~~ — **DONE 2026-07-17
    (PR #46)**: server-side Neo4j execution, vector half degrades soft
    (embeddings not yet populated), functional Style/City/Has-portfolio
    pills, real scores, honest offline states, punk aesthetic verified.
    ~~PROD TODO: set NEO4J_*, NEXT_PUBLIC_NEO4J_ENABLED, and the
    FRONTEND_AUTH_TOKEN pair in the deploy target's env (J7).~~ **DONE
    2026-07-20: all 8 vars set in tatt-app prod via Vercel CLI, rebuilt,
    verified in-browser — live matching is ON at tatt-app.vercel.app/matches
    (real graph artists, scores, no offline notice). VERCEL_TOKEN in
    /opt/org/.env (gitignored).**
    **REGRESSION (2026-07-20, caused by PR #48):** the security session
    removed the shared FRONTEND_AUTH_TOKEN path from verifyApiAuth (correctly
    — the token was extractable from the public bundle). Auth is now
    Firebase-only, so **signed-out visitors to /matches get the offline
    notice** — live matching only works after sign-in. The env-var pair in
    Vercel is now dead weight (safe to delete). Proposed fix, needs a
    decision: make /api/v1/match/semantic public + rate-limited (it serves
    public artist listings), or accept sign-in as a journey prerequisite.
J4. **Design→artist signal** — pass the chosen design's styles/tags into the
    match query so results reflect the design.
J5. **Real booking path** — artist profile → booking WITH artistId → existing
    /api/checkout (Stripe) + /api/v1/book (Firestore), replacing the
    localStorage demo. Port /book/[artistId] logic into the punk /book flow.
J6. **Minimal availability model** — replace Math.random() availability;
    Firestore rules + artist notification.
J7. **One deploy target, auto-deploy, live URL** — MOSTLY DONE (discovered
    2026-07-20): Vercel project **tatt-app** auto-deploys main and
    https://tatt-app.vercel.app serves the current tip with live matching.
    Remaining: THREE Vercel projects deploy this repo (tatt-app, manama-next,
    generous-success) — pick tatt-app as canonical and disconnect the other
    two (Samson call); optional custom domain.

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

- **Forge polish (from 2026-07-20 UX review):** (1) raise the tape-label
  font-size floor to ~10px (7-9px "SELECTED"/"LINES" labels fail WCAG
  readability; keep letter-spacing/punk look); (2) add an expand/zoom
  affordance on generated cut cards — click already means "select", so
  there is no way to view a design large. Fold into any Forge-touching PR.

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
