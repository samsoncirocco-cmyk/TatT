# Vercel Environment Setup - Quick Guide

This guide shows you exactly what environment variables to set on Vercel to fix the 401 errors.

---

## 🎯 Required Vercel Environment Variables

Copy these **exact** values into Vercel:

### Core Configuration

```bash
# Point to Railway backend
VITE_PROXY_URL=https://tatt-production.up.railway.app/api

# Auth token (MUST match Railway's FRONTEND_AUTH_TOKEN)
# Get this value from Railway Dashboard → Variables → FRONTEND_AUTH_TOKEN
VITE_FRONTEND_AUTH_TOKEN=your_frontend_auth_token_from_railway
```

### Feature Flags

```bash
VITE_USE_COUNCIL=true
VITE_USE_OPENROUTER=true
VITE_COUNCIL_DEMO_MODE=false
VITE_DEMO_MODE=false
```

### Budget Controls

```bash
VITE_MAX_DAILY_SPEND=10.00
VITE_TOTAL_BUDGET=500.00
```

### Optional (Add if using)

```bash
# OpenRouter for AI Council (if enabled)
VITE_OPENROUTER_API_KEY=sk-or-v1-your_key_here
```

---

## 📋 Step-by-Step Setup

### 1. Go to Vercel Dashboard

https://vercel.com/dashboard

### 2. Select Your Project

Click on your **TatT** project (or whatever it's named)

### 3. Open Environment Variables

**Settings** → **Environment Variables**

### 4. Add Each Variable

For **each** variable above:

1. Click **Add New**
2. Enter **Key** (e.g., `VITE_PROXY_URL`)
3. Enter **Value** (e.g., `https://tatt-production.up.railway.app/api`)
4. Select **Environment**:
   - ✅ **Production** (required)
   - ✅ **Preview** (recommended for PR previews)
   - ⚠️ **Development** (optional, for `vercel dev`)
5. Click **Save**

Repeat for all variables.

### 5. Redeploy

After adding all variables:

1. Go to **Deployments** tab
2. Click your latest deployment
3. Click **⋯** (three dots)
4. Select **Redeploy**
5. ✅ Check "Use existing build cache"
6. Click **Redeploy**

---

## ✅ Verification

### Test 1: Health Check (Browser Console)

After redeployment, open your Vercel site and run in browser console:

```javascript
fetch('https://tatt-production.up.railway.app/api/health')
  .then(r => r.json())
  .then(data => {
    console.log('✅ Backend health:', data);
    if (data.hasReplicateToken) {
      console.log('✅ Replicate token configured');
    }
  });
```

Expected output:
```json
{
  "status": "ok",
  "hasReplicateToken": true,
  "hasNeo4jConfig": true
}
```

### Test 2: Authenticated Request

Test the auth token is working:

```javascript
fetch('https://tatt-production.up.railway.app/api/predictions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_FRONTEND_AUTH_TOKEN_HERE'
  },
  body: JSON.stringify({
    version: 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
    input: {
      prompt: 'test',
      num_outputs: 1
    }
  })
})
.then(r => r.json())
.then(data => {
  if (data.error) {
    console.error('❌ Error:', data.error);
  } else {
    console.log('✅ Prediction created:', data.id);
  }
});
```

If you see `✅ Prediction created`, auth is working!

### Test 3: Full App Test

1. Go to `/generate` (The Forge)
2. Enter a prompt: "A dragon tattoo"
3. Select body part and style
4. Click **Generate**
5. Check browser console:
   - ✅ Should see successful API calls
   - ❌ If 401 errors, double-check token on Vercel

---

## 🔧 Troubleshooting

### Issue: Still getting 401 errors

**Check**:
1. Token is **exactly** the same on Vercel and Railway (no extra spaces)
2. Variable name is `VITE_FRONTEND_AUTH_TOKEN` (not `FRONTEND_AUTH_TOKEN`)
3. You clicked **Save** after adding
4. You redeployed after saving

**Fix**:
```bash
# Re-verify Railway token:
# Railway Dashboard → Variables → FRONTEND_AUTH_TOKEN
# Copy the exact value shown there

# Re-verify Vercel token:
# Vercel Dashboard → Settings → Environment Variables → VITE_FRONTEND_AUTH_TOKEN
# Paste the exact same value from Railway

# MUST MATCH EXACTLY (no spaces, no line breaks)
```

### Issue: CORS errors

**Check**:
- `VITE_PROXY_URL` ends with `/api` (not `/api/`)
- Railway has Vercel URL in `ALLOWED_ORIGINS`

**Fix on Railway**:
```bash
ALLOWED_ORIGINS=https://tat-t-3x8t.vercel.app,https://your-vercel-domain.vercel.app
```

### Issue: "REPLICATE_API_TOKEN not configured"

**This means**:
- Railway backend is missing the Replicate token

**Fix on Railway**:
```bash
REPLICATE_API_TOKEN=r8_your_replicate_token_here
```

---

## 🔐 Security Notes

- ✅ Auth token is a shared secret between frontend and backend
- ✅ Token should be different in production vs development
- ✅ Keep tokens out of git (already in `.gitignore`)
- ⚠️ Never commit `.env` files with real tokens

---

## 📱 Testing Locally Against Railway

If you want to test your local dev server against Railway backend:

```bash
# Copy Railway config to .env
cp .env.railway .env

# Or manually edit .env:
VITE_PROXY_URL=https://tatt-production.up.railway.app/api
VITE_FRONTEND_AUTH_TOKEN=your_token_from_railway

# Run dev server
npm run dev
```

**Note**: Use local backend for faster development:

```bash
# Switch back to local backend
VITE_PROXY_URL=http://localhost:3001/api
VITE_FRONTEND_AUTH_TOKEN=dev-token-change-in-production

# Start local backend
npm run server

# In another terminal
npm run dev
```

---

## ✅ Final Checklist

Before you start:

- [ ] Railway has `REPLICATE_API_TOKEN=r8_YL3l...` set
- [ ] Railway has `FRONTEND_AUTH_TOKEN=3d3653...` set
- [ ] Vercel has `VITE_PROXY_URL=https://tatt-production.up.railway.app/api`
- [ ] Vercel has `VITE_FRONTEND_AUTH_TOKEN=3d3653...` (matches Railway)
- [ ] Vercel redeployed after adding variables
- [ ] Tested in browser console (both endpoints work)

If all checked ✅, the 401 errors should be gone!

---

**Quick Copy-Paste for Vercel**:

```bash
VITE_PROXY_URL=https://tatt-production.up.railway.app/api
VITE_FRONTEND_AUTH_TOKEN=your_token_from_railway_dashboard
VITE_USE_COUNCIL=true
VITE_USE_OPENROUTER=true
VITE_COUNCIL_DEMO_MODE=false
VITE_DEMO_MODE=false
VITE_MAX_DAILY_SPEND=10.00
VITE_TOTAL_BUDGET=500.00
```

**Note**: Replace `your_token_from_railway_dashboard` with the actual value from:
Railway Dashboard → Your Project → Variables → `FRONTEND_AUTH_TOKEN`

---

**Last Updated**: January 15, 2026
**Related**: `RAILWAY_SETUP.md`, `server.js`, `.env.example`
