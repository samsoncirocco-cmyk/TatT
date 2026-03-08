-- Migration M004: Quality signal columns — powers §17 Agent-Driven Quality Loop
-- Source: docs/architecture/next-gen-ux.md §17
-- Run after M003

ALTER TABLE designs
  ADD COLUMN IF NOT EXISTS quality_signal  TEXT,            -- 'accept' | 'reject' | 'regen' | 'share'
  ADD COLUMN IF NOT EXISTS reject_reason   TEXT,            -- nullable free-text from regenerate dialog
  ADD COLUMN IF NOT EXISTS signal_ts       TIMESTAMPTZ,     -- when signal was captured
  ADD COLUMN IF NOT EXISTS booking_id      UUID REFERENCES bookings(id) ON DELETE SET NULL
;

-- Constraint: valid signal values only
ALTER TABLE designs DROP CONSTRAINT IF EXISTS designs_quality_signal_check;
ALTER TABLE designs ADD CONSTRAINT designs_quality_signal_check
  CHECK (quality_signal IN ('accept', 'reject', 'regen', 'share') OR quality_signal IS NULL);

-- Index for weekly quality batch analysis queries
CREATE INDEX IF NOT EXISTS idx_designs_quality
  ON designs (quality_signal, created_at DESC)
  WHERE quality_signal IS NOT NULL;

-- Index for bypass/quality correlation analysis (§17.5)
CREATE INDEX IF NOT EXISTS idx_designs_bypass_quality
  ON designs (council_bypassed, quality_signal, created_at DESC)
  WHERE quality_signal IS NOT NULL;

-- View: weekly quality summary (used by quality analysis cron)
CREATE OR REPLACE VIEW weekly_quality_summary AS
SELECT
  date_trunc('week', created_at) AS week_of,
  style_tags,
  council_bypassed,
  quality_signal,
  COUNT(*)                                                        AS count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (
    PARTITION BY date_trunc('week', created_at), council_bypassed
  ), 1)                                                           AS pct_of_bypassed_bucket,
  ROUND(AVG(council_ms), 0)                                      AS avg_council_ms
FROM designs
WHERE quality_signal IS NOT NULL
  AND created_at >= NOW() - INTERVAL '90 days'
GROUP BY week_of, style_tags, council_bypassed, quality_signal
ORDER BY week_of DESC, quality_signal;
