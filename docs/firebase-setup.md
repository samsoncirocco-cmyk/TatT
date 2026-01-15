# Firebase Realtime Database Setup Guide

## Overview

This guide configures Firebase Realtime Database for TatT Pro's Match Pulse feature, enabling <100ms real-time artist match updates as users design tattoos.

**Prerequisites**:

- ✅ Task 1 complete (GCP project created)
- ✅ GCP service account key downloaded

**Estimated time**: 20-30 minutes

---

## Step 1: Initialize Firebase Project

### 1.1 Navigate to Firebase Console

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Sign in with the same Google account used for GCP
3. You should see your GCP project listed

### 1.2 Add Firebase to Existing GCP Project

1. Click **"Add project"**
2. Select **"Use an existing Google Cloud Platform project"**
3. Choose your `tatt-pro` project from dropdown
4. Click **"Continue"**
5. **Important**: Accept Firebase terms
6. Click **"Continue"**

### 1.3 Enable Google Analytics (Optional)

For this demo, you can skip analytics:

- Toggle **"Enable Google Analytics"** to **OFF**
- Click **"Add Firebase"**
- Wait ~30 seconds for initialization

---

## Step 2: Create Realtime Database Instance

### 2.1 Navigate to Realtime Database

1. In Firebase Console sidebar, click **"Build"** → **"Realtime Database"**
2. Click **"Create Database"**

### 2.2 Choose Database Location

**CRITICAL**: Must match your GCP region!

1. **Location**: Select **United States (us-central1)**
   - This matches your GCS bucket region
   - Ensures <100ms sync latency
2. Click **"Next"**

### 2.3 Set Security Rules (Start in Test Mode)

For development, start with test mode:

1. Select **"Start in test mode"**
2. Click **"Enable"**

> [!WARNING]
> **Test mode allows anyone to read/write!** We'll secure this in Step 4.

### 2.4 Copy Database URL

Once created, copy your database URL:

```
https://tatt-pro-default-rtdb.firebaseio.com
```

Save this - you'll need it for `.env.local`

---

## Step 3: Configure Firebase Admin SDK

### 3.1 Install Firebase Admin

```bash
cd /Users/ciroccofam/Desktop/tatt-v1
npm install firebase-admin
```

### 3.2 Install Firebase Client SDK

```bash
npm install firebase
```

### 3.3 Get Firebase Configuration

1. In Firebase Console, click ⚙️ (Settings) → **"Project settings"**
2. Scroll to **"Your apps"** section
3. Click **"Web"** icon (</>) to add a web app
4. **App nickname**: `TatT Pro Web`
5. **Do NOT check** "Also set up Firebase Hosting"
6. Click **"Register app"**
7. **Copy the config object** (you'll need this next)

Example config:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "tatt-pro.firebaseapp.com",
  databaseURL: "https://tatt-pro-default-rtdb.firebaseio.com",
  projectId: "tatt-pro",
  storageBucket: "tatt-pro.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};
```

---

## Step 4: Update Environment Variables

### 4.1 Add Firebase Config to `.env.local`

Add these variables to your existing `.env.local`:

```bash
# Firebase Configuration (from Step 3.3)
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=tatt-pro.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://tatt-pro-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=tatt-pro
VITE_FIREBASE_STORAGE_BUCKET=tatt-pro.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890

# Firebase Admin SDK (server-side, uses same GCP service account)
FIREBASE_DATABASE_URL=https://tatt-pro-default-rtdb.firebaseio.com
```

### 4.2 Verify Service Account Permissions

Your GCP service account should already have **Firebase Admin** role from Task 1.

Verify:

```bash
gcloud projects get-iam-policy tatt-pro \
  --flatten="bindings[].members" \
  --filter="bindings.members:tatt-pro-service-account@tatt-pro.iam.gserviceaccount.com" \
  --format="table(bindings.role)"
```

Expected output should include:

```
roles/firebase.admin
```

---

## Step 5: Define Security Rules

### 5.1 Navigate to Rules Tab

1. In Firebase Console → **Realtime Database** → **Rules** tab
2. Replace default rules with production-ready rules

### 5.2 Production Security Rules

```json
{
  "rules": {
    "matches": {
      "$userId": {
        ".read": "$userId === auth.uid || auth.token.admin === true",
        ".write": "auth.token.admin === true",
        "current": {
          ".validate": "newData.hasChildren(['designId', 'updatedAt', 'artists'])"
        }
      }
    },
    ".read": false,
    ".write": false
  }
}
```

**Rules Explanation**:

- Users can **read** only their own matches (`$userId === auth.uid`)
- Only **admin** (server with service account) can **write**
- Validates `current` node has required fields
- Default deny for everything else

### 5.3 Publish Rules

1. Click **"Publish"**
2. Confirm the changes

> [!IMPORTANT]
> **Auth Required**: These rules require authentication. Server-side writes use service account, client reads require Firebase Auth (can add later if needed).

---

## Step 6: Create Database Indexes

### 6.1 Navigate to Rules Tab

Stay in **Realtime Database** → **Rules** tab

### 6.2 Add Index Rules

For optimal query performance, add indexes:

Click **"Add Index"** and configure:

**Index 1: Match timestamp ordering**

- **Path**: `/matches/{userId}/current/updatedAt`
- **Type**: `value`
- Click **"Add Index"**

**Index 2: Artist score ordering**

- **Path**: `/matches/{userId}/current/artists/score`
- **Type**: `value`  
- Click **"Add Index"**

---

## Step 7: Define Database Schema

### 7.1 Schema Documentation

Document your Firebase schema structure:

```javascript
// Firebase Realtime Database Schema
{
  "matches": {
    "{userId}": {
      "current": {
        "designId": "uuid-v4",
        "updatedAt": 1234567890123, // Unix timestamp (ms)
        "artists": [
          {
            "id": "artist-uuid",
            "name": "Artist Name",
            "shopName": "Shop Name",
            "city": "Phoenix",
            "distance": 8.3,
            "hourlyRate": 150,
            "rating": 4.9,
            "portfolioUrl": "https://...",
            "score": 0.87,
            "breakdown": {
              "visual": 0.92,
              "style": 0.85,
              "location": 0.78,
              "budget": 0.90
            },
            "reasoning": "Strong visual match (92%), specializes in Japanese style"
          }
        ]
      },
      "history": {
        // Optional: Store previous matches for "browse history"
      }
    }
  }
}
```

### 7.2 Create Schema File

Save schema to your project:

```bash
mkdir -p /Users/ciroccofam/Desktop/tatt-v1/src/schemas
```

Create `src/schemas/firebase-schema.json`:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Firebase Realtime Database Schema",
  "type": "object",
  "properties": {
    "matches": {
      "type": "object",
      "patternProperties": {
        "^[a-zA-Z0-9-]+$": {
          "type": "object",
          "properties": {
            "current": {
              "type": "object",
              "required": ["designId", "updatedAt", "artists"],
              "properties": {
                "designId": { "type": "string" },
                "updatedAt": { "type": "number" },
                "artists": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "required": ["id", "name", "score"],
                    "properties": {
                      "id": { "type": "string" },
                      "name": { "type": "string" },
                      "score": { "type": "number", "minimum": 0, "maximum": 1 }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

---

## Step 8: Test Firebase Connection

### 8.1 Create Test Script

Create `scripts/test-firebase-connection.js`:

```javascript
import admin from 'firebase-admin';
import { readFileSync } from 'fs';

// Load service account key
const serviceAccount = JSON.parse(
  readFileSync('./gcp-service-account-key.json', 'utf8')
);

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

async function testConnection() {
  try {
    const db = admin.database();
    const ref = db.ref('test');

    // Write test data
    await ref.set({
      timestamp: Date.now(),
      message: 'Firebase connection successful!'
    });

    // Read test data
    const snapshot = await ref.once('value');
    const data = snapshot.val();

    console.log('✅ Firebase Write/Read Success!');
    console.log('Test data:', data);

    // Clean up
    await ref.remove();
    console.log('✅ Cleanup complete');

    process.exit(0);
  } catch (error) {
    console.error('❌ Firebase connection failed:', error);
    process.exit(1);
  }
}

testConnection();
```

### 8.2 Run Test

```bash
# Ensure .env.local is loaded
export FIREBASE_DATABASE_URL=$(grep FIREBASE_DATABASE_URL .env.local | cut -d '=' -f2)

# Run test
node scripts/test-firebase-connection.js
```

Expected output:

```
✅ Firebase Write/Read Success!
Test data: { timestamp: 1234567890123, message: 'Firebase connection successful!' }
✅ Cleanup complete
```

---

## Step 9: Create Firebase Service (Optional Preview)

### 9.1 Create Service File

Preview of what we'll build in Task 11:

```javascript
// src/services/firebase-match-service.js
import { getDatabase, ref, set, onValue, off } from 'firebase/database';
import { initializeApp } from 'firebase/app';

// Initialize Firebase (client-side)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

/**
 * Subscribe to real-time match updates
 * @param {string} userId - User ID
 * @param {Function} callback - Called when matches update
 * @returns {Function} Unsubscribe function
 */
export function subscribeToMatches(userId, callback) {
  const matchRef = ref(database, `matches/${userId}/current`);
  
  onValue(matchRef, (snapshot) => {
    const data = snapshot.val();
    callback(data);
  });

  // Return unsubscribe function
  return () => off(matchRef);
}
```

We'll complete this in Task 11!

---

## Step 10: Monitor Database Usage

### 10.1 Check Free Tier Limits

Firebase Realtime Database free tier includes:

- ✅ **1 GB storage** (more than enough for match data)
- ✅ **10 GB/month bandwidth** (sufficient for 100+ concurrent users)
- ✅ **100 simultaneous connections** (perfect for demo)

### 10.2 Monitor Usage

1. Firebase Console → **Realtime Database** → **Usage** tab
2. Bookmark for monitoring during demo
3. Set up alerts if usage approaches limits

---

## Verification Checklist

Before proceeding to Task 2 (Cloud Storage), verify:

- [ ] ✅ Firebase project linked to GCP project
- [ ] ✅ Realtime Database created in `us-central1`
- [ ] ✅ Database URL copied and saved
- [ ] ✅ Firebase web app registered
- [ ] ✅ Config values added to `.env.local`
- [ ] ✅ Security rules published (production-ready)
- [ ] ✅ Database indexes created (2 indexes)
- [ ] ✅ Test script runs successfully (write/read/delete)
- [ ] ✅ Service account has `firebase.admin` role

---

## Troubleshooting

### Issue: "Permission Denied" on Write

**Solution**: Check security rules allow admin writes:

```json
".write": "auth.token.admin === true"
```

Verify service account credentials are correct.

### Issue: Database URL Not Found

**Solution**: Ensure you selected "Realtime Database", not "Firestore":

- Realtime Database: `https://*.firebaseio.com`
- Firestore: `https://firestore.googleapis.com` (wrong!)

### Issue: Slow Sync (>100ms)

**Solution**: Verify database region matches GCP region:

- Both should be `us-central1`
- Check your Vercel edge region too

### Issue: "Firebase Admin already initialized"

**Solution**: Only call `admin.initializeApp()` once:

```javascript
if (!admin.apps.length) {
  admin.initializeApp({ /* config */ });
}
```

---

## Cost Monitoring

### Expected Demo Costs

- **100 concurrent users**: **$0** (within free tier)
- **Storage**: <10 MB (well under 1 GB limit)
- **Bandwidth**: ~500 MB/day (under 10 GB/month limit)

### Upgrade Triggers

If you exceed free tier:

- **Blaze plan**: Pay-as-you-go
- **Cost**: ~$1 per GB over limit
- **Demo estimate**: Still $0 (unlikely to exceed with 100 users)

---

## Next Steps

✅ **Task 3 Complete!** Proceed to:

1. **[gcs-setup.md](gcs-setup.md)** - Configure Cloud Storage (Task 2)
2. **Task 4** - Build asset migration script
3. **Task 11** - Connect Firebase to Match Pulse UI

---

## Reference Links

- [Firebase Console](https://console.firebase.google.com)
- [Realtime Database Docs](https://firebase.google.com/docs/database)
- [Security Rules Guide](https://firebase.google.com/docs/database/security)
- [Firebase Pricing](https://firebase.google.com/pricing)
- [Admin SDK Setup](https://firebase.google.com/docs/admin/setup)

---

**Estimated Time**: 20-30 minutes  
**Prerequisites**: GCP project created (Task 1)  
**Next Task**: Cloud Storage Setup (Task 2)
