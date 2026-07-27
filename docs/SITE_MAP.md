# Site map & launch verdicts

**Decided:** 2026-07-27 launch-scope triage (ADRs 0028–0031). Every page gets a
verdict against the day-one spine. Regenerate the route list any time with:

```bash
find src/app -name "page.tsx" | sed 's|src/app||;s|/page.tsx||' | sort
```

## The spine (funnel A — TAT-14's definition of done)

```
home → /design (one door: talk or type)
         ├─ conversation (vague idea)      ─┐
         └─ fast lane (complete prompt)    ─┴→ Council → reveal (four cuts)
              → /visualize (AR conviction step)
              → /smart-match → /swipe (Match step)
              → /book → deposit paid
```

Every page below is judged by whether it moves someone along this line.

## Verdicts

| Route | Verdict | Why / where it went |
|---|---|---|
| `/` | core funnel | Needs real example designs (TAT-36 condition) |
| `/design` | **core funnel — the one door** | ADR-0028; all CTAs point here (TAT-34) |
| `/generate/stencil` (Forge) | merge → `/design` fast lane | ADR-0028 supersedes ADR-0018 as destination; reveal grid becomes shared component (TAT-34) |
| `/generate` (Studio) | keep — editing room | ADR-0017 stands; reachable from any picked design; facelift + path rename open (TAT-34, non-blocking) |
| `/journey` | **cut** | Legacy flow, superseded twice over (TAT-34) |
| `/visualize` | core funnel | AR mirror = the conviction step between design and match |
| `/designs`, `/designs/[id]` | keep | Consumer design library |
| `/gallery` | keep + build | Honest empty state today; seed with real work (TAT-36) |
| `/share/[shareId]` | keep | The deck's "social feedback loop", already built |
| `/smart-match` → `/swipe` | **core funnel — the Match step** | ADR-0029; threads designSessionId into booking; swipes feed the taste algo |
| `/matches` | merge → `/artists` | ADR-0029; redirect with filter mapping (TAT-35) |
| `/artists`, `/artists/[slug]` | keep | The one browse/compare list + profiles |
| `/book`, `/book/[artistId]`, `/book/success`, `/bookings` | core funnel | Deposit + booking fee (ADR-0005–0008, 0027) |
| `/pricing` | rebuild honest | ADR-0030; artist plan + booking-fee explainer; consumer tiers stripped (TAT-37) |
| `/dashboard` | rebuild → artist console | Today a consumer redirect; console = bookings, availability, payouts (ADR-0031, TAT-38) |
| `/claim`, `/claim/[artistId]` | keep — unblock | TAT-16 (onboarding never renders), TAT-25 (no identity check) |
| `/artist/[artistId]/availability` | keep | Hours + Google Calendar sync |
| `/takedown/[artistId]` | keep | ADR-0025 |
| `/settings`, `/login`, `/signup` | keep / core funnel | |
| `/about` | keep | Absorbs anything worth saving from `/philosophy` |
| `/demo` | **archive** | Mock walkthrough — violates the "no fake screens" launch bar (TAT-36) |
| `/pitch` | **archive** | Investor artifact; wrong address on a stealth product (TAT-36) |
| `/philosophy` | **archive** | Legacy; job belongs to `/about` (TAT-36) |
| `/legal/privacy`, `/legal/terms` | keep | |

## Business side (ADR-0031: land free, expand later)

1. **Claim + get paid** — free claim, artist keeps 100% of deposits (ADR-0007).
   Blocked by TAT-16/TAT-25.
2. **Run your business** — minimal artist console (TAT-38): bookings +
   history, availability, payout status.
3. **Paid pro tools** — Stripe Billing lane built, dormant (TAT-17). Sells
   only after rung 2 exists.

## Deferred (parking lot — TAT-39)

Artist bidding · temp-tattoo kit ordering · design uploads · consumer
credits/tiers (skeleton in ADR-0030) · virtual consultations. Each has a
wake-up trigger recorded on TAT-39.
