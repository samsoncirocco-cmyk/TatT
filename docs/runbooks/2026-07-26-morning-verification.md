# Morning verification — design bot + AR preview

**Date:** 2026-07-26 · **Time budget:** ~20 minutes · **Money budget:** under $1 if you follow the steps as written

This is the checklist that decides whether the design bot and AR preview ship.
Nothing below has been verified with real credentials against the deployed
site — every overnight agent ran in demo mode at $0 spend, because agents
cannot sign in (see [Appendix B](#appendix-b--why-no-agent-could-verify-this)).
That gap is the whole reason this document exists.

## How to use this

Steps are ordered **by what kills the release fastest**. Each step says what
to do, what pass and fail look like, and what a fail *means*.

> **If a step is marked KILLER and it fails, stop. The steps after it cannot
> save the release, and running them wastes your morning and your budget.**

Two columns matter for planning your 20 minutes:

| Marker | Meaning |
|---|---|
| 💻 | Browser only — do it on your laptop |
| 📱 | **Needs a real phone.** Camera, touch gestures, and on-skin rendering cannot be faked in a simulator or jsdom |
| 💵 | **Costs money.** Amount noted per step |

### Before you start — two environment facts

**Camera work must use the deployed URL, not `npm run dev`.** `getUserMedia`
requires a secure context. `http://localhost:3000` is treated as secure by
Chrome on the same machine, but **your phone hitting your laptop's dev server
over the LAN is not a secure context and the camera will silently never
start.** For anything with a 📱 camera marker, use
`https://tatt-app.vercel.app` or `https://tatttester.com`.

**Vercel is currently rate-limiting builds.** The last checked PR reported a
Vercel status of `FAILURE` pointing at `upgradeToPro=build-rate-limit`. Before
you trust any preview URL, confirm the deployment you are looking at actually
contains today's commits — a stale preview will make you verify last night's
code and conclude the wrong thing.

---

## Step 0 — Confirm what you are testing 💻 · free · 2 min

**Do:** Check that `main` is green and that the deployment is current.

```bash
gh pr list --state merged --limit 5        # what landed overnight
git -C /Users/samson/TatT fetch origin
git -C /Users/samson/TatT log origin/main --oneline -5
```

Then open `https://tatt-app.vercel.app/design` and confirm it returns a page.

**Pass:** `main` HEAD matches what you expect, and the site loads.

**Fail:** The deployed build predates last night's merges.

**Means:** You are testing yesterday's code. Trigger a redeploy first, or
every result below is about the wrong build. Given the build rate limit, this
is a live risk, not a formality.

---

## Step 1 — KILLER — Can a real user sign in and start a session? 💻 · free · 2 min

Everything downstream is gated on this. `/design` renders logged-out, so the
page loading proves nothing — the wall appears on the first API call.

**Do:** In a **private/incognito window**, go to `/design`. Sign in with
Google or email+password. Type anything into the chat box and send it.

**Pass:** The bot opens with a message asking where on your body and what you
want it to mean, and your reply gets a real answer back.

**Fail:** The sign-in popup fails; or your message produces
`Sign in to continue.`, a 401, or a spinner that never resolves.

**Means:** **Stop. Nothing ships.** Every design-session route calls
`verifyApiAuth` *before* it checks anything else — including before the demo
mode check — so there is no configuration that lets a signed-out user reach
the bot. Steps 2–10 are all unreachable. Fix auth first.

---

## Step 2 — KILLER — Does the conversation reach a proposal and reveal four real designs? 💻 · 💵 **~4–16¢** · 5 min

This is the product. If it does not work, nothing else is worth checking.

**Do:** Have a normal conversation. Give it a placement and a meaning — for
example *"inner forearm"* and *"a piece about my grandfather's fishing boat"*.
Answer its follow-ups honestly for about six turns. When it plays back what it
heard and offers **Show me ▸**, do **both** of these, in two separate sessions:

- **Session A:** tap the **Show me ▸** button.
- **Session B:** ignore the button and *type* `yes`.

**Pass:** Both paths land on the reveal. Four tiles, four distinct images,
all four actually rendering. Typing `yes` transitions **once** — the bot must
not re-emit the same proposal, and you must not see a duplicate playback
bubble.

**Fail:** Either path stalls at the proposal; the reveal shows fewer than four
images; a tile shows a `✕` placeholder; or typing `yes` produces the proposal
a second time.

**Means:** **Stop.** This is the core loop. A blank tile in a *live* session
means the generation or upload path is broken, which is a hard blocker.

> **Cost:** one reveal = 4 images. On the Flux/Replicate lane that records 4¢;
> on the Vertex Imagen lane, 16¢. Doing this twice (sessions A and B) costs at
> most ~32¢. Conversation turns are ~1¢ per 10 turns.

> **Note on blank tiles:** two of the four demo-mode placeholder URLs
> (`src/lib/demo-images.ts`) are **404 right now** — verified this morning.
> That only affects `NEXT_PUBLIC_DEMO_MODE=true`. If you see exactly two blank
> tiles, check whether you are in demo mode before treating it as a generation
> failure. The fix is in PR #177, unmerged.

---

## Step 3 — KILLER — Does the backdrop guard accept *your own* renders? 💻 · free (reuses step 2) · 3 min

**This is the highest-risk item in the whole release, and last night's
measurement made it worse, not better.**

Nobody had ever passed genuine platform output through `assessBackdrop` — only
synthetic fixtures. Overnight I ran the real guard over **300 real Vertex
Imagen renders** that were generated with an explicit `white background`
prompt *and* a negative prompt excluding `skin, photo, realistic body parts`.

**144 of 300 — 48% — were rejected as `opaque-scene`.**

Critically, the guard was **not** malfunctioning. Inspecting the rejects shows
Imagen's most common reading of "white background" is *a photograph of a sheet
of white paper lying on a dark desk, with pens and pencils beside it*. Those
are genuinely scenes, and compositing one really would paste a desk onto your
arm. The 0.5 border threshold and the 235 channel cutoff are sound. **The
problem is upstream: the generator produces scenes instead of flash art.**

Two things stop this from being a settled verdict, and only you can resolve
them this morning:

1. Those 300 images came from the **Vertex Imagen** lane. Under ADR-0023 the
   design bot routes most styles to **Flux dev / Krea**, and reserves Vertex
   for realism/portrait. Flux has better prompt adherence. **The Flux lane is
   completely unmeasured.**
2. The design bot appends a stricter clause than the portfolio script did —
   `"Presented as flash art on a plain white background — the design only, not
   photographed on skin."`

**Do:** On the reveal from step 2, tap each of the four tiles in turn and
proceed to the placement preview.

**Pass:** All four tiles composite. You see your design laid onto the photo.

**Fail:** One or more tiles show *"This render is a photo, not flash art on
white — it can't be laid onto your own photo without pasting the whole
picture. Pick another design."*

**Means:**
- **0 of 4 refused** — the Flux lane holds the presentation pin. Ship it. The
  48% figure is a Vertex-lane problem; note it for realism sessions and move on.
- **1 of 4 refused** — acceptable but visible. Users will hit a dead tile
  sometimes. Ship with it logged as a known defect.
- **2+ of 4 refused** — **blocker.** Users cannot reliably reach the preview,
  and the failure lands *after* they've spent money and formed an expectation.
  Fixing this is a generation-prompt problem, not a threshold problem — do not
  "fix" it by lowering the 0.5 threshold, which would let real desk photos
  through onto people's arms.

> Also worth knowing: trimming uniform letterbox bars before assessing rescued
> only 13 of the 144 rejects, so aspect-ratio padding is a real but minor
> contributor. It is not the fix.

---

## Step 4 — CORS on production design URLs 💻 · free · 1 min

**Already verified this morning at the bucket level — you probably do not need
to do anything here.**

I confirmed live against the `tatt-pro-assets` bucket that the CORS policy is
applied and propagated:

| Origin | `access-control-allow-origin` |
|---|---|
| `https://tatttester.com` | returned correctly |
| `https://tatt-t.com` | returned correctly |
| `https://image2ink.com` | returned correctly |
| `https://evil.example.com` | correctly absent |

**Do:** Nothing extra — step 3 already exercised it. If step 3 passed, CORS
works end to end.

**Pass:** Step 3 composited without a *"This design couldn't be read for
preview (its host blocked pixel access)"* message.

**Fail:** You see that pixel-access message.

**Means:** The bucket policy is correct, so a failure here is *object-level*,
not policy-level — a signed-URL or ACL problem on the specific object, not the
CORS config. Replicate-delivered images were never affected by this.

---

## Step 5 — 📱 KILLER for AR — Placement preview on a real phone 💵 free · 3 min

**Do:** On your phone, at `https://tatt-app.vercel.app`, run a session to the
placement preview. Upload a photo of the body part you named. Then:

- **Pinch** with two fingers to scale
- **Twist** with two fingers to rotate
- Drag the **corner knob** (bottom-right) to scale+rotate together
- Tap the **top-left knob** to remove

**Pass:** All four gestures respond smoothly, and the page itself does not
pan or zoom while you are manipulating the design.

**Fail:** Gestures do nothing; the whole page zooms instead of the design; or
the design jumps erratically.

**Means:** **Blocker for the AR half.** These gestures have **zero test
coverage** — jsdom cannot dispatch real multi-touch, and the test suite mocks
Fabric.js entirely, so the green suite says nothing about them. This step is
the *only* evidence that the core interaction works. If it fails, the preview
is not shippable even if everything else passes.

---

## Step 6 — 📱 `multiply` on dark skin 💵 free · 2 min

**Do:** Same preview, but use a photo of the **darkest skin you can
photograph**. Place a design and look at it honestly.

**Pass:** The ink is visibly present and reads as a tattoo.

**Fail:** The design essentially vanishes into the skin.

**Means:** This is a **judgement call, not a bug** — see
[Decision 2 notes](#the-two-open-decisions). `multiply` darkens by
definition, so on deep skin tones dark ink approaches invisible. Skin-tone
matching is explicitly v2 and there is no tone detection in the code today.
The question is whether "the preview is weak on dark skin" is an acceptable
launch state or an equity problem you are unwilling to ship. **Do not let an
agent decide this for you.**

---

## Step 7 — 📱 A large photo 💵 free · 1 min

**Do:** Upload a full-resolution 12MP photo straight from your camera roll.

**Pass:** It either works, or it fails **immediately and clearly** with
*"imageData exceeds the 8MB limit"*.

**Fail:** It hangs, spins indefinitely, or dies silently.

**Means:** A hang here is worse than a rejection. Note the cap is on the
**exported composite**, not your upload — your photo never leaves the browser,
and the client already downscales its export to 1600px longest edge, so this
should pass. If it hangs, the export path is the suspect, not the upload.

---

## Step 8 — Share round trip 💻 · free · 2 min

**Do:** Save the placement preview, then share it. Copy the link. Open it in a
**private window while fully logged out**.

**Pass:** The shared preview renders for a logged-out visitor.

**Fail:** The link 404s, demands sign-in, or shows a broken image.

**Means:** Sharing is the growth loop — a share link that requires an account
is worthless. Note the share button is deliberately disabled until you save,
and shares only the *saved* URL, never the local canvas. If the button never
enables, the save step failed, not the share step.

---

## Step 9 — 📱 Live AR camera mirror 💵 free · 3 min · **only if PR #175 has merged**

Live AR is **not on `main`** as of this writing. `/visualize` is a static
"Coming Soon" page. Skip this step entirely unless #175 landed.

**Do:** Open `/visualize` on your phone **at the deployed HTTPS URL** (not the
dev server — see the secure-context note at the top). Test three failure paths
deliberately:

1. **Deny** camera permission when asked
2. Open the camera in another app **first**, then load the page (camera busy)
3. Enter, then **exit** the AR view

**Pass:** Each failure produces a clear, terminal, honest message. Exiting
releases the camera — the indicator light goes off.

**Fail:** Any of the three shows an infinite spinner, a black screen, or a
message implying it is still trying.

**Means:** A spinner that never resolves is a worse experience than an honest
"we can't use your camera". Also note: **this is a camera mirror with no body
tracking** — see [Decision 2](#decision-2--whether-live-ar-ships-at-all).

---

## Step 10 — Budget sanity 💻 · free · 1 min

**Do:** After all the above, check what you actually spent.

**Pass:** Total well under the `BUDGET_MAX_SPEND_CENTS` cap of **5000** ($50/mo,
set in prod; the code default is 50000).

**Fail:** Spend is far higher than the ~20–50¢ this runbook should cost.

**Means:** Something is generating more than it should. Note the budget
tracker **fails open** — if Firestore is unavailable it allows the request and
logs a warning, so a silent Firestore outage means *no cap at all*. Worth a
glance at the logs for `budget.check_failed`.

---

## The two open decisions

These are yours. They block "shippable" regardless of how clean the code is,
and no amount of testing resolves them.

### Decision 1 — Placement on the forced-proposal path

`hasRequiredFields` demands a placement before the bot proposes. But the
**turn-12 forced proposal bypasses that check entirely** — the cadence ladder
tests `userTurn >= 12` *before* it consults readiness. So a user who never
states a placement can be force-proposed, confirm, and generate.

When that happens the two halves disagree: the brief records placement as
`""`, while the prompt builder's `record.placement || 'forearm'` silently
renders a **forearm** piece with forearm aspect ratio and forearm anatomical
flow. The downstream placement step then gets nothing and falls back to
generic copy. The user is shown a forearm tattoo nobody ever agreed to.

**Options:**

1. **Consult `hasRequiredFields` on the forced branch** — at turn 12, if
   placement is missing, ask for it instead of proposing. Honest, but it
   changes the ADR-0021 cadence and **breaks the test that encodes it**
   (`forces the proposal at user turn 12 with a best-guess playback`).
2. **Record a placement the user never gave** — make the `|| 'forearm'`
   fallback explicit by writing `forearm` into the brief so render and brief
   at least agree. Cheap, but it puts words in the user's mouth.
3. **Ship as-is** — the playback does disclose *"with the placement still
   open"*, so it is technically surfaced, just not re-asked.

**My recommendation: option 1.** The test encodes the cadence, and the cadence
is the thing that should bend — ADR-0021's intent is "never make the user feel
they failed a test", which a single targeted placement question does not
violate. Option 2 makes the system lie quietly, which is the failure mode the
backdrop guard exists to prevent elsewhere; being inconsistent about that
principle is worse than either option alone. But this is an ADR change and
therefore your call.

### Decision 2 — Whether live AR ships at all

What exists is **a working camera mirror with no body tracking.** That is not
a shortfall in the implementation — MindAR has no body tracking, so tracked AR
was never buildable on the chosen library. The honest framing is: the design
floats in front of a live camera feed; it does not stick to your arm.

**Options:**

1. **Ship the mirror**, labelled honestly as a preview and not a fitting. Gets
   something in front of users now; risks reading as broken to anyone who
   expects AR to track.
2. **Hold it** until MediaPipe PoseLandmarker replaces MindAR, and ship the
   still-photo placement preview alone — which does work, and which does the
   actual job of "what would this look like on me".
3. **Ship it behind a flag** to a small group and watch whether the untracked
   mirror reads as magic or as broken.

**My recommendation: option 2**, with a caveat. The still-photo placement
preview already delivers the core value, and an untracked mirror sitting next
to it invites the comparison it loses. But if you have a demo or investor
conversation this week where live camera matters, option 3 costs little. What
I would not do is option 1 unlabelled — "AR" sets an expectation of tracking
that this cannot meet.

---

## Appendix A — What I re-verified on merged `main` overnight

Current `main` at time of writing: `7516c5d` (merge of #174). Full suite:
**858 passed, 7 skipped, 86 files — green.**

| Beat | Verdict |
|---|---|
| Typing `yes` at the proposal goes straight to reveal, once, no repeat | **Holds.** `confirmationIntent.ts` is on `main` (veto-list-first, then anchored allow-list). Covered green by *"treats typed confirmation intent as one confirm transition, never another proposal turn"* and *"renders the proposal reply once (no duplicate playback bubble)"* |
| Tapping **Show me ▸** reaches the reveal | **Holds** at code and test level — but see note below |
| All four reveal tiles render | **Does not hold on `main`.** 2 of the 4 demo URLs are 404, verified live this morning. Fix is in PR #177, **unmerged**. Demo mode only |
| Placement step reads the intake tag and names it | **Holds.** *"names the placement resolved during intake rather than guessing at the photo"* |
| On-skin design refused with an honest message | **Holds.** *"refuses a design photographed on skin, and adds nothing to the canvas"* |
| Flash art composites, strips to real alpha, side-by-side renders | **Holds.** *"accepts flash art on white and composites it with the multiply blend"* and *"shows the design beside the composite"* |

**Nothing regressed where the fixes met each other** — the combined suite is
green and no beat broke as a result of combining branches.

Two corrections to the assumptions I was given:

- **There is no per-route store split in the design journey.** The `/design`
  route uses plain local `useState`; the only zustand stores in the repo serve
  `/generate`, `/matches`, `/swipe`, and auth. Whatever the reveal-reachability
  fix addressed, it was not a store split.
- **The four-tile fix is not on `main`.** It is in PR #177, which is still
  open. If you want it for the morning, it needs to merge first.

---

## Appendix B — Why no agent could verify this

Not one of the checks above was performed live overnight, and the reason is
narrow and fixable:

**Agents cannot obtain a Firebase ID token.**

- `verifyApiAuth` accepts **only** a per-user Firebase ID token. The shared
  static-token path was deliberately removed — it would have been extractable
  from the public browser bundle.
- Auth is checked **before** the demo-mode branch, so even
  `NEXT_PUBLIC_DEMO_MODE=true` does not open a path.
- The only sign-in methods are Google popup and email+password.
  `signInAnonymously` is used nowhere, and anonymous sign-up is disabled in
  the Firebase project.
- Application Default Credentials on the dev machine lack `signBlob`, so an
  agent cannot mint a custom token server-side either.

The result: agents can read code, run the suite, and probe unauthenticated
surfaces — and that is exactly what happened. Every claim of "works" from
overnight is a claim about *tests*, not about the product.

**This is a recurring cost, not a one-off.** Every future night of agent work
hits the same wall on any authenticated journey. Ways out, cheapest first:

1. **A dedicated test user + long-lived refresh token** in the agent
   environment. Agents exchange the refresh token for an ID token via the
   Firebase REST API and call the real routes as a real user. Cheapest, and it
   keeps the auth model intact. Scope the account to a non-production project
   or a clearly-marked test tenant.
2. **Grant the dev service account `roles/iam.serviceAccountTokenCreator`**
   so ADC can `signBlob` and mint custom tokens. Broader blast radius — that
   role can impersonate — so prefer option 1 unless you need it for signed
   GCS URLs anyway.
3. **Enable anonymous Firebase sign-in** in a staging project only. Simplest
   to turn on, but it changes the product's auth surface, so never in prod.

Until one of these exists, treat every overnight "verified" as "verified
against tests" and budget your own morning for the real thing — which is
precisely what this runbook is.
