#!/bin/zsh
# Pulls scrape progress from the remote scraper runner (which owns
# queue.json/state.json/master.json — see the 2026-07-27 .83 migration) back
# into this machine's data/, then runs the existing checkpoint (git
# commit/push + Neo4j import), since this machine holds the git credentials,
# node, and Neo4j config for that step.
#
# Configure via environment (all have defaults matching the original .83
# setup, so existing launchd jobs keep working unmodified):
#   SCRAPER_REMOTE_USER   ssh user on the scraper box       (default: ciroccofam)
#   SCRAPER_REMOTE_HOST   hostname or IP of the scraper box (default: 192.168.0.83)
#   SCRAPER_REMOTE_DIR    tatt-scraper data dir on that box (default: /Users/ciroccofam/tatt-scraper/data)
#   LOCAL_TATT_SCRAPER    tatt-scraper checkout on this box (default: ~/tatt-scraper)
#
# Usage:
#   ./sync_and_checkpoint.sh
#   SCRAPER_REMOTE_HOST=10.0.0.5 SCRAPER_REMOTE_USER=alice ./sync_and_checkpoint.sh
set -euo pipefail

SCRAPER_REMOTE_USER="${SCRAPER_REMOTE_USER:-ciroccofam}"
SCRAPER_REMOTE_HOST="${SCRAPER_REMOTE_HOST:-192.168.0.83}"
SCRAPER_REMOTE_DIR="${SCRAPER_REMOTE_DIR:-/Users/${SCRAPER_REMOTE_USER}/tatt-scraper/data}"
LOCAL_TATT_SCRAPER="${LOCAL_TATT_SCRAPER:-$HOME/tatt-scraper}"

cd "$LOCAL_TATT_SCRAPER"

REMOTE="${SCRAPER_REMOTE_USER}@${SCRAPER_REMOTE_HOST}:${SCRAPER_REMOTE_DIR}"

rsync -a "$REMOTE/queue.json" "$REMOTE/state.json" "$REMOTE/master.json" "$REMOTE/scrape.log" data/ 2>&1

./checkpoint.sh
