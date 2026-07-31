# MAL Top 1,000 Anime and Main Characters: Source Review

**Researched:** 2026-07-30
**Decision:** Use MyAnimeList's documented API for the ranked anime list. Do **not**
scrape MAL's HTML pages for character data. The documented MAL API has no anime
character endpoint, so a compliant 1,000-title character catalog requires written
permission or a separately licensed source.

## Executive recommendation

1. Register a MyAnimeList API client.
2. Fetch the top 1,000 anime through the official `GET /v2/anime/ranking`
   endpoint in two pages of 500.
3. Store only the fields TatT needs: MAL anime ID, rank, canonical title, selected
   aliases, source URL, and retrieval timestamp.
4. Ask MAL for written permission and either:
   - access to an official character-role feed or endpoint; or
   - permission to retrieve and persist the `Main` character assignments from
     the public anime character pages for TatT's commercial detector.
5. Until that permission exists, do not fill the character side with a MAL HTML
   crawler or an unofficial MAL-scraping proxy.

This separates an immediately implementable, official ranking import from the
currently blocked character-role import.

## What MAL's official API can provide

MAL's official API documentation defines `GET
https://api.myanimelist.net/v2/anime/ranking`. For `ranking_type=all`, MAL labels
the result “Top Anime Series.” The response includes each anime's MAL ID, title,
picture, and ranking position, plus a `paging.next` URL. The endpoint accepts
`limit`, `offset`, and `fields`; MAL documents 500 as the maximum `limit`.
([MAL API v2 — Get anime ranking](https://myanimelist.net/apiconfig/references/api/v2#operation/anime_ranking_get))

A reproducible top-1,000 import therefore needs only two official API pages:

```text
GET /v2/anime/ranking?ranking_type=all&limit=500&offset=0
GET /v2/anime/ranking?ranking_type=all&limit=500&offset=500
```

The importer should prefer the returned `paging.next` URL over inventing later
pagination URLs, and should fail closed unless it receives:

- exactly 1,000 records;
- exactly 1,000 unique MAL anime IDs;
- exactly the rank set 1 through 1,000;
- no duplicate ranks; and
- a recorded retrieval timestamp.

The result is a dated snapshot, not an eternal truth: ranks can change.

## Authentication requirements

The ranking operation permits either:

- an OAuth bearer token; or
- `X-MAL-CLIENT-ID` when user login is not required.

The API's security definition explicitly says the client-ID header can
authenticate a client when user login is unnecessary.
([MAL API v2 — Authentication and security definitions](https://myanimelist.net/apiconfig/references/api/v2#section/Authentication))

MAL's authorization guide says an application must first be registered to receive
a client ID and client secret. Its user-authorized route is OAuth 2.0 Authorization
Code Grant with PKCE. The guide documents one-hour access-token and one-month
refresh-token lifetimes. For this public, server-side ranking import, the
documented client-ID header is simpler than obtaining a user's OAuth grant.
([MAL authorization guide](https://myanimelist.net/apiconfig/references/authorization))

The client ID must remain server-side operational configuration. No client secret,
access token, or other credential belongs in the generated catalog, source
control, logs, or this research note.

## The documented MAL API does not provide characters

The current official API v2 specification publishes anime endpoints for search,
details, ranking, seasons, suggestions, and user-list operations. It does **not**
publish an anime-character endpoint. The documented anime-detail schema includes
titles, synopsis, genres, related works, recommendations, studios, and statistics,
but not character records or character roles.
([MAL API v2 reference](https://myanimelist.net/apiconfig/references/api/v2))

Consequently:

- `GET /anime/ranking` can establish the authoritative MAL top 1,000.
- `GET /anime/{anime_id}` cannot supply each show's main characters.
- Adding `fields=characters` is not a documented capability.
- An undocumented endpoint, if discovered, should not be treated as a supported
  production dependency.

This is the material blocker.

## Why HTML scraping is not an appropriate fallback

MAL's Terms of Use are stronger than a purely technical “can we fetch the page?”
test:

- Section 4 grants a limited license for personal, noncommercial use.
- The prohibited-activities language bars collating or aggregating service
  content for use elsewhere.
- MAL says it does not expressly allow scraping or other extraction without prior
  written consent.
- Section 9 restricts copying, distributing, reproducing, adapting, or creating
  derivative works from Company Content except where expressly permitted.

([MAL Terms of Use, updated 2025-12-16](https://myanimelist.net/about/terms_of_use))

MAL's current `robots.txt` does not specifically disallow `/topanime.php` for the
generic `User-agent: *`, but it blocks a long list of AI/training crawlers from the
entire site. In any event, `robots.txt` is a crawler-control signal, not a grant of
contractual or content-reuse rights. It does not override the Terms of Use.
([MAL robots.txt](https://myanimelist.net/robots.txt))

Therefore TatT should not:

- crawl `topanime.php` when the official ranking API exists;
- crawl 1,000 anime character pages;
- use an unofficial service whose relevant output is obtained by scraping MAL;
- download MAL character portraits; or
- describe a scraped snapshot as licensed or official API data.

## Rate-limit guidance

The public MAL API v2 reference does not currently publish a numeric request rate,
a quota table, or a documented `429` response contract. Absence of a published
number is not permission to send unlimited traffic.
([MAL API v2 reference](https://myanimelist.net/apiconfig/references/api/v2))

For the ranking import, the practical answer is simple: make the two documented
500-item requests sequentially, cache the dated result, and do not repeatedly
refetch it during builds or customer requests. A production importer should use
bounded retries with jitter for transient failures, stop on authentication or
authorization failures, and record failures without logging credentials.

Suggested refresh policy after permission review:

- ranking snapshot: no more than daily, with weekly sufficient for the detector;
- character-role catalog: monthly or on explicit catalog releases;
- customer requests: query the local reviewed catalog, never fan out to MAL.

These are TatT-side safeguards, not claims about a MAL-approved request rate.

## Licensed alternative for character roles

AniList's public GraphQL schema can technically bridge from a MAL anime ID to main
characters:

```graphql
query CharacterSource($malId: Int!) {
  Media(idMal: $malId, type: ANIME) {
    id
    idMal
    title { romaji english native }
    characters(role: MAIN, perPage: 25) {
      pageInfo { hasNextPage }
      nodes {
        id
        name { full native alternative }
      }
    }
  }
}
```

The official AniList documentation describes a free, publicly accessible GraphQL
API and says public anime and character data does not require authentication.
([AniList API introduction](https://docs.anilist.co/guide/introduction),
[AniList authentication guide](https://docs.anilist.co/guide/auth/))

However, this is **not presently an approved bulk-ingestion shortcut**. AniList's
official terms prohibit hoarding or mass collection, prohibit using the API as a
backup/data-storage service, and require a commercial license for services above
$150 monthly revenue. A persistent character catalog covering 1,000 MAL titles is
close enough to “mass collection” that TatT should obtain an explicit written
exception and commercial terms before running it.
([AniList API Terms of Use](https://docs.anilist.co/guide/terms-of-use))

If AniList grants that permission, the current official rate-limit page says the
normal limit is 90 requests per minute but the API is presently degraded to 30
requests per minute. Clients must honor `X-RateLimit-*` and `Retry-After`, and
avoid bursts.
([AniList rate limiting](https://docs.anilist.co/guide/rate-limiting))

Any approved AniList bridge must preserve provenance separately:

- MAL remains the source of ranking and MAL anime IDs.
- AniList is the source of the `MAIN` role and character names.
- Matching is by AniList's `idMal`, with title checks and a manual exception queue.
- Missing, ambiguous, or contradictory matches are not guessed.

## Permission request checklist

MAL's Terms direct service questions to its support channel.
([MAL Terms — Contact Us](https://myanimelist.net/about/terms_of_use#20.+Contact+Us))

The request should clearly disclose:

- TatT/TattTester is a commercial tattoo-design product;
- the intended snapshot is the current top 1,000 MAL-ranked anime;
- stored fields are anime IDs, ranks, titles/aliases, character IDs/names, and
  `Main` role assignments;
- MAL images, biographies, synopses, and user data will not be copied;
- the catalog is used for entity detection and disambiguation, not as an anime
  database or list-tracking competitor;
- the expected refresh cadence;
- expected request volume;
- attribution and deletion/update handling; and
- a request for explicit commercial persistence rights and an approved API/feed.

The same specificity should be used if requesting an AniList commercial and
mass-collection exception.

## Data model after permission

Keep the catalog factual and minimal:

```json
{
  "anime": {
    "mal_id": 123,
    "mal_rank": 42,
    "titles": {
      "canonical": "Example",
      "english": "Example",
      "native": "例",
      "aliases": []
    },
    "rank_source": "myanimelist_api_v2",
    "rank_retrieved_at": "ISO-8601 timestamp"
  },
  "characters": [
    {
      "source_id": "provider-specific stable ID",
      "name": "Full Name",
      "native_name": "Native Name",
      "aliases": [],
      "role": "MAIN",
      "role_source": "licensed provider",
      "retrieved_at": "ISO-8601 timestamp"
    }
  ]
}
```

Do not ingest character portraits, biographies, quotes, fan art, voice-actor
photos, or copyrighted descriptive copy for a name detector. Those fields are
unnecessary for matching and materially increase licensing and customer-safety
risk.

## Bottom line

The official MAL ranking half is straightforward: two API requests can establish
the top 1,000. The main-character half cannot lawfully and durably be completed
from MAL's documented API today. The release-safe route is to secure written MAL
permission or an approved licensed character source, then build a provenance-rich
catalog with strict validation. A fast HTML scrape would create a product and
legal dependency that TatT should not ship.
