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

**Note:** There is no standalone export-validation script (`validate_localStorage_export.py` does not exist in `execution/`). The only pre-migration validation available is `migrate_localStorage.py --dry-run`, which parses and checks the export file and prints the complete recovery manifest without writing to Firestore. Treat Step 1 below as the validation step.

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

**Expected output (illustrative — the actual dry run prints every path):**
```
=== localStorage to Firestore Migration ===

Reading ../data/export-[user].json...
Found 1 design history containing 12 versions

DRY RUN: Complete recovery manifest (no writes):

    Design: users/[uid]/designs/abc123def456
    Source: version_history_abc123def456

      Version 1:
        Document: users/[uid]/designs/abc123def456/versions/version-uuid-1
        Layers: 4
          - users/[uid]/designs/abc123def456/versions/version-uuid-1/layers/layer-uuid-1
          ...
        Storage: gs://[bucket]/users/[uid]/designs/abc123def456/images/[content-hash].png
        Image URL type: URL

      Version 2:
        Document: users/[uid]/designs/abc123def456/versions/version-uuid-2
        Layers: 5
        Image URL type: data URI
```

**Review output carefully.** Confirm the version count and layer counts match expected data before proceeding.
For an exact storage manifest, supply `--bucket [BUCKET_NAME]` (or supply a
project ID so the default bucket can be derived). The real run performs the
same complete preflight before its first write.

**Safe target requirement:** run this tool only for a new or empty target user.
It deliberately creates documents without overwriting existing ones and stops if
a generated path already exists. Do not use it to merge an export into a user
who already has designs.

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
Found 1 design history containing 12 versions
Migrated 1/12 versions
Migrated 2/12 versions
...
Migrated 12/12 versions

✓ Successfully migrated 1 designs and 12 versions
```

**Note:** Each `version_history_[design-id]` entry becomes one visible parent
design, with every source version preserved beneath that parent. Multiple
history keys are migrated independently. This matches TatTester's in-app
migration and preserves the customer's timeline.

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
Designs: 1
Versions: 12
Layers: 47
```

For the required empty target user, the design count must equal the number of
`version_history_` keys and the version count must equal the sum of their
arrays. If either count differs, stop and inspect the migration error before
retrying.

**Note:** There is no `test_user_access.py` script in `execution/` — it does not exist. To confirm the target user can actually read their migrated data, either sign in as that user in the app UI and load their designs, or run the Firestore security-rules test suite (if one exists) against the deployed rules. Do not rely on the Step 3 admin-SDK read above as proof of user-level access — the admin client bypasses security rules entirely.

## Rollback

**There is no rollback capability.** `migrate_localStorage.py` has no `--rollback` flag and implements no delete/undo functionality — check `execution/migrate_localStorage.py`'s argparse block (`--input`, `--user-id`, `--project-id`, `--bucket`, `--dry-run` only) to confirm. Do not treat this section as a safety net: **back up before running a real migration.**

### Before running: confirm an empty target and build a recovery manifest

```bash
# Optional disaster-recovery insurance. This is not the routine rollback path.
gcloud firestore export gs://[BACKUP_BUCKET]/firestore-backups/[timestamp]/
```

Before a real run, also record:

- proof that the target user's `designs` collection is empty;
- every deterministic Firestore and Cloud Storage path shown by the dry run; and
- the dry-run version/layer counts.

The script uses create-only writes, so it will fail rather than overwrite a
matching document. The reviewed path manifest is the routine recovery tool:
if a partial migration fails, delete only paths that the manifest proves were
newly created by that run. If the exact paths or empty-target state cannot be
verified ahead of time, do not run the migration.

### If migration fails partway: remove only newly created paths

Use the reviewed manifest to delete only documents and storage objects created
by the failed run, starting with layer and version children, then parent
designs, then orphaned Cloud Storage objects. Confirm the target returns to zero
designs and none of the manifest's storage objects remain before retrying.

Do **not** use a full Firestore import to recover one user's migration. Imports
merge into the live database and can overwrite unrelated documents changed
after the export. A full managed import is disaster recovery for a
whole-database incident only, during a maintenance window and with an explicit
restore decision.

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

**Not configurable:** `migrate_localStorage.py` has no `--batch-size` flag — it writes documents one at a time via create-only `.create()` calls, not batched commits. The table below is rough timing/volume guidance only, not a tunable parameter.

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
