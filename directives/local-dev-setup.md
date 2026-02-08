# Local Development Setup

## Goal
Clone the TatT repository, install dependencies, configure environment variables, and run the development server locally.

## When to Use
- First-time setup for new developers
- Setting up a fresh development machine
- Troubleshooting local environment issues

## Prerequisites
- **Node.js:** 18.x or later (recommend 22.x via nvm)
- **npm:** 9.x or later (comes with Node.js)
- **Git:** Latest version
- **Code Editor:** VS Code (recommended) with extensions:
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - TypeScript and JavaScript Language Features

## Steps

### 1. Clone Repository
```bash
git clone https://github.com/your-org/TatT.git
# Or via SSH:
git clone git@github.com:your-org/TatT.git

cd TatT
git checkout manama/next  # Development branch
```

### 2. Install Dependencies
```bash
npm install
```

**Expected Time:** 2-5 minutes (depending on network speed)

**Common Issues:**
- **`EACCES` permission errors:** Run `sudo chown -R $(whoami) ~/.npm`
- **`gyp` build failures:** Install build tools (`apt-get install build-essential` or Xcode Command Line Tools)
- **Version conflicts:** Delete `node_modules` and `package-lock.json`, re-run `npm install`

### 3. Configure Environment Variables
Create `.env.local` in project root:

```bash
cp .env.example .env.local  # If example file exists
# Or create manually:
touch .env.local
```

**Required Variables:**

```bash
# Replicate (AI tattoo generation)
REPLICATE_API_TOKEN=r8_YOUR_TOKEN_HERE

# Google Cloud (Vertex AI, GCS)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
GCP_PROJECT_ID=tatt-pro
GCP_REGION=us-central1
NEXT_PUBLIC_VERTEX_AI_PROJECT_ID=tatt-pro

# Supabase (vector search)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Neo4j (artist graph database)
NEO4J_URI=neo4j+s://your-instance.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your-password

# Firebase (real-time match updates)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tatt-pro.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tatt-pro
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://tatt-pro-default-rtdb.firebaseio.com
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tatt-pro.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# OpenRouter (Council AI fallback)
OPENROUTER_API_KEY=sk-or-v1-your-key

# Optional: API authentication
TATT_API_KEY=your-secret-api-key

# Optional: Feature flags
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_COUNCIL_DEMO_MODE=false
```

**Getting API Keys:**
- **Replicate:** https://replicate.com/account/api-tokens
- **Google Cloud:** Create service account in GCP Console → IAM & Admin → Service Accounts
- **Supabase:** https://app.supabase.com → Project Settings → API
- **Neo4j:** https://console.neo4j.io → Database → Connect
- **Firebase:** https://console.firebase.google.com → Project Settings → General
- **OpenRouter:** https://openrouter.ai/keys

### 4. Initialize Databases

#### Supabase Vector Schema
```bash
node scripts/setup-supabase-vector-schema.js
```
**Creates:**
- `tattoo_artists` table with pgvector extension
- Text embedding column (768 dimensions)
- Indexes for fast similarity search

#### Neo4j Graph Seed Data
```bash
node scripts/import-to-neo4j.js
```
**Creates:**
- Artist nodes with properties (name, styles, location, etc.)
- Relationship edges (COLLABORATED_WITH, TRAINED, WORKS_AT)

#### Generate Embeddings (Optional)
```bash
node scripts/generate-vertex-embeddings.js
```
**Populates:**
- Vector embeddings for existing artist portfolios
- **Time:** ~5 minutes for 100 artists
- **Cost:** ~$0.10 (Vertex AI Text Embeddings)

### 5. Verify Configuration
```bash
# Test Supabase connection
node scripts/test-supabase-connection.js

# Test Vertex AI health
node scripts/test-gcp-health.js

# Test vector search
node scripts/test-vector-db.js
```

**Expected Output:**
```
✓ Supabase connection successful
✓ Vertex AI credentials valid
✓ Vector search returned 10 results in 87ms
```

### 6. Start Development Server
```bash
npm run dev
```

**Expected Output:**
```
▲ Next.js 16.1.2
- Local:        http://localhost:3000
- Environments: .env.local

✓ Ready in 3.2s
```

**Open:** http://localhost:3000

### 7. Verify App is Working
**Manual Tests:**
1. **Homepage loads:** Should see "TatT" branding + generation UI
2. **Generate tattoo:** Enter prompt "dragon in traditional style" → Click "Generate"
3. **Artist matching:** After generation, click "Find Artists" → See list of matches
4. **Stencil export:** Click "Export Stencil" on a design → Download PDF

**Expected Errors (Normal in Dev):**
- Console warnings about missing env vars (if optional services not configured)
- "Demo mode" messages if external APIs are disabled

## Expected Output
- Development server running at http://localhost:3000
- Hot module reloading enabled (changes reflect instantly)
- TypeScript type checking in terminal
- ESLint warnings/errors displayed

## Edge Cases

### Port 3000 Already in Use
- **Solution:** Kill existing process or use different port:
  ```bash
  PORT=3001 npm run dev
  ```

### Google Service Account JSON Not Found
- **Solution:** Verify `GOOGLE_APPLICATION_CREDENTIALS` path is absolute
- **Alternative:** Base64-encode JSON and use inline:
  ```bash
  GCP_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
  ```

### Supabase Connection Fails
- **Check:** Firewall or VPN blocking connection
- **Solution:** Whitelist IP in Supabase dashboard or disable VPN

### Neo4j Connection Timeout
- **Check:** Instance is running (Aura free tier auto-pauses after inactivity)
- **Solution:** Resume instance in Neo4j console

### Module Not Found Errors
- **Cause:** Dependency not installed or corrupted
- **Solution:** `rm -rf node_modules package-lock.json && npm install`

### TypeScript Errors in IDE
- **Cause:** VS Code using wrong TypeScript version
- **Solution:** CMD+Shift+P → "TypeScript: Select TypeScript Version" → "Use Workspace Version"

## Performance Optimization

### Faster Installs
- Use `pnpm` instead of `npm` (3x faster):
  ```bash
  npm install -g pnpm
  pnpm install
  pnpm dev
  ```

### Faster Builds
- Enable SWC compiler (already default in Next.js 14)
- Reduce dev build time: `NEXT_TELEMETRY_DISABLED=1 npm run dev`

### Database Optimization
- Use local Postgres + pgvector for offline development
- Use local Neo4j Docker container instead of Aura

## Development Workflow

### Feature Development
1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes, test locally
3. Run linter: `npm run lint`
4. Commit: `git commit -m "feat: add my feature"`
5. Push: `git push origin feature/my-feature`
6. Open pull request on GitHub

### Hot Reloading
- **Changes auto-reload:** Components, pages, API routes
- **Requires restart:** `.env.local` changes, `next.config.js` changes

### Debugging
- **Browser DevTools:** React DevTools, Network tab for API calls
- **VS Code Debugger:** Use "Next.js: debug full stack" launch config
- **Console Logging:** Use `console.log()` liberally (removed in production build)

## Related Directives
- `deploy-vercel.md` — Deploy to staging/production after local testing
- `generate-tattoo.md` — Test core generation workflow
- `artist-matching.md` — Test semantic search

## Useful Scripts

```bash
# Run development server
npm run dev

# Build for production (test build locally)
npm run build

# Start production server locally
npm run start

# Run linter
npm run lint

# Run tests (if configured)
npm test

# Clean build cache
rm -rf .next
```

## Troubleshooting Checklist

- [ ] Node.js version ≥18 (`node -v`)
- [ ] Dependencies installed (`node_modules` exists)
- [ ] `.env.local` created and populated
- [ ] Google service account JSON exists at specified path
- [ ] Supabase connection successful (`node scripts/test-supabase-connection.js`)
- [ ] Vertex AI credentials valid (`node scripts/test-gcp-health.js`)
- [ ] Port 3000 available
- [ ] No firewall blocking localhost connections

**Still stuck?** Check `CLAUDE.md` for service dependency map and contact team.
