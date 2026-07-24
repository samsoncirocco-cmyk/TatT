# Intake conversation cadence: 6 / 12 / 20, never exposed as a limit

The bot is a tattoo design consultant, not a companion: its job is to get the user to four designs, not to have a long conversation. Cadence: aim to propose (ADR-0020) within ~6 user turns; at turn 12, propose with its best guess regardless; at turn 20, warm handoff — "Sounds like you're still working out the concept — that's actually a great reason to talk to an artist directly. Want me to find a few who do free consultations in your style?" — into artist matching.

The caps are never surfaced as limits. The user should feel the bot made a judgment call on their behalf, not that they failed a test.

## Consequences

This is the intake-side twin of the refinement hard stop (ADR-0013): both exist because unbounded interaction quietly turns the confidence layer into an AI toy people talk to and never book from. The turn-20 handoff converts the failure mode (user can't converge) into the product's actual goal (talk to an artist).
