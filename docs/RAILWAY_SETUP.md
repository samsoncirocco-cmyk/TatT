# Railway Backend Configuration Guide

This document explains how to configure your Railway backend deployment to fix the 401 Authorization errors.

---

## The Problem

**Error**: `401 Authorization header required from tatt-production.up.railway.app/api/predictions`

**Root Cause**: The Railway backend is missing the `REPLICATE_API_TOKEN` environment variable, so it can't authenticate with Replicate's API.

---

## Required Environment Variables

### On Railway (Backend)

Set these environment variables in your Railway project dashboard:

#### 1. **REPLICATE_API_TOKEN** (CRITICAL - Missing!)

```bash
REPLICATE_API_TOKEN=r8_your_replicate_token_here
```

**How to get it**:
1. Go to https://replicate.com/account/api-tokens
2. Create or copy your API token
3. Add to Railway environment variables

**Note**: This is the **backend** token (NO `VITE_` prefix). The server uses this to proxy all Replicate API calls.

#### 2. **FRONTEND_AUTH_TOKEN** (Security)

```bash
FRONTEND_AUTH_TOKEN=your-secure-random-token-here
```

**Important**: This must match the `VITE_FRONTEND_AUTH_TOKEN` on Vercel (frontend). Generate a secure random string for production:

```bash
# Generate a secure token (Mac/Linux)
openssl rand -hex 32
```

#### 3. **ALLOWED_ORIGINS** (CORS)

```bash
ALLOWED_ORIGINS=https://tat-t-3x8t.vercel.app,https://your-custom-domain.com
```

**Important**: Must include ALL frontend URLs (production + preview deployments). Railway automatically allows `*.vercel.app` domains, but explicit listing is recommended.

#### 4. **Neo4j Configuration** (Graph Database)

```bash
NEO4J_URI=neo4j+s://your-instance.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_neo4j_password
```

#### 5. **Supabase Configuration** (Vector Database)

```bash
SUPABASE_URL=https://yfcmysjmoehcyszvkxsr.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_role_key
```

#### 6. **OpenRouter Configuration** (Optional - for AI Council)

```bash
OPENROUTER_API_KEY=sk-or-v1-your_key_here
```

Only needed if using the AI Council feature with OpenRouter.

---

### On Vercel (Frontend)

Set these environment variables in your Vercel project settings:

#### 1. **VITE_PROXY_URL** (CRITICAL)

```bash
VITE_PROXY_URL=https://tatt-production.up.railway.app/api
```

**Important**: Must point to your Railway backend URL (no trailing slash on `/api`).

#### 2. **VITE_FRONTEND_AUTH_TOKEN** (Security)

```bash
VITE_FRONTEND_AUTH_TOKEN=your-secure-random-token-here
```

**Important**: Must match `FRONTEND_AUTH_TOKEN` on Railway (same value).

#### 3. **Feature Flags**

```bash
VITE_USE_COUNCIL=true
VITE_USE_OPENROUTER=true
VITE_COUNCIL_DEMO_MODE=false
VITE_DEMO_MODE=false
```

#### 4. **Budget Controls**

```bash
VITE_MAX_DAILY_SPEND=10.00
VITE_TOTAL_BUDGET=500.00
```

---

## How to Set Environment Variables

### Railway

1. Go to https://railway.app/dashboard
2. Select your `tatt-production` project
3. Click on your service (backend)
4. Go to **Variables** tab
5. Click **+ New Variable**
6. Add each variable with its value
7. Click **Deploy** (Railway auto-deploys on env changes)

### Vercel

1. Go to https://vercel.com/dashboard
2. Select your `TatT` project
3. Go to **Settings** → **Environment Variables**
4. Add each variable:
   - Set **Environment**: Production (and/or Preview/Development as needed)
   - Enter **Key** and **Value**
5. Click **Save**
6. Redeploy your application

---

## Verification Steps

After setting all environment variables:

### 1. Check Railway Logs

```bash
# In Railway dashboard, go to Deployments → Latest → Logs
# Look for startup logs:

[Server] Starting TatT Proxy Server...
  Host: 0.0.0.0
  Port: 3002
  Environment: production
  Replicate Token: ✓ Yes    # <-- Should show ✓ Yes
  Neo4j Connected: ✓ Yes
  Supabase URL: https://yfcmysjmoehcyszvkxsr.supabase.co
```

If you see `Replicate Token: ✗ No`, the token isn't set correctly.

### 2. Test the Health Endpoint

```bash
# Test from your terminal:
curl https://tatt-production.up.railway.app/api/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2026-01-14T...",
  "services": {
    "replicate": true,
    "neo4j": true,
    "supabase": true
  }
}
```

If `"replicate": false`, the token is missing or invalid.

### 3. Test a Real Generation

1. Go to your Vercel deployment
2. Navigate to `/generate` (The Forge)
3. Enter a prompt and click **Generate**
4. Check browser console:
   - ✅ Should see successful API calls
   - ❌ If you see 401 errors, recheck token configuration

---

## Common Issues

### Issue 1: "REPLICATE_API_TOKEN not configured"

**Symptom**: 500 error when creating predictions

**Fix**:
1. Verify token is set on Railway (NOT Vercel)
2. Check spelling: `REPLICATE_API_TOKEN` (no `VITE_` prefix)
3. Ensure token starts with `r8_`
4. Redeploy Railway after adding

### Issue 2: "Origin not allowed" CORS error

**Symptom**: CORS errors in browser console

**Fix**:
1. Add Vercel URL to `ALLOWED_ORIGINS` on Railway
2. Format: `https://tat-t-3x8t.vercel.app` (no trailing slash)
3. Multiple origins: comma-separated
4. Redeploy Railway

### Issue 3: "Authorization header required"

**Symptom**: 401 error from frontend

**Fix**:
1. Ensure `VITE_FRONTEND_AUTH_TOKEN` is set on Vercel
2. Ensure `FRONTEND_AUTH_TOKEN` is set on Railway
3. **Both must have the same value**
4. Redeploy both services

### Issue 4: "Invalid API token"

**Symptom**: 401 from Replicate API

**Fix**:
1. Go to https://replicate.com/account/api-tokens
2. Regenerate token if expired
3. Update on Railway
4. Test with curl:
   ```bash
   curl -H "Authorization: Token r8_your_token" \
     https://api.replicate.com/v1/models
   ```

---

## Security Checklist

- [ ] `REPLICATE_API_TOKEN` is set ONLY on Railway (backend)
- [ ] `FRONTEND_AUTH_TOKEN` matches on both Railway and Vercel
- [ ] Tokens are NOT committed to git
- [ ] `.env` file is in `.gitignore`
- [ ] `ALLOWED_ORIGINS` restricts to known domains
- [ ] Production uses strong auth tokens (not `dev-token-...`)

---

## Testing the Full Stack

### 1. Test Backend Health

```bash
curl https://tatt-production.up.railway.app/api/health
```

Expected: `{ "status": "ok", ... }`

### 2. Test Frontend → Backend → Replicate

```bash
# From browser console (replace with your actual token):
const response = await fetch('https://tatt-production.up.railway.app/api/predictions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-frontend-auth-token'
  },
  body: JSON.stringify({
    version: 'stability-ai/sdxl:...',
    input: { prompt: 'test' }
  })
});
console.log(await response.json());
```

Expected: `{ "id": "...", "status": "starting", ... }`

---

## Quick Setup Script

Copy/paste this into your Railway environment variables (replace placeholders):

```bash
# Core - REQUIRED
REPLICATE_API_TOKEN=r8_your_token_here
FRONTEND_AUTH_TOKEN=your_secure_token_here
ALLOWED_ORIGINS=https://tat-t-3x8t.vercel.app

# Databases - REQUIRED
NEO4J_URI=neo4j+s://your_instance.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password_here
SUPABASE_URL=https://yfcmysjmoehcyszvkxsr.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_KEY=your_service_key_here

# AI Council - OPTIONAL
OPENROUTER_API_KEY=sk-or-v1-your_key_here

# Server Config - AUTO (Railway sets PORT)
HOST=0.0.0.0
```

Copy/paste this into your Vercel environment variables:

```bash
# Core - REQUIRED
VITE_PROXY_URL=https://tatt-production.up.railway.app/api
VITE_FRONTEND_AUTH_TOKEN=your_secure_token_here

# Feature Flags
VITE_USE_COUNCIL=true
VITE_USE_OPENROUTER=true
VITE_COUNCIL_DEMO_MODE=false
VITE_DEMO_MODE=false

# Budget Controls
VITE_MAX_DAILY_SPEND=10.00
VITE_TOTAL_BUDGET=500.00
```

---

## Need Help?

1. Check Railway logs: **Deployments** → **Logs**
2. Check Vercel logs: **Deployments** → Select deployment → **Function Logs**
3. Test endpoints individually with `curl` or Postman
4. Verify all environment variables are spelled correctly (case-sensitive!)

---

**Last Updated**: January 14, 2026
**Related Files**: `server.js`, `.env.example`, `CLAUDE.md`
