---
status: accepted
---

# Launch monetization: honest pricing page, no consumer tiers at launch

Launch-scope triage grill, 2026-07-27, after re-reading the original pitch
deck. `/pricing` advertised Free/Pro/Studio consumer tiers ($19/$79) backed by
no code — no user-tier concept, no quota enforcement, no watermarking (TAT-21).
Consumer subscriptions also fight the episodic shape of tattoo purchases
(design once, book, cancel), and the deck's own "Core MVP Functions" list never
included them.

Decision: at launch `/pricing` tells the truth — free to design, a booking fee
(`PLATFORM_FEE_BPS`) on top of the deposit when you book (ADR-0007), plus the
artist plan (TAT-17 wires the already-built Stripe Billing lane). The future
consumer-payment lane is credit packs — a lane the pitch deck itself lists —
rather than subscriptions. The entitlement skeleton is designed and deferred:
Stripe subscription/price → existing webhook → Firebase custom claim (`tier`)
riding the ID token that `verifyApiAuth` already decodes → one quota gate in
front of the generation service (atomic per-user monthly counter for free
tier) → tier-aware model routing → free-tier watermark step before GCS upload.
Roughly a week of work when a real user hits a real limit; the same skeleton
serves tiers or credits (only what the counter checks differs).

Free/Pro/Studio naming, pricing, and entitlements are explicitly TBD
post-launch. Studio-tier "API access + custom model training" is dropped — that
is a separate product, not a bullet point.
