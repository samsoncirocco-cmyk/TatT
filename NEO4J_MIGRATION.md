# Neo4j Migration — Artist Data Backend + New Graph Model

**Date:** 2026-07-15
**Status:** Complete (code); live DB seeded.

This document is the handoff for the Neo4j migration. It explains the new graph
metadata model, how the app connects to the new Aura instance, what changed, and
how to run/verify everything. If you're another agent picking this up, read this
first.

---

## 1. What changed, in one paragraph

Artist data now lives in a new Neo4j **Aura** instance (`TatT`, id `c86c5faa`),
and the graph **metadata model** was expanded from a flat 4-node shape to a
9-node model. Previously `Shop`, `State`, `Instagram` were flat *properties* on
`Artist`; they are now first-class **nodes**, and `Tattoo`, `Website`, `Tag` were
added. Connection credentials, the database name wiring, the import script, the
runtime Cypher queries, all helper scripts, and the docs were updated to match.

---

## 2. New metadata model

### Nodes

| Node | Key / properties |
|------|------------------|
| `State` | `{ name }` (e.g. `AZ`) |
| `City` | `{ name, state }` |
| `Shop` | `{ name, city, state }` |
| `Artist` | `{ id, name, hourlyRate, rating, reviewCount, bio, yearsExperience, bookingAvailable, lat, lng, location(point), embedding_id, mentor_id }` |
| `Style` | `{ name }` |
| `Tattoo` | `{ id, imageUrl, artistId }` |
| `Instagram` | `{ handle }` |
| `Tag` | `{ name }` |
| `Website` | `{ url }` — **only created when a real URL exists in the data** |

### Relationships

```
(State)     -[:HAS_CITY]->      (City)
(City)      -[:HAS_SHOP]->      (Shop)
(Shop)      -[:HAS_ARTIST]->    (Artist)
(Shop)      -[:FEATURES_STYLE]->(Style)
(Shop)      -[:HAS_WEBSITE]->   (Website)     -- only when a URL exists
(Artist)    -[:SPECIALIZES_IN]->(Style)
(Artist)    -[:CREATED]->       (Tattoo)
(Artist)    -[:HAS_INSTAGRAM]-> (Instagram)
(Artist)    -[:HAS_WEBSITE]->   (Website)      -- only when a URL exists
(Tattoo)    -[:IN_STYLE]->      (Style)
(Tattoo)    -[:TAGGED_WITH]->   (Tag)
(Instagram) -[:FEATURES]->      (Tattoo)
(Artist)    -[:APPRENTICED_UNDER]->(Artist)     -- preserved from source data
(Artist)    -[:INFLUENCED_BY]->    (Artist)     -- preserved from source data
```

### Old model (for reference — do NOT reintroduce)

Nodes were only `Artist, City, Style, Tag`. `Artist` held `shopName / state /
instagram / styles / tags` as flat properties. Relationships were
`(Artist)-[:LOCATED_IN]->(City)`, `(Artist)-[:SPECIALIZES_IN]->(Style)`,
`(Artist)-[:TAGGED_WITH]->(Tag)`.

Key deltas: **`LOCATED_IN` is gone** — location is now the
`State→City→Shop→Artist` chain. **Tags now hang off `Tattoo`, not `Artist`.**

---

## 3. Data policy (important)

Every node and relationship is derived strictly from **real fields** in
`src/data/artists.json`. Nothing is fabricated.

- **`Website` nodes are not created** — there are no URLs in the dataset. The
  code guards their creation (`websiteUrlsFor()` in `scripts/import-to-neo4j.js`),
  so they appear automatically if a `website`/`websites` field is added later.
- **`bodyParts` was dropped** — not in the model and not in the real data.
- **`data/ink-graph.html` is unchanged**: it remains the standalone
  visualization of the national scraped dataset (previous 4-node model).
  The live database holds BOTH datasets: the 9-node seed model described here
  and the national scraped data (Artist/Shop/City/Style/Tag with WORKS_AT,
  LOCATED_IN, SPECIALIZES_IN, TAGGED_WITH). Runtime queries read both.

---

## 4. Connection & credentials

### Env files (both gitignored)

- **`.env.local`** — Next.js app.
- **`.env`** — dotenv-based scripts.

Both contain:

```
NEO4J_URI=neo4j+s://c86c5faa.databases.neo4j.io
NEO4J_USERNAME=c86c5faa
NEO4J_USER=c86c5faa            # back-compat alias
NEO4J_PASSWORD=********
NEO4J_DATABASE=c86c5faa
```

`.env.local` additionally sets the feature flags and the API auth token:

```
NEXT_PUBLIC_NEO4J_ENABLED=true
NEXT_PUBLIC_NEO4J_ENDPOINT=/api/neo4j/query
FRONTEND_AUTH_TOKEN=tatt-local-dev-token
NEXT_PUBLIC_FRONTEND_AUTH_TOKEN=tatt-local-dev-token   # must equal the server token
NEXT_PUBLIC_DEMO_MODE=false
```

The credentials live only in the gitignored `.env` / `.env.local` files (and
the Aura console). They are never committed to the repo.

### Connection path

```
Browser → neo4jService.ts → POST /api/neo4j/query (route.ts) → getNeo4jDriver() (src/lib/neo4j.ts) → Aura
```

### Gotchas

1. **Database name.** The driver previously called `driver.session()` with no
   database, so it always hit the default `neo4j` DB. It now passes
   `NEO4J_DATABASE`. Wired in `src/lib/neo4j.ts` (exports `NEO4J_DATABASE`), the
   query route, `scripts/import-to-neo4j.js`, and `scripts/test-neo4j-connection.js`.
2. **API auth.** The query route validates `FRONTEND_AUTH_TOKEN`; the client
   sends `NEXT_PUBLIC_FRONTEND_AUTH_TOKEN`. They **must be equal** or every
   query 503s / 403s.
3. **Unusual Aura creds.** The credentials file lists `NEO4J_USERNAME=c86c5faa`
   and `NEO4J_DATABASE=c86c5faa` (Aura normally uses `neo4j` for both). We use
   exactly what the file specifies. If auth fails, try `neo4j` for the username
   and/or database.

---

## 5. Files changed

**Connection / runtime**
- `src/lib/neo4j.ts` — exports `NEO4J_DATABASE`; driver unchanged otherwise.
- `src/app/api/neo4j/query/route.ts` — session now targets `NEO4J_DATABASE`.
- `src/features/match-pulse/services/neo4jService.ts` — all Cypher rewritten to
  traverse the new graph (styles via `SPECIALIZES_IN`, tags via
  `CREATED→Tattoo→TAGGED_WITH`, portfolio via `CREATED→Tattoo.imageUrl`,
  location via `Shop`/`City`/`State`). **Output `ArtistRecord` shape is
  unchanged**, so consumers didn't need edits.
- `.env.local`, `.env`, `.env.example` — credentials + `NEO4J_DATABASE`.

**Scripts** — `scripts/import-to-neo4j.js` (primary importer, full new model),
`scripts/test-neo4j-connection.js`, `scripts/insert-artists-to-neo4j.js`,
`scripts/generate-neo4j-cypher.js`, `scripts/generate-tattoo-artists-data.js`,
`scripts/data_acquisition/import_to_neo4j.js`, `scripts/seed-artist-embeddings.ts`.
`scripts/migrate-neo4j-schema.js` was left as-is (its embedding/mentor index
logic is still valid).

**Docs** — `directives/import-artists.md`, `scripts/README.md`,
`scripts/QUICKSTART.md`, `docs/NEO4J_INTEGRATION_SUMMARY.md`,
`docs/architecture/next-gen-ux.md`,
`docs/TATTOO_ARTISTS_DATA_GENERATION_SUMMARY.md`, `generated/README.md`.
`CHANGELOG.md` was left untouched (historical record).

**Visualization** — `data/ink-graph.html` untouched (still the national-dataset
visualization).

---

## 6. How to run & verify

```bash
npm install

# 1. Confirm credentials + database name resolve
node scripts/test-neo4j-connection.js

# 2. Seed / re-seed the graph (⚠ DETACH DELETEs everything first)
node scripts/import-to-neo4j.js

# 3. Run the app against the live graph
npm run dev        # NEXT_PUBLIC_NEO4J_ENABLED=true, DEMO_MODE=false
```

The importer prints per-label node counts and per-type relationship counts, then
a sample `State→City→Shop→Artist→Style` traversal, so you can eyeball the model.

### Sample query in the new model

```cypher
// Traditional artists in Phoenix (was: MATCH (a)-[:LOCATED_IN]->(c:City {name:'Phoenix'}))
MATCH (:City {name:'Phoenix'})-[:HAS_SHOP]->(:Shop)-[:HAS_ARTIST]->(a:Artist)-[:SPECIALIZES_IN]->(:Style {name:'Traditional'})
RETURN a.name, a.hourlyRate ORDER BY a.rating DESC LIMIT 5
```

---

## 7. Notes for the next agent

- Do **not** reintroduce `LOCATED_IN` or flat `Artist.styles/tags/shopName`
  Cypher — traverse the graph instead.
- `neo4jService.ts` and `scripts/import-to-neo4j.js` are the canonical reference
  for the model; match them if you touch anything else.
- `APPRENTICED_UNDER` / `INFLUENCED_BY` are intentionally preserved. Remove them
  only if the product explicitly drops genealogy/influence features.
