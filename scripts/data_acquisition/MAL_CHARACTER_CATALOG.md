# MyAnimeList character catalog

This fixture-testable builder can snapshot the first N entries from
MyAnimeList's top-anime ranking through Jikan's read-only v4 adapter and keep
the characters whose relationship role is `Main`.

## Source authorization gate

Do **not** acquire or commit a production catalog until TattTester has written
MyAnimeList permission or a licensed feed that permits this reuse. Jikan is an
unofficial adapter and does not grant rights to MyAnimeList's data. The CLI
fails closed unless an operator explicitly supplies
`--acknowledge-source-terms`; that flag is an operational confirmation, not a
substitute for permission.

```bash
node scripts/data_acquisition/build_mal_character_catalog.mjs \
  --acknowledge-source-terms
```

The default run targets 1,000 ranked entries. It writes compact JSON to
`src/data/generated/mal-character-catalog.json` and checkpoints source HTML in
`.tmp/mal-character-catalog`. Cached responses are reduced to the same factual
identity, rank, alias, and role fields needed by the generated output; no images
or character biography prose is retained. If the process is interrupted, run the same
command again: cached pages are reused and the original snapshot timestamp is
preserved. Refreshes use a new timestamped cache namespace, so a failed refresh
cannot silently mix old and new snapshots. The response cache is intentionally
not product data and should not be committed.

Useful options:

```bash
# Small live smoke test with separate output and cache
node scripts/data_acquisition/build_mal_character_catalog.mjs \
  --limit 2 \
  --out .tmp/mal-smoke.json \
  --cache-dir .tmp/mal-smoke-cache \
  --acknowledge-source-terms

# Intentionally acquire a fresh snapshot
node scripts/data_acquisition/build_mal_character_catalog.mjs \
  --refresh \
  --acknowledge-source-terms
```

The generated document includes:

- stable `mal-anime-*` and `mal-character-*` IDs;
- the MAL rank captured for every anime entry;
- title/name aliases derived without guesses from MAL names and URL slugs;
- character role (`main`);
- source paths and top-level retrieval provenance;
- anime, unique-character, and appearance counts.

The parser fails closed on rate-limit or malformed responses. The adapter uses
a minimum 1.1-second request interval and retry/backoff for throttling or
temporary server failures. Tests inject JSON fixtures through the same loader
interface used by the live adapter, so they need no network access or
credentials.
