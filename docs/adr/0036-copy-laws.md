---
status: accepted
---

# ADR 0036 — Copy laws: the name flip, the money sentence, the provenance label

Facelift grill, 2026-07-27. Three standing rules for every user-facing string,
enforced from now on:

1. **The name flip.** All user-facing copy, titles, and metadata say
   **TattTester**, effective immediately (implements ADR-0004; an audit found
   44 user-facing "TatT" strings and zero "TattTester" on a site deployed at
   tatttester.com). "TatT" survives only in code identifiers and internal
   docs. Two-door rules from `docs/brand/two-door-brand-guide.md` are binding:
   Image2Ink appears only as the generator feature's name and as the
   image2ink.com marketing door (to be built); tatt-t.com 301s to
   tatttester.com; one canonical host. Rejected: waiting for a "rebrand
   moment" — pre-launch stealth is the cheapest possible time to fix a name.

2. **The money sentence.** Every surface that mentions money — booking sheet,
   checkout summary, success screen, bookings list, console payouts, claim
   incentive, pricing — states *who pays what and who keeps what* in one
   visible sentence, in the quiet voice. ADR-0007's fee model as copy law:
   the client pays the deposit plus the fee; the artist keeps 100% of the
   deposit. No exceptions without a superseding ADR.

3. **The provenance label.** Every unclaimed artist profile says plainly that
   it is unclaimed and that the work shown comes from the artist's public
   Instagram, with credit — plus a claim door ("Are you X? Claim your
   profile"). Honesty to visitors, invitation to artists, consistent with the
   TAT-31 attribution posture. Exact wording is flagged for counsel review;
   the stance is not. Rejected: a bare "unclaimed" badge (unexplained), and
   silence (implies consent that was never given).

---

## Amendment — 2026-07-30: the money sentence is two-variant

PR #260 rewrote several money-surface sentences to split by artist claim
state, surfacing the ADR-0006/0008 held-deposit reality for unclaimed
artists. That custody truth is right and stays. But the split shipped
without amending this law, and the claimed-artist sentence lost its
strongest clause in the rewrite. This amendment ratifies the variant split
#260 introduced and fixes what each variant must say:

- **Claimed artist** — the full-strength sentence, both clauses
  load-bearing: the artist keeps **100% of the deposit**, and **the booking
  fee is the only part we keep**. Neither clause may be dropped.
- **Unclaimed artist** — the held-deposit sentence (ADR-0006/0008):
  TattTester holds the deposit while the artist claims and verifies the
  profile; it is released to the artist **in full** on claim, or refunded to
  the client **in full** after `DEPOSIT_HOLD_DAYS` if the profile stays
  unclaimed. The booking fee remains the only part TattTester keeps.
- **Aggregate surfaces** that span both kinds of bookings at once (the
  bookings list) state the claimed-artist rule and the unclaimed exception
  in the same breath — one sentence each, still the quiet voice.

Which variant renders follows the same claim discriminator the money flow
itself uses (`artistClaimed` / `artistReady`), defaulting to the claimed
sentence when the surface cannot know. Everything else in law 2 stands:
every money surface, one visible sentence, who pays what and who keeps
what, no exceptions without a superseding ADR.
