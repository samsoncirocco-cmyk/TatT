# Directive: Monitor API Budget and Spending

**ID:** DIR-005
**Owner:** Platform Team
**Last Updated:** 2026-02-16
**Last Tested:** Not yet tested
**Risk Level:** Low
**Estimated Duration:** 5-10 minutes

## Purpose

Monitor and track API spending across Replicate, Vertex AI, and GCP services to ensure TatTester stays within the $500 bootstrap budget for Phase 1 MVP. This directive covers budget tracking, alert configuration, and cost projection.

Budget awareness is critical during the bootstrap phase. Runaway costs from uncapped API usage can exhaust the budget before MVP validation is complete.

## Prerequisites

- [ ] GCP Billing API enabled
- [ ] `GCP_PROJECT_ID` and `BILLING_ACCOUNT_ID` environment variables set
- [ ] Cloud Monitoring configured with budget alerts
- [ ] Python dependencies installed: `pip install -r execution/requirements.txt`
- [ ] Access to GCP Console Billing dashboard

## Procedure

### Step 1: Check Current Spend

```bash
cd execution/
python check_budget.py --period current-month
```

**Expected output:**
```
💰 Budget Report - February 2026

📊 Current Spend:
   ├─ Replicate API: $127.34 (25.5% of $500 budget)
   ├─ Vertex AI: $18.92 (3.8% of $500 budget)
   ├─ Cloud Run: $4.23 (0.8% of $500 budget)
   ├─ Cloud Storage: $1.12 (0.2% of $500 budget)
   ├─ Firestore: $2.87 (0.6% of $500 budget)
   └─ Neo4j Aura: $0.00 (free tier)

💵 Total: $154.48 / $500 (30.9%)
🟢 Status: Within budget

📈 Projection (7-day trend):
   - Daily avg: $7.21
   - Month-end estimate: $218.67
   - Runway: 48 days remaining

⚠️  Alerts:
   - None
```

**If spend > 75%:** Review top cost drivers and consider rate limiting or feature gating.

### Step 2: View Budget Alert History

```bash
python check_budget.py --alerts
```

**Expected output:**
```
🔔 Budget Alert History

📅 February 2026:
   ├─ 2026-02-12: 50% threshold crossed ($250.00)
   │  └─ Action: Team notified via Slack
   └─ 2026-02-14: 75% threshold crossed ($375.00)
      └─ Action: Emergency review, rate limits applied

📅 January 2026:
   └─ No alerts
```

**Look for:** Frequent alerts may indicate need for stricter rate limiting.

### Step 3: View Top Cost Drivers

```bash
python check_budget.py --top-services 10
```

**Expected output:**
```
💸 Top Cost Drivers (Current Month)

1. Replicate API - SDXL generations: $89.42 (17.9%)
2. Replicate API - Anime XL generations: $37.92 (7.6%)
3. Vertex AI - Text embeddings: $18.92 (3.8%)
4. Cloud Run - Compute time: $4.23 (0.8%)
5. Firestore - Document writes: $2.87 (0.6%)
6. Cloud Storage - Egress: $1.12 (0.2%)
7. Secret Manager - Access requests: $0.03 (0.0%)

💡 Optimization opportunities:
   - Replicate: Cache similar prompts to avoid duplicate generations
   - Vertex AI: Batch embedding requests to reduce per-request overhead
```

### Step 4: Check Alert Configuration

```bash
# Verify budget alerts are configured
gcloud billing budgets list --billing-account=[BILLING_ACCOUNT_ID]
```

**Expected output:**
```
BUDGET_ID               DISPLAY_NAME            AMOUNT    THRESHOLD_RULES
budget-1234             TatTester Phase 1 MVP   500 USD   [50, 75, 90, 100]
```

**If no budgets configured:** See Appendix: Configure Budget Alerts.

### Step 5: View Cloud Monitoring Dashboard

```bash
# Open billing dashboard in browser
gcloud monitoring dashboards list --filter="displayName:Billing" --format="value(name)" | head -1 | xargs -I {} gcloud monitoring dashboards describe {} --format="value(dashboardUrl)"
```

Or navigate manually:
1. Go to [GCP Console > Billing](https://console.cloud.google.com/billing)
2. Select project: TatTester
3. Click "Reports" tab
4. Filter: Service = "All", Time = "Last 30 days"

**Look for:** Sudden spikes in spend, which may indicate API abuse or rate limit bypass.

## Rollback

Budget monitoring is read-only. No rollback needed.

If alerts are firing incorrectly, update thresholds:

```bash
gcloud billing budgets update [BUDGET_ID] \
  --billing-account=[BILLING_ACCOUNT_ID] \
  --threshold-rule=percent=50 \
  --threshold-rule=percent=75 \
  --threshold-rule=percent=90
```

## Known Issues

No known issues yet. Update this section when issues are discovered during budget monitoring.

## Post-Operation

- [ ] Review spend against projections
- [ ] If spend > 50%, notify team and review top drivers
- [ ] If spend > 75%, consider emergency rate limiting
- [ ] If spend > 90%, halt non-essential API usage
- [ ] Update budget forecast for next month
- [ ] If any issues occurred, update this directive's "Known Issues" section

## Related Directives

- **DIR-001: Deploy** - Post-deployment budget impact should be monitored
- **DIR-003: Generate Embeddings** - Embedding generation is a top cost driver
- **DIR-006: Onboard Engineer** - New engineers should understand budget constraints

## Appendix: Budget Alert Thresholds

Recommended alert configuration:

| Threshold | Action | Owner | Notification |
|-----------|--------|-------|--------------|
| **50%** ($250) | Review top drivers, optimize if possible | Platform Team | Slack #budget-alerts |
| **75%** ($375) | Emergency review, apply rate limits | Tech Lead | Slack + Email |
| **90%** ($450) | Halt non-essential usage, plan budget increase | Founder | Slack + Email + SMS |
| **100%** ($500) | All API usage paused except health checks | Founder | Slack + Email + SMS |

## Appendix: Configure Budget Alerts

If alerts not yet configured:

```bash
# Create budget with email alerts
gcloud billing budgets create \
  --billing-account=[BILLING_ACCOUNT_ID] \
  --display-name="TatTester Phase 1 MVP" \
  --budget-amount=500USD \
  --threshold-rule=percent=50 \
  --threshold-rule=percent=75 \
  --threshold-rule=percent=90 \
  --threshold-rule=percent=100 \
  --notification-channels=[NOTIFICATION_CHANNEL_ID]
```

To create notification channel (Slack webhook):

```bash
# Create Slack notification channel
gcloud alpha monitoring channels create \
  --display-name="Budget Alerts - Slack" \
  --type=slack \
  --channel-labels=url=[SLACK_WEBHOOK_URL]
```

## Appendix: Cost Breakdown by Service

Typical Phase 1 cost distribution:

| Service | % of Budget | Monthly Cost | Per-Unit Cost | Volume |
|---------|-------------|--------------|---------------|--------|
| **Replicate API** | 70-80% | $350-400 | $0.01-0.02/image | 20,000-30,000 generations |
| **Vertex AI** | 10-15% | $50-75 | $0.025/1K embeddings | 2M-3M embeddings |
| **Cloud Run** | 3-5% | $15-25 | $0.00002400/vCPU-sec | ~400K vCPU-seconds |
| **Firestore** | 2-4% | $10-20 | $0.18/million reads | 50M-100M reads |
| **Cloud Storage** | 1-2% | $5-10 | $0.020/GB | 250-500GB stored |
| **Neo4j Aura** | 0% | $0 | Free tier | < 200K nodes |
| **Secret Manager** | <1% | $0.50-1 | $0.06/10K accesses | 10K-20K accesses |

**Note:** Percentages assume 20K-30K image generations per month. Lower usage shifts distribution toward fixed costs (Cloud Run, Firestore).

## Appendix: Emergency Rate Limiting

If budget alerts fire at 75%+ and spend must be reduced immediately:

```bash
# Reduce Replicate rate limit from 10/min to 2/min
# Edit server.js:
# const replicateRateLimiter = rateLimit({
#   windowMs: 60 * 1000,
#   max: 2,  // Changed from 10
# });

# Redeploy to Cloud Run
gcloud run deploy pangyo-production --image gcr.io/[PROJECT_ID]/pangyo:latest
```

**Impact:** Generation queue times increase 5x. Acceptable for budget preservation, but notify users of slower generations.
