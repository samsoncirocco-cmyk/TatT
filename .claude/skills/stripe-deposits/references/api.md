# Deposit / Connect route & function inventory

Verified against source on branch point `05a40ce` (2026-08-04). Line numbers
drift; symbol names and files are the stable handles.

## Core libraries

| Symbol | File | Notes |
|---|---|---|
| `PLATFORM_FEE_BPS` | `src/lib/stripe.ts` | `Number(process.env.PLATFORM_FEE_BPS) \|\| 1000` |
| `platformFeeCents(grossCents)` | `src/lib/stripe.ts` | `round(gross * bps / 10_000)` |
| `stripeConfigured` | `src/lib/stripe.ts` | false for empty/placeholder `STRIPE_SECRET_KEY`; client constructed with placeholder so imports never throw |
| `STRIPE_NOT_CONFIGURED` 503 body | `src/lib/stripe.ts` | `{ error: 'Payments are not configured.', code: 'STRIPE_NOT_CONFIGURED' }` |
| `DEPOSIT_CENTS_BY_SIZE` | `src/lib/booking.ts` | `{ small: 7500, medium: 15000, large: 30000, sleeve: 50000 }`; medium fallback |
| `depositHoldDays()` | `src/lib/deposit-hold.ts` | env `DEPOSIT_HOLD_DAYS`, default 7 |
| `transferHeldDeposits(artistId)` | `src/lib/booking-relay.ts` | no-op `{0,0}` unless `claimVerified && stripeAccountId && chargesEnabled`; per relay: `stripe.transfers.create` with `source_transaction: relay.chargeId`, idempotency `relay-transfer-<id>`, then status `accepted`. Artist nets full deposit. |
| `refundRelay(relayId)` | `src/lib/booking-relay.ts` | full refund via PaymentIntent, idempotency `relay-refund-<id>`, guarded to `pending` → `refunded`. Only caller: expire-deposits cron. |
| `listPendingByArtist`, `listExpiredPending` | `src/lib/booking-relay.ts` | relay queries (Neo4j `:BookingRelay`) |
| `getArtistStripe`, `setArtistStripeAccount`, `setArtistChargesEnabled` | `src/lib/artist-stripe.ts` | artist Stripe fields on the graph |
| `deriveOnboardingStatus`, `canReceivePayouts` | `src/lib/connect-status.ts` | status derivation from `accounts.retrieve` |

## Checkout — `POST /api/checkout` (`src/app/api/checkout/route.ts`)

- Two line items: deposit (`depositCentsForSize(size)`) + "TattTester booking
  fee" (`platformFeeCents`), both `tax_behavior: "exclusive"`,
  `automatic_tax: { enabled: true }`.
- Claimed artist: `payment_intent_data = { application_fee_amount,
  transfer_data: { destination: artist.stripeAccountId }, metadata }`.
- Unclaimed: `payment_intent_data = { metadata }` only;
  `metadata.depositState` `"routed"` vs `"held"`.
- Reservation path: refreshes the slot hold (not just reads it) so
  `expires_at = holdExpiresAtMs/1000` stays a full TTL out; refreshed
  `holdId` goes into metadata.
- Key metadata: `artistId, size, placement, date, time, depositCents,
  bookingFeeCents, depositState`, optional `holdDays, bookingId, holdId,
  clientUid`.
- 503 when `!stripeConfigured` unless `NEXT_PUBLIC_DEMO_MODE === "true"`
  (then fake `/book/success` URL). Separate 503 when the bookability check
  throws.

## Connect routes (all POST, `runtime = 'nodejs'`, under `src/app/api/v1/connect/`)

| Route | Behavior |
|---|---|
| `/accounts` | Creates Express-controller account (`controller: { stripe_dashboard: {type:'express'}, fees: {payer:'application'}, losses: {payments:'application'} }`, capabilities card_payments/transfers, `metadata.tattArtistId`). Idempotent if account exists. 403 `NOT_OWNER`/`CLAIM_NOT_VERIFIED`. |
| `/onboarding-link` | `accountLinks.create({ type: 'account_onboarding', ... })`; 409 if no account. |
| `/status` | `accounts.retrieve` → `deriveOnboardingStatus`, caches `chargesEnabled`, opportunistically calls `transferHeldDeposits` (errors swallowed). |
| `/login-link` | Express dashboard login link; 409 if no account. |
| `/claim-complete` | Ownership + `claimVerified` gate → `transferHeldDeposits`; 502 on Stripe failure. |
| `/claim` | Public claim *request* (rate-limited): records a pending identity-review request (ADR-0033 — only the approval CLI binds `claimedByUid`). 409 `ALREADY_CLAIMED`/`CLAIM_NOT_PENDING`; 503 if the graph write fails; returns `pendingDeposit` counts when already verified. |

Shared: `src/app/api/v1/connect/shared.ts` (`getBaseUrl`,
`requireOwnedArtist`). Claim UI: `src/app/claim/page.tsx`,
`src/app/claim/[artistId]/page.tsx`.

## Webhook — `POST /api/webhooks/stripe` (`src/app/api/webhooks/stripe/route.ts`)

Verifies `STRIPE_WEBHOOK_SECRET` then `STRIPE_CONNECT_WEBHOOK_SECRET`; 503 if
unset (dev bypass: `STRIPE_WEBHOOK_ALLOW_PLACEHOLDER=true` outside
production). Handled events:

- `checkout.session.completed` — when `metadata.depositState === 'held'`,
  retrieves the PI for `latest_charge` and creates the `:BookingRelay` with
  `expiresAtEpoch = event.created + holdDays * 86400` (holdDays from
  metadata, fallback `depositHoldDays()`); `notifyArtistOfBooking`;
  also subscription persistence and consumer-credit grants.
- `checkout.session.async_payment_succeeded`, `payment_intent.succeeded`.
- `account.updated` — on `charges_enabled` flipping true:
  `setArtistChargesEnabled` + best-effort `transferHeldDeposits` (artistId
  from `account.metadata.tattArtistId`, else graph lookup).
- `invoice.paid` / `invoice.payment_failed`,
  `customer.subscription.created|updated|deleted`.

## Cron — `GET|POST /api/cron/expire-deposits` (`src/app/api/cron/expire-deposits/route.ts`)

Constant-time bearer check against `CRON_SECRET` (401 fail-closed if unset).
`listExpiredPending(now)` → `refundRelay` each → `{ refunded }`. Schedule in
`vercel.json`: `0 9 * * *` (the repo's only cron entry).

## Env vars

`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_WEBHOOK_SECRET`,
`STRIPE_WEBHOOK_ALLOW_PLACEHOLDER`, `STRIPE_CURRENCY` (default `usd`),
`PLATFORM_FEE_BPS` (1000), `DEPOSIT_HOLD_DAYS` (7), `CRON_SECRET`,
`NEXT_PUBLIC_DEMO_MODE`, `STRIPE_PRICE_CONSUMER_CREDITS`, `OPS_NOTIFY_EMAIL`.
