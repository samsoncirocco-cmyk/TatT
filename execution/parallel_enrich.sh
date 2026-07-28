#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
workers=4
batch_size=500
has_execute=false
has_sweep=false
queue_file=""
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
    --queue)
      if (($# < 2)); then
        echo "--queue requires a value" >&2
        exit 2
      fi
      queue_file="$2"
      runner_args+=("$1" "$2")
      shift 2
      ;;
    --queue=*)
      queue_file="${1#--queue=}"
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

if [[ "$has_execute" != true || "$has_sweep" != true || -z "$queue_file" ]]; then
  echo "Usage: execution/parallel_enrich.sh --execute --sweep-id ID --queue FILE [--workers N] [--batch-size N] [runner options]" >&2
  echo "Paid refreshes require execution approval, a stable sweep ID, and an explicit queue." >&2
  exit 2
fi

if ! [[ "$workers" =~ ^[1-9][0-9]*$ && "$batch_size" =~ ^[1-9][0-9]*$ ]]; then
  echo "--workers and --batch-size must be positive integers" >&2
  exit 2
fi

cd "$ROOT"
queue_size="$(
  python3 -c 'import sys; from pathlib import Path; from execution.apify_ig_enrich import load_required_queue; print(len(load_required_queue(Path(sys.argv[1]))))' \
    "$queue_file"
)"

start=0
while ((start < queue_size)); do
  pids=()
  for ((worker = 0; worker < workers && start < queue_size; worker++)); do
    python3 "$ROOT/execution/apify_ig_enrich.py" \
      --start "$start" \
      --count "$batch_size" \
      "${runner_args[@]}" &
    pids+=("$!")
    start=$((start + batch_size))
  done

  status=0
  for pid in "${pids[@]}"; do
    if ! wait "$pid"; then
      status=1
    fi
  done
  if ((status != 0)); then
    echo "A refresh worker failed; no additional paid batches will be started." >&2
    exit "$status"
  fi
done
