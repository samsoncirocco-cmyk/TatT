---
status: accepted
---

# ADR 0037 — Artist-authorized Instagram portfolios replace recovered image alignment

## Decision

A verified artist may connect the Professional or Creator Instagram account
whose username matches the profile's locked Instagram identity, choose up to
eight owned posts, order them, and publish those posts on the public profile.

TattTester stores one `PortfolioPost` per artist plus Instagram media id and a
`SHOWCASES` relationship carrying display order. The durable record includes
the canonical permalink, source (`instagram_api`), consent basis
(`artist_oauth_selection`), verification/refresh timestamps, and active state.
It does **not** store the temporary Instagram media URL returned for the
selection preview. Public media is served through Instagram's embed.

The OAuth grant requests only `instagram_business_basic`. State is random,
single-use, server-stored, artist/uid-bound, and ten-minute limited. Access
tokens are encrypted in server-only Firestore storage. The callback refuses an
Instagram username that does not match the profile identity anchor.
Disconnecting deactivates the selected posts before deleting the local token.

## Why

The deterministic legacy recovery joined an archived Instagram source URL to a
re-hosted image filename. The national importer later replaced those images
with current website portfolio URLs, exhausting that join: a current dry run
would update zero artists, while thousands of old permalink arrays no longer
align with the current image arrays. Treating that output as current portfolio
truth would be false provenance.

Artist selection has a stronger basis and a simpler invariant: the connecting
artist owns the API-visible media and explicitly chooses what TattTester shows.
The post is independent of any copied-image array and can be refreshed or
marked inactive without guessing a replacement.

## Limits

- Meta exposes owned media through this API only for Professional/Creator
  accounts. Personal accounts remain on the Instagram profile-link state until
  a separate artist-approved URL flow is implemented.
- Production access for Instagram accounts outside the app owner's/tester set
  requires Meta Advanced Access and an allowlisted production callback.
- Legacy `portfolioPermalinks` remains a separate, default-off unclaimed-profile
  tier. It is not migrated into `PortfolioPost`.
