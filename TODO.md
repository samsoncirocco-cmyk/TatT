# TatT — Shared TODO

Single source of truth for what needs doing next, across all sessions and
agents. **Every agent: read this before starting work, update it when you
finish or discover work.** Keep entries short; link PRs/issues; date your
changes. Newest state wins — resolve edit conflicts by merging both lists.

_Last updated: 2026-07-24 (booking loop Phase 1 landed on main via #108's
branch — 01d962a + Bugbot fixes 772853e; duplicate PR #113 closed as
superseded, its two deltas ported via merged #117; repo hygiene sweep started —
see "Repo hygiene" section below)_

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
J4. ~~**Design→artist signal**~~ — **DONE 2026-07-20 (audited)**: Forge
    (/generate/stencil) links to /matches?styles=…&from=design; MatchesClient
    parses via src/lib/design-style-signal (validated against
    CANONICAL_STYLES), feeds styles into the live match query, shows the
    "Matched to your design" chip; manual style pick overrides the signal.
    Verified in code + 292→307 test suite on main c039219.
J5. ~~**Real booking path**~~ — **DONE 2026-07-20 (audited)**: match cards
    carry bookHref=/book?artistId=<real graph id>; punk /book flow posts to
    /api/v1/book (Firebase-auth-only via verifyApiAuth, rate-limited,
    Firestore capture with owner uid) then /api/checkout for the Stripe
    deposit. Honest degradation verified: no STRIPE_SECRET_KEY → 503
    "Payments are not configured" (or demo-labeled success only when
    NEXT_PUBLIC_DEMO_MODE=true); booking request is saved either way and the
    UI says no deposit was charged. Old /book/[artistId] page is now a
    redirect (kept for old links/Stripe cancel_urls).
    **Samson ops (not code):** set STRIPE_SECRET_KEY + FIREBASE_* admin
    creds in tatt-app Vercel env; run `firebase deploy --only
    firestore:rules` for the new booking/availability rules.
J6. ~~**Minimal availability model**~~ — **DONE 2026-07-20 (audited)**:
    grep confirms zero Math.random() availability anywhere in src (remaining
    Math.random uses are ID generation, cosmetic tile colors, and one
    randomVariety tiebreaker in match scoring — none present fake
    availability). Model: artist_availability/{artistId} Firestore docs,
    ops-written only (no client writes per firestore.rules); missing doc or
    creds resolves to status "unknown" rendered as "availability on
    request". No fake green dots.
J8. ~~**Auth gate**~~ — **DONE 2026-07-20 (audited, live in prod)**:
    /generate (Forge), /matches, /designs, /book wrapped in ProtectedRoute
    layouts → redirect to /login?redirect=<dest> for anonymous, styled hold
    state while Firebase resolves. Homepage and /artists stay public.
    Verified anonymous-curl on localhost prod build AND tatt-app.vercel.app.
    This also settles the J2/J3 regression below: sign-in is now an explicit
    journey prerequisite, so signed-out users never see the offline notice —
    they get the login gate. The dead FRONTEND_AUTH_TOKEN env pair in Vercel
    can be deleted (Samson).
J7. ~~**One deploy target, auto-deploy, live URL**~~ — **DONE (verified
    2026-07-21)**: tatt-app is the only Vercel project linked to this repo
    (generous-success no longer exists; manama-next has no git link).
    Custom domains all wired + Firebase-authorized: tatt-t.com,
    image2ink.com, tatttester.com. Canonical-domain pick is #81 (Samson).

J9. **Close the booking loop** — roadmap merged 2026-07-22 (PR #106):
    `docs/audits/2026-07-22-booking-gap-analysis.md` (supersedes the
    `docs/booking-gap-analysis` branch, which can be deleted). Decision
    recorded: **Firestore-first** system-of-record for bookings; Supabase
    M003 deferred to a Phase 3 analytics mirror. Same-day Stripe Connect
    merge (1e4dd5a, PRs #92/#99) already shipped held deposits + claim flow
    + a functional webhook — see the doc's Addendum for what that closed.
    ~~**Remaining Phase 1 blockers (doc §5, tasks 1.1–1.9)**~~ — **DONE,
    landed on main 2026-07-24** (#108's branch pushed direct as 01d962a +
    Bugbot fixes 772853e; duplicate PR #113 closed as superseded — two
    parallel sessions built the same J9 scope; #113's two better deltas,
    the bookings ip-echo privacy fix and the DEPOSIT_BY_SIZE dedupe,
    landed via merged #117):
    1.1 `bookingId` threaded through `BookClient` → `/api/checkout` →
    Stripe metadata + `success_url`; 1.2 booking state machine
    (`BookingStatus`, `canTransition`, `appendStatus`, `statusHistory`) in
    `src/lib/booking.ts` + unit tests; 1.3 webhook idempotently transitions
    `booking_requests` `pending → deposit_paid` (event-id + status guards,
    Firestore txn) persisting session/PI/amount/paidAt; 1.4 `/api/v1/book`
    validates `artistId` against the graph (fail-closed on "not found",
    fail-open on Neo4j outage); 1.5 owner-scoped `GET /api/v1/bookings` +
    `/[id]` read API (registered in api-route-security); 1.6 `/book/success`
    + `/bookings` now read server truth; 1.7 deleted dead
    `useBookingStore`/`BookingModal`; 1.8 `notify.ts` + `emailQueueService`
    real transactional email (Resend/webhook, honest degrade); 1.9 webhook
    reconciliation integration test. **Still open:** (a) real email provider
    env (`RESEND_API_KEY`/`EMAIL_FROM`/`OPS_NOTIFY_EMAIL`) not yet set in
    prod — 1.8's code ships but delivery is env-gated, so artists still
    aren't actually told a paid booking exists until Samson sets these;
    (b) artist confirm/decline dashboard (Phase 2); (c) scheduling: merge
    PR #112 (accepted as-is 2026-07-22), then wire the slot picker into the
    booking wizard — integration point is `BookClient.tsx` step 1 (the
    spec's original "replace Math.random()" target no longer exists);
    ~~DEPOSIT_BY_SIZE dedupe~~ **DONE via #117**.

(Prior items now secondary: PR #40 feedback folds into J2/J3 scope; security
reconciliation continues in parallel. Branch protection still blocked on
GitHub plan.)

**Enrichment (2026-07-20):** deterministic pipeline rebuilt at
`~/tatt-scraper/execution/enrich_artists.py`; pilot produced 3 deterministic
shards (~212 artists enriched, styles scrubbed where unverifiable — see
`~/tatt-scraper/data/enrichment/pilot-run.log`). Pilot gate NOT yet passed;
full run NOT launched. Resume after gate review.

## Next

- ~~**Synthetic artists.json still imported by old-theme surfaces**~~ —
  **RESOLVED 2026-07-21 (PR #54 merged)**: /smart-match and /swipe ported to
  the live graph + punk design system; the four old-theme source files
  deleted. Remaining artists.json imports are seed tooling in scripts/.
- **Samson-only ops checklist** (executed 2026-07-21; one item left):
  1. **DEFERRED TO PRE-LAUNCH (Samson, 2026-07-24):** live Stripe
     end-to-end verification. Not urgent — TatT is not taking customers
     yet; do the real-booking + live-dashboard check before the first
     customer, then strike this. Partially verified from a session
     (2026-07-24): /api/checkout is live in prod at tatt-app.vercel.app
     (auth-gated, not 503), and the Stripe sandbox shows zero traffic, so
     prod is not misconfigured onto test keys. Agents: do not re-flag
     this as a blocking ops item.
  2. ~~FIREBASE_* admin credentials~~ — **already set** (FIREBASE_PRIVATE_KEY,
     FIREBASE_CLIENT_EMAIL, FIREBASE_PROJECT_ID in production+preview;
     verified via Vercel API 2026-07-21). A real-booking end-to-end check in
     prod is still worth doing once Stripe is in.
  3. ~~Firestore rules deploy~~ — **DONE 2026-07-21**: rules compiled +
     released to tatt-pro via firebase-tools; minimal firebase.json added to
     the repo so this works from a clean checkout.
  4. ~~Delete dead FRONTEND_AUTH_TOKEN pair~~ — **DONE 2026-07-21** (both
     vars deleted from tatt-app via Vercel API).
  5. ~~Disconnect manama-next + generous-success~~ — **already done**:
     generous-success is deleted; manama-next has no git link (verified via
     Vercel API 2026-07-21). tatt-app is the sole deploy target.
- **Share API store is ephemeral in-memory** (carried from booking branch
  report) — share links die on redeploy; needs a durable store if sharing
  matters.

8. ~~Merge PR #35 (README truth sync)~~ — **superseded**: README truth sync
   landed on main via PR #84 (2026-07-20); #35 is closed.
9. ~~100 synthetic AZ seed artists in Aura~~ — **DONE 2026-07-17**: Samson chose
   delete. Seed artists (float ids), their Tattoo/Instagram/State/Website nodes,
   null-placeId shops, and orphaned tags/cities removed. Live graph is now 100%
   real scraped data. Re-seeding (if ever needed): `scripts/import-to-neo4j.js`.

## Repo hygiene — branch & PR close-out (2026-07-24)

Survey of all 60 remote branches (ancestry, `git cherry` patch-equivalence,
PR state by head). Remote sessions can only push their own branch — branch
deletion and tag pushes 403 at the git proxy — so the delete/tag commands
below are **Samson-run-locally** items.

**Open-PR queue (merge order recommendation):** ~~#118 design-bot~~
**MERGED 2026-07-24** · #125 placement preview (reuses `feat/design-bot`
with new work post-#118 — so that branch is **NOT** deletable, despite
#118 having merged; see the delete-list caveat below) · #131 ADR-0023
forge voice/routing (draft, docs-only) · #112 scheduling engine (already
accepted, additive — merge) · #109 debounce + #103 CTA-signup (small,
merge) · #110 auto-save/delete, #105 weighted rating, #104 thin-match
broaden (medium — quick review each). #104+#105 are now batched as **#135**
and #103+#110+#109 as **#136** (originals left open as fallback until the
batches merge). Crew PRs base on pre-#108 main; if any turn CONFLICTING as
the queue merges, update the branch.

**ROOT CAUSE (2026-07-25): "Automatically delete head branches" is OFF for
this repo.** Every merged PR leaves its branch behind forever — that, not
any one backlog, is why the count climbs. It went 70 → 83 in a single
evening (#132–#146). **Turn the setting on** (Settings → General → Pull
Requests) and this stops recurring; the list below becomes a one-time
cleanup instead of a standing chore. An earlier version of this note
claimed the #120–#130 branches self-cleaned on merge — that was wrong,
they are all still present.

**Branch-deletion rule:** "its PR merged" is not sufficient grounds to
delete — check for a *newer* open PR on the same head first.
`feat/design-bot` was on the delete list on those grounds and would have
taken #125's unmerged commit (1019ca9) with it.

**Delete now — 35 branches verified 100% landed on main** (recovery:
`git push origin <sha>:refs/heads/<name>`):

```
git push origin --delete \
  feat/wire-real-matching feat/portfolio-image-hosting \
  stripe-integration stripe-launch-deposits \
  docs/railway-resolved docs/todolist-followups docs/context-glossary-dedupe \
  brand/image2ink-two-door-copy worktree-arch-grill-docs docs/testing-rule-tiered \
  fix/backlog-cleanup-sweep night/booking-response-hygiene \
  claude/hopeful-wilson-7107ac port-smartmatch-swipe-to-graph \
  feat/close-booking-loop-phase1 codex/tatt-security-hardening \
  feat/generation-module chore/stripe-verify-deferred feat/design-nav-link \
  feat/fallback-logging feat/flux-models feat/forge-flux-migration \
  feat/palette-aware-prompts feat/scene-first-conversation \
  fix/axis-padding-respects-resolution fix/character-subject-backfill \
  fix/confirm-client-error-semantics fix/flash-art-presentation-everywhere \
  fix/playback-character-and-dedupe fix/poll-window-300 fix/prod-generation \
  fix/proposal-beat-and-readiness-gate fix/render-route-budget \
  fix/throttle-window-math fix/vertex-image-persistence
```

Evidence — two verification methods, both re-run 2026-07-25:
- **Ancestor or patch-equivalent to `origin/main`** (`git cherry` shows every
  commit already upstream): the four early feat/stripe branches, the seven
  docs/brand/worktree one-liners, and all 18 of the `#120`–`#142` fix/feat
  branches added in this pass.
- **Squash-merged, so patch IDs differ** — verified by merged-PR head instead:
  night/booking-response-hygiene = #117 (f3cb135), claude/hopeful-wilson-7107ac
  = #111 (e9e3d33), port-smartmatch-swipe-to-graph = #54 (ac028fc),
  feat/close-booking-loop-phase1 = #108 closed with content on main as 01d962a
  (413a3c5), codex/tatt-security-hardening = #43 + 2 stale TODO-note commits
  (ab2342d), feat/generation-module = #51+#55 (5560978).

Cross-checked against the open-PR list: none of the 35 is the head of an open
PR. Heads deliberately excluded for that reason: `feat/design-bot` (#125),
`feat/scheduling-engine` (#112), the five crew branches (#103/#104/#105/#109/
#110), `fix/monochrome-subject-color-scrub` (#146),
`fix/presentation-flash-art` (#145), `chore/frontend-infra-pass` (#143).

**Legacy triage — 33 branches, all pre-dating the 2026-07-17 history rewrite**
(decision 2026-07-24: archive-tag everything, delete groups A+C, hold B):

- A (19, near-certainly landed pre-rewrite): design/punk-site-redesign,
  fix/rate-limit-always-429, feat/handoff-screens-2, fix/ci-test-suites,
  feat/import-scraper-pipeline, feat/user-persistence,
  fix/firebase-admin-bootstrap, fix/council-vertex-project-id,
  fix/startup-probe-and-ci-green, audit/engineering-guidelines-2026-07-14,
  fix/critical-spend-security, refactor/dead-code-config,
  fix/forge-toast-provider, docs/readme-truth-sync (superseded by #84),
  update-atticus-neo4j, chore/cherry-pick-audit-and-gitignore,
  worktree-roadmap-and-branch-triage, docs/roadmap-state-rescope,
  security-hardening-followups
- B (7, HOLD until scraper datasets confirmed safe in ~/tatt-scraper):
  feat/artist-scraper, feat/scrape-scheduler, perf/parallel-scrape,
  data/national-dataset, data/scrape-20k, feat/wire-national-dataset
  (807 commits — biggest unique-content risk), samson/port-artist-crawler
- C (7, ancient/abandoned): deploy-ready, demo-polish,
  samsoncirocco-cmyk/map-codebase, fix/frontend-audit-yc,
  samson/desktop-tatt-v1-gitignore-fix, codex/main-manama-integration,
  manama/next

```
# archive every legacy head as a tag (zero loss), then delete A + C:
for b in <A list> <B list> <C list>; do git tag "archive/$b" "origin/$b"; done
git push origin 'refs/tags/archive/*'
git push origin --delete <A list> <C list>
```

## Backlog

- **TECH DEBT — retire the CANONICAL_STYLES bridge (2026-07-23):** the match
  flow (`src/lib/design-style-signal`, smart-match pills, `/api/v1/match/
  semantic`) runs on its own pre-ontology style list; the design-bot phase-3
  work bridges ontology tag ids → CANONICAL_STYLES with an explicit mapping
  (no fuzzy matching, unmappable tags dropped and logged). This is exactly
  the two-vocabularies drift problem ADR-0010/0011 exist to prevent — the
  bridge is a stopgap. Fix: migrate the match flow (pills, semantic query,
  artist tags in Neo4j/Supabase) onto `data/style-ontology.json` as the
  single controlled vocabulary, then delete the mapping. A mapping unit test
  reads the live ontology so any newly approved tag that lacks a bridge
  entry fails loudly until then.

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
