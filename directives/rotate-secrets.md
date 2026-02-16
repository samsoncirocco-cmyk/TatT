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

### Step 2: Update Staging Environment

```bash
# Deploy staging with new secret version
gcloud run services update pangyo-staging \
  --region us-central1 \
  --update-secrets [ENV_VAR_NAME]=[SECRET_NAME]:2

# Or via GitHub Actions:
gh workflow run ci-cd.yml -f environment=staging -f secret_version=2
```

**Staging auto-picks up new secret on next deployment.** No manual restart needed.

### Step 3: Test Staging with New Secret

```bash
# Run health checks against staging
python execution/run_health_checks.py --base-url https://pangyo-staging-[hash]-uc.a.run.app
```

**Expected output:**
```
✅ GET /api/health: 200 OK
✅ GET /api/health/startup: 200 OK
✅ POST /api/neo4j/query: 200 OK

✅ All health checks passed
```

**If health checks fail:** New secret is invalid. Rollback staging to old version (see Rollback section), verify new secret value, and retry.

**If health checks pass:** Proceed to production update.

### Step 4: Update Production Environment

```bash
# Deploy production with new secret version
gcloud run services update pangyo-production \
  --region us-central1 \
  --update-secrets [ENV_VAR_NAME]=[SECRET_NAME]:2

# Cloud Run performs rolling update (zero downtime)
```

**Expected output:**
```
✓ Deploying new service... Done.
  ✓ Creating Revision...
  ✓ Routing traffic...
Done.
Service [pangyo-production] revision [pangyo-production-00042-abc] has been deployed and is serving 100 percent of traffic.
```

### Step 5: Verify Production

```bash
# Test production health checks
python execution/run_health_checks.py --base-url https://pangyo-production-[hash]-uc.a.run.app

# Monitor logs for errors
gcloud run services logs read pangyo-production --limit 100 --region us-central1 | grep ERROR
```

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

If new secret causes issues:

```bash
# Revert to old secret version
gcloud run services update pangyo-production \
  --region us-central1 \
  --update-secrets [ENV_VAR_NAME]=[SECRET_NAME]:1

# Verify rollback
python execution/run_health_checks.py --base-url https://pangyo-production-[hash]-uc.a.run.app
```

Rollback completes in < 2 minutes.

### Late Rollback (After Old Version Disabled)

If old version already disabled:

```bash
# Re-enable old version
gcloud secrets versions enable 1 --secret [SECRET_NAME]

# Update service to use old version
gcloud run services update pangyo-production \
  --region us-central1 \
  --update-secrets [ENV_VAR_NAME]=[SECRET_NAME]:1
```

## Known Issues

No known issues yet. Update this section when issues are discovered during secret rotations.

## Post-Operation

- [ ] Staging tested and healthy with new secret
- [ ] Production deployed with new secret
- [ ] Health checks pass in production
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
**Used by:** Backend proxy (server.js)
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
**Used by:** AI Council prompt enhancement (councilService.js)
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
4. Deploy to all environments (staging, production)
5. Verify health checks pass
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
