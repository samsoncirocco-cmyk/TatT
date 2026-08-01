---
status: accepted
---

# The Studio is the refinery: three gears, bounded fixes, phone-first

Studio grill, 2026-07-30. ADR-0017 left the Studio on an open verdict —
*invest or delete based on real usage* — and no usage ever arrived to decide
it. Meanwhile `/design` became the one door (ADR-0028) and took over intake,
prompting, and style selection, which left the Studio holding a pile of tools
with no stated job. This ADR closes ADR-0017's open question: **we invest, and
the job is refinement.**

## The role

The Studio is **the refinery**: the room where a picked design goes from
*almost* to *yes*. It is entered from a picked design, never from cold. AI
generation reliably lands at ninety percent; the last ten — a mangled hand, a
crowded corner, a character that needs to be bigger — is what stands between an
image someone likes and a piece someone will wear forever. Closing that gap is
conversion work, not a toy.

Consequently the Studio **sheds** what `/design` now owns: the prompt box, vibe
chips, and body-part selector. It **keeps** what serves refinement: inpainting,
cleanup, element regeneration, layers, version history and comparison, stencil
export.

## Three gears, ranked (not three doors)

The lesson of ADR-0028 applies inside the Studio: co-equal entrances leak,
ranked depth does not.

1. **Point and say** — the default surface. Circle the part that's wrong, say
   what's wrong in words, SketchBot redraws only that region. No tool
   vocabulary. This is the same conversation the product already runs (ADR-0019
   through 0023, and the vision capability of TAT-50), zoomed into one square
   inch. Layers and blend modes still execute underneath; they are simply never
   shown here.
2. **Plain-language tools** — one tap deeper: redraw area, erase, resize part,
   undo. For someone who knows exactly what they want and doesn't feel like
   typing it.
3. **The full bench** — behind an explicit door: layers, blend modes, version
   timeline and compare, element regeneration. ADR-0017's "power tools behind
   explicit doors" rule, now applied *inside* the Studio. Nobody stumbles in;
   anybody may walk in.

## Fixes are bounded, and the boundary sells

Every fix is a real generation call against the real cap, and point-and-say is
designed to invite tinkering — an unmetered path would be a genuine present-day
spend problem, not a launch-day one. Each design therefore carries a generous
per-design fix allowance (25 as of the 2026-08-01 amendment below; env-tunable, drawn from the same global
budget as every other generation).

The ceiling is **spoken in voice, not enforced as a paywall**: someone on their
seventh fix has stopped refining and started avoiding commitment, and the true
thing to say is that this is what an artist is for. The limit ends in a booking
prompt, not a purchase prompt. Consumer credits stay deferred (ADR-0030).

## Phone-first, honestly

Gears 1–2 are phone-native — circling a flaw with a thumb and typing what's
wrong is a better phone gesture than a desktop one, and the audience arrives
from TikTok and Instagram. Gear 3 is desktop-only: layer stacks and blend modes
want pixels and a cursor, and a cramped phone imitation would be worse than an
honest in-voice handoff offering the link for later. Rejected: full mobile
parity (most expensive work, smallest audience) and a desktop-only Studio
(strands the mobile majority at exactly the *almost* moment).

---

## Amendment — 2026-08-01: the fix allowance is 25, not 5–8

The band above was set before anything shipped, reasoning from cost. Samson
raised it to **25** with the reveal working end to end and the post-reveal
critique lane (ADR-0039) drawing from the same counter.

Why the original band was wrong: 5–8 was picked to fence spend, but the
allowance is not the spend control — `checkBudget`/`recordSpend` against
`BUDGET_MAX_SPEND_CENTS` is, and it is unmoved by this. What the allowance
actually governs is **when a person is told to stop tinkering**, and a tattoo
is permanent. Someone who wants a ninth adjustment before committing to
something they wear forever is the customer this product is for, not an abuse
case. Cutting them off at 8 protects a cap that is already protected.

The arithmetic, stated so the next person does not have to rediscover it:
worst case per session becomes 4 reveal + 25 fixes + 1 refine = **30 renders**,
roughly 75¢ at the Flux rate the reveal path actually uses. Against the current
$500/month cap that is ~660 fully-exhausted sessions a month, and nobody uses
the whole allowance. The global cap still stops the bleeding if that is wrong.

Set via `NEXT_PUBLIC_STUDIO_FIX_ALLOWANCE`; `DEFAULT_STUDIO_FIX_ALLOWANCE`
stays the in-code fallback. Revisit when real usage exists — if the median
session uses 20+, the designs are not good enough on the first pass and the
fix is upstream, not a smaller number here.
