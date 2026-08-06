---
name: stripe-deposits
description: Use when touching anything that moves booking money — checkout, deposits, the platform booking fee, Stripe Connect claim/onboarding, held-deposit relays, refunds, or the Stripe webhook — or when reasoning about where a deposit currently sits. Do not use for subscription/credits billing surfaces unless they intersect the deposit paths, or for slot-hold timing bugs (see booking-flow-debug).
---

# TatT deposit & Connect money model

Route/function inventory with file paths: [references/api.md](references/api.md).
Deciding ADRs: 0005 (held deposits), 0006 (7-day auto-refund), 0007 (fee on
top), 0008 (dual claim entry), 0040 (tiered deposits) in `docs/adr/`.

## The model in five sentences

1. The client pays **deposit + booking fee** as two Checkout line items; the
   fee is `platformFeeCents(depositCents)` at `PLATFORM_FEE_BPS` (default
   1000 bps = 10%), and the **artist always keeps 100% of the deposit**
   (ADR-0007). Deposits are tiered by size: $75 / $150 / $300 / $500
   (small/medium/large/sleeve), medium is the fallback (ADR-0040,
   `DEPOSIT_CENTS_BY_SIZE` in `src/lib/booking.ts`).
2. **Claimed artist** (charges-enabled connected account) → destination
   charge: `application_fee_amount` = the fee, `transfer_data.destination` =
   the artist. No `on_behalf_of` anywhere — the platform is merchant of
   record. `metadata.depositState = "routed"`.
3. **Unclaimed artist** → the whole charge is held on the platform and
   recorded as a `:BookingRelay` node (Neo4j) keyed by PaymentIntent, with
   `metadata.depositState = "held"` (ADR-0005).
4. Claim-or-refund: when the artist becomes charges-enabled (via either
   claim entry point, ADR-0008), `transferHeldDeposits(artistId)` pays out
   each pending relay via separate charges & transfers. Otherwise the daily
   cron `/api/cron/expire-deposits` (`0 9 * * *` in `vercel.json`) fully
   refunds relays past `DEPOSIT_HOLD_DAYS` (default 7) — TatT eats the
   Stripe fee (ADR-0006).
5. When a reservation hold backs the checkout, the Checkout Session's
   `expires_at` is pinned to the slot hold's expiry — `HOLD_TTL_MINUTES =
   35` (`src/lib/booking-holds.ts`) — so Stripe stops accepting payment
   exactly when the exclusive slot hold lapses.

## Gotchas

- **Two unrelated "holds".** `booking_holds` (Firestore, 35-minute slot
  exclusivity) and held deposits (`:BookingRelay`, Neo4j, 7-day money hold)
  are separate systems that share a word. Never mix their lifecycles.
- **Fail-closed 503 when Stripe is unconfigured.** `stripeConfigured`
  (`src/lib/stripe.ts`) is false for an empty or `sk_test_PLACEHOLDER`/
  `sk_PLACEHOLDER` key; `/api/checkout` and all five `/api/v1/connect/*`
  money routes then return 503 `STRIPE_NOT_CONFIGURED` — except checkout in
  `NEXT_PUBLIC_DEMO_MODE=true`, which returns a fake success URL. A 503
  here is configuration, not an outage.
- **Release is triple-triggered, idempotent by key.** `transferHeldDeposits`
  is called from `connect/claim-complete`, `connect/status`, and the
  `account.updated` webhook — safe only because transfers use idempotency
  key `relay-transfer-<relayId>` and relays flip to `accepted`. Preserve
  both when editing.
- **The cron is the only automatic closer.** `refundRelay` is called solely
  by `expire-deposits`; if the cron stops, held deposits linger
  indefinitely. It fails closed 401 without `CRON_SECRET`.
- **`slot_lost` after payment does NOT auto-refund.** If a paid booking's
  hold was lost, the webhook logs `DOUBLE-BOOKING RISK` and flags for a
  human (`src/app/api/webhooks/stripe/route.ts`). Don't "fix" this by
  adding an auto-refund — it's a deliberate human gate.
- **One webhook endpoint, two secrets.** `/api/webhooks/stripe` verifies
  against `STRIPE_WEBHOOK_SECRET` then `STRIPE_CONNECT_WEBHOOK_SECRET`.
- **`holdDays` is stamped at checkout.** The webhook prefers
  `metadata.holdDays` over the current env, so changing `DEPOSIT_HOLD_DAYS`
  only affects relays created afterward.
- **Money copy is test-enforced.** Strings in `src/lib/money-copy.ts` have
  regex assertions in `money-copy.test.ts` (ADR-0036 copy laws); edits that
  drop phrases like "only part we keep" fail the suite.
