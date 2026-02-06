# CORS Fix for Railway + Vercel Deployment

## Issue
CORS errors when frontend on Vercel (`https://tat-t-3x8t.vercel.app`) tries to call Railway backend (`https://tatt-production.up.railway.app`).

Error: `Access to fetch at 'https://tatt-production.up.railway.app/api/predictions' from origin 'https://tat-t-3x8t.vercel.app' has been blocked by CORS policy`

## Solution

### Step 1: Update Railway Environment Variables

1. Go to your Railway project dashboard
2. Navigate to **Variables** tab
3. Add or update the following environment variable:

```
ALLOWED_ORIGINS=https://tat-t-3x8t.vercel.app
```

**For multiple origins (comma-separated):**
```
ALLOWED_ORIGINS=https://tat-t-3x8t.vercel.app,https://www.tat-t-3x8t.vercel.app
```

### Step 2: Verify Other Required Variables

Make sure these are also set in Railway:

- ✅ `REPLICATE_API_TOKEN` - Your Replicate API token
- ✅ `FRONTEND_AUTH_TOKEN` - Secure token (must match Vercel's `VITE_FRONTEND_AUTH_TOKEN`)
- ✅ `HOST` = `0.0.0.0` (for cloud hosting)

### Step 3: Verify Vercel Environment Variables

In your Vercel project settings, ensure:

- ✅ `VITE_PROXY_URL` = `https://tatt-production.up.railway.app/api`
- ✅ `VITE_FRONTEND_AUTH_TOKEN` = (must match Railway's `FRONTEND_AUTH_TOKEN`)

### Step 4: Redeploy

1. **Railway**: Will auto-restart when you save environment variables
2. **Vercel**: May need to trigger a redeploy if env vars changed:
   ```bash
   vercel --prod
   ```

### Step 5: Test

1. Open browser console on `https://tat-t-3x8t.vercel.app/generate`
2. Try generating a design
3. Check for CORS errors - they should be gone
4. Check Railway logs for `[CORS] Origin ... allowed` messages

## What Changed in Code

The server now:
- ✅ Automatically includes Vercel URL if `VERCEL_URL` env var is set
- ✅ **Allows all `*.vercel.app` domains** (production + preview deployments)
- ✅ Better CORS logging for debugging
- ✅ Explicit OPTIONS handler for preflight requests
- ✅ Proper CORS headers with credentials support

**Note:** The server automatically allows any origin ending with `.vercel.app`, which covers:
- Production: `https://tat-t-3x8t.vercel.app`
- Preview deployments: `https://tat-t-3x8t-*-*.vercel.app`
- Any other Vercel deployment URLs

## Troubleshooting

### Still getting CORS errors?

1. **Check exact origin match**: The origin must match exactly (including `https://`)
   - Browser console shows the exact origin being blocked
   - Compare with Railway's `ALLOWED_ORIGINS` value

2. **Check Railway logs**: Look for:
   ```
   [CORS] Origin https://tat-t-3x8t.vercel.app not allowed. Allowed origins: ...
   ```

3. **Verify environment variable format**:
   - No trailing slashes
   - Include `https://` protocol
   - Comma-separated for multiple origins (no spaces around commas)

4. **Clear browser cache**: Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)

5. **Check preflight requests**: Open Network tab → look for OPTIONS request to `/api/predictions`
   - Should return 200 status
   - Should include `Access-Control-Allow-Origin` header

## Quick Test

Test CORS configuration with curl:

```bash
# Test preflight (OPTIONS)
curl -X OPTIONS https://tatt-production.up.railway.app/api/predictions \
  -H "Origin: https://tat-t-3x8t.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -v

# Should see: Access-Control-Allow-Origin: https://tat-t-3x8t.vercel.app
```

## Success Indicators

✅ No CORS errors in browser console  
✅ Network requests return 200/401 (not CORS errors)  
✅ Railway logs show `[CORS] Origin ... allowed`  
✅ Designs generate successfully  


