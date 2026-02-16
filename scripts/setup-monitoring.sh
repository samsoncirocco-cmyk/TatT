#!/usr/bin/env bash
set -euo pipefail

# Setup Cloud Monitoring: log-based metrics, budget alerts, and dashboard
# Idempotent: safe to run multiple times

PROJECT_ID="${GCP_PROJECT_ID:?GCP_PROJECT_ID must be set}"
ALERT_EMAIL="${ALERT_EMAIL:?ALERT_EMAIL must be set}"

echo "Setting up Cloud Monitoring for TatTester"
echo "  Project: $PROJECT_ID"
echo "  Alert email: $ALERT_EMAIL"

# Create log-based counter metrics
echo ""
echo "Creating log-based metrics..."

# API errors counter
if gcloud logging metrics create api_errors \
  --project="$PROJECT_ID" \
  --description="Count of API failures" \
  --log-filter='severity="ERROR" AND jsonPayload.event_type=~".*\.failed"' \
  2>/dev/null; then
  echo "✓ api_errors metric created"
else
  echo "✓ api_errors metric already exists"
fi

# Generation count counter
if gcloud logging metrics create generation_count \
  --project="$PROJECT_ID" \
  --description="Count of completed image generations" \
  --log-filter='jsonPayload.event_type="generation.completed"' \
  2>/dev/null; then
  echo "✓ generation_count metric created"
else
  echo "✓ generation_count metric already exists"
fi

# Budget limit reached counter
if gcloud logging metrics create budget_limit_reached \
  --project="$PROJECT_ID" \
  --description="Count of budget limit hits" \
  --log-filter='jsonPayload.event_type="budget.limit_reached"' \
  2>/dev/null; then
  echo "✓ budget_limit_reached metric created"
else
  echo "✓ budget_limit_reached metric already exists"
fi

# API latency distribution metric
if gcloud logging metrics create api_latency_ms \
  --project="$PROJECT_ID" \
  --description="API request latency distribution" \
  --log-filter='jsonPayload.event_type=~".*\.completed" AND jsonPayload.duration_ms>0' \
  --value-extractor='EXTRACT(jsonPayload.duration_ms)' \
  2>/dev/null; then
  echo "✓ api_latency_ms metric created"
else
  echo "✓ api_latency_ms metric already exists"
fi

# Create notification channel (email)
echo ""
echo "Creating notification channel..."

CHANNEL_JSON=$(cat <<EOF
{
  "type": "email",
  "displayName": "TatTester Budget Alerts",
  "labels": {
    "email_address": "$ALERT_EMAIL"
  },
  "enabled": true
}
EOF
)

# Check if channel already exists
EXISTING_CHANNEL=$(gcloud beta monitoring channels list \
  --project="$PROJECT_ID" \
  --filter="type=email AND labels.email_address=$ALERT_EMAIL" \
  --format="value(name)" \
  --limit=1)

if [ -n "$EXISTING_CHANNEL" ]; then
  CHANNEL_NAME="$EXISTING_CHANNEL"
  echo "✓ Using existing email channel: $CHANNEL_NAME"
else
  CHANNEL_NAME=$(gcloud beta monitoring channels create \
    --project="$PROJECT_ID" \
    --channel-content="$CHANNEL_JSON" \
    --format="value(name)")
  echo "✓ Email notification channel created: $CHANNEL_NAME"
fi

# Create budget alert policies
echo ""
echo "Creating budget alert policies..."

# Budget 50% alert
POLICY_50_JSON=$(cat <<EOF
{
  "displayName": "Budget 50% - Replicate Spend",
  "conditions": [{
    "displayName": "Budget spent >= \$250",
    "conditionThreshold": {
      "filter": "resource.type=\"global\" AND metric.type=\"custom.googleapis.com/budget/spent_cents\"",
      "comparison": "COMPARISON_GT",
      "thresholdValue": 25000,
      "duration": "60s",
      "aggregations": [{
        "alignmentPeriod": "60s",
        "perSeriesAligner": "ALIGN_MAX"
      }]
    }
  }],
  "notificationChannels": ["$CHANNEL_NAME"],
  "alertStrategy": {
    "autoClose": "86400s"
  },
  "combiner": "OR"
}
EOF
)

if gcloud alpha monitoring policies create \
  --project="$PROJECT_ID" \
  --policy-from-file=<(echo "$POLICY_50_JSON") \
  2>/dev/null; then
  echo "✓ Budget 50% alert created"
else
  echo "✓ Budget 50% alert already exists"
fi

# Budget 75% alert
POLICY_75_JSON=$(cat <<EOF
{
  "displayName": "Budget 75% - Replicate Spend",
  "conditions": [{
    "displayName": "Budget spent >= \$375",
    "conditionThreshold": {
      "filter": "resource.type=\"global\" AND metric.type=\"custom.googleapis.com/budget/spent_cents\"",
      "comparison": "COMPARISON_GT",
      "thresholdValue": 37500,
      "duration": "60s",
      "aggregations": [{
        "alignmentPeriod": "60s",
        "perSeriesAligner": "ALIGN_MAX"
      }]
    }
  }],
  "notificationChannels": ["$CHANNEL_NAME"],
  "alertStrategy": {
    "autoClose": "86400s"
  },
  "combiner": "OR"
}
EOF
)

if gcloud alpha monitoring policies create \
  --project="$PROJECT_ID" \
  --policy-from-file=<(echo "$POLICY_75_JSON") \
  2>/dev/null; then
  echo "✓ Budget 75% alert created"
else
  echo "✓ Budget 75% alert already exists"
fi

# Budget 90% alert
POLICY_90_JSON=$(cat <<EOF
{
  "displayName": "Budget 90% - Replicate Spend",
  "conditions": [{
    "displayName": "Budget spent >= \$450",
    "conditionThreshold": {
      "filter": "resource.type=\"global\" AND metric.type=\"custom.googleapis.com/budget/spent_cents\"",
      "comparison": "COMPARISON_GT",
      "thresholdValue": 45000,
      "duration": "60s",
      "aggregations": [{
        "alignmentPeriod": "60s",
        "perSeriesAligner": "ALIGN_MAX"
      }]
    }
  }],
  "notificationChannels": ["$CHANNEL_NAME"],
  "alertStrategy": {
    "autoClose": "86400s"
  },
  "combiner": "OR"
}
EOF
)

if gcloud alpha monitoring policies create \
  --project="$PROJECT_ID" \
  --policy-from-file=<(echo "$POLICY_90_JSON") \
  2>/dev/null; then
  echo "✓ Budget 90% alert created"
else
  echo "✓ Budget 90% alert already exists"
fi

# Create monitoring dashboard
echo ""
echo "Creating monitoring dashboard..."

DASHBOARD_JSON=$(cat <<'EOF'
{
  "displayName": "TatTester API Metrics",
  "mosaicLayout": {
    "columns": 12,
    "tiles": [
      {
        "width": 6,
        "height": 4,
        "widget": {
          "title": "API Error Rate",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "metric.type=\"logging.googleapis.com/user/api_errors\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_RATE"
                  }
                }
              }
            }],
            "timeshiftDuration": "0s",
            "yAxis": {
              "label": "Errors per second",
              "scale": "LINEAR"
            }
          }
        }
      },
      {
        "xPos": 6,
        "width": 6,
        "height": 4,
        "widget": {
          "title": "API Latency (Percentiles)",
          "xyChart": {
            "dataSets": [
              {
                "timeSeriesQuery": {
                  "timeSeriesFilter": {
                    "filter": "metric.type=\"logging.googleapis.com/user/api_latency_ms\"",
                    "aggregation": {
                      "alignmentPeriod": "60s",
                      "perSeriesAligner": "ALIGN_DELTA",
                      "crossSeriesReducer": "REDUCE_PERCENTILE_50"
                    }
                  }
                },
                "plotType": "LINE",
                "legendTemplate": "p50"
              },
              {
                "timeSeriesQuery": {
                  "timeSeriesFilter": {
                    "filter": "metric.type=\"logging.googleapis.com/user/api_latency_ms\"",
                    "aggregation": {
                      "alignmentPeriod": "60s",
                      "perSeriesAligner": "ALIGN_DELTA",
                      "crossSeriesReducer": "REDUCE_PERCENTILE_95"
                    }
                  }
                },
                "plotType": "LINE",
                "legendTemplate": "p95"
              },
              {
                "timeSeriesQuery": {
                  "timeSeriesFilter": {
                    "filter": "metric.type=\"logging.googleapis.com/user/api_latency_ms\"",
                    "aggregation": {
                      "alignmentPeriod": "60s",
                      "perSeriesAligner": "ALIGN_DELTA",
                      "crossSeriesReducer": "REDUCE_PERCENTILE_99"
                    }
                  }
                },
                "plotType": "LINE",
                "legendTemplate": "p99"
              }
            ],
            "timeshiftDuration": "0s",
            "yAxis": {
              "label": "Milliseconds",
              "scale": "LINEAR"
            }
          }
        }
      },
      {
        "yPos": 4,
        "width": 4,
        "height": 4,
        "widget": {
          "title": "Budget Spend (50% threshold)",
          "scorecard": {
            "timeSeriesQuery": {
              "timeSeriesFilter": {
                "filter": "metric.type=\"custom.googleapis.com/budget/spent_cents\"",
                "aggregation": {
                  "alignmentPeriod": "60s",
                  "perSeriesAligner": "ALIGN_MAX"
                }
              }
            },
            "sparkChartView": {
              "sparkChartType": "SPARK_LINE"
            },
            "thresholds": [
              { "value": 25000, "color": "YELLOW", "direction": "ABOVE" }
            ]
          }
        }
      },
      {
        "xPos": 4,
        "yPos": 4,
        "width": 4,
        "height": 4,
        "widget": {
          "title": "Budget Spend (75% threshold)",
          "scorecard": {
            "timeSeriesQuery": {
              "timeSeriesFilter": {
                "filter": "metric.type=\"custom.googleapis.com/budget/spent_cents\"",
                "aggregation": {
                  "alignmentPeriod": "60s",
                  "perSeriesAligner": "ALIGN_MAX"
                }
              }
            },
            "sparkChartView": {
              "sparkChartType": "SPARK_LINE"
            },
            "thresholds": [
              { "value": 37500, "color": "ORANGE", "direction": "ABOVE" }
            ]
          }
        }
      },
      {
        "xPos": 8,
        "yPos": 4,
        "width": 4,
        "height": 4,
        "widget": {
          "title": "Budget Spend (90% threshold)",
          "scorecard": {
            "timeSeriesQuery": {
              "timeSeriesFilter": {
                "filter": "metric.type=\"custom.googleapis.com/budget/spent_cents\"",
                "aggregation": {
                  "alignmentPeriod": "60s",
                  "perSeriesAligner": "ALIGN_MAX"
                }
              }
            },
            "sparkChartView": {
              "sparkChartType": "SPARK_LINE"
            },
            "thresholds": [
              { "value": 45000, "color": "RED", "direction": "ABOVE" }
            ]
          }
        }
      }
    ]
  }
}
EOF
)

# Check if dashboard already exists
EXISTING_DASHBOARD=$(gcloud monitoring dashboards list \
  --project="$PROJECT_ID" \
  --filter="displayName='TatTester API Metrics'" \
  --format="value(name)" \
  --limit=1)

if [ -n "$EXISTING_DASHBOARD" ]; then
  echo "✓ Dashboard already exists: $EXISTING_DASHBOARD"
  echo "  To update, delete and re-run: gcloud monitoring dashboards delete $EXISTING_DASHBOARD"
else
  DASHBOARD_NAME=$(gcloud monitoring dashboards create \
    --project="$PROJECT_ID" \
    --config-from-file=<(echo "$DASHBOARD_JSON") \
    --format="value(name)")
  echo "✓ Dashboard created: $DASHBOARD_NAME"
fi

echo ""
echo "✓ Cloud Monitoring setup complete!"
echo ""
echo "Next steps:"
echo "  1. View dashboard: https://console.cloud.google.com/monitoring/dashboards"
echo "  2. Set up weekly match quality report: See scripts/sql/weekly-match-quality.sql"
echo "  3. Create scheduled query in BigQuery Console to run the SQL weekly"
