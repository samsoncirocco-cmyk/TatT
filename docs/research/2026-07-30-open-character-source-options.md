# Open character-data options for the MAL top 1,000

Date checked: 2026-07-30 (America/Phoenix)

## Bottom line

The MyAnimeList ranking can be used only as the ordered list of shows. The character names and `MAIN` relationship should come from a different source.

There is no single source I could verify that is simultaneously:

1. commercially reusable without additional permission,
2. keyed directly by MAL anime ID,
3. explicit about `MAIN` versus supporting characters, and
4. sufficiently complete for the top 1,000.

The fastest defensible route is therefore:

- use MAL only for the 1,000 ranked anime IDs/titles;
- license AniList's API for this commercial, locally cached extraction;
- query each MAL ID directly and retain only `role: MAIN`;
- store only compact factual identity fields: source IDs, display names, native names, aliases, anime ID, and role;
- use Wikidata's CC0 data as a clean fallback and reconciliation layer, not as the primary source.

Kitsu has almost the perfect API shape and should be asked for written commercial/local-catalog permission in parallel. A ready-made Hugging Face dataset could accelerate validation, but its empty provenance documentation makes it unsafe as the production source despite its CC-BY-4.0 label.

## Source comparison

| Source | Direct MAL-ID join | Explicit main-role semantics | Stable character ID | Commercial/local catalog status | Verdict |
|---|---:|---:|---:|---|---|
| AniList API | Yes, `idMal` | Yes, `CharacterRole` with `MAIN` | Yes | Commercial license required above $150/month; mass collection/hoarding prohibited without authorization | Best contractual route after written license |
| Kitsu API | Yes, mapping records | Yes, `mediaCharacters.attributes.role = "main"` | Kitsu ID plus MAL character ID when present | API docs carry Apache-2.0 metadata, but I could not verify that it licenses the underlying catalog for commercial bulk/local reuse | Best technical alternative; get written permission |
| Wikidata | Yes, `P4086` | Yes in theory via `P674` qualified by `P5800`; very sparse | QID; MAL character ID `P4085` may also exist | Structured data is CC0 and commercially reusable | Safe fallback/reconciliation source, not complete enough |
| Hugging Face `fadhilakbar/anime-characters-dataset` | Usually embedded in `anime_source` URL | Yes, `MAIN`, `SUPPORTING`, `BACKGROUND` | Mixed MAL/AniList URL plus row ID | Dataset card says CC-BY-4.0, but README is empty and upstream provenance/license chain is undocumented | Useful evaluation candidate only pending provenance audit |
| DBpedia | No practical direct MAL join | No reliable main/supporting distinction for this use case | DBpedia URI/Wikidata links | CC-BY-SA/GFDL-style attribution obligations | Open but inferior to Wikidata and too sparse/ambiguous |
| AniDB | Requires a separate MAL-to-AniDB crosswalk | Yes, character relation types include main | AniDB character ID | API explicitly says not to download AniDB; bulk behavior can be banned | Do not use for this bulk catalog |
| AnimeAPI | Not verified | Not verified | Not verified | Allows downloading but forbids building a competing anime database and passes third-party rights risk to the user | Not a clean production source |
| Anime-Planet | Not verified | Likely yes on pages | Anime-Planet character slug/ID | No verified API or commercial bulk-data grant found; site blocks automated access in this environment | Do not scrape |

## 1. AniList: best permissioned production route

AniList is the strongest semantic match. Its GraphQL root query accepts a MyAnimeList ID as `Media(idMal: ...)`. A media record exposes a character connection filterable by role, and the connection describes roles as Main, Support, or Background. Character objects have stable integer IDs and structured names.

Primary documentation:

- [`Media(idMal:)` and `characters(role:)`](https://docs.anilist.co/reference/object/media)
- [Character connections and role semantics](https://docs.anilist.co/guide/graphql/connections)
- [Character object](https://docs.anilist.co/reference/object/character)
- [Rate limits](https://docs.anilist.co/guide/rate-limiting)
- [Terms of use](https://anilist.gitbook.io/anilist-apiv2-docs/docs/guide/terms-of-use)

Exact query:

```graphql
query MainCharactersByMalId($malId: Int!, $page: Int!) {
  Media(idMal: $malId, type: ANIME) {
    id
    idMal
    title {
      romaji
      english
      native
    }
    synonyms
    characters(role: MAIN, page: $page, perPage: 25) {
      pageInfo {
        currentPage
        hasNextPage
      }
      edges {
        role
        node {
          id
          name {
            full
            native
            alternative
            alternativeSpoiler
          }
          siteUrl
        }
      }
    }
  }
}
```

Variables:

```json
{"malId": 1, "page": 1}
```

Endpoint:

```text
POST https://graphql.anilist.co
Content-Type: application/json
```

Rate/caching constraints:

- The documented normal limit is 90 requests/minute.
- The documentation currently warns that the service is degraded to 30 requests/minute.
- `X-RateLimit-*` and `Retry-After` headers are documented.
- Each character connection page is limited to 25, though `role: MAIN` will usually fit on one page.
- The terms explicitly prohibit hoarding or mass collection without authorization.
- Commercial products above $150/month require a commercial license.

Recommendation: contact `contact@anilist.co` with an exact request to process 1,000 MAL IDs once, cache only IDs/names/aliases/role locally, refresh no more than monthly, and use the result inside a tattoo-design assistant rather than an anime tracker. Get the mass-collection and local-storage permission in the license.

## 2. Kitsu: ideal data shape, unresolved catalog license

Kitsu's live API directly demonstrated the desired two-stage join:

### Step A: map MAL anime ID to Kitsu anime

```http
GET https://kitsu.io/api/edge/mappings?filter%5BexternalSite%5D=myanimelist%2Fanime&filter%5BexternalId%5D=1&include=item
Accept: application/vnd.api+json
```

For MAL anime ID `1`, the live response mapped to Kitsu anime ID `1`, Cowboy Bebop.

### Step B: retrieve character relationships and names

```http
GET https://kitsu.io/api/edge/anime/1/characters?include=character&page%5Blimit%5D=20
Accept: application/vnd.api+json
```

The live response included:

- relationship IDs;
- `attributes.role` values such as `main` and `supporting`;
- stable Kitsu character IDs;
- canonical and Japanese names;
- MAL character IDs where available.

For Cowboy Bebop, the response reported 125 character relationships and correctly labeled Spike Spiegel, Jet Black, Faye Valentine, and Edward as `main`.

Primary documentation:

- [Kitsu JSON:API documentation](https://hummingbird-me.github.io/api-docs/)
- [Kitsu terms page](https://kitsu.io/terms)

Important licensing caveat:

- The API documentation identifies an Apache-2.0 license, but that does not unambiguously establish that the underlying catalog facts/database may be copied into a commercial local dataset.
- The linked terms page is a JavaScript application and did not expose readable catalog-reuse language during this review.
- I found no published numeric read-rate limit in the official API documentation or response headers.
- Pagination defaults to 10 and generally has a maximum of 20 per the official docs.

Recommendation: email Kitsu for written permission covering commercial use, a one-time 1,000-show export, local storage of compact character facts, refresh frequency, attribution, and any required share-back. If they approve, Kitsu is simpler than AniList because its mapping endpoint exposes the MAL join explicitly and character records often carry MAL character IDs.

## 3. Wikidata: unquestionably reusable, measurably incomplete

Wikidata is the cleanest legal source:

- all structured data is CC0 with no attribution requirement;
- `P4086` is the stable MyAnimeList anime ID;
- `P674` links a work to characters appearing in it;
- `P5800` is the narrative-role qualifier and permits values including `main character` (`Q12317360`), protagonist, deuteragonist, and tritagonist;
- character items may carry MAL character ID `P4085`.

Primary documentation:

- [Wikidata data access and CC0 terms](https://www.wikidata.org/wiki/Wikidata:Data_access)
- [MyAnimeList anime ID `P4086`](https://www.wikidata.org/wiki/Property:P4086)
- [Characters `P674`](https://www.wikidata.org/wiki/Property:P674)
- [Narrative role `P5800`](https://www.wikidata.org/wiki/Property:P5800)
- [Main character `Q12317360`](https://www.wikidata.org/wiki/Q12317360)
- [MyAnimeList character ID `P4085`](https://www.wikidata.org/wiki/Property:P4085)
- [API etiquette](https://www.mediawiki.org/wiki/API:Etiquette)

Exact batched SPARQL query for a supplied set of MAL IDs:

```sparql
SELECT ?malId ?anime ?animeLabel ?character ?characterLabel ?malCharacterId
WHERE {
  VALUES ?malId { "1" "1535" "5114" }

  ?anime wdt:P4086 ?malId .
  ?anime p:P674 ?characterStatement .
  ?characterStatement ps:P674 ?character ;
                      pq:P5800 ?narrativeRole .
  ?narrativeRole wdt:P279* wd:Q12317360 .

  OPTIONAL { ?character wdt:P4085 ?malCharacterId . }

  SERVICE wikibase:label {
    bd:serviceParam wikibase:language "en,ja".
  }
}
ORDER BY ?malId ?characterLabel
```

Endpoint:

```text
GET https://query.wikidata.org/sparql?query=...&format=json
Accept: application/sparql-results+json
User-Agent: TattTester/<version> (<contact URL or email>)
```

Observed whole-graph coverage on 2026-07-30:

```sparql
SELECT
  (COUNT(DISTINCT ?anime) AS ?malAnime)
  (COUNT(DISTINCT ?animeWithCharacter) AS ?withCharacters)
  (COUNT(DISTINCT ?animeWithMain) AS ?withMain)
WHERE {
  { ?anime wdt:P4086 ?mal . }
  UNION
  { ?animeWithCharacter wdt:P4086 ?mal2 ; wdt:P674 ?character . }
  UNION
  {
    ?animeWithMain wdt:P4086 ?mal3 .
    ?animeWithMain p:P674 ?stmt .
    ?stmt pq:P5800 ?role .
    ?role wdt:P279* wd:Q12317360 .
  }
}
```

Live result:

- 6,880 distinct Wikidata anime items with a MAL ID;
- 309 with any `P674` character;
- 99 with a `P674` character explicitly qualified as a main-character subclass.

This is only about 4.5% coverage for any character and 1.4% for explicitly main characters across MAL-linked Wikidata anime. The popular top 1,000 may do somewhat better, but Wikidata alone cannot be assumed to cover it.

Access guidance:

- send an informative User-Agent;
- batch IDs rather than sending one request per ID;
- make requests serially;
- cache results;
- honor `429` and `Retry-After`;
- use low query timeouts and split large `VALUES` lists into conservative batches.

## 4. Ready-made CC-BY dataset: useful but provenance is not yet trustworthy

[`fadhilakbar/anime-characters-dataset`](https://huggingface.co/datasets/fadhilakbar/anime-characters-dataset) is unusually close to the desired output:

- dataset card declares CC-BY-4.0;
- 173,964 rows / 34.6 MB;
- `anime_source` often contains a MAL anime URL;
- `character_source` contains a MAL or AniList character URL;
- `character_name` and `japanese_name`;
- explicit `role` and `importance` values: `MAIN`, `SUPPORTING`, `BACKGROUND`.

However:

- its README is empty;
- it does not identify how the data was collected;
- it does not document upstream source licenses or permission;
- its mixed MAL/AniList URLs strongly suggest it was assembled from sources whose own bulk/local reuse terms matter;
- a dataset uploader's CC-BY label cannot grant rights they do not hold.

Recommendation: do not ship it directly. It can be used to estimate matching coverage and to test the importer's schema in a non-production evaluation. Before production use, obtain the author's collection code, source list, timestamps, and proof that every upstream source permits redistribution under CC-BY-4.0.

## 5. Other sources rejected

### DBpedia

DBpedia is openly available under attribution/share-alike terms and has a public SPARQL endpoint, but it extracts Wikipedia/infobox data and does not provide a dependable MAL-ID-to-explicit-`MAIN` relationship. It adds licensing complexity without improving on Wikidata for this task.

Primary sources:

- [DBpedia licensing/about](https://www.dbpedia.org/about/)
- [DBpedia SPARQL service](https://www.dbpedia.org/resources/sparql/)

### AniDB

AniDB's HTTP anime response can contain character relationships with values such as `main character in`, so the semantics are useful. But its API documentation says:

- no more than one page every two seconds;
- heavy local caching is required;
- requesting the same dataset multiple times in a day can cause a ban;
- the API must not be used to “download” AniDB;
- clients must be registered.

That makes a systematic top-1,000 catalog extraction contrary to the published access intent.

Primary sources:

- [AniDB HTTP API definition](https://wiki.anidb.net/HTTP_API_Definition)
- [AniDB API overview](https://wiki.anidb.net/API)

### AnimeAPI

AnimeAPI grants permission to download API materials for as long as a use case requires, but forbids building a competing anime database and says third-party content may require separate permission. It also disclaims non-infringement and places third-party usage risk on the customer. This is not a clean replacement for a licensed role catalog.

Primary source:

- [AnimeAPI terms](https://animeapi.org/animeapi-terms-of-service/)

### Anime-Planet

No documented API or explicit commercial bulk/local-data grant was found. Automated access was blocked in this environment. Do not scrape it.

## Recommended acquisition policy

1. **Ranking authority:** MAL ranking/API only, storing rank, MAL anime ID, title, and ranking retrieval timestamp.
2. **Primary character authority:** AniList under written commercial and mass-collection permission, or Kitsu under equivalent written permission.
3. **Open reconciliation:** Wikidata CC0 for QIDs, MAL character IDs, labels, and missing records where a properly role-qualified statement exists.
4. **No prose or images:** store names, aliases, IDs, role, and provenance only. Do not copy biographies, descriptions, or character art.
5. **Per-field provenance:** retain the source, source record ID, retrieval timestamp, license/permission version, and source URL for each anime-character relationship.
6. **No inferred `MAIN`:** if a source only says a character appears in a work, mark the role unresolved rather than silently promoting it.
7. **Human correction layer:** keep TatT-owned alias and collision overrides separate from the imported source so corrections survive refreshes.
8. **Source revocation:** make each imported source removable and rebuildable independently.

## Permission request checklist

Ask AniList and Kitsu to explicitly approve:

- commercial use inside TattTester;
- reading character relationships for 1,000 MAL anime IDs;
- filtering to main characters;
- storing source IDs, names, native names, aliases, anime IDs, and role locally;
- refreshing monthly or quarterly;
- serving the compact names/aliases internally to SketchBot;
- whether derived alias indexes may remain proprietary;
- required attribution and backlink format;
- deletion/refresh obligations if a record changes;
- rate limits and preferred batch/query shape.

Do not ask for biographies, synopses, images, or other expressive content; they are unnecessary for character-name detection and make the rights analysis materially harder.
