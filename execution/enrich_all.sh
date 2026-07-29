#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
has_execute=false
has_sweep=false
has_queue=false

for argument in "$@"; do
  case "$argument" in
    --execute) has_execute=true ;;
    --sweep-id|--sweep-id=*) has_sweep=true ;;
    --queue|--queue=*) has_queue=true ;;
    --start|--count|--start=*|--count=*)
      echo "enrich_all.sh owns --start and --count; invoke apify_ig_enrich.py for a slice" >&2
      exit 2
      ;;
  esac
done

if [[ "$has_execute" != true || "$has_sweep" != true || "$has_queue" != true ]]; then
  echo "Usage: execution/enrich_all.sh --execute --sweep-id ID --queue FILE [runner options]" >&2
  echo "Paid refreshes require execution approval, a stable sweep ID, and an explicit queue." >&2
  exit 2
fi

exec python3 "$ROOT/execution/apify_ig_enrich.py" \
  --start 0 \
  "$@"
