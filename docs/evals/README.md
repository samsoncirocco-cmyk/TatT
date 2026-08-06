# Router evals

Golden sets for the session router (ADR-0056) and the memory writes it drives
(ADR-0055, ADR-0057, ADR-0058). Each turn states the message that arrived, the
route it should take, and the memory writes that should result.

These exist because the router is a judgment call, not a rule table, and the
only honest way to change judgment is to replay it against turns whose right
answer is already agreed.

## Reading a file

- `source: "live"` — verbatim from a real session. Not paraphrased, typos
  included. `sessionId` and `capturedAt` say where it came from.
- `source: "synthetic"` — written to cover a route the real session never
  exercised. Clearly marked because a synthetic turn proves less than a real
  one.
- `actual` — present only where today's system gets it wrong. These are the
  regression cases; the file is the record of the bug, not just the spec.
- `expectedWrites` — the graph writes, with facet and relation
  (ADR-0058). Replaying a turn twice must produce the same graph, so every
  write is idempotent by contract.

## Sets

| File | What it covers |
|---|---|
| `router-golden-0f6234e9.json` | The 2026-08-05 stall. Intake through reveal, subject swap, two re-roll refusals, plus synthetic commentary / rejection / new-idea / ambiguous turns. |
| `router-golden-smash-cast.json` | The other 2026-08-05 session. Four characters named on the opener, two survived grounding — an unverifiable franchise and a corrected typo each deleted a person. |

## Adding to a set

Prefer real turns. When a session goes wrong, capture it here before fixing it —
a bug with a golden turn attached cannot silently come back, and the ones worth
capturing are exactly the ones nobody predicted.
