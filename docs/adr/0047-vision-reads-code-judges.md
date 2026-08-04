---
status: accepted
---

# A vision model reads the image; code decides what it means

Measured 2026-08-04 while building the unrequested-lettering guard (#297).
The guard has to answer one question — *does this render contain words the
customer did not ask for?* — and that question splits into two jobs that look
like one.

## The problem this records

Every image model measured writes words into roughly one render in five. On
the same corpus through the real prompt path (#293, n≈20 per arm):

| lane | renders containing unrequested lettering |
|---|---|
| Gemini 3.1 Flash Image | 30% |
| Imagen 4 via Replicate | 22% |
| Flux dev | 20% |

The words are not noise — renders came back carrying `GOKU`, `VEGETA`,
`PLUS ULTRA!`, and one carried a scraped Instagram handle. No routing choice
removes this; only a gate does.

But a gate that rejects all lettering breaks the product. Script tattoos,
memorial names and banner text are ordinary tattoo work. So the gate must
distinguish lettering the customer **asked for** from lettering the model
**invented**.

## The decision

**The vision call does OCR and nothing else. A deterministic test on the
request decides whether the lettering belongs.**

Not: one multimodal call given both the image and the request, asked to
judge. That is the obvious design, it is what was specified, and it does not
work.

## Why — three failed attempts, one direction

Each version was validated against real renders from the bake-off, not
reasoning:

1. **Given the image and the request, asked "is any of this lettering
   unrequested".** Given *"Goku and Vegeta standing together"*, it saw `GOKU`
   lettered across the artwork and called it **requested** — the names appear
   in the request, so it reasoned they belonged. That is precisely the case
   the guard exists for, and it sailed through.

2. **Wording sharpened** to state that naming a subject is not asking for that
   name to be written. Fixed case 1, broke the opposite: a request explicitly
   asking for names *"lettered in a banner"* was now flagged as intruded.

3. **Example wording neutralised**, in case the example's words were
   contaminating judgment on those specific images. Same failure as 2.

Three attempts, one direction: **with pixels in front of it, the model reads
lettering as a defect regardless of what the request says.** A fourth wording
was not going to fix a systematic bias, so the shape changed instead.

## What that buys

Splitting the jobs gives each side the one it is good at. OCR is what vision
models are reliable at. The request is text *we generate* — `structuredMode`
builds it — so a keyword test over it is auditable, free, deterministic, and
cannot be talked out of its answer by a picture.

Validated 6/6 across both directions, including the decisive pair: **the same
image scored intruded when only figures were requested and clean when the
lettering was requested.** The single-call versions could not do that.

## The cost, stated honestly

The deterministic half is a keyword list, and a keyword list misses phrasings.
That failure is bounded in the safe direction *for misses*: an unrecognised
way of asking for script flags a legitimate tattoo, costing a re-roll and a
metadata flag — nothing here withholds a design.

It is **not** automatically safe for phrasings that match the wrong way. The
first version matched `text` inside `texture` and `no text`, so a customer
explicitly declining lettering would have disabled the gate. Word boundaries
and negation stripping fix those two; the general lesson is that this half
needs its cases enumerated, not trusted.

## The wider lesson, which cost more than the design

The classifier was validated 6/6 against PNGs on disk and was right. The
plumbing around it had never seen a real provider result and was wrong:
`resolveImagePayload` assumed a data URL, while Replicate returns an HTTPS
URL. On Flux — the lane actually in production — the gate would have skipped
every render and recorded `textGuardSkipped: parse`.

**Installed and doing nothing is the failure mode that survives every unit
test and every demo**, because the unit tests stub `fetch` and the demo never
runs the real provider. `textGuard.live.test.ts` exists for that reason: opt-in
behind `TEXT_GUARD_LIVE=1`, and it asserts `screened`, not `intruded` — a
skipped verdict is indistinguishable from a clean one at a glance, which is
exactly how the bug survived review.

## Where this generalises

Any check of the form *"is this model output wrong, given what was asked"*.
Put the perception in the model and the judgment in code, and keep a live
check for the seam between them.
