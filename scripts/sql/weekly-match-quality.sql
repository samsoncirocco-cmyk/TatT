-- Weekly Match Quality Report
--
-- Analyzes which matches users engage with most, grouped by matching sources.
-- Measures engagement funnel: view → click → contact artist.
--
-- Setup as Scheduled Query in BigQuery Console:
--   1. Go to BigQuery Console → Scheduled queries → Create scheduled query
--   2. Paste this SQL
--   3. Schedule: Every Monday at 9:00 AM
--   4. Destination table: api_events.match_quality_weekly (overwrite)
--   5. Enable email notifications for query failures
--
-- Query analyzes logs from Cloud Logging sink (see setup-bigquery-sink.sh)

CREATE OR REPLACE TABLE api_events.match_quality_weekly AS
WITH engagement_events AS (
  SELECT
    jsonPayload.user_id AS user_id,
    jsonPayload.artist_id AS artist_id,
    jsonPayload.match_id AS match_id,
    jsonPayload.match_score AS match_score,
    jsonPayload.action AS action,
    jsonPayload.rank_position AS rank_position,
    ARRAY_TO_STRING(jsonPayload.sources, ',') AS sources,
    timestamp
  FROM `PROJECT_ID.api_events.match_events_*`  -- Replace PROJECT_ID with your GCP project
  WHERE DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
    AND jsonPayload.event_type = 'match.engagement'
)
SELECT
  DATE_TRUNC(CURRENT_DATE(), WEEK) AS report_week,
  sources,
  COUNT(DISTINCT match_id) AS total_matches,
  COUNTIF(action = 'view') AS viewed,
  COUNTIF(action = 'click') AS clicked,
  COUNTIF(action = 'contact') AS contacted,
  SAFE_DIVIDE(COUNTIF(action = 'contact'), COUNT(DISTINCT match_id)) AS engagement_rate,
  APPROX_QUANTILES(match_score, 100)[OFFSET(50)] AS median_match_score,
  AVG(rank_position) AS avg_rank_position
FROM engagement_events
GROUP BY sources
ORDER BY engagement_rate DESC;

-- Example query to run after table is populated:
--
-- SELECT
--   report_week,
--   sources,
--   total_matches,
--   engagement_rate,
--   median_match_score
-- FROM api_events.match_quality_weekly
-- ORDER BY report_week DESC, engagement_rate DESC;
