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

`execution/check_budget.py` estimates **Replicate generation spend only** (by
counting generation events/design versions in Firestore and multiplying by
per-model pricing). It does not query GCP Billing directly and has no
`--period`, `--alerts`, or `--top-services` flags -- its real flags are
`--budget`, `--warn-threshold`, `--project-id`, and `--json`.

```bash
cd execution/
python3 check_budget.py --budget 500 --warn-threshold 0.75
```

**Expected output:**
```
=== Replicate API Budget Check ===

Total generations: 6234
Estimated spend: $154.48 / $500.00 (30.9%)
Remaining budget: $345.52

Breakdown by model:
  sdxl: 4471 gens × $0.020 = $89.42
  default: 1516 gens × $0.025 = $37.90
  flux: 247 gens × $0.030 = $7.41

✓ Spend is below 75% threshold
```

The script exits with status `1` when spend is at or above `--warn-threshold`
(useful for scripting/CI checks) and `0` otherwise. Pass `--json` for
machine-readable output, e.g. `python check_budget.py --json | jq .breakdown`.

**If spend > 75%:** Review the per-model breakdown above and consider rate
limiting or feature gating.

### Step 2: View Budget Alert History

There is no built-in alert-history feature -- `check_budget.py` only reports
the current estimated spend at the moment it's run. Budget *alerts*
(threshold-crossing notifications) are configured and tracked in GCP Billing,
not in this script. To see alert history, check the notification channel
configured below (Step 4) or the GCP Console Billing > Budgets & alerts page.

### Step 3: Vertex AI / Cloud Run / Firestore / Storage Spend

`check_budget.py` only covers Replicate spend. For actual spend across all
GCP services (Vertex AI, Cloud Run, Firestore, Cloud Storage, Secret
Manager), use GCP Billing directly -- there is no local script for this yet:

The `gcloud billing accounts describe` command only shows account metadata; it
does **not** report spend. Use the Reports tab in the GCP Console Billing
dashboard (Step 5 below) for a per-service breakdown, or query the project's
BigQuery billing export if one has been configured.

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

### Step 5: View Billing Reports

Cloud Monitoring dashboard records do not contain a browser `dashboardUrl`
field. Open the authoritative Billing Reports page directly:

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
  --threshold-rule=percent=0.50 \
  --threshold-rule=percent=0.75 \
  --threshold-rule=percent=0.90
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
  --threshold-rule=percent=0.50 \
  --threshold-rule=percent=0.75 \
  --threshold-rule=percent=0.90 \
  --threshold-rule=percent=1.0 \
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
# Reduce the Replicate rate limit (e.g. from 10/min to 2/min) in the
# rate-limit config used by the generation API routes (src/lib/rate-limit.ts)
```

**Vercel is the only active deploy target** (the legacy Railway/Express
proxy was retired 2026-07-20, and Cloud Run is dormant/manual-dispatch-only
in CI -- see `directives/deploy.md`). Redeploying to Cloud Run would **not**
affect the live site. To get this rate-limit change live immediately, follow
`directives/deploy.md`: commit the change, push to `main` (Vercel
auto-deploys), or run `vercel --prod` directly for an out-of-band emergency
deploy.

**Impact:** Generation queue times increase 5x. Acceptable for budget preservation, but notify users of slower generations.
