#!/bin/zsh
# Create one self-consistent, reviewable checkpoint from the current scrape.
#
# The script commits only the cleaned snapshot. Runtime state remains ignored.
# Neo4j is previewed every time and is updated only when APPLY_NEO4J=true.
#
# Usage:
#   ./checkpoint.sh
#   ./checkpoint.sh --force
#
# Configuration:
#   SCRAPER_DATA_BRANCH       branch that owns dataset checkpoints
#   CHECKPOINT_MIN_DELTA      minimum new combined records (default: 300)
#   NATIONAL_ARTISTS_SNAPSHOT tracked cleaned snapshot path
#   SCRAPER_PYTHON            Python executable for the cleaner
#   SCRAPER_NODE              Node executable for the importer
#   APPLY_NEO4J               true to pass --apply to the protected importer
set -euo pipefail

FORCE=false
if [[ "${1:-}" == "--force" ]]; then
  FORCE=true
  shift
fi
if (( $# > 0 )); then
  echo "Unknown option: $1" >&2
  exit 2
fi

REPO_ROOT="${0:A:h}"
STATE_FILE="${REPO_ROOT}/data/state.json"
LAST_CHECKPOINT_FILE="${REPO_ROOT}/data/.last-checkpoint"
SCRAPER_DATA_BRANCH="${SCRAPER_DATA_BRANCH:-data/scrape-20k}"
CHECKPOINT_MIN_DELTA="${CHECKPOINT_MIN_DELTA:-300}"
NATIONAL_ARTISTS_SNAPSHOT="${NATIONAL_ARTISTS_SNAPSHOT:-data/national-artists-2026-07-15.json}"
SCRAPER_PYTHON="${SCRAPER_PYTHON:-${REPO_ROOT}/.venv/bin/python}"
SCRAPER_NODE="${SCRAPER_NODE:-$(command -v node)}"
APPLY_NEO4J="${APPLY_NEO4J:-false}"

cd "$REPO_ROOT"

if [[ ! -f "$STATE_FILE" ]]; then
  echo "No scrape state found; nothing to checkpoint."
  exit 0
fi
if [[ ! -x "$SCRAPER_PYTHON" ]]; then
  SCRAPER_PYTHON="$(command -v python3)"
fi
if [[ ! "$CHECKPOINT_MIN_DELTA" =~ ^[0-9]+$ ]]; then
  echo "CHECKPOINT_MIN_DELTA must be a non-negative integer." >&2
  exit 2
fi

CURRENT_BRANCH="$(git branch --show-current)"
if [[ "$CURRENT_BRANCH" != "$SCRAPER_DATA_BRANCH" ]]; then
  echo "Refusing to checkpoint from ${CURRENT_BRANCH}; expected ${SCRAPER_DATA_BRANCH}." >&2
  exit 2
fi

read -r TOTAL ARTISTS SHOPS CITIES TARGET <<EOF
$("$SCRAPER_PYTHON" - "$STATE_FILE" <<'PY'
import json
import sys

state = json.load(open(sys.argv[1]))
artists = int(state["total_artists"])
shops = int(state["total_shops"])
print(
    artists + shops,
    artists,
    shops,
    int(state["cities_done"]),
    int(state["target"]),
)
PY
)
EOF

LAST=0
if [[ -f "$LAST_CHECKPOINT_FILE" ]]; then
  LAST="$(<"$LAST_CHECKPOINT_FILE")"
fi
DELTA=$(( TOTAL - LAST ))

if (( DELTA < 0 )); then
  echo "Refusing to checkpoint: total fell from ${LAST} to ${TOTAL}." >&2
  exit 1
fi
if [[ "$FORCE" != true ]] && (( DELTA == 0 )); then
  echo "Checkpoint already current at ${TOTAL} combined records."
  exit 0
fi

# Reaching the target always forces the final checkpoint, even when the last
# increment is smaller than the normal threshold.
if (( TOTAL >= TARGET )); then
  FORCE=true
fi
if [[ "$FORCE" != true ]] && (( DELTA < CHECKPOINT_MIN_DELTA )); then
  echo "Checkpoint skipped: ${DELTA} new records; threshold is ${CHECKPOINT_MIN_DELTA}."
  exit 0
fi

"$SCRAPER_PYTHON" execution/clean_artist_names.py
cp data/national-artists-clean.json "$NATIONAL_ARTISTS_SNAPSHOT"

if ! git diff --quiet -- "$NATIONAL_ARTISTS_SNAPSHOT"; then
  git add "$NATIONAL_ARTISTS_SNAPSHOT"
  git commit -m "data: checkpoint — ${ARTISTS} artists + ${SHOPS} shops (${CITIES} cities done)"
  git push origin "$SCRAPER_DATA_BRANCH"
else
  echo "Tracked snapshot is unchanged; skipping commit."
fi

IMPORTER="scripts/import-national-to-neo4j.js"
if [[ ! -f "$IMPORTER" ]]; then
  echo "Missing protected importer: ${IMPORTER}" >&2
  exit 1
fi

# Preview first on every run. This fails closed if the database or protection
# records cannot be read.
"$SCRAPER_NODE" "$IMPORTER" --input "$NATIONAL_ARTISTS_SNAPSHOT"

if [[ "$APPLY_NEO4J" == true ]]; then
  "$SCRAPER_NODE" "$IMPORTER" --apply --input "$NATIONAL_ARTISTS_SNAPSHOT"
else
  echo "Neo4j apply skipped. Set APPLY_NEO4J=true to update the live graph."
fi

# Advance only after the commit/push and requested database step succeeded.
echo "$TOTAL" > "$LAST_CHECKPOINT_FILE"
echo "Checkpoint complete at ${TOTAL} combined records."
