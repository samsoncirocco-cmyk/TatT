# Ranked anime and main-character catalog

This builder treats the MyAnimeList link as a **show list**, exactly as
intended. It creates a factual identity catalog through four narrow sources:

1. MyAnimeList's top-anime ranking page selects the first N
   anime and records each reported rank.
2. [manami-project anime-offline-database][manami] maps each MAL anime ID to a
   Kitsu anime ID.
3. Kitsu's `animeCharacters` relationships provide `role=main`; the related
   Kitsu character records provide names and aliases.
4. Only when a show has no Kitsu mapping or Kitsu returns zero mains, Jikan's
   `/v4/anime/{malId}/characters` fills the gap. It retains only relationships
   whose role is exactly `Main`, plus `character.mal_id` and `character.name`.

No character descriptions, biographies, artwork, or images are written to the
cache or generated catalog.

## Source authorization gate

Do **not** acquire or commit a production catalog until TattTester has written
permission or a licensed feed that permits the intended reuse. Jikan is an
unofficial API and does not grant rights to MyAnimeList data. The CLI fails
closed unless an operator explicitly supplies `--acknowledge-source-terms`;
that flag records an operational check, not permission or a legal conclusion.
The manami mapping remains subject to its ODbL/DbCL license and attribution
requirements.

## Run it

```bash
node scripts/data_acquisition/build_mal_character_catalog.mjs \
  --acknowledge-source-terms
```

The default run targets 1,000 ranked entries and writes compact JSON to
`src/data/generated/mal-character-catalog.json`. Source responses and progress
are checkpointed in `.tmp/mal-character-catalog`, which is not product data and
must not be committed. Run the same command after an interruption to resume.
Use `--refresh` only when intentionally taking a new snapshot.

To regenerate schema v3 strictly from an existing MAL/manami/Kitsu cache
without making any Jikan requests, add `--skip-jikan-fallback`. Shows with no
Kitsu mains remain in the catalog with an empty character array, and provenance
records that the fallback was disabled.

```bash
# Small isolated smoke test
node scripts/data_acquisition/build_mal_character_catalog.mjs \
  --limit 2 \
  --out .tmp/mal-smoke.json \
  --cache-dir .tmp/mal-smoke-cache \
  --acknowledge-source-terms

# Intentionally acquire a fresh snapshot
node scripts/data_acquisition/build_mal_character_catalog.mjs \
  --refresh \
  --acknowledge-source-terms

# Rebuild from completed MAL/manami/Kitsu caches without Jikan
node scripts/data_acquisition/build_mal_character_catalog.mjs \
  --cache-dir .tmp/mal-kitsu-character-catalog-v3 \
  --acknowledge-source-terms \
  --skip-jikan-fallback
```

Requests to each source are globally spaced by at least 1.1 seconds by default
and retry temporary throttling/server failures with backoff. Tests inject local
fixtures through the same loader boundaries, so tests need no network access.
The acknowledgment flag is intentional: confirm the required authorization and
review the current terms and policies for MAL, manami, Kitsu, and Jikan before
each acquisition. It does not grant rights the source does not provide.

## Output and honest coverage

Every anime has:

- stable MAL anime ID, reported MAL rank, and deterministic
  `selectionPosition`;
- factual MAL title aliases;
- its mapped Kitsu ID, or `null` when no mapping exists;
- zero or more Kitsu characters whose relationship role is exactly `main`; or
- only when that list is empty, Jikan characters whose role is exactly `Main`.

Each character has a source-qualified stable ID, factual name, `role: "main"`,
explicit source, and source path. Kitsu entries may also retain factual aliases;
Jikan fallback entries retain no aliases or other fields. Kitsu and MAL
character IDs are never conflated, and names alone never cause two identities
to merge. An empty character array is retained and counted honestly; the
builder never guesses a character or silently substitutes a different show.

Top-level provenance records the ranking snapshot time, each source's role, and
the exact anime-offline-database release date and license metadata. The mapping
dataset is available under ODbL 1.0 + DbCL 1.0; preserve its attribution and
comply with the license when distributing a derived database.

The generated schema is version 3. Counts include mapped/unmapped anime,
distinct source-qualified characters, total appearances, and Kitsu/Jikan
fallback coverage. MAL IDs are deduplicated if a live ranking shifts between
page requests. Duplicate reported
ranks are allowed; `selectionPosition` remains deterministic.

[manami]: https://github.com/manami-project/anime-offline-database
