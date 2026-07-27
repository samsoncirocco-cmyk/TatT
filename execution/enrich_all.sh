#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
has_execute=false
has_sweep=false

for argument in "$@"; do
  case "$argument" in
    --execute) has_execute=true ;;
    --sweep-id|--sweep-id=*) has_sweep=true ;;
    --start|--count|--start=*|--count=*)
      echo "enrich_all.sh owns --start and --count; invoke apify_ig_enrich.py for a slice" >&2
      exit 2
      ;;
  esac
done

if [[ "$has_execute" != true || "$has_sweep" != true ]]; then
  echo "Usage: execution/enrich_all.sh --execute --sweep-id ID [runner options]" >&2
  echo "Paid refreshes require explicit execution approval and a stable sweep ID." >&2
  exit 2
fi

exec python3 "$ROOT/execution/apify_ig_enrich.py" \
  --start 0 \
  --count 1000000 \
  "$@"
