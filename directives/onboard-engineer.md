# Directive: Onboard New Engineer

**ID:** DIR-006
**Owner:** Tech Lead
**Last Updated:** 2026-02-16
**Last Tested:** Not yet tested
**Risk Level:** Low
**Estimated Duration:** 90-120 minutes (target: < 2 hours to productive)

## Purpose

Onboard a new engineer to the TatTester codebase and infrastructure. This directive provides a complete path from repository clone to deploying a working development environment and running tests.

The goal is for a new engineer to be productive (able to make PRs and run local builds) within 2 hours of starting this process.

## Prerequisites

- [ ] Engineer has GitHub account with repo access granted
- [ ] Engineer has GCP account added to project (roles: Editor, Cloud Run Admin)
- [ ] Engineer has received .env file with development credentials (via 1Password or secure channel)
- [ ] Laptop has admin access for installing tools

## Procedure

### Step 1: Install Required Tools

**macOS:**
```bash
# Install Homebrew (if not already installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js 20
brew install node@20
echo 'export PATH="/usr/local/opt/node@20/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Install Python 3.12
brew install python@3.12
echo 'export PATH="/usr/local/opt/python@3.12/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Install Google Cloud CLI
brew install google-cloud-sdk

# Install GitHub CLI (optional but recommended)
brew install gh
```

**Linux (Ubuntu/Debian):**
```bash
# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Python 3.12
sudo add-apt-repository ppa:deadsnakes/ppa
sudo apt-get update
sudo apt-get install -y python3.12 python3.12-venv python3-pip

# Google Cloud CLI
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```

**Verify installations:**
```bash
node --version   # Should show v20.x.x
npm --version    # Should show 10.x.x
python3.12 --version  # Should show 3.12.x
gcloud --version # Should show latest
```

### Step 2: Clone Repository and Install Dependencies

```bash
# Clone repo
git clone https://github.com/[ORG]/pangyo.git
cd pangyo

# Install Node.js dependencies
npm install

# Install Python dependencies
pip3.12 install -r execution/requirements.txt
```

**Expected output:**
```
added 1,247 packages in 42s
Successfully installed google-cloud-firestore-2.16.0 neo4j-5.20.0 ...
```

### Step 3: Configure Environment Variables

```bash
# Copy example env file
cp .env.example .env

# Open .env and fill in values from shared 1Password vault
# Required vars:
#   - REPLICATE_API_TOKEN
#   - NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD
#   - GCP_PROJECT_ID
#   - FIREBASE_* (all public keys)
#   - OPENROUTER_API_KEY
```

**Do NOT commit .env file.** It's already in .gitignore.

### Step 4: Authenticate with GCP

```bash
# Login to GCP
gcloud auth login
gcloud auth application-default login

# Set project
gcloud config set project [PROJECT_ID]

# Verify auth
gcloud auth list
```

**Expected output:**
```
Credentialed Accounts
ACTIVE  ACCOUNT
*       your-email@example.com
```

### Step 5: Validate Environment

```bash
# Run environment validation script
cd execution/
python validate_env.py
```

**Expected output:**
```
✅ Secret Manager: All 4 secrets accessible
✅ Firestore: Connected
✅ Neo4j: Connected
✅ Cloud Storage: Bucket pangyo-tattoo-images accessible

✅ All validation checks passed. System ready.
```

**If checks fail:** See troubleshooting section below. Most common issues:
- GCP credentials not set: Re-run `gcloud auth application-default login`
- Neo4j credentials wrong: Verify .env values match 1Password
- Firestore not accessible: Ensure GCP project ID is correct

### Step 6: Run Development Servers

**Terminal 1 (Frontend):**
```bash
npm run dev
```

**Expected output:**
```
VITE v5.x.x  ready in 847 ms

➜  Local:   http://localhost:3000/
➜  Network: use --host to expose
➜  press h + enter to show help
```

**Terminal 2 (Backend Proxy):**
```bash
npm run server
```

**Expected output:**
```
[Server] Proxy server running on port 3001
[Server] CORS enabled for: http://localhost:3000
[Server] Rate limiting active
```

**Verify both servers running:**
```bash
curl http://localhost:3000/api/health
# Expected: {"status":"healthy"}

curl http://localhost:3001/api/health
# Expected: {"status":"healthy"}
```

### Step 7: Run Tests

```bash
# JavaScript/React tests
npm run test

# Python execution script tests (if they exist)
pytest tests/execution/ -v

# Linting
npm run lint
```

**Expected output:**
```
✓ src/services/canvasService.test.js (12)
✓ src/services/versionService.test.js (18)
...

Test Files  47 passed (47)
Tests  312 passed (312)
Duration  8.42s
```

**If tests fail:** Check if failure is environmental (missing .env vars) or real regression. Ask team lead for guidance.

### Step 8: Make a Test Change

To verify full workflow:

```bash
# Create feature branch
git checkout -b onboarding-test-[yourname]

# Make trivial change
echo "// Onboarding test by [yourname]" >> src/test.js

# Commit
git add src/test.js
git commit -m "test: onboarding verification"

# Push and create PR
git push origin onboarding-test-[yourname]
gh pr create --title "Onboarding test" --body "Verifying dev environment setup"
```

**Team lead will review and close the PR.** This confirms Git workflow is working.

### Step 9: Deploy to Staging (Optional Advanced Step)

If you want to verify full deployment pipeline:

```bash
# Trigger staging deployment (requires GCP permissions)
gh workflow run ci-cd.yml -f environment=staging

# Watch deployment
gh run watch
```

**Note:** This step is optional for day 1. Focus on local development first.

## Rollback

Onboarding is additive. No rollback needed.

If engineer needs to reset environment:

```bash
# Remove all local changes
git clean -fdx
git reset --hard origin/main

# Remove node_modules and reinstall
rm -rf node_modules/
npm install
```

## Known Issues

No known issues yet. Update this section when issues are discovered during engineer onboarding.

## Post-Operation

- [ ] Engineer can run `npm run dev` and see UI at localhost:3000
- [ ] Engineer can run `npm test` and all tests pass
- [ ] Engineer verified environment with `python execution/validate_env.py`
- [ ] Engineer created and pushed a test branch
- [ ] Engineer added to team communication channels (Slack, etc.)
- [ ] Engineer received access to 1Password, GCP Console, GitHub repo
- [ ] If any issues occurred, update this directive's "Known Issues" section

## Related Directives

- **DIR-001: Deploy** - New engineers should observe a deployment
- **DIR-002: Seed Artists** - New engineers should seed local Neo4j with sample data
- **DIR-005: Monitor Budget** - New engineers should understand budget constraints

## Appendix: Architecture Overview

**Read CLAUDE.md first.** It contains comprehensive architecture documentation.

**Quick orientation:**

```
Frontend (Next.js + React):
  - src/pages/*.jsx → Route pages
  - src/components/ → React components
  - src/hooks/ → Custom hooks (state + service orchestration)
  - src/services/ → Business logic and API clients

Backend (Express proxy):
  - server.js → Main proxy server
  - Proxies Replicate, council, and other APIs
  - Hides API tokens from client

Data Layer:
  - Firestore → User designs, versions, layers (subcollections)
  - Neo4j → Artist graph (relationships, styles, specialties)
  - Cloud Storage → Generated images (permanent URLs)
  - Vertex AI → Embeddings for semantic matching

Operational:
  - directives/ → SOPs (you're reading one now)
  - execution/ → Python automation scripts
  - .github/workflows/ → CI/CD automation
```

**Key design patterns:**
- Service layer pattern: All external APIs in `/src/services/`
- Custom hooks pattern: Stateful logic in `/src/hooks/`
- Immutable state updates: Never mutate arrays/objects directly
- Progressive enhancement: localStorage → Firestore migration for auth users

## Appendix: Troubleshooting Common Issues

### Issue: "Module not found" errors

**Symptom:** `npm run dev` fails with `Cannot find module '@/components/...'`

**Resolution:**
```bash
# Clear build cache
rm -rf .next/
npm run dev
```

### Issue: "Neo4j connection timeout"

**Symptom:** `validate_env.py` fails with "Could not connect to Neo4j"

**Resolution:**
1. Check Neo4j Aura isn't paused (logs into console, resume database)
2. Verify `NEO4J_URI` in .env starts with `neo4j+s://`
3. Check firewall allows outbound connections to port 7687

### Issue: "Firestore permission denied"

**Symptom:** `validate_env.py` fails with "403 Forbidden"

**Resolution:**
```bash
# Re-authenticate with application default credentials
gcloud auth application-default login
```

### Issue: Tests fail with "localStorage is not defined"

**Symptom:** `npm test` fails on localStorage references

**Resolution:** This is expected in test environment. Tests should mock localStorage:
```javascript
global.localStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
};
```

If test doesn't mock, it's a bug. Ask team lead or fix it as first contribution.

### Issue: Port 3000 already in use

**Symptom:** `npm run dev` fails with "EADDRINUSE: address already in use"

**Resolution:**
```bash
# Find process using port 3000
lsof -ti:3000 | xargs kill -9

# Or use alternate port
PORT=3001 npm run dev
```

## Appendix: Recommended VS Code Extensions

Install these for optimal developer experience:

- **ESLint** (`dbaeumer.vscode-eslint`) - Linting
- **Prettier** (`esbenp.prettier-vscode`) - Code formatting
- **Tailwind CSS IntelliSense** (`bradlc.vscode-tailwindcss`) - Tailwind autocomplete
- **Python** (`ms-python.python`) - Python language support
- **Vitest** (`ZixuanChen.vitest-explorer`) - Test runner UI
- **GitLens** (`eamodio.gitlens`) - Git history and blame

Set VS Code to format on save:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

## Appendix: Team Communication Norms

- **Daily standup:** 9:30 AM PT in #dev-standups (async text updates)
- **PR reviews:** Tag @team-leads, expect review within 4 hours during business hours
- **Deployments:** Announce in #deployments before deploying to production
- **Incidents:** Use #incidents channel, tag @oncall
- **Budget alerts:** Monitored in #budget-alerts, 75%+ threshold requires immediate attention
- **Questions:** Ask in #dev-help, no question is too small

**PR norms:**
- Title format: `type(scope): description` (e.g., `feat(canvas): add flip layer transform`)
- Include "Fixes #123" in description to auto-close issues
- All tests must pass before merge
- Minimum 1 approval required (2 for infrastructure changes)
