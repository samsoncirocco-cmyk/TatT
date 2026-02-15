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

dotenv_get() {
  local key="$1"
  if [[ -f ".env.local" ]]; then
    # dotenv v17 can print a status line; keep output clean for use in gcloud flags.
    node -e "process.env.DOTENV_CONFIG_QUIET='true'; require('dotenv').config({ path: '.env.local' }); const v=(process.env['${key}']||'').trim(); process.stdout.write(v);" 2>/dev/null || true
  else
    echo -n ""
  fi
}

# NEXT_PUBLIC_* are required at build time for the client bundle.
NEXT_PUBLIC_FIREBASE_API_KEY="${NEXT_PUBLIC_FIREBASE_API_KEY:-$(dotenv_get NEXT_PUBLIC_FIREBASE_API_KEY)}"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="${NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:-$(dotenv_get NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN)}"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="${NEXT_PUBLIC_FIREBASE_PROJECT_ID:-$(dotenv_get NEXT_PUBLIC_FIREBASE_PROJECT_ID)}"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="${NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:-$(dotenv_get NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET)}"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="${NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:-$(dotenv_get NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID)}"
NEXT_PUBLIC_FIREBASE_APP_ID="${NEXT_PUBLIC_FIREBASE_APP_ID:-$(dotenv_get NEXT_PUBLIC_FIREBASE_APP_ID)}"

ALLOWED_ORIGINS="${ALLOWED_ORIGINS:-$(dotenv_get ALLOWED_ORIGINS)}"
if [[ -z "${ALLOWED_ORIGINS}" ]]; then
  # Default for local dev + Vercel previews. Keep in sync with src/middleware.ts.
  ALLOWED_ORIGINS="http://localhost:3000,http://localhost:3001,http://localhost:5173"
fi
ALLOWED_ORIGINS_ESCAPED="${ALLOWED_ORIGINS//,/\\,}"

if [[ -z "${NEXT_PUBLIC_FIREBASE_API_KEY}" || -z "${NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}" || -z "${NEXT_PUBLIC_FIREBASE_PROJECT_ID}" ]]; then
  cat <<'EOF'
Missing required Firebase public config for build.

Set these (either in your shell env or in .env.local) and re-run:
  NEXT_PUBLIC_FIREBASE_API_KEY
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
  NEXT_PUBLIC_FIREBASE_PROJECT_ID
EOF
  exit 1
fi

echo "[Cloud Run] Project: ${PROJECT_ID}"
echo "[Cloud Run] Region: ${REGION}"
echo "[Cloud Run] Building image: ${IMAGE_TAG}"
gcloud builds submit \
  --config cloudbuild.yaml \
  --substitutions _IMAGE="${IMAGE_TAG}",_NEXT_PUBLIC_FIREBASE_API_KEY="${NEXT_PUBLIC_FIREBASE_API_KEY}",_NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="${NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}",_NEXT_PUBLIC_FIREBASE_PROJECT_ID="${NEXT_PUBLIC_FIREBASE_PROJECT_ID}",_NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="${NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}",_NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="${NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID}",_NEXT_PUBLIC_FIREBASE_APP_ID="${NEXT_PUBLIC_FIREBASE_APP_ID}" \
  --project "${PROJECT_ID}"

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
  --set-env-vars NODE_ENV=production,ALLOWED_ORIGINS="${ALLOWED_ORIGINS_ESCAPED}" \
  --allow-unauthenticated \
  --project "${PROJECT_ID}"

URL="$(gcloud run services describe "${SERVICE_NAME}" --region "${REGION}" --format 'value(status.url)' --project "${PROJECT_ID}")"
echo "[Cloud Run] Service URL: ${URL}"
