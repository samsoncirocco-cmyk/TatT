# Quick Setup: Railway Environment Update

## Step 1: Create .env file

Create a `.env` file in the project root with:

```bash
RAILWAY_API_TOKEN=1fea344a-d858-4753-ae2e-d0d9dd7b6301
VERCEL_URL=https://tat-t-3x8t.vercel.app
```

**Note:** The script will automatically try both of your project IDs:
- `a0fa4f56-541e-4b6e-9760-c0975d382020`
- `6c984fbf-b5e0-4ae0-b59e-5cd8e82a1688`

## Step 2: Run the update script

```bash
npm run railway:update-env
```

The script will:
1. Try the first project
2. If it fails, try the second project
3. Update `ALLOWED_ORIGINS` to include your Vercel URL
4. Railway will auto-restart with the new config

## Step 3: Verify

After the script runs successfully:
1. Check Railway logs to confirm restart
2. Test your frontend - CORS errors should be gone!

## Alternative: List projects first

To see which project is which:

```bash
npm run railway:list
```

This will show you all projects and their services to help identify the backend.

