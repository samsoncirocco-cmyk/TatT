import os
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def test_parallel_runner_covers_every_queue_slice(tmp_path):
    fake_bin = tmp_path / "bin"
    fake_bin.mkdir()
    fake_python = fake_bin / "python3"
    fake_python.write_text(
        """#!/usr/bin/env bash
set -euo pipefail
if [[ "$1" == "-c" ]]; then
  echo 1201
  exit 0
fi
printf '%s\\n' "$*" >> "$CALL_LOG"
"""
    )
    fake_python.chmod(0o755)
    queue = tmp_path / "queue.json"
    queue.write_text('[{"id":"artist-1","ig":"@ink.sam"}]')
    call_log = tmp_path / "calls.log"
    environment = {
        **os.environ,
        "PATH": f"{fake_bin}:{os.environ['PATH']}",
        "CALL_LOG": str(call_log),
    }

    result = subprocess.run(
        [
            "bash",
            str(ROOT / "execution" / "parallel_enrich.sh"),
            "--execute",
            "--sweep-id",
            "sweep-1",
            "--queue",
            str(queue),
            "--workers",
            "2",
            "--batch-size",
            "500",
        ],
        cwd=ROOT,
        env=environment,
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr
    calls = [line.split() for line in call_log.read_text().splitlines()]
    starts = sorted(int(call[call.index("--start") + 1]) for call in calls)
    counts = [int(call[call.index("--count") + 1]) for call in calls]
    assert starts == [0, 500, 1000]
    assert counts == [500, 500, 500]
