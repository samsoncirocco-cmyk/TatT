---
status: accepted
---

# The Idea is the concept, not the character

Grill session, 2026-08-05, prompted by a live session (`0f6234e9`) that stalled.
The customer asked for punk Nelson from The Simpsons, got four cuts, then said
"lets try and make it specifically of Homer Simpson" — same arm, same punk
register, same hard dark lines, same don't-clash-with-Greek-myth-later
constraint. Nothing in the system could say whether that was the same tattoo
idea or a different one, so nothing could carry the thread forward. Fifty turns
later there would be no record that any of it was a Simpsons piece.

The design session is the wrong unit for this. A session is one sitting; the
thing the customer is actually pursuing outlives it, spans channels (web and
SMS), and survives the subject changing underneath it.

## Decision

**Idea** is the durable unit above the session, and it holds the *concept* —
placement, register, style intent, and standing constraints ("has to sit next
to Greek myths later"). The **subject** (Nelson, Homer, a kraken) is a mutable
field inside the Idea, not part of its identity. Swapping the character is an
iteration within the Idea; it does not start a new one.

An Idea keeps the subjects it moved off. A swap records the previous subject as
abandoned rather than overwriting it, because what a customer rejected is signal
of the same kind as what they picked (ADR-0022's raw material).

An Idea carries a nullable parent for the piece it belongs to — the sleeve, the
half-sleeve, the back. Deliberately not modeled beyond the link: the customer in
`0f6234e9` opened by describing exactly this ("build out a sleeve eventually...
consistent style that won't block me out of other tattoos later"), so the
relationship is real, but nothing consumes it yet and guessing its shape now
would be guessing.

When the classification is genuinely unclear the router asks rather than
choosing (ADR-0056), and that question doubles as a taste probe — "fresh takes
on the Simpsons piece, or something completely different?", "want to lose the
art direction too?"

## Rejected

- **Subject changes fork a new Idea.** Preserves the trail through a link, but
  fragments the thing the customer experiences as one pursuit, and splits the
  taste signal across records that each hold too few data points to be worth
  reading.
- **Subject simply overwrites.** Simplest, and what the current `IntakeRecord`
  effectively does. Rejected because it silently discards the rejection signal —
  the customer moving off Nelson is one of the more informative things that
  happened in that session.
- **Session as the durable unit.** Already available and already logged. Cannot
  span channels, cannot survive a re-entry days later, and dies at the point
  where the interesting iteration begins.

## Consequences

`buildPlayback` currently speaks the concept and drops the character — session
`0f6234e9` was told "a blackwork piece on your right arm — punk with a tear",
with Nelson nowhere in the sentence, because no character label resolved and it
fell through to `record.meaning`. Once concept and subject are formally separate
the read-back owes the customer both, and that fallback becomes a bug with a
name rather than an oddity.

Identity becomes a prerequisite. `SmsProfile` already anchors on E.164 and
carries `sessionIds` as "the taste-signal trail"; `DesignSession` has no owner
field at all. An Idea cannot span sessions on web until web sessions have an
owner, so that work is now on the path rather than beside it.
