---
status: accepted
---

# SketchBot texts first: proactive re-engagement

Owner decision, 2026-08-05 (TattTester Buzz channel). Answers 7-10, plus the
owner's framing: *"we can have sketchbot text them and say i have a tattoo idea
for them based on their usage... there is no issue with giving people ideas if
it helps them get more tattoos."*

Overturns the deferral in ADR-0022 (see ADR-0052).

## Context

Every SMS SketchBot has ever sent was a **reply**. The Twilio integration is a
webhook: a person texts, we answer. Terms §4 says exactly that — *"By texting
SketchBot at the number published on this site you agree to receive
conversational replies."*

The product leaks between designing and booking, and those are separated by
weeks. Nothing currently reaches into that gap.

## The decision

**SketchBot may initiate messages.** Two triggers ship together (answer 8b):

- **Abandoned session** — designed cuts, never booked. Barely promotional: the
  customer started a job and we are helping them finish it.
- **Cold idea** — a later message proposing a design based on what they picked
  before. This is the one that is unambiguously marketing.

**Frequency: at most one message per 7 days** (answer 9b), across both
triggers combined.

**Consent is bundled into terms acceptance** (answer 7b) rather than carried on
a separate opt-in checkbox, and **promotional traffic sends under the existing
A2P campaign** (answer 10b) rather than waiting on a separate registration.

## The risk that comes with 7b and 10b, recorded because it is silent

The recommendation was a separate unchecked opt-in and a separate campaign
registration. The owner chose otherwise, and the calls stand — but the failure
mode does not announce itself, so it is written here.

Under TCPA, a message we initiate proposing a design is promotional, and
promotional messaging is generally held to a stricter consent standard than
the transactional consent terms §4 describes. The practical risk is **not a
lawsuit first — it is carrier filtering.** An A2P campaign registered as
conversational customer care that begins sending promotional traffic can be
throttled or revoked. If the SketchBot number is filtered, the SMS door closes
entirely, and it closes quietly: messages simply stop arriving.

**Mitigation, which changes no decision above:** delivery rate and opt-out rate
are recorded from the first proactive send and surfaced where someone will see
them. A rise in either is the only early warning this failure mode gives.

The compliance plumbing already exists and is unchanged — `STOP`, `STOPALL`,
`UNSUBSCRIBE`, `CANCEL`, `END`, `QUIT` are honoured, Twilio's advanced opt-out
answers compliance keywords before we do, `START` reopens, and the SMS types
carry a never-send flag. **What was missing was the consent record, not the off
switch.**

## What makes the message worth sending

The trigger is not "it has been seven days." It is that we know something
specific: which axis pole they picked. *"Last time you went bold and
blackwork"* is only possible because ADR-0049 records the pick, and ADR-0022's
logging mandate means the history is already in `design_sessions`.

A proactive message with nothing specific behind it is a blast, and a blast is
what gets numbers filtered. **The personalization is not a nicety here; it is
the thing that makes the message defensible.**

## Consequences

- A per-user record of picked axis poles — a few values, not a graph or an
  embedding. The heavy version was rejected in ADR-0052's discussion.
- Terms gain the proactive-messaging disclosure and the frequency statement.
- Both triggers need a suppression check against the never-send flag and
  against anyone who has booked.
