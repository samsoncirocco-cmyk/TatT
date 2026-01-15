# Google Cloud Platform Setup Guide

## Overview

This guide walks you through setting up Google Cloud Platform (GCP) for TatT Pro, enabling Vertex AI services for image generation, AI Council, layer decomposition, and portfolio embeddings.

## Prerequisites

- Google account
- Credit card (required for GCP billing, but free tier covers most demo usage)
- Admin access to your project repository

---

## Step 1: Create Google Cloud Project

### 1.1 Navigate to Google Cloud Console

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Sign in with your Google account
3. Accept terms of service if prompted

### 1.2 Create New Project

1. Click the project dropdown (top left, near "Google Cloud" logo)
2. Click **"New Project"**
3. Enter project details:
   - **Project name**: `TatT Pro`
   - **Project ID**: `tatt-pro` (or `tatt-pro-XXXXX` if taken)
   - **Organization**: Select your organization (or leave as "No organization")
4. Click **"Create"**
5. Wait for project creation (~30 seconds)
6. **Copy your Project ID** - you'll need this later

---

## Step 2: Enable Billing

### 2.1 Set Up Billing Account

1. Navigate to **Billing** in the left sidebar (or [console.cloud.google.com/billing](https://console.cloud.google.com/billing))
2. Click **"Link a billing account"**
3. Follow prompts to add credit card
   - Choose "Individual" account type
   - Enter billing details
   - Verify card (small charge, immediately refunded)

### 2.2 Configure Budget Alerts

1. Go to **Billing** → **Budgets & alerts**
2. Click **"Create Budget"**
3. Configure budget:
   - **Name**: `TatT Demo Budget`
   - **Budget amount**: `$200.00` per month
   - **Threshold rules**:
     - 25% ($50) - Email alert
     - 50% ($100) - Email alert  
     - 75% ($150) - Email + Slack notification (if configured)
     - 100% ($200) - Email + Slack + consider pausing services
4. Click **"Finish"**

> [!IMPORTANT]
> **Cost Control**: Budget alerts protect against unexpected costs. Gemini 1.5 Flash is cost-effective but not free on Vertex AI.

---

## Step 3: Enable Required APIs

### 3.1 Navigate to APIs & Services

1. Click hamburger menu (☰) → **APIs & Services** → **Library**
2. Or go to [console.cloud.google.com/apis/library](https://console.cloud.google.com/apis/library)

### 3.2 Enable Vertex AI APIs

Enable each of the following APIs (search → enable):

1. **Vertex AI API**
   - Search: "Vertex AI API"
   - Click **"Enable"**
   - Wait ~30 seconds for activation

2. **Vertex AI Image API** (Imagen 3)
   - Search: "Vertex AI Image"
   - Enable if separate from main Vertex AI API

3. **Vertex AI Vision API**
   - Search: "Vertex AI Vision" or "Cloud Vision API"
   - Enable for layer decomposition

4. **Cloud Storage API**
   - Search: "Cloud Storage"
   - Enable for asset storage

5. **Firebase Realtime Database API**
   - Search: "Firebase Realtime Database"
   - Enable for Match Pulse

### 3.3 Verify APIs Enabled

1. Go to **APIs & Services** → **Dashboard**
2. Confirm all 5 APIs listed in "Enabled APIs"

---

## Step 4: Create Service Account

Service accounts allow your application to authenticate with GCP services.

### 4.1 Navigate to Service Accounts

1. Click hamburger menu → **IAM & Admin** → **Service Accounts**
2. Or go to [console.cloud.google.com/iam-admin/serviceaccounts](https://console.cloud.google.com/iam-admin/serviceaccounts)

### 4.2 Create Service Account

1. Click **"Create Service Account"**
2. Enter details:
   - **Service account name**: `tatt-pro-service-account`
   - **Service account ID**: Auto-generated (e.g., `tatt-pro-service-account@tatt-pro.iam.gserviceaccount.com`)
   - **Description**: `Service account for TatT Pro Vertex AI and Cloud Storage access`
3. Click **"Create and Continue"**

### 4.3 Grant Required Roles

Add the following roles (search and click **"+ Add Another Role"**):

1. **Vertex AI User** (`roles/aiplatform.user`)
   - Allows Gemini, Imagen, Vision, Embeddings API calls

2. **Storage Object Admin** (`roles/storage.objectAdmin`)
   - Full control over Cloud Storage buckets/objects

3. **Firebase Admin** (`roles/firebase.admin`)
   - Manage Firebase Realtime Database

4. Click **"Continue"**

### 4.4 Skip User Access (Optional)

- Click **"Done"** (no need to grant users access to this service account)

---

## Step 5: Generate Service Account Key

> [!CAUTION]
> **Security Critical**: Service account keys provide full access to your GCP resources. Never commit to Git!

### 5.1 Create Key

1. Find your new service account in the list
2. Click the **three-dot menu (⋮)** → **Manage keys**
3. Click **"Add Key"** → **"Create new key"**
4. Select **JSON** format
5. Click **"Create"**
6. Key file downloads automatically (e.g., `tatt-pro-abc123.json`)
7. **IMPORTANT**: Move this file to a secure location:

   ```bash
   # Move to project root (add to .gitignore!)
   mv ~/Downloads/tatt-pro-*.json /Users/ciroccofam/Desktop/tatt-v1/gcp-service-account-key.json
   ```

### 5.2 Secure the Key

1. **Add to .gitignore**:

   ```bash
   echo "gcp-service-account-key.json" >> /Users/ciroccofam/Desktop/tatt-v1/.gitignore
   ```

2. **Set restrictive permissions** (macOS/Linux):

   ```bash
   chmod 600 /Users/ciroccofam/Desktop/tatt-v1/gcp-service-account-key.json
   ```

---

## Step 6: Configure Environment Variables

### 6.1 Create `.env.local` (Development)

Copy `.env.example` to `.env.local` and add GCP credentials:

```bash
# Google Cloud Platform Configuration
GCP_PROJECT_ID=tatt-pro  # Your actual project ID
GCP_REGION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=./gcp-service-account-key.json

# Vertex AI Configuration
VITE_VERTEX_AI_ENABLED=true
VITE_VERTEX_AI_PROJECT_ID=tatt-pro
VITE_VERTEX_AI_REGION=us-central1

# Cloud Storage Configuration
VITE_GCS_BUCKET_NAME=tatt-pro-assets
VITE_GCS_SIGNED_URL_EXPIRY=3600  # 1 hour in seconds

# Firebase Configuration (will be added in firebase-setup.md)
VITE_FIREBASE_PROJECT_ID=tatt-pro
VITE_FIREBASE_DATABASE_URL=https://tatt-pro-default-rtdb.firebaseio.com
```

### 6.2 Verify Configuration

Run this command to verify your setup:

```bash
# Test GCP authentication
node -e "console.log(process.env.GCP_PROJECT_ID || 'GCP_PROJECT_ID not set')"
```

---

## Step 7: Set Up Vertex AI Quotas

### 7.1 Navigate to Quotas

1. Go to **IAM & Admin** → **Quotas**
2. Or [console.cloud.google.com/iam-admin/quotas](https://console.cloud.google.com/iam-admin/quotas)

### 7.2 Check Gemini Free Tier

1. Search filter: "Vertex AI API"
2. Look for: **"Generate Content requests per minute per region"**
3. Verify quotas are sufficient for your needs (default quotas are usually adequate)
4. **No action needed** - just confirming

### 7.3 Monitor Usage

1. Go to **Vertex AI** → **Dashboard**
2. Bookmark for monitoring during demo:
   - [console.cloud.google.com/vertex-ai/dashboard](https://console.cloud.google.com/vertex-ai/dashboard)

---

## Step 8: Test GCP Connection

### 8.1 Install Google Cloud SDK (Optional)

For command-line access and testing:

```bash
# macOS (Homebrew)
brew install --cask google-cloud-sdk

# Authenticate
gcloud auth login
gcloud config set project tatt-pro
```

### 8.2 Test Service Account

Create a test script:

```javascript
// test-gcp-connection.js
import { GoogleAuth } from 'google-auth-library';

async function testConnection() {
  try {
    const auth = new GoogleAuth({
      keyFilename: './gcp-service-account-key.json',
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });

    const client = await auth.getClient();
    const projectId = await auth.getProjectId();

    console.log('✅ GCP Connection Successful!');
    console.log('Project ID:', projectId);
    console.log('Service Account:', client.email);

    return true;
  } catch (error) {
    console.error('❌ GCP Connection Failed:', error.message);
    return false;
  }
}

testConnection();
```

Run test:

```bash
node test-gcp-connection.js
```

Expected output:

```
✅ GCP Connection Successful!
Project ID: tatt-pro
Service Account: tatt-pro-service-account@tatt-pro.iam.gserviceaccount.com
```

---

## Step 9: Cost Estimation & Monitoring

### 9.1 Expected Demo Costs (4-6 Weeks)

| Service | Free Tier | Demo Usage | Estimated Cost |
|---------|-----------|------------|----------------|
| **Gemini 1.5 Flash** | Pay-as-you-go | 2,000 requests | **~$0.50** |
| **Imagen 3** | None | 500 generations | **$10-20** |
| **Vision API** | 1,000/month | 500 decompositions | **$0.75** |
| **Embeddings** | None | 1,000 artists | **$0.03** |
| **Cloud Storage** | 5GB | 5GB + 50GB bandwidth | **$2-5** |
| **Firebase Realtime** | 1GB storage | 100 concurrent users | **$0** ✅ |
| **TOTAL** | | | **~$15-25** |

### 9.2 Set Up Cost Alerts

Already configured in Step 2.2, but verify:

1. Go to **Billing** → **Reports**
2. Filter by: "This month"
3. Group by: "Service"
4. Monitor daily during demo period

### 9.3 Cost Optimization Tips

- ✅ Use Gemini 1.5 Flash for cost efficiency
- ✅ Cache Gemini responses (5-minute TTL)
- ✅ Use preview mode (dreamshaper) for quick iterations
- ✅ Only use high-res Imagen for final designs
- ✅ Batch embedding generation (run once, not per request)

---

## Verification Checklist

Before proceeding to Task 2 (Cloud Storage Setup), verify:

- [ ] ✅ GCP project created (`tatt-pro` or similar)
- [ ] ✅ Billing enabled with budget alerts ($50/$100/$200)
- [ ] ✅ 5 APIs enabled (Vertex AI, Vision, Storage, Firebase, Imagen)
- [ ] ✅ Service account created with 3 roles (Vertex AI User, Storage Admin, Firebase Admin)
- [ ] ✅ Service account key JSON downloaded and secured
- [ ] ✅ `.env.local` created with GCP configuration
- [ ] ✅ Service account key added to `.gitignore`
- [ ] ✅ Quotas verified
- [ ] ✅ Test connection script runs successfully

---

## Troubleshooting

### Issue: "Permission Denied" Error

**Solution**: Verify service account has required roles:

```bash
gcloud projects get-iam-policy tatt-pro \
  --flatten="bindings[].members" \
  --filter="bindings.members:tatt-pro-service-account@tatt-pro.iam.gserviceaccount.com"
```

### Issue: "API Not Enabled" Error

**Solution**: Enable API manually:

```bash
gcloud services enable aiplatform.googleapis.com --project=tatt-pro
gcloud services enable storage.googleapis.com --project=tatt-pro
gcloud services enable vision.googleapis.com --project=tatt-pro
```

### Issue: Billing Not Activated

**Solution**:

1. Check billing status: [console.cloud.google.com/billing](https://console.cloud.google.com/billing)
2. Verify project is linked to billing account
3. Confirm credit card is valid

### Issue: Downloaded Key File Empty

**Solution**:

1. Delete the broken key in GCP console
2. Create a new key (limit: 10 keys per service account)
3. Ensure popup blocker isn't preventing download

---

## Next Steps

✅ **Task 1 Complete!** Proceed to:

1. **[firebase-setup.md](firebase-setup.md)** - Initialize Firebase Realtime Database (Task 3)
2. **[gcs-setup.md](gcs-setup.md)** - Configure Cloud Storage (Task 2)
3. **[vertex-ai-integration.md](vertex-ai-integration.md)** - Integrate Vertex AI services (Tasks 6, 7, 9, 12)

---

## Reference Links

- [GCP Console](https://console.cloud.google.com)
- [Vertex AI Pricing](https://cloud.google.com/vertex-ai/pricing)
- [Gemini API Pricing](https://cloud.google.com/vertex-ai/generative-ai/pricing)
- [Cloud Storage Pricing](https://cloud.google.com/storage/pricing)
- [Firebase Pricing](https://firebase.google.com/pricing)
- [Service Account Best Practices](https://cloud.google.com/iam/docs/best-practices-for-managing-service-account-keys)

---

**Estimated Time**: 30-45 minutes  
**Prerequisites**: Google account, credit card  
**Next Task**: Cloud Storage Setup (Task 2)
