# Directive: Seed Neo4j with Artist Data

**ID:** DIR-002
**Owner:** Data Team
**Last Updated:** 2026-02-16
**Last Tested:** Not yet tested
**Risk Level:** Medium
**Estimated Duration:** 10-30 minutes (depends on data size)

## Purpose

Import artist, portfolio, style, and tag data into Neo4j graph database from JSON or CSV source files. This operation populates the graph database with initial artist profiles and relationships that power the hybrid matching system.

Neo4j stores the relationship-based component of TatTester's matching algorithm (artist specialties, portfolio tags, location data) while Firestore handles vector embeddings for semantic similarity.

## Prerequisites

- [ ] Neo4j database accessible (Aura or self-hosted)
- [ ] `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD` environment variables set
- [ ] Source data file exists at `data/artists.json` or specified path
- [ ] Source data validated against schema (see Appendix)
- [ ] Python dependencies installed: `pip install -r execution/requirements.txt`
- [ ] Backup of existing data taken if re-seeding (see Rollback section)

## Procedure

### Step 1: Validate Source Data

```bash
# Check source file exists and is valid JSON
python execution/validate_artist_data.py data/artists.json
```

**Expected output:**
```
✅ Schema valid: 247 artists, 1,832 portfolio items
✅ All required fields present
✅ No duplicate artist IDs
```

**If validation fails:** Fix source data issues reported in output before proceeding.

### Step 2: Run Import Script

```bash
cd execution/
python seed_artists.py \
  --source ../data/artists.json \
  --batch-size 100 \
  --clear-existing
```

**Parameters:**
- `--source`: Path to source JSON file (default: `../data/artists.json`)
- `--batch-size`: Number of records per transaction (default: 100, max: 500)
- `--clear-existing`: Delete all existing data before import (use with caution)
- `--dry-run`: Preview import without writing to database

**Expected output:**
```
🔄 Connecting to Neo4j at neo4j+s://xxxxx.databases.neo4j.io
✅ Connected successfully
🔄 Clearing existing data...
✅ Deleted 0 artists, 0 portfolios
🔄 Importing artists (batch size: 100)
   ├─ Batch 1/3: 100 artists imported
   ├─ Batch 2/3: 100 artists imported
   └─ Batch 3/3: 47 artists imported
✅ Total: 247 artists, 1,832 portfolio items, 4,216 relationships
⏱️  Completed in 47.3 seconds
```

**If import fails mid-batch:** Script is transactional per batch. Partial batches are rolled back. Re-run with same parameters to continue from last successful batch.

### Step 3: Verify Import

```bash
# Count imported nodes
python -c "
from neo4j import GraphDatabase
import os
driver = GraphDatabase.driver(
    os.environ['NEO4J_URI'],
    auth=(os.environ.get('NEO4J_USER', 'neo4j'), os.environ['NEO4J_PASSWORD'])
)
with driver.session() as session:
    result = session.run('MATCH (a:Artist) RETURN count(a) AS count')
    print(f'Artists: {result.single()[\"count\"]}')
    result = session.run('MATCH (p:Portfolio) RETURN count(p) AS count')
    print(f'Portfolio items: {result.single()[\"count\"]}')
driver.close()
"
```

**Expected output:**
```
Artists: 247
Portfolio items: 1,832
```

### Step 4: Verify Relationships

```bash
# Test a sample query
python -c "
from neo4j import GraphDatabase
import os
driver = GraphDatabase.driver(
    os.environ['NEO4J_URI'],
    auth=(os.environ.get('NEO4J_USER', 'neo4j'), os.environ['NEO4J_PASSWORD'])
)
with driver.session() as session:
    # Find artists specializing in Japanese style
    result = session.run('''
        MATCH (a:Artist)-[:SPECIALIZES_IN]->(s:Style {name: \"Japanese\"})
        RETURN a.name AS artist
        LIMIT 5
    ''')
    for record in result:
        print(f'  - {record[\"artist\"]}')
driver.close()
"
```

**Expected output:**
```
  - Artist Name 1
  - Artist Name 2
  - ...
```

**Look for:** At least 3-5 artists returned. If zero, check that source data includes Japanese style tags.

## Rollback

### Restore from Backup (if --clear-existing was used)

If you took a backup before clearing:

```bash
# Restore from Neo4j dump
neo4j-admin database load --from-path=backups/neo4j-[timestamp].dump neo4j --overwrite-destination=true
```

### Delete Imported Data (if no backup)

```bash
python execution/seed_artists.py --clear-existing --dry-run
# Review what will be deleted, then:
python execution/seed_artists.py --clear-existing
```

**Warning:** This deletes ALL artist data. Only use if you need to start fresh.

## Known Issues

### KI-001: Linter auto-modifies execution script function names and error messages
**Discovered:** 2026-02-16 during Phase 6 Plan 02
**Symptom:** After committing execution scripts, a subsequent linter/formatter run renames functions (e.g., `health_check` to `health_check_get`) and reformats error message strings. Tests written against original signatures then fail.
**Root cause:** Project has auto-formatting enabled (IDE or pre-commit hook) that applies naming convention rules to Python files.
**Resolution:** Accept linter modifications as improvements. Update test expectations to match linter-modified function names and error messages. The linter changes improved code quality (more explicit function names).
**Prevention:** After creating or modifying execution scripts, run the linter manually (`npm run lint` or equivalent) BEFORE writing tests. Write tests against the post-linter code, not the pre-linter code.

## Post-Operation

- [ ] Verify artist count matches source data
- [ ] Verify relationships created (SPECIALIZES_IN, HAS_PORTFOLIO, etc.)
- [ ] Test a sample matching query in Neo4j Browser or Bloom
- [ ] If any issues occurred, update this directive's "Known Issues" section
- [ ] If source data schema changed, update `validate_artist_data.py` and this directive

## Related Directives

- **DIR-003: Generate Embeddings** - Run after seeding to create vector embeddings for portfolio images
- **DIR-004: Migrate Data** - For moving data between environments
- **DIR-006: Onboard Engineer** - New engineers should seed local Neo4j as part of setup

## Appendix: Source Data Schema

Expected JSON structure for `data/artists.json`:

```json
{
  "artists": [
    {
      "id": "artist-uuid-1",
      "name": "Artist Name",
      "location": {
        "city": "Portland",
        "state": "OR",
        "country": "USA",
        "lat": 45.5152,
        "lng": -122.6784
      },
      "specialties": ["Japanese", "Color Realism"],
      "portfolio": [
        {
          "id": "portfolio-uuid-1",
          "imageUrl": "https://storage.googleapis.com/...",
          "tags": ["dragon", "sleeve", "color"],
          "description": "Full sleeve dragon piece",
          "bodyPart": "arm",
          "year": 2023
        }
      ],
      "rating": 4.8,
      "yearsExperience": 12,
      "shopName": "Ink & Honor",
      "contactEmail": "artist@example.com",
      "instagramHandle": "@artistname"
    }
  ]
}
```

**Required fields:** `id`, `name`, `location.city`, `location.state`, `specialties`, `portfolio`
**Optional fields:** `rating`, `yearsExperience`, `shopName`, `contactEmail`, `instagramHandle`

## Appendix: Batch Size Guidance

| Data Size | Batch Size | Estimated Time | Notes |
|-----------|------------|----------------|-------|
| < 100 artists | 50 | 5-10 seconds | Small dataset, batch size less critical |
| 100-500 artists | 100 | 20-60 seconds | Recommended default |
| 500-2000 artists | 200 | 1-5 minutes | Balance between speed and memory |
| 2000+ artists | 500 | 5-30 minutes | Large imports, monitor memory usage |

**Rate limit awareness:** Neo4j Aura has no hard rate limits, but very large batches (>1000) may cause memory pressure. If imports fail with OOM errors, reduce batch size.
