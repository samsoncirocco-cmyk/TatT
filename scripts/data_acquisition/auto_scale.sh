#!/bin/bash
# Automated Full-Scale Data Acquisition
# ==========================================
# 
# This script monitors the current crawler and automatically
# launches the full-scale crawl when it completes.
#
# Usage:
#   bash src/scripts/data_acquisition/auto_scale.sh

set -e

echo "========================================="
echo "Auto-Scale Data Acquisition"
echo "========================================="
echo ""

# Wait for current crawler to complete
echo "[1/4] Waiting for current crawler to complete..."
while pgrep -f "CRAWLER_TOTAL_LIMIT=500" > /dev/null; do
    sleep 30
    echo "  Still running... (checking every 30s)"
done

echo "✅ Current crawler completed!"
echo ""

# Brief pause to ensure file writes complete
sleep 5

# Check results
CURRENT_RESULTS="src/scripts/data_acquisition/output/raw_artists_production.json"
if [ -f "$CURRENT_RESULTS" ]; then
    ARTIST_COUNT=$(grep -o '"handle"' "$CURRENT_RESULTS" | wc -l)
    echo "📊 Current run found: $ARTIST_COUNT artist handles"
fi
echo ""

# Launch full US crawl (no limits)
echo "[2/4] Launching FULL US CRAWL (no limits)..."
echo "  Target: All 50 cities, ~1,000-2,000 shops"
echo "  Estimated time: 2-4 hours"
echo "  Estimated cost: ~$34"
echo ""

# Clear progress to start fresh
rm -f src/scripts/data_acquisition/output/progress.json

# Launch full crawl in background
nohup node src/scripts/data_acquisition/production_crawler.js > src/scripts/data_acquisition/output/full_crawl.log 2>&1 &
CRAWLER_PID=$!

echo "✅ Full crawler launched (PID: $CRAWLER_PID)"
echo "📝 Logs: src/scripts/data_acquisition/output/full_crawl.log"
echo ""

# Monitor progress
echo "[3/4] Monitoring progress..."
echo "  (Press Ctrl+C to stop monitoring, crawler will continue)"
echo ""

tail -f src/scripts/data_acquisition/output/crawler.log &
TAIL_PID=$!

# Wait for crawler to complete
wait $CRAWLER_PID
kill $TAIL_PID 2>/dev/null || true

echo ""
echo "[4/4] Full crawl completed!"
echo ""

# Run validator automatically
echo "🤖 Launching AI Validator..."
node src/scripts/data_acquisition/production_validator.js

echo ""
echo "========================================="
echo "✅ COMPLETE!"
echo "========================================="
echo "Results:"
echo "  - Raw data: src/scripts/data_acquisition/output/raw_artists_production.json"
echo "  - Verified: src/scripts/data_acquisition/output/verified_artists_production.json"
echo ""
echo "Next: Review verified_artists_production.json"
