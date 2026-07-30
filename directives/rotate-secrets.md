# Directive: Rotate Secrets in Secret Manager

**ID:** DIR-007
**Owner:** Security / Platform Team
**Last Updated:** 2026-02-16
**Last Tested:** Not yet tested
**Risk Level:** High
**Estimated Duration:** 20-30 minutes per secret

## Purpose

Rotate API keys, passwords, and other secrets stored in Google Cloud Secret Manager. Secret rotation is a security best practice that limits the blast radius of compromised credentials and ensures compliance with zero-trust principles.

This directive covers rotation of all secrets used by TatTester, including Replicate API tokens, Neo4j passwords, Firebase private keys, and OpenRouter API keys.

> **Deploy architecture note (2026-07-20):** Vercel is the only user-facing deploy target for this app; see `directives/deploy.md`. The `pangyo-staging` / `pangyo-production` Cloud Run services referenced below are **dormant** — their GitHub Actions deploy jobs are `workflow_dispatch`-only (see `.github/workflows/ci-cd.yml`) and nothing routes real traffic to them. Updating a secret on those Cloud Run services does **not** update the live production site. For any secret consumed by the live site, the value must also be updated as a Vercel environment variable (Vercel dashboard or `vercel env`) and a new deployment triggered — that is the step that actually matters for production.

## Prerequisites

- [ ] New secret value obtained (new API key generated, password reset, etc.)
- [ ] Access to Secret Manager with `secretmanager.admin` role
- [ ] Staging environment available for testing rotated secrets
- [ ] Communication sent to team about planned rotation (if causing downtime)
- [ ] Backup of current secret version taken (automatic in Secret Manager)

## Procedure

### General Rotation Process

All secrets follow this process. Specific secrets covered in Appendix.

### Step 1: Create New Secret Version

```bash
# Add new version to existing secret
echo -n "[NEW_SECRET_VALUE]" | gcloud secrets versions add [SECRET_NAME] --data-file=-

# Verify new version created
gcloud secrets versions list [SECRET_NAME]
```

**Expected output:**
```
NAME  STATE    CREATED
2     enabled  2026-02-16T10:30:00Z
1     enabled  2026-02-10T08:15:00Z
```

**Note:** Old version (1) remains enabled during transition. This allows rollback if new version has issues.

### Step 2 (optional): Update Dormant Cloud Run Staging Service

**This step only affects the dormant `pangyo-staging` Cloud Run service — it is not user-facing and is not the real staging surface.** (Real pre-prod validation for this app is a Vercel preview deployment; see `directives/deploy.md`.) Skip this step entirely unless you specifically need to keep the dormant Cloud Run services in sync with the new secret value.

```bash
# Dormant service only — does not affect the live site
gcloud run services update pangyo-staging \
  --region us-central1 \
  --update-secrets [ENV_VAR_NAME]=[SECRET_NAME]:2

# Or via GitHub Actions (manual dispatch only — see .github/workflows/ci-cd.yml):
gh workflow run ci-cd.yml -f environment=staging -f secret_version=2
```

### Step 3 (optional): Sanity-Check the Dormant Cloud Run Service

```bash
# Run health checks against the dormant staging service, if Step 2 was performed
python execution/run_health_checks.py --base-url https://pangyo-staging-[hash]-uc.a.run.app
```

**Expected output:**
```
✅ GET /api/health: 200 OK
✅ GET /api/health/startup: 200 OK
✅ POST /api/neo4j/query: 200 OK

✅ All health checks passed
```

**This only validates the dormant Cloud Run service.** Passing or failing here says nothing about the live Vercel production site — proceed to Step 4 regardless once the new secret value itself has been confirmed correct.

### Step 4: Update Vercel Production Environment

**This is the step that actually updates the live, user-facing production site.**

```bash
# Remove the old value and add the new one (or edit it in the Vercel dashboard:
# Project Settings -> Environment Variables)
vercel env rm [ENV_VAR_NAME] production
vercel env add [ENV_VAR_NAME] production
# (paste the new secret value when prompted)

# Redeploy so the new environment variable takes effect
vercel --prod
```

**Note:** Changing a Vercel environment variable does not by itself update a running deployment — a new deployment (`vercel --prod`, or a push to `main` if Git integration is configured) is required to pick it up.

### Step 5: Verify Production

```bash
# Confirm the new deployment is live
vercel ls

# Tail logs for errors on the new deployment
vercel logs https://tatt-app.vercel.app
```

Also open `https://tatt-app.vercel.app` and exercise the feature that depends on the rotated secret (e.g. generate a design, run artist matching, hit the affected API route directly).

**Monitor for 10 minutes.** Look for:
- Authentication errors (indicates secret not working)
- Connection failures (indicates wrong credentials)
- Rate limit errors (indicates wrong API key)

**If errors occur:** Rollback immediately (see Rollback section).

### Step 6: Disable Old Secret Version (After Grace Period)

**Wait 24 hours** before disabling old version. This grace period allows:
- Detection of delayed failures
- Rollback if issues discovered during high-traffic periods
- Verification across all services/environments

After 24 hours:

```bash
# Disable old version
gcloud secrets versions disable 1 --secret [SECRET_NAME]

# Verify only new version enabled
gcloud secrets versions list [SECRET_NAME]
```

**Expected output:**
```
NAME  STATE     CREATED
2     enabled   2026-02-16T10:30:00Z
1     disabled  2026-02-10T08:15:00Z
```

**Old version is retained but disabled.** Can be re-enabled if needed for emergency rollback.

## Rollback

### Immediate Rollback (Within 24 Hours)

If the new secret causes issues on the live site:

```bash
# Revert the Vercel production environment variable to the old value
vercel env rm [ENV_VAR_NAME] production
vercel env add [ENV_VAR_NAME] production
# (paste the old secret value when prompted)

# Redeploy to pick up the reverted value
vercel --prod

# Alternative: roll back to the previous deployment directly
vercel rollback <previous-deployment-url>

# Verify
vercel logs https://tatt-app.vercel.app
```

Rollback completes in a few minutes (deployment build time).

If Step 2 was also performed against the dormant `pangyo-staging`/`pangyo-production` Cloud Run services, revert those too for consistency (does not affect the live site):

```bash
gcloud run services update pangyo-production \
  --region us-central1 \
  --update-secrets [ENV_VAR_NAME]=[SECRET_NAME]:1
```

### Late Rollback (After Old Version Disabled)

If old version already disabled:

```bash
# Re-enable old version
gcloud secrets versions enable 1 --secret [SECRET_NAME]
```

Then repeat the Vercel revert steps above with the re-enabled old value.

## Known Issues

No known issues yet. Update this section when issues are discovered during secret rotations.

## Post-Operation

- [ ] New secret value confirmed valid (dormant Cloud Run sanity check, if performed)
- [ ] Vercel production environment variable updated with new secret value
- [ ] New Vercel deployment triggered (`vercel --prod` or push to `main`) and live
- [ ] Production functionality verified on `https://tatt-app.vercel.app`
- [ ] Logs monitored for 10 minutes, no errors
- [ ] Old secret version disabled (after 24-hour grace period)
- [ ] Rotation documented in #security-changelog
- [ ] If any issues occurred, update this directive's "Known Issues" section

## Related Directives

- **DIR-001: Deploy** - Secret rotation often paired with deployments
- **DIR-006: Onboard Engineer** - New engineers need access to current secrets in 1Password

## Appendix: Secrets Inventory

All secrets managed in GCP Secret Manager:

### 1. Replicate API Token

**Secret name:** `replicate-api-token`
**Env var:** `REPLICATE_API_TOKEN`
**Used by:** Next.js API routes (`src/app/api/`)
**How to rotate:**
1. Generate new token at https://replicate.com/account/api-tokens
2. Add new version: `echo -n "[TOKEN]" | gcloud secrets versions add replicate-api-token --data-file=-`
3. Follow general rotation process above

**Grace period:** 7 days (Replicate doesn't invalidate old tokens immediately)

### 2. Neo4j Password

**Secret name:** `neo4j-password`
**Env var:** `NEO4J_PASSWORD`
**Used by:** Backend Neo4j queries, Python seed scripts
**How to rotate:**
1. Log into Neo4j Aura console
2. Navigate to database → Security → Reset password
3. Copy new password
4. Add new version: `echo -n "[PASSWORD]" | gcloud secrets versions add neo4j-password --data-file=-`
5. Follow general rotation process above

**Caution:** Neo4j password change is immediate. Old password stops working instantly. Minimize time between steps 2 and 4.

### 3. Firebase Private Key

**Secret name:** `firebase-private-key`
**Env var:** `FIREBASE_PRIVATE_KEY` (JSON string)
**Used by:** Backend Firestore Admin SDK
**How to rotate:**
1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Download JSON file
4. Add new version: `cat firebase-key.json | gcloud secrets versions add firebase-private-key --data-file=-`
5. Follow general rotation process above
6. Delete downloaded JSON file securely: `shred -u firebase-key.json`

**Grace period:** 30 days (old service account keys remain valid)

### 4. OpenRouter API Key

**Secret name:** `openrouter-api-key`
**Env var:** `OPENROUTER_API_KEY`
**Used by:** AI Council prompt enhancement (`src/services/council/internal/councilService.ts`)
**How to rotate:**
1. Log into OpenRouter dashboard
2. API Keys → Create new key
3. Copy key (shown only once)
4. Add new version: `echo -n "[KEY]" | gcloud secrets versions add openrouter-api-key --data-file=-`
5. Follow general rotation process above
6. Revoke old key in dashboard (after 24-hour grace period)

**Grace period:** Unlimited until old key manually revoked

## Appendix: Rotation Schedule

Recommended rotation frequency:

| Secret | Rotation Frequency | Trigger Events |
|--------|-------------------|----------------|
| **Replicate API Token** | Every 90 days | Or immediately if: exposed in logs/commits, employee offboarding |
| **Neo4j Password** | Every 180 days | Or immediately if: exposed, suspected compromise, admin access granted to contractor |
| **Firebase Private Key** | Every 365 days | Or immediately if: key downloaded to insecure location, employee offboarding |
| **OpenRouter API Key** | Every 90 days | Or immediately if: exposed, unusual usage detected |

**Emergency rotation:** If any secret is exposed publicly (e.g., committed to git, pasted in Slack, leaked in logs), rotate **immediately** (within 1 hour).

## Appendix: Automated Rotation (Future Enhancement)

Secret Manager supports automatic rotation via Cloud Functions:

```javascript
// functions/rotate-secrets/index.js
// Triggered by Cloud Scheduler every 90 days

exports.rotateReplicateToken = async (req, res) => {
  // 1. Generate new Replicate token via API
  // 2. Add new version to Secret Manager
  // 3. Deploy staging with new version
  // 4. Run health checks
  // 5. Deploy production if healthy
  // 6. Disable old version after 24h
};
```

**Not implemented in Phase 1.** Manual rotation is sufficient for MVP. Consider automation in Phase 6+ when rotation becomes frequent burden.

## Appendix: Secret Exposure Response

If a secret is accidentally exposed:

**Immediate actions (within 1 hour):**
1. Revoke/disable exposed secret in provider dashboard
2. Generate new secret
3. Add new secret version to Secret Manager
4. Update the Vercel production environment variable and redeploy (`vercel --prod`) — this is what actually protects the live site (see Step 4 above); also update the dormant Cloud Run services if they're being kept in sync
5. Verify production functionality on `https://tatt-app.vercel.app`
6. Notify team in #security-incidents

**Follow-up actions (within 24 hours):**
1. Review access logs for unauthorized usage of exposed secret
2. Update .gitignore or other safeguards to prevent re-exposure
3. Document incident in Known Issues section of this directive
4. If exposure was in git commit, use BFG Repo-Cleaner or git-filter-repo to scrub history

**Example git history scrubbing:**
```bash
# Install BFG Repo-Cleaner
brew install bfg

# Remove all instances of exposed secret from git history
bfg --replace-text <(echo "r8_exposed_token==>REDACTED") --no-blob-protection .git

# Force push cleaned history
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force
```

**Caution:** Force-pushing rewrites history. Notify all collaborators to re-clone repository.
