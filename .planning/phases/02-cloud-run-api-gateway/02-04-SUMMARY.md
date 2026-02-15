# Phase 2 Plan 04 Summary (Deploy Scripts)

## Changes
- Added Cloud Run deploy script:
  - `scripts/deploy-cloud-run.sh` (Cloud Build image, Cloud Run deploy with `min-instances=1`, prints service URL)
- Added API Gateway deploy script:
  - `scripts/deploy-api-gateway.sh` (resolves placeholders in `openapi/api-spec.yaml`, creates API config, creates/updates gateway)

## Verification
- `bash -n` passes for:
  - `openapi/cloud-armor-policy.sh`
  - `scripts/deploy-cloud-run.sh`
  - `scripts/deploy-api-gateway.sh`

## Pending (Human Verify)
- Actual GCP deployment and end-to-end routing via API Gateway (requires `gcloud` auth + enabled APIs).

