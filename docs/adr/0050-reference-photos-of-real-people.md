---
status: accepted
---

# Reference photos of real people reach the image model

Owner decision, 2026-08-05 (TattTester Buzz channel). Answers 1-6 of a
31-question decision set; every position below is Samson's, not an agent's.

## Context

Reference images have been accepted since TAT-50 on both doors — inbound MMS
(`sketchbotSms/internal/media.ts`) and web upload
(`/api/v1/design-session/[id]/reference`). But the pipeline turns a photo into
**words**: `analyzeReferenceImage` reads it with `gemini-3.1-flash-lite` and
`applyReferenceSignals` merges the resulting description into the intake
record. The pixels never leave for the render API.

The consequence is that a customer who uploads a picture of their own dog gets
*a* dog. `ANALYSIS_PROMPT` only names *"specific, recognizable (possibly
copyrighted) characters... never guesses"*, so a pet or a partner returns an
empty `characters` array and there is nothing for the prompt to anchor a
likeness to. The system was built to recognise Goku, not somebody's family.

ADR-0048 moved the cast lane to `google/nano-banana-2`, which accepts
reference images natively. That made the missing link cheap.

## The decision

**A reference photo may depict identifiable real people, pets and things, and
the image itself is sent to the render provider** so the design can resemble
the subject rather than a generic stand-in.

The positions behind that, each decided by the owner:

| | |
|---|---|
| **Retention** | Kept for the life of the session, then dropped. |
| **Attestation** | The uploader must have rights to the image **and** permission from any identifiable person in it. |
| **Deceased people** | Explicitly allowed with no extra step. Memorial tattoos are ordinary tattoo work and a flow that fights them is wrong for this product. |
| **Disclosure** | The third-party render provider is named plainly in the terms, plus a one-line note at the point of upload. Not buried. |
| **Deletion** | Self-serve, in settings. |
| **Minors** | **No rule.** See below. |

## On the minors question, recorded honestly

The recommendation was to prohibit photos containing minors outright. **The
owner chose no rule**, and when the consequence was put to him he reaffirmed
it with his reasoning:

> *"we are getting rid of the photo on our end at the end of the session, it's
> no different than them choosing to upload a photo into Google or ChatGPT."*

That reasoning is recorded because it is the decision, and it is coherent: the
retention answer above is what carries it. A family photo passed to a
general-purpose AI service is an ordinary thing people already do knowingly,
and this product does it for a narrower purpose and keeps nothing afterwards.
The disclosure answer means they are told which provider it reaches before
they send it.

This ADR does not invent a prohibition the owner declined — that failure mode
is exactly what ADR-0053 exists to prevent. What it does record is that this
remains the position most likely to be revisited under counsel review, since
some jurisdictions treat facial data of minors under their own statutes
regardless of retention. It goes to
`docs/legal/likeness-counsel-notes.md` as an open question **for counsel**, not
as an agent's second opinion on a settled call.

## Consequences

- The render request gains a reference-image input distinct from the refine
  path's `sourceImage`, which carries a *design*, not a photo.
- Attached photos pin the session to the strong lane regardless of cast size
  (owner answer 18a): likeness is the hardest thing we ask an image model for,
  and the measured lane gap is largest exactly there.
- The terms and privacy pages gain sections stating the six positions above.
  Their prose is drafted from **this** ADR — the positions are settled here,
  by the owner, and the drafting step implements them rather than choosing
  them.
- `MAX_REFERENCE_IMAGE_BYTES` (5MB) and `MAX_REFERENCE_IMAGES_PER_MESSAGE` (3)
  are unchanged; nano-banana-2 accepts more references than we send.
