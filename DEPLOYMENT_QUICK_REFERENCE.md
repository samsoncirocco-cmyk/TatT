# TatT Deployment Quick Reference

## 🚀 Pre-Deployment Checklist

### 1. Generate Auth Token
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copy the output - you'll use it for both `FRONTEND_AUTH_TOKEN` and `VITE_FRONTEND_AUTH_TOKEN`

### 2. Set Environment Variables

#### Local Development (.env file)
```bash
# Server-side (never exposed to client)
REPLICATE_API_TOKEN=r8_your_actual_replicate_token
FRONTEND_AUTH_TOKEN=your_generated_token_from_step_1
HOST=127.0.0.1
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Client-side (bundled with app)
VITE_FRONTEND_AUTH_TOKEN=your_generated_token_from_step_1
VITE_PROXY_URL=http://localhost:3001/api
VITE_USE_COUNCIL=false
VITE_DEMO_MODE=false
```

#### Production (Vercel/Railway/Render)
Add these to your hosting platform's environment variables:

**Server Environment (Railway):**
- `REPLICATE_API_TOKEN` = your Replicate API token
- `FRONTEND_AUTH_TOKEN` = your generated token
- `HOST` = `0.0.0.0` (for cloud hosting)
- `ALLOWED_ORIGINS` = `https://tat-t-3x8t.vercel.app,https://www.tat-t-3x8t.vercel.app` (include all your frontend URLs, comma-separated)
- `VERCEL_URL` = `https://tat-t-3x8t.vercel.app` (optional, will be auto-added if not in ALLOWED_ORIGINS)

**Client Environment:**
- `VITE_FRONTEND_AUTH_TOKEN` = same as `FRONTEND_AUTH_TOKEN`
- `VITE_PROXY_URL` = `https://your-api-domain.com/api`
- `VITE_USE_COUNCIL` = `false` (or `true` if using council)
- `VITE_DEMO_MODE` = `false`

### 3. Test Locally
```bash
# Terminal 1: Start backend
npm run server

# Terminal 2: Start frontend
npm run dev

# Terminal 3: Run tests
npm test

# Terminal 4: Verify health
curl http://localhost:3001/api/health
```

Expected health response:
```json
{
  "status": "ok",
  "message": "Proxy server is running",
  "hasToken": true,
  "authRequired": true
}
```

### 4. Verify Security

#### Test Auth (should fail with 401)
```bash
curl -X POST http://localhost:3001/api/predictions \
  -H "Content-Type: application/json" \
  -d '{"test":"data"}'
```

#### Test Auth (should succeed with 200)
```bash
curl -X POST http://localhost:3001/api/predictions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_generated_token" \
  -d '{"test":"data"}'
```

---

## 📋 Deployment Steps

### Vercel Deployment

1. **Deploy Frontend**
   ```bash
   vercel --prod
   ```

2. **Add Environment Variables** (Vercel Dashboard)
   - Go to Project Settings → Environment Variables
   - Add all `VITE_*` variables
   - Redeploy

3. **Deploy Backend** (Separate Vercel Project or Railway)
   - Create new project for `server.js`
   - Add server environment variables
   - Update `VITE_PROXY_URL` in frontend to point to backend URL

### Railway Deployment

1. **Deploy Backend**
   ```bash
   railway up
   ```

2. **Add Environment Variables** (Railway Dashboard)
   - Go to your Railway project → Variables tab
   - Add all server environment variables:
     - `REPLICATE_API_TOKEN` = your Replicate token
     - `FRONTEND_AUTH_TOKEN` = your generated secure token
     - `HOST` = `0.0.0.0`
     - `ALLOWED_ORIGINS` = `https://tat-t-3x8t.vercel.app` (or comma-separated list of all frontend URLs)
     - `VERCEL_URL` = `https://tat-t-3x8t.vercel.app` (optional)
   - Note the generated Railway URL (e.g., `https://tatt-production.up.railway.app`)

3. **Update Frontend**
   - Set `VITE_PROXY_URL` to Railway backend URL
   - Deploy frontend to Vercel

---

## 🔍 Post-Deployment Verification

### 1. Health Check
```bash
curl https://your-api-domain.com/api/health
```

### 2. Test Auth Flow
```bash
# Should fail (401)
curl -X POST https://your-api-domain.com/api/predictions

# Should succeed (200)
curl -X POST https://your-api-domain.com/api/predictions \
  -H "Authorization: Bearer your_token"
```

### 3. Test Frontend
- Open `https://your-domain.com`
- Navigate to Generate tab
- Enter a design description
- Click Generate
- Verify designs appear

### 4. Check Logs
- Monitor server logs for errors
- Check rate limit hits
- Verify CORS is working

---

## 🚨 Troubleshooting

### "Cannot connect to proxy server"
- ✅ Check `VITE_PROXY_URL` is set correctly
- ✅ Verify backend is running
- ✅ Check CORS `ALLOWED_ORIGINS` includes your domain

### "Authorization header required"
- ✅ Check `VITE_FRONTEND_AUTH_TOKEN` is set
- ✅ Verify it matches `FRONTEND_AUTH_TOKEN` on server
- ✅ Rebuild frontend after adding env vars

### "Origin not allowed" / CORS errors
- ✅ Add your Vercel domain to Railway's `ALLOWED_ORIGINS` environment variable
- ✅ Format: `https://tat-t-3x8t.vercel.app` (comma-separated for multiple)
- ✅ Include both `https://domain.com` and `https://www.domain.com` if applicable
- ✅ Railway will auto-restart after env var changes
- ✅ Check Railway logs for CORS debug messages: `[CORS] Origin ... allowed/not allowed`
- ✅ Verify the exact origin in browser console (must match exactly, including protocol)

### "Rate limit exceeded"
- ✅ Normal behavior - wait 1 minute
- ✅ Increase limit in `server.js` if needed (line 30)
- ✅ Consider implementing user-based limits

### Tests failing
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Run tests
npm test
```

---

## 📊 Monitoring

### Key Metrics to Watch

1. **API Usage**
   - Check localStorage: `tattester_api_usage`
   - Monitor Replicate dashboard
   - Set up budget alerts

2. **Error Rates**
   - 401/403 errors (auth issues)
   - 429 errors (rate limiting)
   - 500 errors (server issues)

3. **Performance**
   - Generation time (should be < 60s)
   - Storage quota usage
   - Memory leaks (check browser DevTools)

### Recommended Tools
- **Error Tracking:** Sentry
- **Analytics:** Vercel Analytics or Plausible
- **Uptime:** UptimeRobot
- **Logs:** Vercel Logs or Railway Logs

---

## 🔄 Rollback Procedure

If deployment fails:

1. **Revert to Previous Version**
   ```bash
   git revert HEAD
   git push
   ```

2. **Restore Old Env Vars**
   - Remove new auth tokens
   - Restore `VITE_REPLICATE_API_TOKEN`
   - Redeploy

3. **Restore Backup Component**
   ```bash
   mv src/components/DesignGenerator.jsx.backup src/components/DesignGenerator.jsx
   git commit -am "Rollback to pre-hardening version"
   git push
   ```

---

## 📞 Support

- **Documentation:** See `PRODUCTION_HARDENING_SUMMARY.md`
- **Issues:** Check `TROUBLESHOOTING.md`
- **Tests:** Run `npm test` for diagnostics

---

## ✅ Success Criteria

Your deployment is successful when:

- ✅ Health check returns `{"status":"ok"}`
- ✅ Auth is required for predictions
- ✅ Rate limiting is active
- ✅ Frontend can generate designs
- ✅ Toasts appear (no alerts)
- ✅ Tests pass
- ✅ No console errors

**You're production-ready! 🎉**

