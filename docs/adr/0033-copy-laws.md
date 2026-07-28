---
status: accepted
---

# Copy laws: the name flip, the money sentence, the provenance label

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
