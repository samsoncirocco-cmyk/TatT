---
status: accepted
---

# Three agent-authored restrictions overturned

Owner decision, 2026-08-05 (TattTester Buzz channel), after an audit of all 49
ADRs asking a single question: **which of these did the owner actually
decide?**

Roughly a third cite an owner decision or a grill session. The rest were
written by agents and became binding anyway. Most of those are ordinary
engineering — module boundaries, money in integer cents — and stand untouched.
Three were product restrictions with no owner behind them, and two of the
three contradicted decisions the owner made the same night.

## ADR-0013 is superseded

> *"The bot **never** offers further iteration — unbounded refinement
> repositions the product from confidence layer to AI toy people play with and
> never book from."*

ADR-0049 makes rounds the product: two cuts, a pick, a refined round seeded by
the picked image, each round costing a credit. The owner chose unlimited rounds
(answer 12a).

The 2026 reasoning was not stupid — it feared an endless toy nobody books
from. What it lacked was the metering that now exists. **A round costs a
credit, so iteration is bounded by something real instead of by a rule**, and
the customer decides how much refinement their design is worth. ADR-0041's
lifetime quota is the hard stop ADR-0013 was reaching for.

**ADR-0013 is superseded in full.**

## ADR-0022's ban on cross-session personalization is overturned

> *"There is no cross-session personalization yet... a 'still thinking about
> that forearm piece?' greeting only delights when recall is accurate, and one
> bad recall reads as creepy."*

The owner's position, stated directly: *"there is no issue with giving people
ideas if it helps them get more tattoos."* Proactive re-engagement is approved
and specified in ADR-0051.

The half of ADR-0022 that was right is **kept and credited**: it mandated that
transcripts, intake records and pick signals be logged cleanly from day one,
precisely so personalization would be cheap when someone decided to want it.
That instruction is why the feature is a small build rather than a large one —
the data is already in `design_sessions`.

**The logging mandate stands. The deferral does not.**

## ADR-0016 is amended, not dropped

> *"All four reveal variations render on a single provider... mixing providers
> within a session confounds the pick signal."*

The reasoning survives and matters more under ADR-0049 than it did before: if
the two cuts in a round came from different providers, the pick could mean *"I
prefer that renderer"* rather than *"I prefer that pole"*, which would poison
the exact signal the loop exists to collect.

So the rule is narrowed rather than removed. **One provider per round**, with
two named exceptions:

- **ADR-0048's downgrade.** When the cast lane is unavailable the round falls
  to another provider — but it is announced and the credit is released, so
  there is no silent mixing and no pick collected under false pretences.
- **Round-to-round change.** A later round may route differently from an
  earlier one; the pick is only ever compared within a round.

## Why this ADR exists at all

Not to relitigate old calls. To record that **three product restrictions were
in force that the owner had never agreed to**, and that finding them required
someone to go looking. ADR-0053 is the rule meant to stop the next three.
