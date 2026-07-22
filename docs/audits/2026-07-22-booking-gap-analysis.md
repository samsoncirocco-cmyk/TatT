# TatT Booking Architecture Gap Analysis — v2 (Reconciled)

> **Date:** 2026-07-22
> **Version:** 2 — supersedes commit `a124809` on branch `docs/booking-gap-analysis` (the "Gon" v1 analysis). v1's strategic additions are folded in; its stale evidence is corrected in §1.
> **Scope:** Gap analysis between the current codebase (`main` @ `4269114`) and high-trust scheduling platforms — Boulevard (deposit/session logic), Fresha (solo onboarding + marketplace feed), Airbnb (trust signals + visual grid), Cal.com (scheduling primitives + webhooks).
> **Method:** Three parallel full-source read passes (data layer, API/services, frontend) against `main` @ `4269114`, plus a diff-review of v1's claims against current code. Every file path cited below was verified to exist at that commit.

---

## Executive Summary

TatT today is a **directory with a payment form**, not a booking platform. The good news: the honest-MVP groundwork shipped in PRs #88–#100 is real and reusable — a validated booking-capture API, a signature-verified Stripe webhook skeleton, deployed Firestore rules, live graph-backed artist pages, and a deliberately honest availability model. The bad news: **five loops are open**, and until they close, every deposit collected is a liability rather than a booking:

1. **Payment reconciliation** — the Stripe webhook verifies signatures and then only `console.log`s. Nothing ever marks a deposit paid, and the checkout session doesn't carry the `bookingId`, so even a fixed webhook would have nothing to reconcile against.
2. **Booking lifecycle** — every booking is written `status: 'pending'` and stays there forever. There is no state machine, no artist confirm/decline, no cancellation path.
3. **Real availability** — availability is a single coarse status per artist (`unknown|open|waitlist|closed`). There are no schedules, no slots, no double-booking prevention. Clients *request* days; nothing is ever *reserved*.
4. **Artist identity & auth** — artists are scraped graph records, not accounts. There are no roles, no claim flow, no operator surface. Artist IDs are inconsistent across four stores with zero referential integrity.
5. **Notification** — `emailQueueService.js` is a `console.log` mock. The UI promises "the artist will contact you within 24 hours," but **no artist is ever told a booking exists**. *(Recommended as a Phase 1 blocker; final phasing is an open product decision — see §5.)*

The remediation plan (§5) closes loop 1–2 in Phase 1 with small, surgical changes to files that already exist, defers the slot engine and operator surfaces to Phase 2, and pushes marketplace/trust features to Phase 3. The booking system-of-record is **decided: Firestore-first** (Samson, 2026-07-22 — §2.4), with Supabase M003 retained as a Phase 3 analytics mirror.

---

## 1. Corrections to v1 (Evidence Reconciliation)

v1's strategy holds up; its evidence layer audited a pre-rebuild snapshot. Anyone executing from v1's task list would modify files that are now redirects or dead code. Corrections, each verified against `main` @ `4269114`:

| # | v1 claim ("High Confidence") | Current reality | Evidence |
|---|---|---|---|
| 1 | Two disconnected booking paths: `BookingModal.tsx` vs `book/[artistId]/page.tsx` | **Stale.** `BookingModal.tsx` is dead code (imported nowhere); `book/[artistId]` is a redirect into the unified `/book` wizard. `BookClient.tsx` posts `/api/v1/book` then `/api/checkout` in sequence. **The disconnection survives one level down** — no `bookingId` is threaded into checkout, so the booking record and the Stripe session are unlinkable (§3.2). | `src/app/book/[artistId]/page.tsx` (redirect), `src/app/book/BookClient.tsx` `submit()` |
| 2 | Fake availability — `generateAvailability()` uses `Math.random()` | **Stale.** Removed; only a comment memorializing it remains. Live model is an honest per-artist status doc in Firestore, defaulting to "Availability on request". | `src/lib/availability.ts`, `src/lib/booking.ts` (`AvailabilityStatus`), `firestore.rules` `artist_availability` |
| 3 | Artist profiles read static JSON (`src/lib/artists.ts`), bypassing Neo4j | **Stale.** That file no longer exists. `/artists` and `/artists/[slug]` are `force-dynamic` server components querying the live graph. Static JSON survives only as `src/data/featured-artists.json` on the home page. | `src/lib/artists-graph.ts`, `src/app/artists/page.tsx`, `src/app/artists/[slug]/page.tsx` |
| 4 | "No migration file exists yet" for bookings | **Wrong.** `M003_bookings_table.sql` exists (alongside M001/M002/M004) — designed but unwired, and its column set conflicts with v1's proposed schema (different status enum, slot columns). | `docs/architecture/migrations/M003_bookings_table.sql` |
| 5 | No Firestore rules exist for availability/bookings | **Stale.** Deployed rules cover `booking_requests` (server-write-only, owner-read) and `artist_availability` (signed-in read, no client writes). | `firestore.rules` lines 26–40 |
| 6 | No `/dashboard` route exists | **Technically stale** — `/dashboard` exists but redirects to `/designs`. The conclusion (no operator surface) stands. | `src/app/dashboard/page.tsx` |
| 7 | `useBookingStore` is the live booking flow state | **Stale.** It is dead — referenced only by its own test. The live flow uses local `useState` in `BookClient.tsx` plus `tattStorage.useBookings` (localStorage). v1 tasks 1.11–1.12 would have wired an availability store into a store nothing renders. | `src/store/useBookingStore.ts`, `src/lib/tattStorage.ts` |
| 8 | Neo4j `Artist` properties: `id, name, has_multiple_locations, profile_url, is_curated, …` | **Conflated.** `has_multiple_locations`/`profile_url`/`is_curated` are Supabase `tattoo_artists` columns, not graph properties. The actual node properties are in §2.1. | `scripts/import-to-neo4j.js`, `scripts/setup-supabase-tattoo-artists.js` |

**v1 findings that remain fully confirmed:** webhook no-op, no state machine, hardcoded deposits, no artist role/claims, no slot engine, Supabase live-instance uncertainty. **v1 additions adopted into this plan:** SessionType (Boulevard), slot-hold TTL, explicit lifecycle states, Cal.com recurring-schedule model, trust signals mirrored onto graph nodes.

---

## 2. Database & Schema Gaps

### 2.1 Current Neo4j schema (verified)

Authoritative source: `scripts/import-to-neo4j.js`; query layer: `src/features/match-pulse/services/neo4jService.ts`; driver: `src/lib/neo4j.ts`; read-only proxy: `src/app/api/neo4j/query/route.ts`.

```
(State)-[:HAS_CITY]->(City)-[:HAS_SHOP]->(Shop)-[:HAS_ARTIST]->(Artist)
(Shop)-[:FEATURES_STYLE]->(Style)      (Shop)-[:HAS_WEBSITE]->(Website)
(Artist)-[:SPECIALIZES_IN]->(Style)    (Artist)-[:HAS_INSTAGRAM]->(Instagram)
(Artist)-[:CREATED]->(Tattoo)-[:IN_STYLE]->(Style)
(Tattoo)-[:TAGGED_WITH]->(Tag)         (Artist)-[:TAGGED_WITH]->(Tag)
(Instagram)-[:FEATURES]->(Tattoo)
(Artist)-[:APPRENTICED_UNDER {start_year, end_year}]->(Artist)
(Artist)-[:INFLUENCED_BY {influence_type, strength}]->(Artist)
```

`Artist` properties: `id`, `name`, `shopName`, `city`, `state`, `lat`, `lng`, `location` (point, with POINT INDEX), `instagram`, `hourlyRate`, `rating`, `reviewCount`, `bio`, `yearsExperience`, `bookingAvailable`, `embedding_id`, `mentor_id`, `portfolioImages[]` (written by `scripts/host-artist-images.mjs`). Scraped artists (the national dataset) carry honest nulls for `hourlyRate`/`yearsExperience`/`bookingAvailable`, and `rating`/`reviewCount` are **shop-level Google values** (tagged `shop-rating`) — not per-artist reviews.

### 2.2 What the graph is missing for a booking platform

| Missing | Why it matters (platform pattern) |
|---|---|
| `(:User)` nodes + `(:User)-[:BOOKED {bookingId, bookedAt, sessionDate}]->(:Artist)` | Airbnb-style "clients who booked X also booked Y" and repeat-client ranking need booking edges in the graph, even if the booking *record* lives elsewhere. |
| `(:User)-[:MANAGES]->(:Artist)` | Fresha solo self-service: the claim flow's durable artifact. An artist account is a `User` who manages an `Artist` node. |
| Trust-signal properties on `Artist`: `is_verified`, `claimed_at`, `completed_bookings`, `response_time_hours` | Airbnb trust signals must be *rankable* — putting them on the node makes them available to the same Cypher that powers matching. v1 put `verified` only in Supabase, where match queries can't see it. |
| Per-artist reviews (`(:Review)-[:ABOUT]->(:Artist)` or SQL table, Phase 3) | Current `rating` is a shop-level Google value; a high-trust marketplace needs first-party post-booking reviews. |
| Deposit policy / session catalog | Not graph data — belongs in the booking store (§2.4) — but the graph needs nothing beyond a `bookable: true` flag once an artist completes onboarding. |

**Deliberately NOT in the graph:** availability slots, holds, payment records. Slot writes are high-frequency and transactional; Neo4j is the wrong tool and the existing architecture doc (`docs/architecture/next-gen-ux.md` §5) already reached the same conclusion.

### 2.3 The canonical artist-ID problem (prerequisite to everything)

Artist identity is fragmented across four stores with zero referential integrity:

| Store | ID form | Linkage |
|---|---|---|
| Neo4j `Artist.id` | int (seed) or `artist_<ig_handle>` (scraped) | canonical candidate |
| JSON (`data/artists.json`, `data/national-artists-*.json`) | same as Neo4j | source of truth for imports |
| Supabase `portfolio_embeddings.artist_id` | bare UUID, **no FK** | unlinked |
| Supabase `tattoo_artists.id` | UUID | disjoint from all of the above |
| Firestore `booking_requests.artistId` | free-form string ≤80 chars | **unvalidated** — any string is accepted |

**Remediation:** declare Neo4j `Artist.id` the canonical artist ID platform-wide. `/api/v1/book` must validate `artistId` against the graph before persisting (cheap `MATCH (a:Artist {id: $id}) RETURN a.id LIMIT 1`). Supabase embedding rows get a backfill mapping. New booking-domain records always store the canonical ID.

### 2.4 Booking system-of-record: **decided — Firestore-first**

Two designs were evaluated; the choice gates every Phase 1 task. **Decision (Samson, 2026-07-22): Option A, Firestore-first.** Option B's analysis is retained below as the record of why it lost.

**Option A — Firestore-first (chosen).** Extend what is live: `booking_requests` becomes the booking record (gains lifecycle fields), new `artist_profiles/{artistId}` doc holds session types + deposit policy, new `artist_availability` structure holds recurring schedule + overrides + holds. Pros: rules already deployed, Admin SDK already bootstrapped (`src/lib/firebase-admin.ts`), zero new infrastructure, transactions + TTL patterns handle slot holds, real-time listeners come free for the artist booking inbox. Cons: weak ad-hoc analytics (mitigated by a Phase 3 export/mirror), Firestore query limits.

```
booking_requests/{bookingId}        // extended, not replaced
  + status: 'pending' | 'deposit_paid' | 'confirmed' | 'declined'
          | 'completed' | 'cancelled' | 'refunded' | 'expired'
  + statusHistory: [{status, at, by}]
  + depositAmount, stripeSessionId, stripePaymentIntent, paidAt
  + confirmedSlot: {date, start, end} | null

artist_profiles/{artistId}          // new — operator-owned config
  ownerUid, claimedAt, isVerified
  sessionTypes: [{id, name, durationMin, depositType: 'flat'|'percent'|'none', depositAmount}]
  bufferMin, policies: {cancellation, reschedule}

artist_availability/{artistId}      // upgraded from coarse status
  status (kept for back-compat)
  recurring: {mon: [{start,end}], ...}
  overrides/{date}: {closed | windows}
  holds/{holdId}: {slotStart, slotEnd, bookingId, expiresAt}   // TTL-expired
```

**Option B — Supabase relational (not chosen; v1's design, via existing `M003_bookings_table.sql`).** Pros: SQL analytics, RLS, joins against `designs`. Cons: the live Supabase project's status is **uncertain** — `docs/architecture/next-gen-ux.md` Appendix D records it as deleted (NXDOMAIN, 2026-03-08) and no live verification has occurred; Firebase Auth ≠ Supabase `auth.users`, so RLS-by-user requires a JWT bridge or service-role-only access; adds a third live datastore to the booking hot path before any booking works.

**Resolution:** Option A for Phases 1–2; keep M003 as the Phase 3 analytics mirror (nightly export of completed bookings into Supabase for SQL reporting), which captures Option B's benefit without putting an unverified datastore in the payment path. All Phase 1–2 tasks in §5 therefore target Firestore.

---

## 3. Backend & Routing Gaps

### 3.1 What exists and is reusable

- **Uniform auth:** every non-public route goes through `verifyApiAuth` (`src/lib/api-auth.ts` → `src/lib/auth-dal.ts`, Firebase ID token). No static-token path.
- **Booking capture:** `POST /api/v1/book` (`src/app/api/v1/book/route.ts`) — validated payload (`validateBookingRequest` in `src/lib/booking.ts`, unit-tested), IP rate limit, `undefined`-stripping (the #100 fix), Admin-SDK write to `booking_requests`, honest JSONL fallback.
- **Deposit checkout:** `POST /api/checkout` (`src/app/api/checkout/route.ts`) — SDK-less Stripe Checkout session, size-tiered deposits, honest demo-mode degradation.
- **Webhook skeleton:** `POST /api/webhooks/stripe` (`src/app/api/webhooks/stripe/route.ts`) — manual HMAC verify with `timingSafeEqual`, fail-closed on missing secret.
- **Async worker infra:** Cloud Tasks with fail-closed OIDC (`src/lib/cloud-tasks-auth.ts`) — the right substrate for future notification fan-out and hold expiry.
- **Discovery:** hybrid vector+graph matching (`src/features/match-pulse/services/hybridMatchService.ts`) with graceful degradation and an honesty gate (`graphSource: 'live'|'mock'`).

### 3.2 Gap: the payment loop never closes (Boulevard — deposit/session logic)

Boulevard's core mechanic is simple: *a session is not booked until the deposit clears, and the deposit clearing **is** the state transition.* TatT has both halves but no wire between them:

1. `BookClient.submit()` receives `bookingId` from `/api/v1/book`, then calls `/api/checkout` **without it**. The Stripe session metadata carries name/size/date strings but no key back to the booking record.
2. The webhook receives `checkout.session.completed`, verifies it, logs it, and returns. No document is updated; no one is notified; the client's local `paymentStatus` never reconciles with anything.

**Fix (Phase 1, surgical):** add `bookingId` to `CheckoutPayload` and `metadata` (`src/lib/booking.ts`, `BookClient.tsx`, `checkout/route.ts`); make the webhook load `booking_requests/{metadata.bookingId}`, transition `pending → deposit_paid`, persist `stripeSessionId`/`paymentIntent`/`amount`/`paidAt`, idempotently (store processed event IDs — Stripe retries). This is the single highest-leverage change in the codebase.

### 3.3 Gap: no booking state machine

`status` is written once as `'pending'` and never touched. Required lifecycle (store-agnostic):

```
pending ──deposit──▶ deposit_paid ──artist confirms──▶ confirmed ──▶ completed
   │                      │                                │
   ├──▶ expired           ├──▶ declined ──▶ refunded       ├──▶ cancelled ──▶ refunded
   └──▶ cancelled         └──▶ cancelled ─┘                └──(no-show policy, Phase 3)
```

Implement as a pure transition table in `src/lib/booking.ts` (`canTransition(from, to, actor)`) so the same rules guard the webhook, the artist inbox API, and the client cancel API. Every transition appends to `statusHistory`.

### 3.4 Gap: no scheduling primitives (Cal.com)

Cal.com's model decomposes cleanly and maps directly onto what TatT needs — none of it exists yet:

| Cal.com primitive | TatT implementation (Phase 2) |
|---|---|
| Event type (duration, price) | `sessionTypes` on `artist_profiles` (also Boulevard's per-service deposit rule) |
| Recurring weekly schedule | `artist_availability.recurring` |
| Date overrides | `artist_availability/overrides/{date}` |
| Buffer time | `bufferMin` on profile, applied at slot expansion |
| Slot computation | new `src/services/schedulingService.ts`: recurring → expand to concrete slots for range → subtract overrides → subtract confirmed bookings + active holds → apply buffer |
| Booking hold | `holds/{holdId}` with `expiresAt` (5-min TTL) written transactionally at checkout start; released by webhook (paid) or expiry (Cloud Task / TTL policy). Prevents the two-clients-one-slot race. |
| Webhooks out (`BOOKING_CREATED`, `BOOKING_CANCELLED`…) | Phase 3: outbound event fan-out from the transition table, HMAC-signed, per-artist endpoints |

Until Phase 2 ships, Phase 1 keeps the honest request-days model — it is correct for a consultation-first tattoo workflow (Boulevard note: tattoo sessions are *quoted after consult*, so "request + deposit + artist confirms" is a legitimate v1 — what's missing is the confirm step, not fake slots).

### 3.5 Gap: no artist identity, role, or self-service API (Fresha)

- No `role`/custom claims anywhere; every authenticated user is a client.
- No claim flow: scraped `Artist` nodes have no owner. Fresha's onboarding funnel (find your profile → verify → configure services/deposits → set schedule → go live) requires: Firebase custom claim `artist:{artistId}` set server-side after verification (Instagram OAuth or manual review for MVP-scale ~15 profiles), `(:User)-[:MANAGES]->(:Artist)` edge, and write APIs guarded by that claim (`/api/v1/artist/profile`, `/availability`, `/session-types`, `/bookings/inbox`).
- `firestore.rules` currently blocks all client writes to `artist_availability` — correct today; Phase 2 keeps writes server-side (API routes check the claim) rather than opening rules.

### 3.6 Other backend gaps

- **Hardcoded deposits:** `DEPOSIT_BY_SIZE` ($75/$150/$300/$500) in `src/lib/booking.ts` — becomes a fallback once `sessionTypes` exist; `checkout/route.ts` reads the artist's configured deposit first.
- **Notifications:** `src/services/emailQueueService.js` is a `console.log` mock. Minimum viable: transactional email (booking received → artist; deposit paid → client + artist) triggered from the webhook + book route. *Recommended Phase 1; flagged as an open product decision.*
- **Durability nits:** in-memory IP rate limit in `book/route.ts` (per-instance; fine for MVP, note for scale), ephemeral `/tmp/tatt-data/bookings.jsonl` fallback (acceptable only because failures are now logged), in-memory `sharedDesignsStore` (unrelated to booking, same pattern).
- **Read APIs missing:** no `GET /api/v1/bookings/:id` (the success page renders Stripe redirect params, not server truth) and no artist-side booking list.

---

## 4. UX & State Management Gaps

### 4.1 Discovery (Airbnb — visual grid + trust)

What exists is closer to Airbnb than v1 credited: `/artists` is a responsive card grid over the live graph with URL-driven filters and pagination; `/matches` adds match-% and per-card "Book the chair"; `/smart-match` → `/swipe` is a working tinder-deck. Gaps:

- **The portfolio isn't on the platform.** Profile pages show `portfolioImages[0]` + an Instagram link-out; swipe cards render *monograms* because the match API returns a portfolio **count**, not image URLs. For a portfolio-driven vertical this is the discovery gap: Airbnb's listing-gallery pattern (grid lightbox, style-tagged images) needs (a) the match/browse APIs to return `portfolioImages`, (b) a profile gallery component. The data already exists on the `Artist` nodes.
- **Trust signals are borrowed, not owned.** Cards/profiles show shop-level Google ratings (honestly labeled). Airbnb-grade trust needs platform-generated signals — verified badge (from the claim flow), completed-bookings count, response time — rendered on card + profile and fed into ranking (§2.2).
- **Three discovery surfaces, three filter implementations** (`RosterControls`, `MatchesClient` filters, `smart-match` form). Consolidate filter state into one shared hook/store before adding more discovery features.
- **Navigation hides the marketplace:** the persistent `NavBar.tsx` links Home/Demo/Forge/Pitch — not `/artists`, `/matches`, or `/book`. A booking platform whose nav omits booking is a directory by construction.

### 4.2 Booking & deposit flow UI

The 3-step `/book` wizard (`BookClient.tsx`) is honest and well-built (real calendar days as *requests*, deposit-by-size shown, degrades cleanly when Stripe is unconfigured). Gaps:

- **No reconciled post-payment state.** `/book/success` renders Stripe redirect params ("To be confirmed" placeholders) instead of fetching the booking; `/bookings` reads localStorage only, so `depositPaid` stays `false` forever and a second device shows nothing. Fix: success page + `/bookings` fetch from `GET /api/v1/bookings` (owner-scoped — the Firestore rules already permit exactly this read).
- **No slot picker** — correct until the Phase 2 slot engine exists; then step 1 upgrades from request-days to real slots with a hold timer (Cal.com pattern: slot selected → held → pay within TTL).
- **Design attachment works** (`designId`/`designImageUrl` flow into the booking) — the design→discovery handoff is style-based only (`/matches?styles=…&from=design`). Fine for now; a true "send this design to this artist" is the Phase 3 messaging feature.

### 4.3 State management: clean up before building on it

- **Dead parallel implementations to delete first:** `src/store/useBookingStore.ts` (complete Zustand booking store, rendered by nothing) and `src/components/booking/BookingModal.tsx`. Leaving them invites exactly the mistake v1 made — planning work against dead files.
- **Three overlapping auth layers** (`tattStorage.useUser`, two near-duplicate `AuthProvider`s — `src/components/AuthProvider.tsx` and `src/components/auth/AuthProvider.tsx` — plus `useAuthStore`). Artist-role UI (`isArtist`, managed artist ID) must land in **one** of these, not a fourth; consolidation is a Phase 2 prerequisite.
- **Server-state pattern is sound** (server components fetch graph/Firestore per request; interactive islands are client) — the artist operator surfaces should follow it: server-fetch the inbox, client-mutate via API.

### 4.4 The missing half of the product: artist-side UI

There is no artist-facing surface at all. Phase 2 minimum (Fresha's solo-operator loop): claim/onboarding wizard (`/artist/onboard`), booking inbox with accept/decline (`/artist/dashboard` — the redirect stub at `/dashboard` stays client-facing), availability editor (weekly hours + date overrides), session-type & deposit editor. All API-backed per §3.5; no admin involvement anywhere in the loop.

---

## 5. Prioritized Technical Action Plan

Phases map to the three success criteria: Phase 1 → end-to-end booking, Phase 2 → self-service operators + portfolio discovery, Phase 3 → marketplace/trust. Estimates assume one engineer.

### Phase 1 — Close the booking loop (1–1.5 weeks)

Goal: *a deposit paid on Stripe provably updates the booking record, and both sides can see server truth.* All tasks are surgical edits to existing files.

| # | Task | Files | Est. |
|---|---|---|---|
| 1.0 | ~~Decide system-of-record~~ **Decided: Firestore-first** (§2.4, 2026-07-22) | — | done |
| 1.1 | Thread `bookingId` through checkout: add to `CheckoutPayload` + Stripe `metadata` | `src/lib/booking.ts`, `src/app/book/BookClient.tsx`, `src/app/api/checkout/route.ts` | 0.5d |
| 1.2 | Booking state machine: status enum + `canTransition()` transition table + `statusHistory`; extend `validateBookingRequest` types | `src/lib/booking.ts` (+ tests in `src/lib/booking.test.ts`) | 0.5d |
| 1.3 | **Webhook writes state**: on `checkout.session.completed`, idempotently transition `pending → deposit_paid`, persist `stripeSessionId`/`paymentIntent`/`amount`/`paidAt` | `src/app/api/webhooks/stripe/route.ts` | 1d |
| 1.4 | Canonical artist-ID validation: `/api/v1/book` verifies `artistId` exists in the graph | `src/app/api/v1/book/route.ts`, `src/lib/artists-graph.ts` | 0.5d |
| 1.5 | Owner-scoped booking read API: `GET /api/v1/bookings` + `GET /api/v1/bookings/[id]` (Firestore rules already allow this read shape) | new `src/app/api/v1/bookings/route.ts`, `[id]/route.ts` | 0.5d |
| 1.6 | Reconciled client state: `/book/success` + `/bookings` fetch server truth instead of Stripe params / localStorage-only | `src/app/book/success/page.tsx`, `src/app/bookings/page.tsx` | 1d |
| 1.7 | Delete dead code so no one builds on it: `useBookingStore.ts`, `BookingModal.tsx` | delete 2 files + test | 0.5d |
| 1.8 | *Open decision — recommended:* transactional email on booking-created (→ artist contact, ops-configured initially) and deposit-paid (→ client). Without it the loop closes technically but not humanly. | `src/services/emailQueueService.js` → real provider; called from 1.3 + book route | 1d |
| 1.9 | Integration test: book → checkout (test mode) → webhook fixture → assert `deposit_paid` + read API | new `src/app/api/webhooks/stripe/route.test.ts` or `tests/` | 1d |

**Deliverable:** client books → pays deposit → booking record transitions to `deposit_paid` → both parties can retrieve server truth. Still request-based scheduling (honest for a consult-first vertical) — no fake slots.

### Phase 2 — Solo-operator self-service + portfolio discovery (3–4 weeks)

| # | Task | Notes | Est. |
|---|---|---|---|
| 2.1 | Auth consolidation: single `AuthProvider`, role/claims surfaced (`isArtist`, `managedArtistId`) | prerequisite for everything below | 1d |
| 2.2 | Artist claim flow: verification (manual review acceptable at ~15 profiles) → Firebase custom claim → `(:User)-[:MANAGES]->(:Artist)` edge → `claimed_at`/`is_verified` on node | new `/api/v1/artist/claim`, admin script `scripts/set-artist-claims.js` | 2d |
| 2.3 | Artist profile config store: `artist_profiles/{artistId}` (session types, deposit rules, buffer, policies) + CRUD API | Boulevard SessionType pattern; `checkout` reads it, `DEPOSIT_BY_SIZE` becomes fallback | 2d |
| 2.4 | Scheduling service: recurring schedule + overrides → slot expansion → subtract bookings/holds → buffer | new `src/services/schedulingService.ts` + `GET /api/v1/artists/[id]/availability` | 2d |
| 2.5 | Slot holds with TTL at checkout start; webhook releases/confirms; expiry via Cloud Task | extends 1.3; Cal.com race-condition fix | 1.5d |
| 2.6 | Artist dashboard: booking inbox (accept/decline → state machine), availability editor, session-type editor | new `/artist/dashboard`, `/artist/onboard` | 4d |
| 2.7 | Booking wizard upgrade: real slot picker with hold timer (falls back to request-days for unclaimed artists) | `BookClient.tsx` | 2d |
| 2.8 | Portfolio on-platform: match/browse APIs return `portfolioImages`; profile gallery; swipe cards get real images | `hybridMatchService.ts`, `artists-graph.ts`, profile page, `swipe/page.tsx` | 2d |
| 2.9 | Trust signals: `is_verified`/`completed_bookings`/`response_time_hours` on `Artist` nodes, rendered on cards/profiles, weighted in match scoring | `neo4jService.ts`, `scoreAggregation` | 1.5d |
| 2.10 | Nav + discovery consolidation: `/artists`·`/matches`·`/book` in `NavBar.tsx`; one shared filter store | `NavBar.tsx`, new `useDiscoveryFilters` | 1.5d |

### Phase 3 — Marketplace & trust layer (4–6 weeks, sequence flexible)

Refunds/cancellation (Stripe refund → `refunded` transition → slot release) · reschedule flow · first-party reviews (post-`completed` only — verified-booking reviews, the Airbnb trust anchor) · outbound webhooks from the transition table (Cal.com-style, HMAC-signed) · notification hardening (digest, reminders) · analytics mirror to Supabase M003 (per §2.4 decision) · in-app messaging with design attachment · multi-artist shop calendars.

**Explicitly not doing:** stack migration (Neo4j/TS/Python stay), AR (deliberately de-scoped per #90/#69), marketplace feed/social features before booking works.

---

## Appendix: Platform-pattern → implementation crosswalk

| Platform pattern | TatT implementation | Tasks |
|---|---|---|
| **Boulevard** — deposit gates the session; per-service deposit rules | Webhook-driven `deposit_paid` transition; `sessionTypes` with flat/percent/none deposits replacing `DEPOSIT_BY_SIZE` | 1.1–1.3, 2.3 |
| **Fresha** — solo operator onboards & runs the business with zero admin | Claim flow → custom claims → `MANAGES` edge → onboarding wizard → dashboard/inbox/availability/session-type editors | 2.1–2.6 |
| **Airbnb** — visual grid, gallery, platform-owned trust signals | Portfolio images in APIs + profile gallery + real swipe cards; `is_verified`/`completed_bookings`/`response_time` on nodes, in ranking; verified-booking reviews | 2.8–2.9, P3 reviews |
| **Cal.com** — schedule primitives; holds; event webhooks | Recurring schedule + overrides + buffer + slot expansion (`schedulingService.ts`); 5-min holds with TTL; outbound lifecycle webhooks | 2.4–2.5, 2.7, P3 webhooks |
