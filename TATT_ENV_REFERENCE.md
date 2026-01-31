# 🔑 TatT Environment Variables Reference

**Last Updated:** 2026-01-31
**Computer:** ciroccofam's MacBook
**Location:** `~/conductor/workspaces/tatt-v1/`

---

## 📍 Quick Access

**Current Project:** `manama-next` (Next.js 15 + TypeScript)
**Environment File:** `.env.local` (gitignored - never commit!)
**Template:** `.env.master` (safe to commit - no secrets)

---

## 🔐 Authentication & Security

### Frontend/Backend Auth Token
```bash
FRONTEND_AUTH_TOKEN=ad7f20706528595fe5d39db3fd3d3e8b92ecab254bb8b6eda2e54f9b1a584a9b
NEXT_PUBLIC_FRONTEND_AUTH_TOKEN=ad7f20706528595fe5d39db3fd3d3e8b92ecab254bb8b6eda2e54f9b1a584a9b
```
**Usage:** Shared secret between frontend and backend
**Security:** Change in production! Generate with: `openssl rand -hex 32`

---

## ☁️ Google Cloud Platform (GCP)

### Project Configuration
```bash
GCP_PROJECT_ID=tatt-pro
GCP_PROJECT_NUMBER=762958140397
GCP_REGION=us-central1
```

### Service Account Authentication
```bash
GOOGLE_APPLICATION_CREDENTIALS=./gcp-service-account-key.json
```
**File Location:** `~/conductor/workspaces/tatt-v1/manama-next/gcp-service-account-key.json`
**Note:** This file is gitignored

### Vertex AI Configuration
```bash
NEXT_PUBLIC_VERTEX_AI_ENABLED=true
NEXT_PUBLIC_VERTEX_AI_PROJECT_ID=tatt-pro
NEXT_PUBLIC_VERTEX_AI_REGION=us-central1
NEXT_PUBLIC_VERTEX_GEMINI_MODEL=gemini-2.0-flash-exp
NEXT_PUBLIC_VERTEX_IMAGEN_MODEL=imagen-3.0-generate-001
NEXT_PUBLIC_VERTEX_VISION_MODEL=imagetext@001
```

### Google Cloud Storage (GCS)
```bash
NEXT_PUBLIC_GCS_BUCKET_NAME=tatt-pro-assets
NEXT_PUBLIC_GCS_PROJECT_ID=tatt-pro
GCS_BUCKET_NAME=tatt-pro-assets
GCS_PROJECT_ID=tatt-pro
GCS_LOCATION=us-central1
```
**Bucket URL:** `gs://tatt-pro-assets`

---

## 🔥 Firebase (Real-time Database)

### Client Configuration (Public - Safe to Expose)
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyB6SB_XMwTMgADiDo9Jld08zAQVeSR7CBM
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tatt-pro.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tatt-pro
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tatt-pro.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=762958140397
NEXT_PUBLIC_FIREBASE_APP_ID=1:762958140397:web:6da1c328603d52cbfacde4
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-C6MP4PTN82
```

### Database URLs
```bash
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://tatt-pro-default-rtdb.firebaseio.com
FIREBASE_DATABASE_URL=https://tatt-pro-default-rtdb.firebaseio.com
```

### Admin SDK
```bash
# FIREBASE_ADMIN_KEY=./firebase-admin-key.json
```
**Note:** Managed via file, not needed for client dev

---

## 🗄️ Supabase (PostgreSQL + Vector Search)

### URLs & Keys
```bash
NEXT_PUBLIC_SUPABASE_URL=https://yfcmysjmoehcyszvkxsr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_4tPUrucza4SR1J-HCMzgoA_h-rnrFBn
SUPABASE_SERVICE_ROLE_KEY=sb_secret_DBun_2vz-tGuNyF_lBLt8w_IFHf1KCV
```

**Dashboard:** https://supabase.com/dashboard/project/yfcmysjmoehcyszvkxsr
**Database:** PostgreSQL with pgvector extension
**Usage:** Artist profiles, vector embeddings (4096-dim CLIP)

⚠️ **Security:** `SERVICE_ROLE_KEY` = server-only, never expose to client!

---

## 🕸️ Neo4j (Graph Database)

### Connection
```bash
NEO4J_URI=neo4j+s://36767c9d.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=hULhcSIK-88HtRg9A4t-Rourj9wEieVbWSStVfplRmg
```

### Client Settings
```bash
NEXT_PUBLIC_NEO4J_ENABLED=true
NEXT_PUBLIC_NEO4J_ENDPOINT=/api/neo4j/query
```

**Dashboard:** https://console.neo4j.io
**Usage:** Artist genealogy, mentorship networks, relationship matching

---

## 🤖 AI Council (Prompt Enhancement)

### Configuration
```bash
NEXT_PUBLIC_USE_COUNCIL=true
NEXT_PUBLIC_COUNCIL_DEMO_MODE=false
NEXT_PUBLIC_COUNCIL_API_URL=http://localhost:8001/api
```

### OpenRouter (Multi-Model)
```bash
NEXT_PUBLIC_USE_OPENROUTER=false
# OPENROUTER_API_KEY=sk-or-v1-... (Get from: https://openrouter.ai/keys)
```

**Council Models:**
- Claude 3.5 Sonnet (Creative Director)
- GPT-4 Turbo (Technical Expert)
- Gemini Pro 1.5 (Style Specialist)

**Cost:** ~$0.01-0.03 per enhancement

---

## 🎛️ Feature Flags

```bash
NEXT_PUBLIC_ENABLE_INPAINTING=true
NEXT_PUBLIC_ENABLE_STENCIL_EXPORT=true
NEXT_PUBLIC_ENABLE_AR_PREVIEW=false
NEXT_PUBLIC_DEMO_MODE=false
```

---

## 🌐 Proxy & Development

```bash
NEXT_PUBLIC_PROXY_URL=http://127.0.0.1:3002/api
```

**Express Server:** `server.js` on port 3002
**Usage:** CORS proxy for Replicate, Neo4j queries

---

## 📂 File Locations

### Main Project
```
~/conductor/workspaces/tatt-v1/manama-next/
├── .env.local              ← Active environment (gitignored)
├── .env.master             ← Template (safe to commit)
├── gcp-service-account-key.json  ← GCP credentials
└── firebase-admin-key.json       ← Firebase admin (optional)
```

### Other Locations
```
~/.config/gcloud/           ← gcloud CLI credentials
```

---

## 🔄 Common Tasks

### Copy to New Project
```bash
cd ~/conductor/workspaces/tatt-v1/new-project/
cp ../manama-next/.env.master .env.local
# Edit .env.local with actual keys
```

### Rotate Auth Token
```bash
# Generate new token
openssl rand -hex 32

# Update in:
# - .env.local (both FRONTEND_AUTH_TOKEN vars)
# - Railway/Vercel dashboard
# - Any API clients
```

### Verify Variables Loaded (Next.js)
```bash
npm run dev
# In browser console:
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)
```

### Backup This File
```bash
# Copy to Google Drive or secure location
cp TATT_ENV_REFERENCE.md ~/Google\ Drive/TatT/secrets/
```

---

## 🚨 Security Reminders

1. ✅ **Never commit** `.env.local` to git
2. ✅ **Always rotate tokens** when team members leave
3. ✅ **Use different tokens** for dev/staging/production
4. ✅ **Keep this reference file** in a secure location (not Dropbox/public cloud)
5. ✅ **Service account keys** should be regenerated every 90 days

---

## 📞 Service Dashboards

| Service | Dashboard URL | Purpose |
|---------|--------------|---------|
| **GCP Console** | https://console.cloud.google.com/home?project=tatt-pro | Vertex AI, GCS, billing |
| **Firebase** | https://console.firebase.google.com/project/tatt-pro | Real-time database, auth |
| **Supabase** | https://supabase.com/dashboard/project/yfcmysjmoehcyszvkxsr | PostgreSQL, vectors |
| **Neo4j** | https://console.neo4j.io | Graph database |
| **OpenRouter** | https://openrouter.ai/keys | LLM council API keys |
| **Vercel** | https://vercel.com/dashboard | Frontend deployment |
| **Railway** | https://railway.app/dashboard | Backend Express server |

---

## 📝 Notes

- **GCP Service Account:** Has roles for Vertex AI, Cloud Storage, Vision API
- **Supabase:** Free tier, upgrade if vector searches > 50k/month
- **Neo4j:** Aura free tier (200k nodes, 400k relationships)
- **Firebase:** Spark plan (free, 1GB storage, 10GB transfer/month)
- **OpenRouter:** Pay-as-you-go, ~$0.03 per council call

---

## 🔗 Related Files

- `.env.master` - Master template (this repo)
- `.gitignore` - Ensure `.env.local` is listed
- `next.config.ts` - Environment variable handling
- `src/lib/google-auth-edge.ts` - GCP credential loading

---

**💡 Tip:** Bookmark this file in your browser for quick access!

---

*Generated: 2026-01-31 by Claude Code*
