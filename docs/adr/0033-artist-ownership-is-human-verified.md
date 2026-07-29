---
status: accepted
---

# Artist ownership is human-verified before trust or money

## Context

The roster begins with scraped profiles. A Firebase login proves control of a
TatT account, but it does not prove that the account belongs to the artist on a
profile. The old `v1/connect/claim` route wrote `claimedByUid` for the first
signed-in caller. Every later ownership check was internally consistent but
anchored to that unverified first-writer fact. Because the same binding gates
Stripe Connect and held deposits, a stranger could claim an artist and route
real money to themselves.

## Decision

The public claim route is request-only:

- It records an `ArtistClaimRequest` in `pending_verification`.
- It never writes `claimedByUid`, Connect state, or payout state.
- When the profile has an Instagram handle, it gives the requester a
  short-lived code to publish on that account.
- It tells ops exactly what to verify and reports delivery failure honestly.

Approval is a human-run, dry-run-first command. The normal proof is seeing the
current code on the profile's Instagram. Manual review is available only when
both the request and artist profile lack a usable Instagram handle; that
no-Instagram fallback requires a specific note that becomes part of the audit
record. Approval atomically binds `claimedByUid`, marks
`claimVerificationStatus = "verified"`,
records approver identity/method/note/time, and closes the request. The guarded
write rechecks the code, issue time, and both handle snapshots in the ownership
transaction; it refuses removed artists, expired codes, mismatched handles, and
any attempt to replace an owner.

Every trust-bearing path requires both the uid match and verified status:

- Profile, availability, calendar, booking-inbox, subscription, and Connect
  access.
- Direct destination charges.
- Release of held deposits, including webhook/cron retries.

An unverified claimant therefore remains equivalent to an unclaimed artist for
money movement.

## Artist-managed profile data

A verified artist can edit name, shop, bio, booking URL, city, and state.
Writes record `artistManagedFields` and `profileManagedAtEpochMs`. Refresh and
import jobs use the shared `scripts/lib/artist-managed-import.mjs` Cypher
contract to preserve those fields. Instagram is not self-editable and verified
imports preserve it because it is the identity anchor. Hosted portfolio uploads
remain outside this path until the consented-media work in TAT-40 is configured.

## Consequences

- Claim conversion includes a human review step at launch.
- `OPS_NOTIFY_EMAIL` must be configured for a request to be represented as
  delivered.
- Instagram OAuth can later automate professional-account proof, but no paid
  service or unconfigured credential is required for the safe launch path.
- Existing `claimedByUid` values without verified status fail closed and must
  be reviewed before they can edit profiles or receive funds.
