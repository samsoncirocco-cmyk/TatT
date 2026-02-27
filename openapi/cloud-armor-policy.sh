#!/usr/bin/env bash
set -euo pipefail

# Cloud Armor WAF policy for TatTester API

PROJECT_ID="${1:-$(gcloud config get-value project 2>/dev/null)}"
if [[ -z "${PROJECT_ID}" ]]; then
  echo "PROJECT_ID is required (pass as first argument or set via gcloud config)."
  exit 1
fi

POLICY_NAME="tattester-waf"

echo "[Cloud Armor] Using project: ${PROJECT_ID}"

echo "[Cloud Armor] Creating policy: ${POLICY_NAME} (if missing)..."
gcloud compute security-policies create "${POLICY_NAME}" \
  --description="WAF for TatTester API" \
  --project "${PROJECT_ID}" 2>/dev/null || true

echo "[Cloud Armor] Adding XSS rule..."
gcloud compute security-policies rules create 1000 \
  --security-policy="${POLICY_NAME}" \
  --expression="evaluatePreconfiguredExpr('xss-stable')" \
  --action="deny-403" \
  --description="Deny XSS (preconfigured xss-stable)" \
  --project "${PROJECT_ID}" 2>/dev/null || true

echo "[Cloud Armor] Adding SQLi rule..."
gcloud compute security-policies rules create 1001 \
  --security-policy="${POLICY_NAME}" \
  --expression="evaluatePreconfiguredExpr('sqli-stable')" \
  --action="deny-403" \
  --description="Deny SQLi (preconfigured sqli-stable)" \
  --project "${PROJECT_ID}" 2>/dev/null || true

echo "[Cloud Armor] Adding IP rate limit rule..."
gcloud compute security-policies rules create 2000 \
  --security-policy="${POLICY_NAME}" \
  --expression="true" \
  --action="rate-based-ban" \
  --rate-limit-threshold-count=500 \
  --rate-limit-threshold-interval-sec=60 \
  --ban-duration-sec=600 \
  --conform-action="allow" \
  --exceed-action="deny-429" \
  --enforce-on-key="IP" \
  --description="Rate limit: 500 req/min per IP; ban 10m" \
  --project "${PROJECT_ID}" 2>/dev/null || true

echo "[Cloud Armor] Done. Policy: ${POLICY_NAME}"

