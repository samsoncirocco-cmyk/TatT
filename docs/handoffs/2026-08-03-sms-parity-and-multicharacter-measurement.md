# Handoff — SMS/web parity, the stencil chain, and the first multi-character measurement

Date: 2026-08-03
Branch: `worktree-sketchbot-stencil-chain` (9 commits ahead of `main` @ `1bfd18a`) — since merged as #298–#302; the branch is deleted.
Classification: historical evidence (`docs/handoffs/**`) — does not establish current product truth.

> **Superseded in one part, 2026-08-04.** Every cast-completeness number
> below measured `imagen-3.0-generate-001`. Google is retiring every
> `imagen-*` endpoint (announced 2026-08-17), the Vertex provider moved to
> `gemini-3.1-flash-image` (#277), and the re-measurement on the live lanes
> (#293) found **Flux 39–49%** and **gemini-3.1-flash-image 100%** on 3+
> character requests. Cast size now routes to the Gemini lane (#314). Cite
> #293 for cast completeness, not this document. Everything else here —
> the presentation measurement, the "shpler" finding, the identity-clause
> regression on Flux, and the shipped work — still stands.

---

## Why this work happened

The question was whether image generation should move to a multi-node
workflow. Answering it turned into three things: a product gap that got
built, a measurement that had never been taken, and a routing decision that
turns out to be backwards.

---

## 1. What shipped

Nine commits, all rebased onto current `main` so PR #275 is included. Full
suite green against the pre-existing baseline (4 failing files, all
AR/canvas jsdom issues: `ARMirror`, `PlacementPreview`, `captureService`,
`designSource`). Build and lint clean.

| Commit | What |
|---|---|
| `21cf618` | `sourceImage` / `sourceStrength` on `GenerationRequest` — image-to-image |
| `97e0e93` | SMS gets the whole post-reveal journey (critique, pick, refinement, handoff) |
| `ff666af` | Stencil derived from the approved design |
| `e9caed2` | Placement preview over SMS (server-side compositing) |
| `aaf98c2` | Backdrop harness can measure the Flux lane |
| `83c1173` | Stencil prompt strength raised to the measured 0.9 |
| `1344c9d` | Cast-completeness harness |
| `ce3b6c2` | Cast corpus fixed to send the prompt production actually sends |

### SMS/web parity

SMS previously stopped dead after four cuts arrived. It now reaches every
step the web does:

| Step | Web | SMS before | SMS now |
|---|---|---|---|
| Chat, reference photo, four designs | yes | yes | yes |
| React and get fixes (25 allowance) | yes | no | **yes** |
| Pick favourite + least favourite | yes | no | **yes** |
| Refinement question → final version | yes | no | **yes** |
| See it on your own body | yes | no | **yes** |
| Brief that reaches an artist | yes | no | **yes** |

Two rules exist only on SMS, because the web gets them free from its UI:

- **`isBarePickReference`** — on the web a pick is a click and a critique is
  typing. Over SMS both are text, and `isFixRequest` treats almost anything
  as a fix, so a bare "2" would have spent a render re-cutting cut 2 against
  the instruction "2". A choice and nothing else is a pick; a choice inside
  an instruction is a critique.
- **`RESTART_INTENT`** — a web user starts over by navigating back to
  `/design`. A texter has one thread, so without an explicit "start over"
  they would critique the same four cuts forever.

Decisions embedded in that work, worth not re-litigating blindly:

- Spend is recorded by the designSession service for critique and
  refinement, **never** in the SMS adapter. An earlier draft of this branch
  double-charged; `main` moved spend into the service while this branch was
  in flight.
- The fix allowance is the web's full 25 for any phone number. Samson's
  call, asked and confirmed. `BUDGET_MAX_SPEND_CENTS` remains the backstop.
- `?ds=` is **not** added to the public `/share/<id>` artist link — that
  surface is public and the brief carries the customer's verbatim meaning
  text.
- Body photos are composited in memory and **never persisted**. The web
  never stores them either (it composites in-browser and uploads only the
  result). Only the composite is stored, because the Brief carries it.

### The stencil chain

A finished session now produces two artifacts: the colour design the
customer approved, and black line art the artist works from. The stencil is
derived from the approved **image** via image-to-image, never re-prompted
from text — re-prompting yields a different tattoo.

- Only `flux-dev` accepts a source image. `flux-schnell` has no image input;
  `krea2` has style-reference only, which transfers style rather than
  preserving composition. Verified against published schemas 2026-08-01.
- Providers **refuse** a source image they cannot honour rather than
  silently rendering from text — a silent drop returns a different design
  and the caller cannot tell.
- Off by default behind `STENCIL_DERIVATION_ENABLED` (one render/session).
- `STENCIL_PROMPT_STRENGTH` = **0.9**, measured. The original 0.65 was a
  guess and produced the approved design lightly desaturated, not a stencil.
  Usable band is 0.85–0.95.

---

## 2. What was measured

Two harnesses, both reusing production code so they cannot drift from what
ships.

### Presentation — closed, and the answer is good

`scripts/measure-backdrop.mjs` scores whether a render is flash-art-on-white
rather than a photograph of skin. ADR-0023 measured this 12/12 on Imagen and
**never on Flux**, which is the lane most sessions use — the gap that ADR's
Consequences section admits. The reason was mechanical: the generator script
said "Vertex Imagen only… REPLICATE_API_TOKEN is not available locally,"
which is no longer true.

**Result: 24/24 across both prompt sets, border fraction 1.000 at p10/p50/p90.**
The Flux lane holds flash-art-on-white. This question is settled.

### Correctness — newly measured, and it is the real problem

The backdrop gate is **blind to whether a design is right**. Concrete proof
from the same run: a lettering design asked for a grandmother's name scored
a perfect 1.000 and reads **"shpler"**. A four-hero sleeve containing one
hero would also score 1.000.

`scripts/measure-cast.mjs` scores what fraction of a requested named cast
actually appears. Five casts of 2–5, four variations each.

| Lane | Cast completeness | Full cast |
|---|---|---|
| Flux, identity clause off | 71.4% | 9/20 |
| Flux, identity clause on | **48.1%** | 6/20 |
| **Imagen, identity clause on** | **92.0%** | 13/19 |

Kingdom Hearts specifically: **Imagen 94%** (3 of 4 renders complete,
visually correct — Riku silver-haired, Kairi red bob, Sora's crown necklace,
Roxas blond) vs **Flux 19%** (0 of 4; two renders returned nothing
recognisable).

**Two findings:**

1. **Imagen is far better at multi-character than Flux**, on the identical
   prompt. Routing currently sends anime/illustrative to Krea and everything
   else to Flux, reserving Imagen for realism/portrait — backwards for
   ensembles.
2. **The identity clause makes Flux worse.** The ensemble prompt in
   `structuredMode.ts` ("exactly four distinct figures… Riku — Kingdom
   Hearts… never swap, merge, or homogenize them") dropped Kingdom Hearts
   from 69% to 19% and Naruto from 100% to 50%. It roughly doubles prompt
   length and Flux loses the subject. It shipped without measurement.

### Caveats that matter

- **One run of 20 per arm.** Directional, not statistically settled.
- **The scorer flatters.** It asks a vision model *which characters are
  present*, not whether they are drawn correctly. A Flux render scoring 4/4
  had four near-identical faces and no silver-haired Riku. Treat every
  number as an upper bound.
- **The first cast run measured the wrong prompt.** Records carried only a
  free-text subject, leaving `requestedCharacters` / `characterIdentities`
  empty, so the ensemble clause never fired. Fixed in `ce3b6c2`. Any future
  corpus record **must** populate those fields.

### Reproducing

```bash
# from the worktree; needs gcloud ADC + REPLICATE_API_TOKEN
export REPLICATE_API_TOKEN=$(grep -oE '^REPLICATE_API_TOKEN=.*' .env.local | cut -d= -f2-)
node_modules/.bin/vite-node -c vitest.config.js scripts/measure-cast.mjs -- /tmp/cast-imagen imagen /tmp/cast-imagen.json
node_modules/.bin/vite-node -c vitest.config.js scripts/generate-backdrop-sample.mjs -- /tmp/bd tuning flux
node_modules/.bin/vite-node -c vitest.config.js scripts/measure-backdrop.mjs -- /tmp/bd
```

Roughly $0.50 per cast run, $0.30 per backdrop run.

---

## 3. Where the multi-node question landed

The original pitch — add nodes to fix image quality — was aimed at the wrong
problem, and the measurements point somewhere cheaper for *accuracy*.

But the founder's reframing is right and was under-weighted during this
session. Two distinct failures were being collapsed into one metric:

- **Characters dropped or blended** → fixed by routing to Imagen. Done
  cheaply, no architecture.
- **No control over individual characters** → *not* fixed by routing, and
  this is what a per-character flow solves.

Today the critique loop re-cuts the **whole image**. Fixing Riku's keyblade
re-rolls Sora. You cannot keep Sora from render 2 and Kairi from render 4.
And a single render produces a fused composition, not the separable linework
an artist rearranges — which is exactly what the founder's own reference
example asked for ("so the lines can be easily edited and arranged on an
iPad").

**The one real boundary on the per-character approach:** separately
generated characters can be *arranged* but cannot *interact*. A vertical
stacked sleeve works. Characters mid-fight with crossing keyblades does not
— interaction has to happen inside one render.

Much of the per-character path is now closer than when
`docs/sleeve-forge-plan.md` proposed it in May: the critique loop,
image-to-image, and the pick flow all exist. What is missing is splitting a
cast into per-character sessions and assembling approved characters.

---

## 4. Open decisions

*Resolution status, 2026-08-04: (1) is decided — ADR-0045. (3) is decided
and shipped — the Vertex lane IS a Gemini image model now (#277) and 3+
casts route to it (#314). (2) remains open.*

1. **Assembly: human or automated?** The May plan assumed the human
   composes (no auto-layout code). The founder's iPad comment suggests the
   same. Needs confirming before the per-character path is designed.
2. **IP posture on reference images.** Feeding a copyrighted reference
   *image* into the generator is a different legal posture from naming a
   character in text. Currently references contribute only a one-line text
   description — the pixels are discarded. Wiring them through is now
   trivial (`sourceImage` exists) but is a product/legal call, not a
   technical one.
3. **Whether to add Gemini's image model.** The founder's reference example
   came from `gemini.google.com` directly, not this platform. Vertex access
   exists; the model is not in the catalog. Imagen at 92% may make it
   unnecessary — benchmark before building.

---

## 5. Recommended next steps

**Do regardless:**

1. **Route multi-character work to Imagen.** Largest available quality win;
   a routing-table change, not new infrastructure.
2. **Make the identity clause per-model, or disable it for Flux.** It is
   measurably harmful there.
3. **Adopt both corpora as a merge gate** for any routing or prompt change.
   ~$1 and 20 minutes; would have caught the identity-clause regression.

**Then:**

4. **Design the per-character path** once assembly is decided. This is the
   editability fix, and it is what the founder actually asked for.
5. **Look at a real stencil end to end.** Strength is measured but no one
   has seen one come out of a full session. Flip
   `STENCIL_DERIVATION_ENABLED` and run one.

### The shape that is commercially viable and handles any request

The trap is picking one architecture for every customer. Most tattoo
requests are single-subject — a snake, lettering, a flower — and those work
today for pennies. Four-character sleeves are rare, expensive to render, and
the highest-value bookings. One architecture priced for the hard case
overcharges the common one; one priced for the common case fails the
valuable one.

**Tier the path by what the customer actually asked for, and let cost follow
intent:**

| Tier | Trigger | Path | Cost/session |
|---|---|---|---|
| 1 | 1–2 subjects, any style | today's single render | ~$0.10 |
| 2 | 3+ named characters | single render, routed to Imagen | ~$0.10 |
| 3 | customer wants to change one character, or needs separable linework | per-character + assembly | ~$0.40 |

Tiers 1 and 2 are the default and cover almost every session. **Tier 3 is
entered on demand, never by default** — when someone says "Riku's keyblade
is wrong" or asks for a stacked sleeve. That is also the moment they are
most committed, so the expensive path fires exactly when the session is
most likely to convert to a booking.

The customer never sees any of this. They describe a tattoo and get a good
one. Tiers 1 and 2 exist today or are one routing change away; tier 3 is the
only real build, and it can wait until tiers 1–2 are measured in front of
real people.

**Toward vendor-agnosticism** (the models moved under us twice in one day):

- Route on **declared capability**, not model name. `supportsSourceImage` is
  the seed of this; extend it with reliable-cast-size, negative-prompt
  support, aspect ratios.
- Have the prompt builder emit a **structured brief** and let each provider
  adapter render it to that model's dialect. Today one string goes to every
  model, and the identity clause proves prompts do not transfer.

---

## 6. Known gaps in this work

- `/api/v1/stencil/export` is **still a stub**. It does no image work and
  returns a fabricated `storage.example.com` URL while reporting `dpi: 300`
  and calibration markers. Delete it or build it; it should not remain a
  stub that reports success.
- Client and server disagree on the Imagen model id —
  `imagegeneration@006` in `src/features/generate/services/replicateService.js`
  vs `imagen-3.0-generate-001` server-side.
- Placement preview centres the design and takes only a size hint
  ("bigger"/"smaller"). No repositioning over SMS.
- The Replicate account was under $5 credit during this session, which
  throttles to 6 requests/minute with a burst of 1 — production reveals fire
  four concurrent renders straight into that. Topped up 2026-08-03.
- One Imagen render was refused by the safety filter (`mha-5_v0`), so that
  arm scored 19 rather than 20.
