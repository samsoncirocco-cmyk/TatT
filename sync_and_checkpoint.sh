#!/bin/zsh
# Pulls scrape progress from the remote scraper runner (which owns
# queue.json/state.json/master.json — see the 2026-07-27 .83 migration) back
# into a staging directory, validates a self-consistent snapshot, then replaces
# this machine's data files and runs checkpoint.sh. This machine holds the git
# credentials and Neo4j configuration for that step.
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
#   ./sync_and_checkpoint.sh --force
#   SCRAPER_REMOTE_HOST=10.0.0.5 SCRAPER_REMOTE_USER=alice ./sync_and_checkpoint.sh
set -euo pipefail

SCRAPER_REMOTE_USER="${SCRAPER_REMOTE_USER:-ciroccofam}"
SCRAPER_REMOTE_HOST="${SCRAPER_REMOTE_HOST:-192.168.0.83}"
SCRAPER_REMOTE_DIR="${SCRAPER_REMOTE_DIR:-/Users/${SCRAPER_REMOTE_USER}/tatt-scraper/data}"
LOCAL_TATT_SCRAPER="${LOCAL_TATT_SCRAPER:-$HOME/tatt-scraper}"

cd "$LOCAL_TATT_SCRAPER"

REMOTE="${SCRAPER_REMOTE_USER}@${SCRAPER_REMOTE_HOST}:${SCRAPER_REMOTE_DIR}"
STAGING_DIR="$(mktemp -d "${TMPDIR:-/tmp}/tatt-scrape-sync.XXXXXX")"
trap 'rm -rf "$STAGING_DIR"' EXIT

rsync -a \
  "$REMOTE/queue.json" \
  "$REMOTE/state.json" \
  "$REMOTE/master.json" \
  "$REMOTE/scrape.log" \
  "$STAGING_DIR/" 2>&1

python3 - "$STAGING_DIR" <<'PY'
import json
import sys
from pathlib import Path

stage = Path(sys.argv[1])
state = json.loads((stage / "state.json").read_text())
queue = json.loads((stage / "queue.json").read_text())
master = json.loads((stage / "master.json").read_text())

artists = master.get("artists")
shops = master.get("shops")
if not isinstance(queue, list) or not isinstance(artists, list) or not isinstance(shops, list):
    raise SystemExit("staged scrape snapshot has an invalid shape")

expected_artists = state.get("total_artists")
expected_shops = state.get("total_shops")
done_cities = sum(1 for item in queue if item.get("status") == "done")
if len(artists) != expected_artists or len(shops) != expected_shops:
    raise SystemExit(
        "staged scrape snapshot is inconsistent: "
        f"state={expected_artists} artists/{expected_shops} shops, "
        f"master={len(artists)} artists/{len(shops)} shops"
    )
if done_cities != state.get("cities_done"):
    raise SystemExit(
        "staged scrape snapshot is inconsistent: "
        f"state cities_done={state.get('cities_done')}, queue done={done_cities}"
    )
PY

rsync -a \
  "$STAGING_DIR/queue.json" \
  "$STAGING_DIR/state.json" \
  "$STAGING_DIR/master.json" \
  "$STAGING_DIR/scrape.log" \
  data/

./checkpoint.sh "$@"
