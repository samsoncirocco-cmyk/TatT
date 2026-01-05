# Update Railway Environment Variables via Script

Since there's no Railway MCP server available, I've created a script that uses the Railway GraphQL API to update environment variables programmatically.

## Quick Start

### Step 1: Get Your Railway API Token

1. Go to: https://railway.app/account/tokens
2. Click "New Token"
3. Give it a name (e.g., "TatT CORS Update")
4. Copy the token

### Step 2: Get Your Project ID

1. Go to your Railway project dashboard
2. The Project ID is in the URL: `https://railway.app/project/[PROJECT_ID]`
3. Or go to Project Settings → General → Reference ID

### Step 3: Run the Script

Add these to your `.env` file (or export as environment variables):

```bash
RAILWAY_API_TOKEN=your_token_here
RAILWAY_PROJECT_ID=your_project_id_here
RAILWAY_SERVICE_ID=your_service_id_here  # Optional - will use first service if not provided
VERCEL_URL=https://tat-t-3x8t.vercel.app  # Optional - defaults to this
```

Then run:

```bash
npm run railway:update-env
```

Or directly:

```bash
node scripts/update-railway-env.js
```

## What the Script Does

1. ✅ Connects to Railway API using your token
2. ✅ Fetches your project services
3. ✅ Gets current `ALLOWED_ORIGINS` environment variable
4. ✅ Checks if Vercel URL is already included
5. ✅ Adds Vercel URL to `ALLOWED_ORIGINS` if not present
6. ✅ Updates the environment variable
7. ✅ Railway automatically restarts with new variables

## Alternative: Manual Update

If you prefer to update manually:

1. Go to Railway Dashboard → Your Project
2. Click on your service
3. Go to **Variables** tab
4. Add or update: `ALLOWED_ORIGINS` = `https://tat-t-3x8t.vercel.app`
5. Railway will auto-restart

## Troubleshooting

### "RAILWAY_API_TOKEN is required"
- Make sure you've added the token to your `.env` file
- Or export it: `export RAILWAY_API_TOKEN=your_token`

### "RAILWAY_PROJECT_ID is required"
- Find your project ID in the Railway dashboard URL
- Or in Project Settings → General

### "401 Unauthorized"
- Your API token might be invalid or expired
- Generate a new token at: https://railway.app/account/tokens

### "Service not found"
- Check your `RAILWAY_SERVICE_ID` is correct
- Or leave it unset to use the first service automatically

## Security Note

⚠️ **Never commit your `.env` file with Railway API tokens!**

The `.env` file should already be in `.gitignore`, but double-check:
- ✅ `.env` is in `.gitignore`
- ✅ Only share tokens with trusted team members
- ✅ Rotate tokens periodically

## Success Indicators

After running the script, you should see:
- ✅ "Successfully updated ALLOWED_ORIGINS!"
- ✅ Railway service will automatically restart
- ✅ CORS errors should be resolved after restart

Check Railway logs to confirm the service restarted with new environment variables.

