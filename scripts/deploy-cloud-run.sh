#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: bash scripts/deploy-cloud-run.sh [--project PROJECT_ID] [--region REGION]

Builds the Docker image with Cloud Build and deploys to Cloud Run.
Note: This script uses --allow-unauthenticated because API Gateway is expected to enforce auth.
EOF
}

PROJECT_ID="$(gcloud config get-value project 2>/dev/null || true)"
REGION="us-central1"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project)
      PROJECT_ID="${2:-}"
      shift 2
      ;;
    --region)
      REGION="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1"
      usage
      exit 1
      ;;
  esac
done

if [[ -z "${PROJECT_ID}" ]]; then
  echo "PROJECT_ID is required (pass --project or set via gcloud config)."
  exit 1
fi

SERVICE_NAME="tattester-api"
IMAGE_TAG="gcr.io/${PROJECT_ID}/tattester:latest"

echo "[Cloud Run] Project: ${PROJECT_ID}"
echo "[Cloud Run] Region: ${REGION}"
echo "[Cloud Run] Building image: ${IMAGE_TAG}"
gcloud builds submit --tag "${IMAGE_TAG}" --project "${PROJECT_ID}"

echo "[Cloud Run] Deploying service: ${SERVICE_NAME}"
gcloud run deploy "${SERVICE_NAME}" \
  --image "${IMAGE_TAG}" \
  --platform managed \
  --region "${REGION}" \
  --min-instances 1 \
  --max-instances 10 \
  --timeout 300 \
  --cpu 2 \
  --memory 1Gi \
  --concurrency 80 \
  --set-env-vars NODE_ENV=production \
  --allow-unauthenticated \
  --project "${PROJECT_ID}"

URL="$(gcloud run services describe "${SERVICE_NAME}" --region "${REGION}" --format 'value(status.url)' --project "${PROJECT_ID}")"
echo "[Cloud Run] Service URL: ${URL}"

