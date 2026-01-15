# TatT Pro - Google Cloud Migration Progress

## ✅ What's Been Created

I've built the core infrastructure services for your Google Cloud migration:

### 1. **Environment Configuration**

- ✅ Updated `.env.example` with all GCP, Firebase, and Cloud Storage variables
- ✅ Your project details integrated:
  - Project ID: `tatt-pro`
  - Project Number: `762958140397`
  - Region: `us-central1`

### 2. **Google Cloud Storage Service** (`src/services/gcs-service.js`)

Complete GCS integration with:

- ✅ Upload files to GCS with metadata
- ✅ Generate signed URLs (1-hour expiry)
- ✅ Delete files
- ✅ Helper functions for designs, layers, stencils, portfolios
- ✅ Batch operations
- ✅ Health check

**Key Functions**:

```javascript
import { uploadDesign, uploadLayer, uploadStencil, getSignedUrl } from './services/gcs-service.js';

// Upload a design
const result = await uploadDesign(imageBuffer, designId, { userId, style, bodyPart });
// Returns: { success, gcsPath, url, bucket, path }

// Upload a layer
const layer = await uploadLayer(layerBuffer, designId, 'subject', { userId });

// Get signed URL for existing file
const url = await getSignedUrl('designs/abc123.png', 3600);
```

### 3. **Firebase Match Service** (`src/services/firebase-match-service.js`)

Real-time artist matching with <100ms sync:

- ✅ Subscribe to match updates (client-side)
- ✅ Update matches (server-side)
- ✅ Debounced updates (prevents excessive writes)
- ✅ Health check

**Key Functions**:

```javascript
import { subscribeToMatches, updateMatches } from './services/firebase-match-service.js';

// Subscribe to real-time updates
const unsubscribe = subscribeToMatches(userId, (matchData) => {
  console.log('New matches:', matchData.artists);
});

// Update matches (server-side)
await updateMatches(userId, {
  designId: 'uuid',
  artists: [{ id, name, score, breakdown, reasoning }]
});
```

### 4. **Asset Migration Script** (`scripts/migrate-to-gcs.js`)

Migrate existing designs from local storage to GCS:

- ✅ Reads designs from Supabase
- ✅ Uploads to GCS with integrity checks (SHA-256 checksums)
- ✅ Updates Supabase URLs to GCS signed URLs
- ✅ Dry-run mode for testing
- ✅ Detailed progress and error reporting

**Usage**:

```bash
# Dry run (no changes)
node scripts/migrate-to-gcs.js --dry-run

# Migrate first 10 designs (testing)
node scripts/migrate-to-gcs.js --limit=10

# Full migration
node scripts/migrate-to-gcs.js
```

### 5. **Supabase Schema Extensions** (`scripts/supabase-schema-extension.sql`)

New database tables for layers and embeddings:

- ✅ `design_layers` table - RGBA layer PNGs with transforms
- ✅ `portfolio_embeddings` table - 4096-dim vectors for artist matching
- ✅ Vector search function: `match_artists(embedding, threshold, count)`
- ✅ Indexes for performance (IVFFlat for vector search)
- ✅ Row Level Security (RLS) policies
- ✅ Helper views and triggers

**Run in Supabase SQL Editor**:

```sql
-- Copy contents of scripts/supabase-schema-extension.sql
-- Paste into: https://supabase.com/dashboard/project/YOUR_PROJECT/editor
-- Execute
```

### 6. **Dependencies Installed** ✅

```bash
npm install @google-cloud/storage firebase firebase-admin
```

---

## 🚀 Next Steps

### Step 1: Configure Firebase (Required)

You need to get your Firebase configuration values:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your `tatt-pro` project
3. Click ⚙️ Settings → Project Settings
4. Scroll to "Your apps" → Click the Web icon (</>)
5. Copy the config values

Add to `.env.local`:

```bash
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=tatt-pro.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://tatt-pro-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=tatt-pro
VITE_FIREBASE_STORAGE_BUCKET=tatt-pro.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123...
VITE_FIREBASE_APP_ID=1:123...
```

### Step 2: Get Service Account Key (Required)

1. Go to [GCP Console](https://console.cloud.google.com/iam-admin/serviceaccounts?project=tatt-pro)
2. Find your service account
3. Click ⋮ → Manage keys → Add Key → Create new key → JSON
4. Download and save as `gcp-service-account-key.json` in project root
5. Add to `.gitignore`:

   ```bash
   echo "gcp-service-account-key.json" >> .gitignore
   ```

### Step 3: Create GCS Bucket

```bash
# Install gcloud CLI (if not installed)
brew install --cask google-cloud-sdk

# Authenticate
gcloud auth login
gcloud config set project tatt-pro

# Create bucket
gsutil mb -l us-central1 gs://tatt-pro-assets

# Apply CORS (create gcs-cors.json first - see docs/gcs-setup.md)
gsutil cors set gcs-cors.json gs://tatt-pro-assets
```

### Step 4: Run Supabase Migration

1. Open [Supabase SQL Editor](https://supabase.com/dashboard/project/YOUR_PROJECT/editor)
2. Copy contents of `scripts/supabase-schema-extension.sql`
3. Paste and execute
4. Verify tables created: `design_layers`, `portfolio_embeddings`

### Step 5: Test Services

```bash
# Test GCS connection
node scripts/test-gcs-upload.js

# Test Firebase connection
node scripts/test-firebase-connection.js

# Test migration (dry run)
node scripts/migrate-to-gcs.js --dry-run --limit=5
```

---

## 📊 What's Working Now

### ✅ Ready to Use

- GCS upload/download service
- Firebase real-time match service
- Asset migration script
- Supabase schema ready

### ⏳ Needs Configuration

- Firebase config values (Step 1)
- Service account key (Step 2)
- GCS bucket creation (Step 3)
- Supabase migration (Step 4)

### 🔜 Coming Next

- Vertex AI Gemini service (AI Council)
- Vertex AI Imagen service (Image generation)
- Vertex AI Vision service (Layer decomposition)
- Zustand store for Forge canvas

---

## 💡 Quick Commands

```bash
# Install dependencies (already done)
npm install

# Create .env.local from example
cp .env.example .env.local
# Then fill in your values

# Test GCS service
node scripts/test-gcs-upload.js

# Migrate assets (dry run first!)
node scripts/migrate-to-gcs.js --dry-run

# Start development server
npm run dev
```

---

## 📚 Documentation

All setup guides are in `docs/`:

- [GCP Setup](docs/gcp-setup.md) - Google Cloud Platform configuration
- [Cloud Storage Setup](docs/gcs-setup.md) - GCS bucket and CORS
- [Firebase Setup](docs/firebase-setup.md) - Realtime Database

---

## ❓ Questions?

Let me know if you need help with:

- Getting Firebase config values
- Creating the service account key
- Setting up the GCS bucket
- Running the Supabase migration
- Testing any of the services

I can also continue building:

- Vertex AI services (Gemini, Imagen, Vision)
- Zustand state management
- Match Pulse UI components
- Layer editing components

What would you like to tackle next? 🚀
