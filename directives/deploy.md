# Directive: Deploy to Cloud Run

**ID:** DIR-001
**Owner:** Platform Team
**Last Updated:** 2026-02-16
**Last Tested:** Not yet tested
**Risk Level:** High
**Estimated Duration:** 15-20 minutes

## Purpose

Deploy the TatTester application to Google Cloud Run (staging or production environment). This directive covers both automated deployment via GitHub Actions (preferred) and manual deployment via `gcloud` CLI (emergency fallback).

Cloud Run deployments create immutable revisions with traffic splitting capabilities, enabling zero-downtime updates and instant rollbacks.

## Prerequisites

- [ ] All tests passing in CI (for main branch deploys)
- [ ] Change approved in team communication channel
- [ ] Staging deployment validated and tested (for production deploys)
- [ ] Environment variables and secrets configured in Secret Manager
- [ ] GCP credentials available (Workload Identity for CI, `gcloud auth` for manual)

## Procedure

### Automated Deployment (Preferred)

**For staging:**
1. Push to `staging` branch or manually trigger workflow:
   ```bash
   gh workflow run ci-cd.yml -f environment=staging
   ```

2. Monitor deployment progress:
   ```bash
   gh run list --workflow=ci-cd.yml --limit 1
   gh run watch
   ```

3. Once complete, verify deployment:
   ```bash
   python execution/run_health_checks.py --base-url https://pangyo-staging-[hash]-uc.a.run.app
   ```

**For production:**
1. Merge approved PR to `main` branch (triggers automatic deployment)

2. Monitor deployment in GitHub Actions UI or CLI:
   ```bash
   gh run watch
   ```

3. Verify deployment health:
   ```bash
   python execution/run_health_checks.py --base-url https://pangyo-production-[hash]-uc.a.run.app
   ```

4. Monitor logs for first 5 minutes:
   ```bash
   gcloud run services logs read pangyo-production --limit 100 --region us-central1
   ```

### Manual Deployment (Emergency Fallback)

If GitHub Actions is unavailable:

1. Authenticate with GCP:
   ```bash
   gcloud auth login
   gcloud config set project [PROJECT_ID]
   ```

2. Build Docker image:
   ```bash
   gcloud builds submit --tag gcr.io/[PROJECT_ID]/pangyo:$(git rev-parse --short HEAD)
   ```

3. Deploy to Cloud Run:
   ```bash
   gcloud run deploy pangyo-production \
     --image gcr.io/[PROJECT_ID]/pangyo:$(git rev-parse --short HEAD) \
     --region us-central1 \
     --platform managed \
     --allow-unauthenticated \
     --set-env-vars NODE_ENV=production \
     --update-secrets REPLICATE_API_TOKEN=replicate-api-token:latest,NEO4J_PASSWORD=neo4j-password:latest,OPENROUTER_API_KEY=openrouter-api-key:latest
   ```

4. Verify with health checks:
   ```bash
   python execution/run_health_checks.py --base-url https://pangyo-production-[hash]-uc.a.run.app
   ```

## Verification

After deployment completes:

1. **Health endpoint check:**
   ```bash
   curl https://[SERVICE_URL]/api/health
   # Expected: {"status":"healthy","timestamp":"..."}
   ```

2. **Startup probe check:**
   ```bash
   curl https://[SERVICE_URL]/api/health/startup
   # Expected: {"status":"healthy","checks":[...]}
   ```

3. **Neo4j connectivity:**
   ```bash
   curl -X POST https://[SERVICE_URL]/api/neo4j/query \
     -H "Content-Type: application/json" \
     -d '{"query":"RETURN 1 AS num"}'
   # Expected: {"records":[{"num":1}]}
   ```

4. **Monitor error rate in Cloud Console:**
   - Navigate to Cloud Run > pangyo-[environment] > Logs
   - Filter: `severity>=ERROR`
   - Should see zero errors in first 5 minutes

## Rollback

If deployment causes issues:

### Quick Rollback (Traffic Split)

```bash
# Get previous revision name
gcloud run revisions list --service pangyo-production --region us-central1 --limit 5

# Route 100% traffic to previous revision
gcloud run services update-traffic pangyo-production \
  --to-revisions [PREVIOUS_REVISION]=100 \
  --region us-central1
```

### Full Rollback (Redeploy Previous Image)

```bash
# Find previous working image
gcloud container images list-tags gcr.io/[PROJECT_ID]/pangyo --limit 10

# Redeploy previous image
gcloud run deploy pangyo-production \
  --image gcr.io/[PROJECT_ID]/pangyo:[PREVIOUS_SHA] \
  --region us-central1
```

Rollback completes in < 30 seconds. Verify with health checks after rollback.

## Known Issues

### KI-001: Docker multi-stage Python venv portability between Debian and Alpine
**Discovered:** 2026-02-16 during Phase 6 Plan 03
**Symptom:** Python packages with C extensions (e.g., grpcio) compiled in python:3.12-slim (Debian) may segfault when copied to node:20-alpine (Alpine/musl)
**Root cause:** Debian uses glibc while Alpine uses musl libc. Native extensions compiled against glibc are not binary-compatible with musl.
**Resolution:** Current requirements.txt uses pure-Python packages or packages with pre-built musl wheels. If adding new Python dependencies with C extensions (numpy, grpcio, etc.), must either: (a) install from Alpine-compatible wheels, (b) compile in Alpine stage, or (c) add `apk add` for build dependencies in the runner stage.
**Prevention:** Before adding new Python dependencies to requirements.txt, check if they have C extensions. Test the Docker build end-to-end with `docker build .` locally before merging.

## Post-Operation

- [ ] Verify health checks pass
- [ ] Monitor error rates for 10 minutes post-deployment
- [ ] Update team communication channel with deployment results
- [ ] If any issues occurred, update this directive's "Known Issues" section
- [ ] If procedure deviated from documented steps, update this directive

## Related Directives

- **DIR-007: Rotate Secrets** - Update secrets before deploying with new credentials
- **DIR-006: Onboard Engineer** - New engineers should observe a deployment as part of onboarding
- **DIR-005: Monitor Budget** - Check budget impact after high-traffic deployments

## Appendix: Staging vs Production Differences

| Aspect | Staging | Production |
|--------|---------|------------|
| **Service name** | `pangyo-staging` | `pangyo-production` |
| **CPU/Memory** | 1 CPU / 1Gi | 2 CPU / 2Gi |
| **Max instances** | 3 | 10 |
| **Min instances** | 0 (scales to zero) | 1 (always warm) |
| **Ingress** | All | All (add Cloud Armor later) |
| **Secret versions** | `latest` | `latest` (rotate via DIR-007) |
| **Traffic pattern** | Internal team testing | Real users |
| **Deployment trigger** | Push to `staging` branch | Merge to `main` |
