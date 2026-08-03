# OpenRouter × Anthropic Startup Credits — Eligibility & Application Pack

**Offer:** $1,000 in Anthropic/Claude credits via OpenRouter, valid 6 months.
**Applicant entity:** TattTester (tatttester.com)
**Prepared:** 2026-07-31

---

## 1. Eligibility scorecard

| # | Requirement | Status | Evidence / gap |
|---|---|---|---|
| 1 | Building an AI-native product | **Met** | Generation, prompt enhancement and artist matching are all model calls; TatT is already an OpenRouter customer (see §2). |
| 2a | Live website | **Met** | `https://tatttester.com` returns 200. `tatt-t.com` 301s to it; `image2ink.com` serves 200 independently. |
| 2b | Active LinkedIn company page listing team/founders | **NOT MET** | No public TattTester company page found. Blocker — see §4. |
| 3 | Bootstrapped or funded ≤ Series B | **Met** | Bootstrapped, pre-launch, no outside capital. |
| 4 | Sign up with a professional email on your domain | **MET as of 2026-07-31** | Cloudflare Email Routing live on `tatttester.com`. See §3. |
| 5 | *(undisclosed in the offer text)* < $500 lifetime OpenRouter spend | **UNKNOWN** | Stated on OpenRouter's own program page. Check before doing any other work — see §0. |

Two confirmed blockers, both administrative, both resolvable today. Neither
requires code. One unknown that could void the whole exercise.

---

## 0. The $500 lifetime spend cap — resolved by a fresh account

OpenRouter's own program page lists a requirement the perk listing omits:

> "Have less than $500 in lifetime OpenRouter spend"

**Decision (2026-07-31): open a new OpenRouter account under
`samson@tatttester.com` rather than applying with the existing personal-Gmail
account.** A new account starts at $0 lifetime spend, and the program explicitly
asks for "a company email address linked to an OpenRouter account" — so this is
the intended shape, not a workaround.

One thing to confirm before applying: the terms state each applicant may receive
startup credits **once**. If the existing Gmail-registered account has already
received startup credits from this program, a second account is not a clean
path. If it hasn't, you're fine.

**Do not fund or spend on the new account** before applying — keep it at $0.
See §5a for the production cutover, which has a sequencing trap.

Also note the direct program offers **up to $5,000** in universal credits plus
0% processing fees for 12 months — five times the $1,000 partner offer — but
requires "working with an approved OpenRouter partner." The perks-platform route
you were sent *is* that partner path. If you bank with Mercury, their perk
listing may be a better-value route to the same program.

---

## 2. Why criterion 1 is strong (use this in the form)

TatT is not an app that bolted on a chat box. Verified in-repo model usage:

- **Council prompt enhancement** — `anthropic/claude-3.5-sonnet` via OpenRouter
  (`src/services/council/internal/councilService.ts:120`)
- **Fast + vision lanes** — `anthropic/claude-haiku-4-5` via OpenRouter
  (`src/app/api/v1/council/generate/route.ts:56-57`)
- **Intake / entity extraction** — OpenRouter
  (`src/services/intake/internal/extractionService.ts:58`)
- **SketchBot conversation engine** — Vertex Gemini primary, OpenRouter fallback
  currently pinned to `z-ai/glm-5.2`
  (`src/services/designConversation/internal/providers.ts:34`)

That last line is the honest, compelling ask: **the credits would fund moving the
SketchBot conversational lane onto Claude**, where it belongs on quality, instead
of a cost-chosen fallback. That is exactly the "build, test and scale without
upfront cost" story the program is written for. Say it plainly — reviewers
respond better to a specific spend plan than to "we love AI."

---

## 3. Blocker A — domain email (also fixes a live bug)

### The bug you should know about first

`support@tatttester.com` is **published on the live site and used as the
operational fallback contact**, and it currently bounces:

- Privacy policy, rendered publicly — `src/app/legal/privacy/page.tsx:483`
- Account-deletion request link — `src/app/settings/page.tsx:329`
- Artist takedown / reinstate / claim ops fallback — `src/app/api/v1/artists/takedown/route.ts:59,113`, `.../reinstate/route.ts:87,140`, `.../connect/claim/route.ts:113`

With no MX record, mail to that address has nowhere to go. An artist following
the takedown instructions in your own privacy policy gets a bounce. Fixing
criterion 4 fixes this at the same time.

### ✅ DONE — Cloudflare Email Routing, configured 2026-07-31

Cloudflare account `391709d5bfb8c6a4f69d8a97ec6ed0d7`, zone `tatttester.com`.

Verified live via `dig`:

```
MX   6  route3.mx.cloudflare.net.
MX  13  route2.mx.cloudflare.net.
MX  33  route1.mx.cloudflare.net.
TXT     "v=spf1 include:_spf.mx.cloudflare.net ~all"
```

Destination address `samson.cirocco@gmail.com` — **Verified** (auto-verified,
since the Cloudflare account is registered to that address; no confirmation
email was needed).

Active routing rules:

| Rule | Action | Status |
|---|---|---|
| `samson@tatttester.com` | → samson.cirocco@gmail.com | Active |
| `support@tatttester.com` | → samson.cirocco@gmail.com | Active |
| Catch-all | Drop | Disabled (left as-is) |

This closes criterion 4 **and** stops the `support@` bounce documented above.

**Remaining caveat:** Email Routing is **receive-only**. Enough to register and
verify the OpenRouter account, and enough for support@ to reach you. It does not
let you *send* from `@tatttester.com` — replies to an artist's takedown request
would still come from your Gmail. To send as support@, add Gmail "Send mail as"
backed by an SMTP relay, or use Workspace below.

**Untested:** no mail has actually been delivered through the route yet. Send a
test message to `support@tatttester.com` to confirm end to end.

### Alternative: Google Workspace (~$7/user/mo)

Real mailbox, real sending, needed eventually anyway if you want
`samson@tatttester.com` on outbound artist comms. Add the MX records from the
Workspace setup wizard into Cloudflare DNS (use the values the wizard shows —
Google has changed its recommended record set over time). Set the Cloudflare
proxy to **DNS only** for mail records.

**Recommendation:** turn on Email Routing today so the application is unblocked
and support@ stops bouncing; decide on Workspace separately on its own merits.

---

## 4. Blocker B — LinkedIn company page

Requirement is specifically "an **active** company page **listing your team or
founders**." A bare page with a logo and no people attached tends to read as
thin. What you need:

1. **Create the page** — linkedin.com/company/setup/new. You need a personal
   LinkedIn profile with a verified email to create one. Company email
   verification may be requested, which is another reason to do §3 first.
2. **Attach yourself as a person** — edit your personal profile to add a current
   position at TattTester (Founder). This is what makes the team "listed"; the
   company page then shows an associated member. A page with zero associated
   people is the usual reason this criterion fails.
3. **Post 2–3 times before applying** so the page is "active." Product
   screenshots, the SketchBot SMS flow, an artist-matching explainer. Nothing
   elaborate — evidence of a pulse.
4. **Cross-link** — put the LinkedIn URL in the site footer next to
   About/Sign Up, so a reviewer moving site → LinkedIn sees the two match. (Tell
   me when the URL exists and I'll wire the footer link.)

### Draft company page copy

**Tagline (max 120 chars):**
> AI tattoo design and artist matching. Think it. Ink it.

**About (paste and trim to taste):**
> TattTester turns a sentence into a tattoo you can actually get.
>
> Describe an idea in plain language — slang welcome — and our design engine
> returns four distinct interpretations in seconds. Refine the linework, mask and
> regenerate a region, export a stencil. Then match with real tattoo artists by
> portfolio fit, style and location rather than by who paid for placement, and
> book the chair with the deposit and fees shown up front.
>
> Permanent decisions deserve a rehearsal. We're building the step that has been
> missing between "I want this" and a needle.
>
> Founded 2026. Bootstrapped.

**Industry:** Software Development
**Company size:** 1 employee (0–1)
**Specialties:** Generative AI, Tattoo Design, Artist Discovery, Semantic Search, Consumer Marketplace
**Website:** https://tatttester.com

---

## 5. Draft application answers

Adapt, don't paste blind — reviewers can tell.

**What are you building?**
> TattTester is an AI-native platform for designing a tattoo and finding the
> artist who should execute it. Users describe an idea in one sentence — over
> web or SMS — and get four distinct design interpretations back, which they can
> then refine region-by-region and export as a stencil. A semantic matching layer
> pairs the finished design with artists whose actual portfolio fits the style,
> and handles booking and deposits end to end.

**How do you use LLMs today?**
> LLMs are the core of the product, not a feature on the side. We run a
> multi-agent "Council" that expands a user's plain-language prompt into a
> structured generation spec, a vision lane that reads reference images users
> upload, an extraction service that turns free-text and SMS conversation into
> structured design intent, and a conversational agent (SketchBot) that runs the
> whole intake over text message. We already route Claude through OpenRouter —
> Sonnet for prompt enhancement, Haiku for the fast and vision lanes.

**How would you use the credits?**
> Two things. First, move SketchBot's conversational engine onto Claude — it is
> the highest-judgment surface we have, and it is currently on a cheaper fallback
> model purely for cost reasons. Second, run a proper evaluation of Claude
> variants across our Council stage, where prompt quality drives image quality
> and therefore our largest per-request cost. Both are experiments we have
> deferred because inference spend competes directly with image-generation spend
> on a bootstrapped budget.

**Funding status:** Bootstrapped. No outside capital raised.

**Team:** Solo founder — Samson Cirocco. *(Adjust if others should be listed.)*

---

## 5a. Production cutover to the new account

**Good news: no code change is required.** All five OpenRouter call sites read
`process.env.OPENROUTER_API_KEY` — nothing is hardcoded:

- `src/services/council/internal/councilService.ts:110`
- `src/services/designConversation/internal/providers.ts:143,226`
- `src/services/intake/internal/extractionService.ts:55,279`
- `src/app/api/v1/council/generate/route.ts:63`
- `src/app/api/health/startup/route.ts:167` (presence check only)

### Where the key lives

| Location | Action | Notes |
|---|---|---|
| **Vercel env — `OPENROUTER_API_KEY`** | **Swap. This is the one that matters.** | Production + Preview + Development scopes. Requires a redeploy to take effect. |
| Local `.env.local` | Swap in each worktree | Otherwise local dev keeps billing the old account. |
| GCP Secret Manager `openrouter-api-key` | Ignore for now | Referenced by `.github/workflows/ci-cd.yml:260`, but the `build` and `deploy` jobs are gated `if: github.event_name == 'workflow_dispatch'` (lines 189, 242) — dormant. Update only if you ever run that manual Cloud Run deploy. |

### ⚠️ Sequencing trap — do not swap the key before credits land

A brand-new OpenRouter account has a $0 balance. If you point production at it
before the credits are applied, `POST /api/v1/council/generate` **hard-fails** —
its fast and vision lanes (`anthropic/claude-haiku-4-5`,
`route.ts:56-57`) are OpenRouter-only with no Vertex fallback.

The other two lanes degrade quietly rather than breaking, because both try
Vertex first and fall back to OpenRouter:
- Council prompt enhancement (`councilService.ts:780-812`)
- SketchBot conversation (`providers.ts` — Vertex primary, OpenRouter fallback)

So: **apply → wait for credits to appear in the new account → then swap the
Vercel var and redeploy.** Verify with `/api/health/startup` and
`/api/health/council` before considering the cutover done.

### Optional tidy-up while you're in there

`OPENROUTER_SITE_URL` currently defaults to `https://tatt-app.vercel.app`
(`councilService.ts:112`) and is sent as the `HTTP-Referer` OpenRouter uses for
app attribution. Setting `OPENROUTER_SITE_URL=https://tatttester.com` makes
attribution match the domain the new account is registered under. Env change
only, no code edit.

Note also that `BUDGET_MAX_SPEND_CENTS` is unaffected by credits — the cap still
applies, which is what you want.

---

## 6. Links

**Check eligibility first**
- OpenRouter usage/spend — https://openrouter.ai/activity
- Program terms (the $500 cap lives here) — https://openrouter.ai/startup-program-terms

**Apply**
- The "Get Deal" listing you were sent — https://www.joinsecret.com/openrouter
- OpenRouter's own program (up to $5,000) — https://openrouter.ai/startup-program
- Mercury perk, if you bank there — https://mercury.com/perks/openrouter

**Domain email**
- Cloudflare dashboard — https://dash.cloudflare.com/ → `tatttester.com` → Email → Email Routing
- Google Workspace, if you want outbound too — https://workspace.google.com/business/signup

**LinkedIn**
- Create the company page — https://www.linkedin.com/company/setup/new/
- Add TattTester as a current position — https://www.linkedin.com/in/me/

---

## 7. Order of operations

1. Enable Cloudflare Email Routing → `samson@tatttester.com` lands in your inbox. *(unblocks #4, fixes the support@ bounce)*
2. Register a **new** OpenRouter account with `samson@tatttester.com`. Leave it at $0 spend. *(clears #5)*
3. Create the LinkedIn company page; add TattTester as a current position on your personal profile. *(unblocks #2b)*
4. Post 2–3 times to the page over a few days.
5. Apply, using `samson@tatttester.com`, drawing on §5.
6. **Wait for credits to land in the new account.**
7. Swap `OPENROUTER_API_KEY` in Vercel → redeploy → verify via `/api/health/council`. *(§5a — do not do this before step 6)*
8. Send me the LinkedIn URL and I'll add the footer link.

Nothing on this list requires a code change. Steps 1–3 are the real blockers;
step 7 is the one with a failure mode attached.
