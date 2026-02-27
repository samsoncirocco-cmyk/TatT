#!/usr/bin/env bash
set -euo pipefail

# Setup BigQuery dataset and Cloud Logging sink for TatTester API event logs
# Idempotent: safe to run multiple times

PROJECT_ID="${GCP_PROJECT_ID:?GCP_PROJECT_ID must be set}"
DATASET="api_events"
SINK_NAME="api-events-sink"
LOCATION="us-central1"

echo "Setting up BigQuery sink for TatTester API events"
echo "  Project: $PROJECT_ID"
echo "  Dataset: $DATASET"
echo "  Location: $LOCATION"

# Create BigQuery dataset (idempotent)
echo ""
echo "Creating BigQuery dataset..."
bq mk --dataset \
  --location="$LOCATION" \
  --description="TatTester API event logs for analytics" \
  --default_table_expiration=7776000 \
  "$PROJECT_ID:$DATASET" 2>/dev/null && echo "✓ Dataset created" || echo "✓ Dataset already exists"

# Create log sink routing structured events to BigQuery
# Filter matches all event_type fields from instrumented API routes
echo ""
echo "Creating Cloud Logging sink..."
if gcloud logging sinks create "$SINK_NAME" \
  "bigquery.googleapis.com/projects/$PROJECT_ID/datasets/$DATASET" \
  --project="$PROJECT_ID" \
  --log-filter='jsonPayload.event_type=~"^(generation|match|council|embeddings|budget)\."' \
  --description="Routes API events to BigQuery for analytics" \
  2>/dev/null; then
  echo "✓ Sink created"
else
  echo "✓ Sink already exists, updating filter..."
  gcloud logging sinks update "$SINK_NAME" \
    "bigquery.googleapis.com/projects/$PROJECT_ID/datasets/$DATASET" \
    --project="$PROJECT_ID" \
    --log-filter='jsonPayload.event_type=~"^(generation|match|council|embeddings|budget)\."'
fi

# Grant sink writer identity BigQuery Data Editor permission
echo ""
echo "Configuring sink permissions..."
WRITER_IDENTITY=$(gcloud logging sinks describe "$SINK_NAME" --project="$PROJECT_ID" --format='value(writerIdentity)')

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="$WRITER_IDENTITY" \
  --role="roles/bigquery.dataEditor" \
  --condition=None \
  --quiet

echo ""
echo "✓ BigQuery sink setup complete!"
echo ""
echo "  Dataset: $PROJECT_ID:$DATASET"
echo "  Sink: $SINK_NAME"
echo "  Writer: $WRITER_IDENTITY"
echo ""
echo "Logs matching the filter will appear in BigQuery within 1-2 minutes."
echo "Cloud Logging will auto-create tables as logs arrive."
