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

### Step 1: Validate Export File

```bash
# Validate JSON structure before migration
python execution/validate_localStorage_export.py data/export-[user].json
```

**Expected output:**
```
✅ Valid localStorage export
📊 Summary:
   - Session ID: abc123def456
   - Designs: 3
   - Total versions: 12
   - Total layers: 47
   - Date range: 2026-01-15 to 2026-02-10
✅ All required fields present
✅ No schema violations
```

**If validation fails:** Fix reported issues before proceeding. Common issues:
- Missing `sessionId` field
- Malformed layer data
- Invalid ISO8601 timestamps

### Step 2: Preview Migration (Dry Run)

```bash
cd execution/
python migrate_localStorage.py \
  --source ../data/export-[user].json \
  --user-uid [FIREBASE_UID] \
  --dry-run
```

**Expected output:**
```
🔍 DRY RUN MODE - No data will be written
🔄 Loading export file...
✅ Loaded 3 designs with 12 versions

📋 Migration plan:
   ├─ Design 1: "Dragon sleeve concept"
   │  ├─ Version 1: 4 layers → users/[uid]/designs/[did]/versions/v001/layers/
   │  ├─ Version 2: 5 layers → users/[uid]/designs/[did]/versions/v002/layers/
   │  └─ Version 3: 6 layers → users/[uid]/designs/[did]/versions/v003/layers/
   ├─ Design 2: "Minimalist geometric"
   │  └─ Version 1: 3 layers → users/[uid]/designs/[did2]/versions/v001/layers/
   └─ Design 3: "Floral back piece"
       ├─ Version 1: 7 layers → users/[uid]/designs/[did3]/versions/v001/layers/
       └─ Version 2: 8 layers → users/[uid]/designs/[did3]/versions/v002/layers/

📊 Total writes:
   - 3 design documents
   - 12 version documents
   - 47 layer documents
   - 62 total Firestore writes
```

**Review output carefully.** Ensure design names and version counts match expected data.

### Step 3: Run Migration

```bash
python migrate_localStorage.py \
  --source ../data/export-[user].json \
  --user-uid [FIREBASE_UID]
```

**Parameters:**
- `--source`: Path to localStorage export JSON
- `--user-uid`: Target Firebase user UID (required for authenticated users)
- `--anonymous`: Migrate to anonymous storage (uses `sessionId` as user identifier)
- `--dry-run`: Preview migration without writing
- `--overwrite`: Overwrite existing designs with same IDs (default: skip existing)
- `--batch-size`: Documents per batch (default: 100, max: 500)

**Expected output:**
```
🔄 Connecting to Firestore...
✅ Connected
🔄 Migrating 3 designs for user [uid]...

   ├─ Design 1/3: dragon-sleeve-concept
   │  ├─ Created design document ✅
   │  ├─ Version 1: 4 layers written ✅
   │  ├─ Version 2: 5 layers written ✅
   │  └─ Version 3: 6 layers written ✅
   ├─ Design 2/3: minimalist-geometric
   │  ├─ Created design document ✅
   │  └─ Version 1: 3 layers written ✅
   └─ Design 3/3: floral-back-piece
      ├─ Created design document ✅
      ├─ Version 1: 7 layers written ✅
      └─ Version 2: 8 layers written ✅

✅ Migration complete!
📊 Total writes: 62 documents
⏱️  Completed in 8.4 seconds
```

### Step 4: Verify Migration

```bash
# Count migrated documents
python -c "
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
Designs: 3
Versions: 12
Layers: 47
```

**Counts should match dry-run summary.** If counts are lower, check for partial migration errors in logs.

### Step 5: Test User Access

```bash
# Verify user can read their migrated data
python execution/test_user_access.py --user-uid [FIREBASE_UID]
```

**Expected output:**
```
🔄 Testing user access for [uid]...
✅ User can read designs collection
✅ User can read versions subcollection
✅ User can read layers subcollection
✅ Security rules enforce owner-only access
✅ All access tests passed
```

## Rollback

### Delete Migrated Data

```bash
# Delete all designs for a specific user
python execution/migrate_localStorage.py \
  --user-uid [FIREBASE_UID] \
  --rollback
```

**Warning:** This deletes ALL designs for the user, not just migrated data. Only use if migration corrupted data.

### Restore from Firestore Backup

```bash
# List available backups
gsutil ls gs://[BACKUP_BUCKET]/firestore-backups/

# Restore specific backup
gcloud firestore import gs://[BACKUP_BUCKET]/firestore-backups/[timestamp]/
```

**Caution:** Firestore import is ALL-OR-NOTHING. Restoring a backup overwrites the entire database, not just one user's data.

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

Expected structure for localStorage export JSON:

```json
{
  "sessionId": "abc123def456",
  "exportedAt": "2026-02-16T10:30:00Z",
  "designs": [
    {
      "id": "design-uuid-1",
      "name": "Dragon sleeve concept",
      "createdAt": "2026-01-15T14:22:00Z",
      "versions": [
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
  ]
}
```

## Appendix: Batch Size Guidance

| User Type | Typical Data | Batch Size | Est. Time |
|-----------|--------------|------------|-----------|
| Casual user | 1-5 designs, 5-20 versions | 100 | < 5 seconds |
| Active user | 5-20 designs, 20-100 versions | 100 | 5-15 seconds |
| Power user | 20+ designs, 100+ versions | 200 | 15-60 seconds |
| Bulk migration (admin) | 1000+ designs | 500 | 5-20 minutes |

**Firestore limits:**
- Max 500 writes per batch commit
- Max 10MB per batch
- No rate limit for writes (but monitor quota)
