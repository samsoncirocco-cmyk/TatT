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
per-design fix allowance (default 5–8, env-tunable, drawn from the same global
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
