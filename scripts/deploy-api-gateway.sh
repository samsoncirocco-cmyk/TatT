#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: bash scripts/deploy-api-gateway.sh [--project PROJECT_ID] [--region REGION]

Resolves placeholders in openapi/api-spec.yaml and deploys an API Gateway config + gateway.
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

API_NAME="tattester-api"
GATEWAY_NAME="tattester-gateway"
SERVICE_NAME="tattester-api"

echo "[API Gateway] Project: ${PROJECT_ID}"
echo "[API Gateway] Region: ${REGION}"

CLOUD_RUN_URL="$(gcloud run services describe "${SERVICE_NAME}" --region "${REGION}" --format 'value(status.url)' --project "${PROJECT_ID}")"
if [[ -z "${CLOUD_RUN_URL}" ]]; then
  echo "Cloud Run URL not found. Deploy Cloud Run first (scripts/deploy-cloud-run.sh)."
  exit 1
fi
echo "[API Gateway] Cloud Run URL: ${CLOUD_RUN_URL}"

TMP_SPEC="$(mktemp -t tattester-openapi.XXXXXX.yaml)"
trap 'rm -f "${TMP_SPEC}"' EXIT

sed "s|https://tattester-api-HASH-uc.a.run.app|${CLOUD_RUN_URL}|g; s|PROJECT_ID|${PROJECT_ID}|g" \
  openapi/api-spec.yaml > "${TMP_SPEC}"

echo "[API Gateway] Ensuring API exists: ${API_NAME}"
gcloud api-gateway apis create "${API_NAME}" --project "${PROJECT_ID}" 2>/dev/null || true

CONFIG_NAME="tattester-config-$(date +%Y%m%d%H%M)"
echo "[API Gateway] Creating API config: ${CONFIG_NAME}"
gcloud api-gateway api-configs create "${CONFIG_NAME}" \
  --api="${API_NAME}" \
  --openapi-spec="${TMP_SPEC}" \
  --project="${PROJECT_ID}"

if gcloud api-gateway gateways describe "${GATEWAY_NAME}" --location="${REGION}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
  echo "[API Gateway] Updating gateway: ${GATEWAY_NAME}"
  gcloud api-gateway gateways update "${GATEWAY_NAME}" \
    --api="${API_NAME}" \
    --api-config="${CONFIG_NAME}" \
    --location="${REGION}" \
    --project="${PROJECT_ID}"
else
  echo "[API Gateway] Creating gateway: ${GATEWAY_NAME}"
  gcloud api-gateway gateways create "${GATEWAY_NAME}" \
    --api="${API_NAME}" \
    --api-config="${CONFIG_NAME}" \
    --location="${REGION}" \
    --project="${PROJECT_ID}"
fi

GW_URL="$(gcloud api-gateway gateways describe "${GATEWAY_NAME}" --location="${REGION}" --format 'value(defaultHostname)' --project "${PROJECT_ID}")"
echo "[API Gateway] Gateway hostname: ${GW_URL}"

