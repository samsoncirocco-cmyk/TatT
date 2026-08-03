---
status: accepted
---

# Consumer monetization: 25 lifetime free generations, then a $10 credit pack

Owner grill session, 2026-08-03 (TattTester Buzz channel). Decided by Samson.

## Context

ADR-0030 made the launch pricing page honest (no fictional consumer tiers) and
named credit packs — not subscriptions — as the future consumer-payment lane,
but left the free quota and pack pricing "explicitly TBD post-launch." Older
copy and design artifacts still carried a "5 generations / month free + $19
Pro subscription" model (and variants: 3 designs/month, $12 Pro) that was
never backed by code. Meanwhile SMS (SketchBot) and the website are two doors
into the same generation service, so a per-channel or client-side quota would
be trivially bypassed.

## Decision

- **Free tier: 25 free generations, LIFETIME per user.** Not monthly, not
  daily. The same single counter covers SMS and the website — one quota per
  user across both channels, **enforced server-side** in front of the
  generation service. Client-side or per-channel counting is not enforcement.
- **After the free 25: a single credit pack — $10 for 25 generations** — sold
  as a one-off Stripe Checkout payment. One pack SKU; no pack ladder yet.
- **There is no consumer subscription.** The "$19 Pro" subscription is dead
  copy; strike it wherever it appears as the decided model. A consumer SaaS
  subscription is parked as a possible future product, to be re-decided with
  its own ADR if it ever comes back.

This supersedes the "5/month free + $19 Pro" model (and its 3-designs/month,
$12/month variants) wherever docs or scripts present it as decided. It closes
the quota/price TBD left open by ADR-0030; ADR-0030's entitlement skeleton
(webhook → claim/counter → one gate in front of generation) is exactly the
build path, with the counter checking lifetime credits instead of a monthly
tier quota.

## Rejected alternatives

- **Monthly free quota.** Rejected: tattoo purchases are episodic
  (design once, book, done — ADR-0030); a monthly reset gives away repeated
  free budgets to the exact users who should be buying a pack.
- **Consumer subscription ($19 Pro or otherwise).** Parked, not chosen:
  fights the episodic purchase shape, and no code ever backed it.
- **Different quotas per channel (SMS vs web).** Rejected: same user, same
  cost, same product; a split quota is confusing and gameable.

## Consequences

- Server-side lifetime-quota enforcement and the $10/25 Stripe Checkout pack
  are build work, tracked in GitHub issue #80. Until it lands this ADR is
  intent (`accepted_not_implemented` in the feature ledger's vocabulary).
- `/pricing`, marketing copy, and pitch material must describe: free 25
  lifetime generations, then $10 per 25-generation pack, plus the existing
  booking deposit + fee lane (ADR-0007, ADR-0040).
