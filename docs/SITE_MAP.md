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
| `/image2ink` | **marketing door — feeds the funnel** | TAT-46; served at image2ink.com via middleware rewrite (`src/proxy.ts`); not a second brand or a separate signup — every CTA hands off to TattTester (`/signup`, `/design`, `/claim`) |
| `/design` | **core funnel — the one door** | ADR-0028; all CTAs point here (TAT-34) |
| `/generate/stencil` (Forge) | **redirects → `/design` fast lane** | Implemented in PR #214; preserves the prompt |
| `/generate` (Studio) | keep — editing room | ADR-0017 stands; reachable from any picked design; facelift + path rename open (TAT-34, non-blocking) |
| `/journey` | **removed** | Legacy flow removed in PR #214 |
| `/visualize` | core funnel | AR mirror = the conviction step between design and match |
| `/designs`, `/designs/[id]` | keep | Consumer design library |
| `/gallery` | keep + build | Honest empty state today; seed with real work (TAT-36) |
| `/share/[shareId]` | keep | The deck's "social feedback loop", already built |
| `/smart-match` → `/swipe` | **core funnel — the Match step** | ADR-0029; threads designSessionId into booking; swipes feed the taste algo |
| `/matches` | **redirects → `/artists`** | Implemented in PR #212 with filter mapping |
| `/artists`, `/artists/[slug]` | keep | The one browse/compare list + profiles |
| `/book`, `/book/[artistId]`, `/book/success`, `/bookings` | core funnel | Deposit + booking fee (ADR-0005–0008, 0027) |
| `/pricing` | **honest launch pricing** | Implemented in PR #210: free consumer design, booking fee, later artist subscription |
| `/dashboard` | consumer compatibility redirect | Redirects to the consumer design library |
| `/console` | **artist console** | Implemented in PR #213: bookings/history, availability, payout state |
| `/claim`, `/claim/[artistId]` | verified request flow | Pending human review before ownership, Connect, or funds (ADR-0033) |
| `/artist/profile` | artist profile manager | Verified owners edit artist-managed public fields; Instagram stays locked |
| `/artist/[artistId]/availability` | keep | Hours + Google Calendar sync |
| `/takedown/[artistId]` | keep | ADR-0025 |
| `/settings`, `/login`, `/signup` | keep / core funnel | |
| `/about` | keep | Absorbs anything worth saving from `/philosophy` |
| `/demo` | **removed** | Mock walkthrough removed in PR #211 |
| `/pitch` | **removed** | Investor artifact removed in PR #211 |
| `/philosophy` | **removed** | Legacy page removed in PR #211; `/about` remains |
| `/legal/privacy`, `/legal/terms` | keep | |

## Business side (ADR-0031: land free, expand later)

1. **Verify + claim + get paid** — free request, human identity review, then
   Connect; artist keeps 100% of deposits (ADR-0007, ADR-0033).
2. **Run your business** — `/console`: bookings + history, availability,
   payout status (implemented in PR #213).
3. **Paid pro tools** — Stripe Billing lane built, dormant (TAT-17). Sells
   only after rung 2 exists.

## Deferred (parking lot — TAT-39)

Artist bidding · temp-tattoo kit ordering · design uploads · consumer
credits/tiers (skeleton in ADR-0030) · virtual consultations. Each has a
wake-up trigger recorded on TAT-39.
