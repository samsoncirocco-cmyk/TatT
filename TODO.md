# TatT — Shared TODO

Single source of truth for what needs doing next, across all sessions and
agents. **Every agent: read this before starting work, update it when you
finish or discover work.** Keep entries short; link PRs/issues; date your
changes. Newest state wins — resolve edit conflicts by merging both lists.

_Last updated: 2026-07-22 (booking gap analysis merged — PR #106; Stripe Connect
merge 1e4dd5a landed same day: held deposits, claim flow, functional webhook;
gap-analysis addendum reconciles the two)_

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
    **Remaining Phase 1 blockers (doc §5, tasks 1.1–1.9):** thread
    `bookingId` into checkout metadata; webhook transitions
    `booking_requests` to `deposit_paid` (state machine in
    `src/lib/booking.ts`); validate `artistId` against the graph; booking
    read API + reconcile `/bookings` and `/book/success` with server truth;
    make `notifyArtistOfBooking` (`src/lib/notify.ts`) actually deliver;
    delete dead `useBookingStore`/`BookingModal`. Also: `DEPOSIT_BY_SIZE`
    is now duplicated in `checkout/route.ts` (cents) and `lib/booking.ts`
    (dollars) — consolidate before it drifts.

(Prior items now secondary: PR #40 feedback folds into J2/J3 scope; security
reconciliation continues in parallel. Branch protection still blocked on
GitHub plan.)

**Enrichment (2026-07-20):** deterministic pipeline rebuilt at
`~/tatt-scraper/execution/enrich_artists.py`; pilot produced 3 deterministic
shards (~212 artists enriched, styles scrubbed where unverifiable — see
`~/tatt-scraper/data/enrichment/pilot-run.log`). Pilot gate NOT yet passed;
full run NOT launched. Resume after gate review.

## Next

- **Synthetic artists.json still imported by old-theme surfaces** (audit
  2026-07-20): /smart-match and /swipe routes lazy-load
  src/features/SmartMatch.jsx / SwipeMatch.jsx, and
  src/components/{SmartMatchContent,SwipeMatchContent,ArtistsContent,
  ArtistProfileContent}.jsx still import ../data/artists.json (100 fake
  artists). The journey path (/, /artists, /generate, /matches, /book,
  /designs) is clean — homepage uses featured-artists.json generated FROM
  Neo4j. Decide: retire /smart-match + /swipe (old theme, violates design
  rule) or port to graph. scripts/ importers referencing artists.json are
  seed tooling, fine.
- **Samson-only ops checklist** (executed 2026-07-21; one item left):
  1. **LIKELY DONE — verify (Samson):** Stripe Connect merge 1e4dd5a
     (2026-07-22) says "Webhook endpoint + env configured in prod (Vercel)",
     which implies STRIPE_SECRET_KEY (+ webhook secrets) are now set. Not
     independently verified from a session — confirm /api/checkout no longer
     503s in prod, then strike this.
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
