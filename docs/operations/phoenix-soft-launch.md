---
status: current
verified_against: 8db5d3e
verified_on: 2026-07-27
owner: Samson
issue: TAT-13
---

# Phoenix soft-launch runbook

> **Amendment (2026-08-03, ADR-0042):** recruited, identity-checked artists
> are an **upgrade lane, not a launch gate**. The soft launch runs end-to-end
> on scraped, unclaimed profiles via the booking relay (ADR-0005–0008), with
> bookability gated by ADR-0043 (real tattoo evidence + working contact
> channel). The recruiting phases below stand and continue in parallel
> (starting with Sailor Zac), but the "five launch-ready artists" supply gate
> no longer blocks launch.

## Outcome

Launch TattTester to a deliberately small Phoenix-metro cohort only after the
full journey is honest and supportable:

`sign up → design → match → booking → deposit/confirmation`

The first supply comes from consented, identity-checked local artists. The first
demand comes from Samson's personal network. This is not a broad public
announcement, a paid campaign, or permission to contact anyone from an agent
session.

## What the repository proves today

- The product journey and artist console exist; see
  `docs/status/features.yaml`.
- `src/data/artists.json` contains 100 generated Arizona fixtures, including 69
  Phoenix-metro records. `scripts/generate-tattoo-artists-data.js` generated
  names and attributes, so these are **not 69 recruitable artists** and must not
  be used as a launch-density claim.
- `execution/scrape_artists.py` can discover candidate shops and linked artist
  handles from public pages. Discovery does not prove identity, consent,
  quality, availability, or willingness to join.
- Production artist counts and launch readiness have not been verified by this
  document. Run the density audit below against the active graph immediately
  before recruiting.

## Owners and authority

| Area | Directly responsible | Approval / escalation |
| --- | --- | --- |
| Go/no-go, outreach, budget, launch date | Samson | Samson |
| Copyright/licensing posture and public media policy | Samson | Qualified counsel |
| Candidate research, consent evidence, roster hygiene | Launch Ops | Samson |
| Identity review, profile claim, payout readiness | Launch Ops | Samson for exceptions |
| Product gates, telemetry, defects, rollback | Engineering | Samson for go/no-go |
| Profile facts, portfolio permission, offered hours | Each recruited artist | Launch Ops verifies evidence |

An automation or coding agent may prepare research, drafts, reports, and code.
It may not send outreach, accept legal terms, spend money, change production
data, approve identity, or flip the launch gate.

## Non-negotiable entry gates

Every row needs a dated evidence link in TAT-13 before cohort invitations begin.
“Code exists” is not the same as the operational test passing.

| Gate | Required evidence | Owner | Stop condition |
| --- | --- | --- | --- |
| Media rights | TAT-31/TAT-40 policy decision; every launch profile uses artist-consented media or a permitted embed | Samson + counsel | Any unlicensed re-hosted image on a launch profile |
| Takedown | Request and operator runbook dry-run completed | Launch Ops | A request cannot be received, reviewed, or actioned |
| Identity | TAT-25 process in force before claim or payout; reviewer and evidence timestamp recorded | Launch Ops | A claimant can receive money without review |
| Pricing/deposits | TAT-8 policy and customer copy approved | Samson | Held/refund semantics are ambiguous |
| Availability | ADR-0027 model used: synced calendars get held reservations; everyone else gets an explicit request | Engineering | Fake slot, double booking, or silent calendar degradation |
| Booking lifecycle | TAT-20 verified with a same-day/later-slot regression test | Engineering | One booking strands unrelated availability |
| Placement honesty | TAT-32 quality test completed for the majority generation path | Engineering | Placement output is represented as tracked or measured when it is not |
| Domain and OAuth | TAT-12 canonical domain/TLS and TAT-30 Google consent configuration verified | Engineering + Samson | Redirect, consent, or callback uses a non-canonical origin |
| Money | TAT-5 controlled live Stripe charge, webhook, payout state, refund, and ledger reconciliation | Engineering + Samson | Any unexplained charge, missing webhook, or unreconciled refund |
| Support | Named same-day owner for artist/client issues and a documented pause switch | Samson | Nobody is available to own incidents during a cohort |

## Phase 0 — measure real local supply

Run this read-only query against the active Neo4j database. Do not paste emails,
phone numbers, or private outreach notes into the repository.

```cypher
MATCH (a:Artist)
OPTIONAL MATCH (city:City)-[:HAS_SHOP]->(:Shop)-[:HAS_ARTIST]->(a)
WITH a, coalesce(a.city, city.name) AS city
WHERE city IN [
  'Phoenix', 'Scottsdale', 'Tempe', 'Mesa', 'Chandler', 'Gilbert',
  'Glendale', 'Peoria', 'Surprise', 'Apache Junction', 'Cave Creek'
]
  AND a.removedAt IS NULL
OPTIONAL MATCH (a)-[:SPECIALIZES_IN]->(style:Style)
WITH a, city, collect(DISTINCT style.name) AS styles
RETURN
  city,
  count(a) AS discovered,
  sum(CASE WHEN a.claimedByUid IS NOT NULL THEN 1 ELSE 0 END) AS claimed,
  sum(CASE WHEN a.identityVerifiedAt IS NOT NULL THEN 1 ELSE 0 END) AS identity_checked,
  sum(CASE WHEN a.mediaConsentStatus = 'granted' THEN 1 ELSE 0 END) AS media_consented,
  collect({id: a.id, handle: a.instagram, styles: styles})[0..25] AS review_sample
ORDER BY discovered DESC;
```

Save only the dated aggregate result and a link to the private review list in
TAT-13. Missing `identityVerifiedAt` or `mediaConsentStatus` is a failed launch
gate, not zero-risk evidence.

Build a private shortlist of 12 candidates:

- Start with Sailor Zac as the lighthouse candidate.
- Cover at least three metro zones.
- Cover the four demand clusters chosen from actual friend-cohort briefs, not
  assumptions.
- Prefer artists with a real shop affiliation, clear ownership evidence, an
  active portfolio, and enough stated availability for a small cohort.
- Exclude anyone with a takedown, identity ambiguity, copied/aggregator media,
  or no safe contact route.

## Phase 1 — recruit the lighthouse supply

### Artist value proposition

The offer is a free, claimed profile and artist console with qualified local
design briefs, honest booking requests, availability controls, and clear payout
state. Do not promise guaranteed leads, revenue, exclusivity, AI ownership of
their art, or a paid CRM that is not built.

### Initial outreach draft

> Hey [artist name] — I’m Samson, building TattTester here in Phoenix. It helps
> first-time clients turn a rough tattoo idea into a visual brief, then find a
> local artist whose style fits. I’m inviting a very small group of Phoenix
> artists to shape the first version. There’s no fee and no exclusivity.
>
> I’d like to show you exactly what the profile and booking flow say before
> anything goes live. We would only use portfolio work you explicitly approve,
> and you can remove it at any time. Would you be open to a 20-minute walkthrough?

This is a draft for Samson to send or revise. An agent must not send it.

### Twenty-minute artist walkthrough

1. Two minutes: first-timer problem and what TattTester does **not** replace.
2. Five minutes: consumer brief, match, and booking experience.
3. Five minutes: profile facts, approved portfolio media, styles, and service
   area.
4. Five minutes: claim, identity review, availability mode, deposit/payout
   behavior, and takedown.
5. Three minutes: ask what would make the artist refuse the product; record the
   answer verbatim.

### Launch-ready artist checklist

- [ ] Identity reviewed by a named human; evidence timestamp recorded privately.
- [ ] Artist has claimed the intended graph profile.
- [ ] Name, handle, shop, location, and style taxonomy confirmed by the artist.
- [ ] Every displayed image has explicit permission or an approved embed path.
- [ ] Takedown/removal instructions shown to the artist.
- [ ] Stripe onboarding and payout status are unambiguous.
- [ ] Artist chooses request mode or connects a calendar and publishes offered
      hours; TatT never infers bookable gaps.
- [ ] Artist completes a test booking from the consumer side and reviews the
      resulting console record.
- [ ] Same-day support route and expected response time acknowledged.

Artist supply gate: **five launch-ready artists**, spanning three metro zones
and the demand cohort's four leading style clusters. Multi-style artists may
cover more than one cluster; do not invent tags to hit the number.

## Phase 2 — friends-and-family journey test

Invite ten adults from Samson's personal network individually. Do not post a
public link. Give each participant one realistic idea and ask them to proceed
without coaching while an observer timestamps the funnel:

1. Account created.
2. First design direction generated.
3. A direction selected.
4. Artist match/deck reached.
5. Artist profile reviewed.
6. Booking request started.
7. Booking request submitted.
8. Deposit path reached and, only for the approved controlled subset, completed.

Afterward ask only:

- “Where did you feel least sure?”
- “What did you believe would happen after paying?”
- “Why did you choose or reject the first artist?”
- “What would stop you from using this for a real tattoo?”

Demand gate:

- At least 8 of 10 reach an artist match without intervention.
- At least 5 of 10 submit a booking request.
- Every participant correctly understands whether they requested a time or
  reserved a held slot.
- No P0/P1 defect, lost booking, unexplained charge, unapproved media exposure,
  or identity dispute.

These are readiness thresholds, not growth forecasts.

## Phase 3 — controlled Phoenix soft launch

Open a capped cohort of 25 Phoenix-metro adults through direct invitations.
Keep the supply roster at five to ten launch-ready artists. No paid acquisition,
press, influencer campaign, or public social announcement in this phase.

Run a daily 15-minute review while the cohort is open:

1. New signups and completed design sessions.
2. Match-to-profile and profile-to-booking conversion.
3. Request vs reservation mode and calendar degradations.
4. Deposits, webhooks, refunds, and payout exceptions.
5. Artist response time and declined/countered requests.
6. Incorrect profile/media reports and takedown requests.
7. Open P0/P1/P2 defects and owner.

## Scorecard

Track aggregates in the private launch workspace and post a dated summary to
TAT-13. Do not commit participant contact data.

| Category | Metrics |
| --- | --- |
| Supply | candidates reviewed, contacted, replied, walkthroughs, identity-checked, media-consented, claimed, payout-ready, calendar-ready |
| Demand | invited, signed up, first design, selected direction, reached match, viewed profile, submitted booking, paid deposit |
| Quality | completion time, generation failure, zero-match result, user-reported match relevance, artist acceptance/counter/decline |
| Trust | incorrect profile claims, unapproved-media reports, takedowns, refunds, charge disputes, double-bookings |
| Operations | first response time, artist response time, open P0/P1/P2, mean time to resolution |

Use funnel rates only when the denominator is shown. With cohorts this small,
report raw counts beside every percentage.

## Pause and rollback

Pause new invitations immediately for any of:

- claimant or payout identity dispute;
- unapproved artist media visible in the cohort;
- deposit charged without a durable booking record;
- double-booked reservation or stale slot presented as live;
- takedown request that cannot be actioned the same day;
- exposure of private contact, calendar, or payment data;
- any other P0 or unresolved P1.

Pausing means: stop invitations, disable the affected path or fall back to the
request model where safe, preserve evidence, contact affected people personally,
reconcile money, and record the owner and restart gate in TAT-13. It does not
mean silently hiding the metric.

## Sequence and completion

1. Attach the Phase 0 aggregate density result to TAT-13.
2. Close every non-negotiable entry gate with dated evidence.
3. Recruit and certify five launch-ready artists, starting with Sailor Zac.
4. Complete the ten-person friends-and-family gate.
5. Obtain Samson's explicit go/no-go for the capped 25-person cohort.
6. Run the controlled cohort and publish a dated scorecard.
7. Mark TAT-13 complete only after the cohort retrospective records: what
   worked, what stopped, incidents/refunds/takedowns, artist feedback, and the
   explicit decision to expand, repeat, or stop.
