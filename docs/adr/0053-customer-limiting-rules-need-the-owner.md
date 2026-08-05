---
status: accepted
---

# A rule that limits the customer needs the owner's yes

Owner decision, 2026-08-05 (TattTester Buzz channel), answer 31a. Written in
response to the owner's own question: *"is it possible that agents have
created a bunch of rules/bans around things that i don't agree with?"*

They had. ADR-0052 overturns three.

## The problem

Agents write ADRs. That is the point of the format and it has worked well —
most of this record is agents doing careful thinking and leaving it where the
next agent can find it. But an ADR is binding by construction, and nothing
distinguished *"the generation module has one public entry point"* from
*"the bot **never** offers further iteration."*

The first is an engineering choice. The second is a product decision that
shapes what a customer is allowed to do, and it sat in force for months
without the owner ever agreeing to it. It was found only because he thought to
ask.

The failure is not that agents overreach on purpose. It is that a well-argued
ADR reads identically whether or not a human ever said yes, and the format
offered no way to tell.

## The decision

**Two classes of ADR, one difference.**

- **Engineering ADRs** — module boundaries, data shapes, library choices,
  provider plumbing, test strategy. Agents write and accept these freely. This
  is unchanged and deliberately unchanged; the alternative is a bottleneck on
  the owner for decisions he has no reason to make.

- **Customer-limiting ADRs** — anything that forbids, caps, gates, or removes
  something a customer can otherwise do, ask for, see, or receive. **These
  require the owner's explicit yes before status becomes `accepted`.**

The test is deliberately blunt, because a subtle test will be argued around at
3am: *would a customer notice if this rule vanished?* If yes, it needs a human.

## How it shows up in the file

Every customer-limiting ADR must name its provenance in the first lines —
which owner conversation, which date. The ones that do this already are the
model: ADR-0040 through 0043 open with *"Owner grill session, 2026-08-03...
Decided by Samson."*

An agent that believes a customer-limiting rule is needed and cannot get an
answer writes it with `status: proposed` and says so in the channel. **Proposed
is not binding.** Shipping code that enforces a `proposed` ADR is the thing
this ADR forbids.

## Rejected alternatives

- **Every ADR needs owner approval.** Rejected by the owner (option 31b). It
  would put him in the path of decisions like "one public entry point per
  module", which is exactly the work he delegated.
- **Leave it; catch them in review.** Rejected (31c). Three of these survived
  months of review, including reviews by agents who had read the ADR corpus.
  Nobody catches a rule that reads as though it was always the plan.

## Consequences

- The audit that produced ADR-0052 should be re-run periodically. It is cheap:
  read each ADR's opening lines for provenance, then ask of the ones without
  it whether a customer would notice the rule.
- The second-tier findings from that audit are recorded but not acted on —
  closed style-tag vocabulary (0010), ontology approval gating (0011), the
  four-axis pool (0012), placement never silently adjusted (0014), live AR
  killed against a written directive (0024), simulated verification retired
  (0032). Each is a customer-visible restriction with no owner sign-off. They
  stand until reviewed, and they are listed here so the next person does not
  have to find them again.
