# Google Cloud Storage Setup Guide

## Overview

This guide configures Google Cloud Storage (GCS) for TatT Pro's asset storage, replacing local filesystem storage with cloud-native signed URLs for designs, layers, and stencils.

**Prerequisites**:

- ✅ Task 1 complete (GCP project + service account)
- ✅ Service account key downloaded

**Estimated time**: 20-30 minutes

---

## Step 1: Create Cloud Storage Bucket

### 1.1 Navigate to Cloud Storage

1. Go to [console.cloud.google.com/storage](https://console.cloud.google.com/storage)
2. Or: Click hamburger menu (☰) → **Cloud Storage** → **Buckets**

### 1.2 Create Bucket

1. Click **"Create Bucket"**
2. **Name your bucket**: `tatt-pro-assets`
   - Must be globally unique
   - If taken, try: `tatt-pro-assets-YOURNAME` or `tatt-pro-assets-2026`
   - **Important**: Bucket names are permanent!
3. Click **"Continue"**

### 1.3 Choose Location

**CRITICAL**: Must match Firebase region!

1. **Location type**: Regional
2. **Location**: `us-central1 (Iowa)`
   - Same as Firebase Realtime Database
   - Lowest latency to Vercel edge
3. Click **"Continue"**

### 1.4 Choose Storage Class

1. **Default storage class**: Standard
   - Best for frequently accessed files
   - Designs and layers accessed often
2. Click **"Continue"**

### 1.5 Access Control

1. **Prevent public access**: ✅ Enforce (keep checked)
   - We'll use signed URLs for secure access
   - Never make bucket public!
2. **Access control**: Fine-grained (recommended)
3. Click **"Continue"**

### 1.6 Data Protection

1. **Object versioning**: OPTIONAL
   - Enable if you want version history
   - Adds ~20% storage cost
   - Recommendation: **Disable for demo**
2. **Retention policy**: None
3. **Encryption**: Google-managed key (default)
4. Click **"Create"**

---

## Step 2: Configure CORS

CORS (Cross-Origin Resource Sharing) allows browser uploads from your Vercel domain.

### 2.1 Create CORS Configuration File

Create `gcs-cors.json` in your project root:

```json
[
  {
    "origin": [
      "http://localhost:5173",
      "http://localhost:3000",
      "https://tatt-tester.vercel.app",
      "https://*.vercel.app"
    ],
    "method": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "responseHeader": [
      "Content-Type",
      "Content-Length",
      "Content-Disposition",
      "X-Goog-Resumable"
    ],
    "maxAgeSeconds": 3600
  }
]
```

**Update origins**:

- Add your production domain when deployed
- Keep localhost for development

### 2.2 Apply CORS Configuration

```bash
# Install Google Cloud SDK if not already installed
brew install --cask google-cloud-sdk  # macOS

# Authenticate (if not done in Task 1)
gcloud auth login
gcloud config set project tatt-pro

# Apply CORS configuration
gsutil cors set gcs-cors.json gs://tatt-pro-assets
```

### 2.3 Verify CORS

```bash
gsutil cors get gs://tatt-pro-assets
```

Expected output should match your `gcs-cors.json`

---

## Step 3: Set Up Lifecycle Policies

Automatically delete temporary files after 7 days to save costs.

### 3.1 Create Lifecycle Configuration

Create `gcs-lifecycle.json`:

```json
{
  "lifecycle": {
    "rule": [
      {
        "action": {
          "type": "Delete"
        },
        "condition": {
          "age": 7,
          "matchesPrefix": ["temp/"]
        }
      },
      {
        "action": {
          "type": "SetStorageClass",
          "storageClass": "COLDLINE"
        },
        "condition": {
          "age": 90,
          "matchesPrefix": ["archive/"]
        }
      }
    ]
  }
}
```

**Rules**:

- **Rule 1**: Delete files in `temp/` folder after 7 days
- **Rule 2**: Move `archive/` files to Coldline storage after 90 days (cheaper)

### 3.2 Apply Lifecycle Policy

```bash
gsutil lifecycle set gcs-lifecycle.json gs://tatt-pro-assets
```

### 3.3 Verify Lifecycle

```bash
gsutil lifecycle get gs://tatt-pro-assets
```

---

## Step 4: Configure IAM Permissions

Ensure your service account can access the bucket.

### 4.1 Grant Storage Admin Role

```bash
# Grant service account full access to bucket
gsutil iam ch \
  serviceAccount:tatt-pro-service-account@tatt-pro.iam.gserviceaccount.com:roles/storage.objectAdmin \
  gs://tatt-pro-assets
```

### 4.2 Verify Permissions

```bash
gsutil iam get gs://tatt-pro-assets
```

Look for your service account with `roles/storage.objectAdmin`

---

## Step 5: Create Folder Structure

Organize assets with a clear folder structure.

### 5.1 Create Folders (Optional)

GCS doesn't have true folders, but prefixes work:

```bash
# Create placeholder files to establish "folders"
echo "Generated tattoo designs" > designs.txt
gsutil cp designs.txt gs://tatt-pro-assets/designs/.keep
rm designs.txt

echo "RGBA layer PNGs" > layers.txt
gsutil cp layers.txt gs://tatt-pro-assets/layers/.keep
rm layers.txt

echo "Stencil exports (300 DPI)" > stencils.txt
gsutil cp stencils.txt gs://tatt-pro-assets/stencils/.keep
rm stencils.txt

echo "Temporary uploads" > temp.txt
gsutil cp temp.txt gs://tatt-pro-assets/temp/.keep
rm temp.txt

echo "Artist portfolio thumbnails" > portfolios.txt
gsutil cp portfolios.txt gs://tatt-pro-assets/portfolios/.keep
rm portfolios.txt
```

### 5.2 Folder Hierarchy

```
gs://tatt-pro-assets/
├── designs/          # Generated tattoo images
├── layers/           # RGBA layer PNGs (subject, background, effects)
├── stencils/         # High-res stencil exports (300 DPI)
├── temp/             # Temporary uploads (auto-deleted after 7 days)
└── portfolios/       # Artist portfolio thumbnails
```

---

## Step 6: Update Environment Variables

### 6.1 Add GCS Config to `.env.local`

```bash
# Google Cloud Storage Configuration
VITE_GCS_BUCKET_NAME=tatt-pro-assets
VITE_GCS_PROJECT_ID=tatt-pro
VITE_GCS_SIGNED_URL_EXPIRY=3600  # 1 hour in seconds

# Storage service configuration
GCS_BUCKET_NAME=tatt-pro-assets
GCS_PROJECT_ID=tatt-pro
GCS_LOCATION=us-central1
```

### 6.2 Verify Configuration

```bash
# Check environment variables
grep GCS .env.local
```

---

## Step 7: Test Upload & Signed URL Generation

### 7.1 Install Google Cloud Storage SDK

```bash
npm install @google-cloud/storage
```

### 7.2 Create Test Script

Create `scripts/test-gcs-upload.js`:

```javascript
import { Storage } from '@google-cloud/storage';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Initialize Storage with service account
const storage = new Storage({
  keyFilename: './gcp-service-account-key.json',
  projectId: process.env.GCS_PROJECT_ID || 'tatt-pro'
});

const bucketName = process.env.GCS_BUCKET_NAME || 'tatt-pro-assets';
const bucket = storage.bucket(bucketName);

async function testUploadAndSignedURL() {
  try {
    // Step 1: Create test file
    const testData = `Test upload at ${new Date().toISOString()}`;
    const localFilePath = 'test-upload.txt';
    writeFileSync(localFilePath, testData);
    
    console.log('✅ Created test file');

    // Step 2: Upload to GCS
    const gcsFilePath = 'temp/test-upload.txt';
    await bucket.upload(localFilePath, {
      destination: gcsFilePath,
      metadata: {
        contentType: 'text/plain',
        metadata: {
          uploadedBy: 'test-script',
          timestamp: Date.now().toString()
        }
      }
    });
    
    console.log(`✅ Uploaded to gs://${bucketName}/${gcsFilePath}`);

    // Step 3: Generate signed URL (1 hour expiry)
    const file = bucket.file(gcsFilePath);
    const [signedUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 3600 * 1000 // 1 hour
    });
    
    console.log('✅ Generated signed URL:');
    console.log(signedUrl);

    // Step 4: Download via signed URL (verify it works)
    const response = await fetch(signedUrl);
    const downloadedData = await response.text();
    
    if (downloadedData === testData) {
      console.log('✅ Download verification successful!');
    } else {
      throw new Error('Downloaded data does not match uploaded data');
    }

    // Step 5: Cleanup
    await file.delete();
    console.log('✅ Deleted test file from GCS');
    
    // Clean up local file
    const { unlinkSync } = await import('fs');
    unlinkSync(localFilePath);
    console.log('✅ Cleanup complete');

    console.log('\n🎉 All tests passed!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testUploadAndSignedURL();
```

### 7.3 Run Test

```bash
# Load environment variables
export GCS_BUCKET_NAME=$(grep VITE_GCS_BUCKET_NAME .env.local | cut -d '=' -f2)
export GCS_PROJECT_ID=$(grep VITE_GCS_PROJECT_ID .env.local | cut -d '=' -f2)

# Run test
node scripts/test-gcs-upload.js
```

Expected output:

```
✅ Created test file
✅ Uploaded to gs://tatt-pro-assets/temp/test-upload.txt
✅ Generated signed URL:
https://storage.googleapis.com/tatt-pro-assets/temp/test-upload.txt?X-Goog-Algorithm=...
✅ Download verification successful!
✅ Deleted test file from GCS
✅ Cleanup complete

🎉 All tests passed!
```

---

## Step 8: Create GCS Service (Preview)

### 8.1 Service File Structure

Preview of what we'll build in Task 4:

```javascript
// src/services/gcs-service.js
import { Storage } from '@google-cloud/storage';

const storage = new Storage({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  projectId: process.env.GCP_PROJECT_ID
});

const bucketName = process.env.GCS_BUCKET_NAME;
const bucket = storage.bucket(bucketName);

/**
 * Upload file to GCS and return signed URL
 * @param {Buffer|string} fileData - File data or path
 * @param {string} destinationPath - Path in bucket (e.g., 'designs/abc123.png')
 * @param {Object} metadata - Optional metadata
 * @returns {Promise<string>} Signed URL (1-hour expiry)
 */
export async function uploadToGCS(fileData, destinationPath, metadata = {}) {
  const file = bucket.file(destinationPath);
  
  await file.save(fileData, {
    metadata: {
      contentType: metadata.contentType || 'image/png',
      metadata: {
        uploadedAt: new Date().toISOString(),
        ...metadata
      }
    }
  });

  // Generate signed URL
  const [signedUrl] = await file.getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + 3600 * 1000 // 1 hour
  });

  return signedUrl;
}

/**
 * Get signed URL for existing file
 * @param {string} filePath - Path in bucket
 * @param {number} expirySeconds - URL expiry (default: 1 hour)
 * @returns {Promise<string>} Signed URL
 */
export async function getSignedUrl(filePath, expirySeconds = 3600) {
  const file = bucket.file(filePath);
  
  const [signedUrl] = await file.getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + expirySeconds * 1000
  });

  return signedUrl;
}

/**
 * Delete file from GCS
 * @param {string} filePath - Path in bucket
 */
export async function deleteFromGCS(filePath) {
  await bucket.file(filePath).delete();
}
```

We'll complete this in Task 4!

---

## Step 9: Monitor Storage Usage

### 9.1 Check Free Tier & Costs

Cloud Storage pricing:

- **Storage**: $0.020 per GB/month (Standard class, us-central1)
- **Bandwidth**: $0.12 per GB egress (after 1 GB free)
- **Operations**: $0.05 per 10,000 Class A ops (PUT/POST), $0.004 per 10,000 Class B ops (GET)

Demo estimates:

- **Storage**: 5 GB × $0.020 = **$0.10/month**
- **Bandwidth**: 50 GB × $0.12 = **$6.00/month** (but 1 GB free = $5.88)
- **Operations**: 10,000 signed URL generations = **$0.004**
- **Total**: ~**$2-5/month**

### 9.2 Monitor Usage

1. Go to [console.cloud.google.com/storage/browser](https://console.cloud.google.com/storage/browser)
2. Click on `tatt-pro-assets` bucket
3. Check **"Usage"** tab
4. Monitor:
   - Total storage size
   - Number of objects
   - Bandwidth (egress)

### 9.3 Set Up Budget Alerts (Already Done)

Budget alerts from Task 1 cover all GCP services including Storage.

---

## Step 10: Naming Conventions

### 10.1 File Naming Strategy

Use consistent naming for easy organization:

**Generated Designs**:

```
designs/{designId}.png
designs/{designId}_{timestamp}.png  # For versions
```

**Layer PNGs**:

```
layers/{designId}_subject_{timestamp}.png
layers/{designId}_background_{timestamp}.png
layers/{designId}_effect_{timestamp}.png
```

**Layer Thumbnails** (64x64px):

```
layers/{designId}_subject_{timestamp}_thumb.png
```

**Stencils** (300 DPI):

```
stencils/{designId}_{timestamp}_300dpi.png
```

**Portfolio Thumbnails**:

```
portfolios/{artistId}_{index}.jpg
```

### 10.2 Metadata Best Practices

Always include metadata:

```javascript
{
  contentType: 'image/png',
  metadata: {
    designId: 'uuid',
    userId: 'uuid',
    uploadedAt: '2026-01-15T09:00:00Z',
    dpi: '300',
    layerType: 'subject' // or 'background', 'effect'
  }
}
```

---

## Verification Checklist

Before proceeding to Task 4 (Asset Migration), verify:

- [ ] ✅ GCS bucket created (`tatt-pro-assets` in `us-central1`)
- [ ] ✅ CORS configuration applied (allows localhost + Vercel)
- [ ] ✅ Lifecycle policies set (delete `temp/` after 7 days)
- [ ] ✅ Service account has `storage.objectAdmin` role
- [ ] ✅ Folder structure created (designs, layers, stencils, temp, portfolios)
- [ ] ✅ Environment variables added to `.env.local`
- [ ] ✅ `@google-cloud/storage` npm package installed
- [ ] ✅ Test script runs successfully (upload → signed URL → download → delete)
- [ ] ✅ Signed URLs expire after 1 hour (verified in test)

---

## Troubleshooting

### Issue: "Bucket name already exists"

**Solution**: Choose a different name:

```bash
# Try these alternatives
tatt-pro-assets-YOURNAME
tatt-pro-assets-2026
tatt-pro-designs-RANDOM123
```

### Issue: "Permission Denied" on Upload

**Solution**: Verify service account has `storage.objectAdmin`:

```bash
gsutil iam get gs://tatt-pro-assets | grep storage.objectAdmin
```

### Issue: CORS Error in Browser

**Solution**:

1. Check CORS config includes your domain
2. Re-apply CORS: `gsutil cors set gcs-cors.json gs://tatt-pro-assets`
3. Verify: `gsutil cors get gs://tatt-pro-assets`

### Issue: Signed URL Expired

**Solution**:

- Signed URLs expire after 1 hour by default
- Regenerate URL before serving to client
- Consider implementing URL refresh logic

### Issue: High Storage Costs

**Solution**:

1. Enable lifecycle policy (delete temp files after 7 days)
2. Use Nearline/Coldline for archived designs
3. Compress images before upload (lossy JPEG for previews, PNG for finals)

---

## Cost Optimization Tips

### Reduce Storage Costs

✅ Use lifecycle policies (auto-delete old temp files)  
✅ Compress images (use Sharp.js before upload)  
✅ Store thumbnails at lower resolution (64x64px vs. 1024x1024px)  
✅ Use JPEG for previews, PNG only for final stencils  

### Reduce Bandwidth Costs

✅ Use CDN (Vercel Edge) to cache signed URLs  
✅ Generate signed URLs server-side (avoid client requests)  
✅ Batch operations (upload multiple files at once)  

### Reduce Operation Costs

✅ Cache signed URLs for 1 hour (don't regenerate on every request)  
✅ Use resumable uploads for large files (>5MB)  
✅ Avoid frequent metadata updates  

---

## Next Steps

✅ **Task 2 Complete!** Proceed to:

1. **Task 4** - Build asset migration script (`migrate-to-gcs.js`)
2. **Task 7** - Implement Vision API layer decomposition
3. **Update existing services** - Replace local storage with GCS

---

## Reference Links

- [Cloud Storage Console](https://console.cloud.google.com/storage)
- [Cloud Storage Pricing](https://cloud.google.com/storage/pricing)
- [CORS Configuration](https://cloud.google.com/storage/docs/configuring-cors)
- [Signed URLs Guide](https://cloud.google.com/storage/docs/access-control/signed-urls)
- [Lifecycle Management](https://cloud.google.com/storage/docs/lifecycle)
- [Best Practices](https://cloud.google.com/storage/docs/best-practices)

---

**Estimated Time**: 20-30 minutes  
**Prerequisites**: GCP project + service account (Task 1)  
**Next Task**: Asset Migration Script (Task 4)
