# Intake conversation cadence: 6 / 12 / 20, never exposed as a limit

The bot is a tattoo design consultant, not a companion: its job is to get the user to four designs, not to have a long conversation. Cadence: aim to propose (ADR-0020) within ~6 user turns; at turn 12, propose with its best guess regardless; at turn 20, warm handoff — "Sounds like you're still working out the concept — that's actually a great reason to talk to an artist directly. Want me to find a few who do free consultations in your style?" — into artist matching.

The caps are never surfaced as limits. The user should feel the bot made a judgment call on their behalf, not that they failed a test.

## Amendment: the turn-12 forced proposal never fires without a placement (2026-07-27)

Owner decision, 2026-07-27: the forced best-guess may fire past every open
question **except placement**. Placement anchors the composite step — the
placement preview trusts the intake tag by spec (per the AR spec), and the
render path refuses to invent one. Before this amendment the forced proposal
bypassed the readiness gate entirely, the brief recorded `""`, and a silent
`|| 'forearm'` fallback in prompt construction rendered a forearm piece the
user never asked for — render and brief disagreed.

So: when turn 12 arrives without a placement, the bot does not propose. It
asks for placement directly — one short, in-voice question, still never
framed as a limit — and the forced proposal fires on the next turn once the
answer lands. The metaphor the decision was made under: the waiter may not
walk to the kitchen without a real order.

The rule's purpose survives intact. The conversation still cannot chat
forever — the gate holds only until placement exists, re-asks
deterministically if ignored, and the turn-20 handoff still closes the
session regardless.

## Consequences

This is the intake-side twin of the refinement hard stop (ADR-0013): both exist because unbounded interaction quietly turns the confidence layer into an AI toy people talk to and never book from. The turn-20 handoff converts the failure mode (user can't converge) into the product's actual goal (talk to an artist).
