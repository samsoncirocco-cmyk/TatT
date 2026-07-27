#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
workers=4
batch_size=500
has_execute=false
has_sweep=false
runner_args=()

while (($#)); do
  case "$1" in
    --workers)
      if (($# < 2)); then
        echo "--workers requires a value" >&2
        exit 2
      fi
      workers="$2"
      shift 2
      ;;
    --batch-size)
      if (($# < 2)); then
        echo "--batch-size requires a value" >&2
        exit 2
      fi
      batch_size="$2"
      shift 2
      ;;
    --execute)
      has_execute=true
      runner_args+=("$1")
      shift
      ;;
    --sweep-id)
      if (($# < 2)); then
        echo "--sweep-id requires a value" >&2
        exit 2
      fi
      has_sweep=true
      runner_args+=("$1" "$2")
      shift 2
      ;;
    --sweep-id=*)
      has_sweep=true
      runner_args+=("$1")
      shift
      ;;
    --start|--count|--start=*|--count=*)
      echo "parallel_enrich.sh owns --start and --count; use --workers and --batch-size" >&2
      exit 2
      ;;
    *)
      runner_args+=("$1")
      shift
      ;;
  esac
done

if [[ "$has_execute" != true || "$has_sweep" != true ]]; then
  echo "Usage: execution/parallel_enrich.sh --execute --sweep-id ID [--workers N] [--batch-size N] [runner options]" >&2
  echo "Paid refreshes require explicit execution approval and a stable sweep ID." >&2
  exit 2
fi

if ! [[ "$workers" =~ ^[1-9][0-9]*$ && "$batch_size" =~ ^[1-9][0-9]*$ ]]; then
  echo "--workers and --batch-size must be positive integers" >&2
  exit 2
fi

pids=()
for ((worker = 0; worker < workers; worker++)); do
  start=$((worker * batch_size))
  python3 "$ROOT/execution/apify_ig_enrich.py" \
    --start "$start" \
    --count "$batch_size" \
    "${runner_args[@]}" &
  pids+=("$!")
done

status=0
for pid in "${pids[@]}"; do
  if ! wait "$pid"; then
    status=1
  fi
done
exit "$status"
