# Directive: Migrate Data to Firestore

**ID:** DIR-004
**Owner:** Data Team
**Last Updated:** 2026-02-16
**Last Tested:** Not yet tested
**Risk Level:** Medium
**Estimated Duration:** 15-45 minutes (depends on data volume)

## Purpose

Migrate design data from browser localStorage exports to Firestore's production structure. This operation enables users to preserve their designs when transitioning from the MVP's localStorage-based persistence to the production-grade Firestore backend.

TatTester's progressive migration strategy allows anonymous users to continue using localStorage while authenticated users get automatic Firestore sync. This directive handles bulk migration of exported data.

## Prerequisites

- [ ] Firestore database provisioned and security rules deployed
- [ ] `GCP_PROJECT_ID` environment variable set
- [ ] GCP credentials available (`gcloud auth application-default login` or service account)
- [ ] Python dependencies installed: `pip install -r execution/requirements.txt`
- [ ] Exported localStorage JSON file available (user exports via UI or manual browser extraction)
- [ ] Target user's Firebase UID known (for authenticated migrations)

## Procedure

**Note:** There is no standalone export-validation script (`validate_localStorage_export.py` does not exist in `execution/`). The only pre-migration validation available is `migrate_localStorage.py --dry-run`, which parses and checks the export file without writing to Firestore. Treat Step 1 below as the validation step.

### Step 1: Preview Migration (Dry Run)

```bash
cd execution/
python3 migrate_localStorage.py \
  --input ../data/export-[user].json \
  --user-id [FIREBASE_UID] \
  --dry-run
```

**Parameters (real flags, from `execution/migrate_localStorage.py`):**
- `--input`: Path to localStorage export JSON file (required)
- `--user-id`: Target Firestore user ID (required)
- `--project-id`: GCP project ID (optional for `--dry-run`; defaults to `GCP_PROJECT_ID` env var; required for a real run)
- `--bucket`: Cloud Storage bucket for uploaded images (optional; defaults to `{project_id}-designs`)
- `--dry-run`: Parse and validate without writing to Firestore

There are no `--source`, `--user-uid`, `--anonymous`, `--overwrite`, or `--batch-size` flags — the script does not implement them.

**Expected output (illustrative — actual dry-run prints up to the first 3 versions):**
```
=== localStorage to Firestore Migration ===

Reading ../data/export-[user].json...
Found 12 versions

DRY RUN: Migration mapping:

  Version 1:
    → users/[uid]/designs/design_1/versions/version-uuid-1
    Layers: 4
    Image URL type: URL

  Version 2:
    → users/[uid]/designs/design_2/versions/version-uuid-2
    Layers: 5
    Image URL type: data URI

  Version 3:
    → users/[uid]/designs/design_3/versions/version-uuid-3
    Layers: 6
    Image URL type: URL

  ... and 9 more
```

**Review output carefully.** Confirm the version count and layer counts match expected data before proceeding.

### Step 2: Run Migration

```bash
python3 migrate_localStorage.py \
  --input ../data/export-[user].json \
  --user-id [FIREBASE_UID] \
  --project-id [GCP_PROJECT_ID]
```

Omit `--project-id` if `GCP_PROJECT_ID` is already set in the environment. Add `--bucket [BUCKET_NAME]` to override the default `{project_id}-designs` bucket.

**Expected output:**
```
=== localStorage to Firestore Migration ===

Reading ../data/export-[user].json...
Found 12 versions
Migrated 1/12 designs
Migrated 2/12 designs
...
Migrated 12/12 designs

✓ Successfully migrated 12 designs
```

**Note:** The script migrates each *version* into its own generated design document (`design_id = sha256(version.id)[:16]`) — it does not group versions under a shared parent design the way the export file's `designs` array does. Review actual Firestore output structure after migration rather than assuming it mirrors the export file's nesting.

### Step 3: Verify Migration

```bash
# Count migrated documents
python3 -c "
from google.cloud import firestore
db = firestore.Client()

user_uid = '[FIREBASE_UID]'
designs = db.collection('users').document(user_uid).collection('designs').stream()

total_designs = 0
total_versions = 0
total_layers = 0

for design in designs:
    total_designs += 1
    versions = db.collection('users').document(user_uid).collection('designs').document(design.id).collection('versions').stream()
    for version in versions:
        total_versions += 1
        layers = db.collection('users').document(user_uid).collection('designs').document(design.id).collection('versions').document(version.id).collection('layers').stream()
        total_layers += len(list(layers))

print(f'Designs: {total_designs}')
print(f'Versions: {total_versions}')
print(f'Layers: {total_layers}')
"
```

**Expected output:**
```
Designs: 12
Versions: 12
Layers: 47
```

For an empty target user, the script creates one design document per source
version, so the design and version counts are equal. For a user who already
has designs, compare the before/after delta to the dry-run version count rather
than comparing the totals directly. If the delta is lower, check for partial
migration errors in logs.

**Note:** There is no `test_user_access.py` script in `execution/` — it does not exist. To confirm the target user can actually read their migrated data, either sign in as that user in the app UI and load their designs, or run the Firestore security-rules test suite (if one exists) against the deployed rules. Do not rely on the Step 3 admin-SDK read above as proof of user-level access — the admin client bypasses security rules entirely.

## Rollback

**There is no rollback capability.** `migrate_localStorage.py` has no `--rollback` flag and implements no delete/undo functionality — check `execution/migrate_localStorage.py`'s argparse block (`--input`, `--user-id`, `--project-id`, `--bucket`, `--dry-run` only) to confirm. Do not treat this section as a safety net: **back up before running a real migration.**

### Before running: back up and build a recovery manifest

```bash
# Full-database managed export. A users-only collection-group export does NOT
# automatically include nested designs/versions/layers subcollections.
gcloud firestore export gs://[BACKUP_BUCKET]/firestore-backups/[timestamp]/
```

Before a real run, also record:

- every existing document path under the target user that the migration may
  overwrite;
- every generated design document path the migration will create; and
- the dry-run version/layer counts.

This reviewed manifest is required because a Firestore import does not delete
new documents that were absent from the export. If the exact affected paths
cannot be identified ahead of time, do not run the migration.

### If migration corrupted data: manual recovery

```bash
# List available backups
gsutil ls gs://[BACKUP_BUCKET]/firestore-backups/

# Restore exported documents that existed before the migration
gcloud firestore import gs://[BACKUP_BUCKET]/firestore-backups/[timestamp]/
```

Managed import merges exported documents into the database and overwrites
matching document IDs. It is **not** all-or-nothing and it does **not** remove
new documents created by the failed migration. Use the reviewed recovery
manifest to delete only those newly created paths, then verify the target
user's full design/version/layer tree. Treat this as manual disaster recovery,
not rollback.

## Known Issues

No known issues yet. Update this section when issues are discovered during data migrations.

## Post-Operation

- [ ] Verify document counts match export file
- [ ] Test user can access migrated designs in UI
- [ ] Verify security rules prevent unauthorized access
- [ ] Delete original localStorage export file (contains user data)
- [ ] If any issues occurred, update this directive's "Known Issues" section
- [ ] If schema changed, update `migrate_localStorage.py` and this directive

## Related Directives

- **DIR-003: Generate Embeddings** - Run after migration to embed newly imported portfolios
- **DIR-005: Monitor Budget** - Monitor Firestore read/write quotas after bulk migrations
- **DIR-006: Onboard Engineer** - New engineers should run a test migration as part of onboarding

## Appendix: Firestore Structure

Migrated data follows this subcollection structure:

```
users/
  {uid}/
    designs/
      {designId}/
        name: string
        createdAt: timestamp
        updatedAt: timestamp
        metadata: object

        versions/
          {versionId}/
            versionNumber: number
            timestamp: timestamp
            prompt: string
            enhancedPrompt: string
            parameters: object
            isFavorite: boolean
            branchedFrom: object (optional)

            layers/
              {layerId}/
                type: 'subject' | 'background' | 'effect'
                imageUrl: string
                blendMode: string
                opacity: number
                visible: boolean
                transform: object
                zIndex: number
```

**Why subcollections instead of arrays?**
- Firestore queries on deeply nested arrays are limited
- Subcollections enable pagination for users with 100+ versions
- Security rules can target individual layers for fine-grained access control
- Scales better (no 1MB document size limit)

## Appendix: Export File Format

The parser requires a top-level key containing `version_history_` whose value
is the versions array. It does not accept a top-level `designs` array.

Expected structure for localStorage export JSON:

```json
{
  "version_history_abc123def456": [
    {
      "id": "version-uuid-1",
      "versionNumber": 1,
      "timestamp": "2026-01-15T14:22:00Z",
      "prompt": "Japanese dragon sleeve",
      "enhancedPrompt": "Traditional Japanese dragon...",
      "parameters": {
        "model": "sdxl",
        "size": "1024x1024"
      },
      "imageUrl": "https://storage.googleapis.com/...",
      "layers": [
        {
          "id": "layer-uuid-1",
          "type": "subject",
          "imageUrl": "https://storage.googleapis.com/...",
          "blendMode": "normal",
          "opacity": 1.0,
          "visible": true,
          "transform": {
            "x": 0, "y": 0, "rotation": 0, "scale": 1
          },
          "zIndex": 0
        }
      ],
      "isFavorite": false
    }
  ]
}
```

## Appendix: Batch Size Guidance

**Not configurable:** `migrate_localStorage.py` has no `--batch-size` flag — it writes documents one at a time via individual `.set()` calls, not batched commits. The table below is rough timing/volume guidance only, not a tunable parameter.

| User Type | Typical Data | Est. Time |
|-----------|--------------|-----------|
| Casual user | 1-5 designs, 5-20 versions | < 5 seconds |
| Active user | 5-20 designs, 20-100 versions | 5-15 seconds |
| Power user | 20+ designs, 100+ versions | 15-60 seconds |
| Bulk migration (admin) | 1000+ designs | 5-20 minutes |

**Firestore limits (informational — not enforced by this script):**
- Max 500 writes per batch commit
- Max 10MB per batch
- No rate limit for writes (but monitor quota)
