#!/usr/bin/env python3
"""Auditable Instagram enrichment and refresh-state collection.

Reads the ranked artist queue, scrapes profiles in chunks through Apify, and
writes one accepted profile per artist for ``scripts/host-artist-images.mjs``.

The account-quality gate is on by default.  Rejected/dead profiles are logged
to JSONL and existing profile files are moved to a recoverable quarantine so
an idempotent host-all run cannot accidentally re-import them.  ``--no-filter``
is an explicit operator override; it is recorded on every bypassed output.

No graph or production database writes happen here.  The refresh-state ledger
is applied separately by the dry-run-by-default TatT operator tool.
"""

from __future__ import annotations

import argparse
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable, Mapping

try:
    from execution.ig_quality import looks_bookable
    from execution.ig_refresh_state import (
        DEFAULT_DEAD_THRESHOLD,
        classify_scrape_result,
        normalize_handle,
        update_handle_state,
    )
except ModuleNotFoundError:  # direct ``python execution/apify_ig_enrich.py``
    from ig_quality import looks_bookable
    from ig_refresh_state import (
        DEFAULT_DEAD_THRESHOLD,
        classify_scrape_result,
        normalize_handle,
        update_handle_state,
    )


ACTOR = "apify~instagram-profile-scraper"
ROOT = Path(__file__).resolve().parent.parent
DEFAULT_QUEUE = ROOT / "data" / "enrichment" / "instagram" / "artist-queue.json"
DEFAULT_OUT = ROOT / "data" / "enrichment" / "instagram" / "apify-profiles"
DEFAULT_LEDGER = ROOT / "data" / "enrichment" / "instagram" / "refresh-status.json"
DEFAULT_AUDIT = ROOT / "data" / "enrichment" / "instagram" / "refresh-audit.jsonl"
DEFAULT_REPORT = ROOT / "data" / "enrichment" / "instagram" / "apify-run-report.json"
TERMINAL_STATUSES = {"SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"}


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def load_token() -> str:
    token = os.environ.get("APIFY_TOKEN", "").strip()
    if token:
        return token
    env_path = Path("/opt/org/.env")
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if line.startswith("APIFY_TOKEN="):
                token = line.split("=", 1)[1].strip()
                if token:
                    return token
    raise RuntimeError("APIFY_TOKEN is required")


def api(method: str, url: str, body: Any = None, timeout: int = 120) -> Any:
    data = json.dumps(body).encode() if body is not None else None
    request = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode())


def run_chunk(usernames: list[str], token: str) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    """Run one paid actor chunk.  Called only from ``main``."""

    encoded_token = urllib.parse.quote(token, safe="")
    run = api(
        "POST",
        f"https://api.apify.com/v2/acts/{ACTOR}/runs?token={encoded_token}",
        {"usernames": usernames},
    )["data"]
    run_id = run["id"]
    dataset_id = run["defaultDatasetId"]
    final = run
    for _ in range(120):
        final = api(
            "GET",
            f"https://api.apify.com/v2/actor-runs/{run_id}?token={encoded_token}",
        )["data"]
        if final.get("status") in TERMINAL_STATUSES:
            break
        time.sleep(5)
    items = api(
        "GET",
        f"https://api.apify.com/v2/datasets/{dataset_id}/items"
        f"?token={encoded_token}&clean=true",
    )
    return final, items


def extract_images(row: Mapping[str, Any]) -> list[str]:
    images: list[str] = []
    for post in row.get("latestPosts") or []:
        url = post.get("displayUrl") or post.get("imageUrl")
        if isinstance(url, str) and url.startswith(("http://", "https://")) and url not in images:
            images.append(url)
    return images[:8]


def row_handle(row: Mapping[str, Any]) -> str:
    direct = normalize_handle(
        row.get("username")
        or row.get("handle")
        or row.get("requestedUsername")
        or row.get("input")
    )
    if direct and "/" not in direct:
        return direct
    input_url = str(row.get("inputUrl") or row.get("url") or "")
    if "instagram.com/" in input_url:
        path = urllib.parse.urlparse(input_url).path.strip("/").split("/")[0]
        return normalize_handle(path)
    return ""


def build_chunk_observations(
    requested_handles: Iterable[str],
    items: Iterable[Mapping[str, Any]],
    actor_status: str,
) -> dict[str, tuple[str, str | None, Mapping[str, Any] | None]]:
    """Pair every requested handle with an active/dead/transient observation."""

    requested = [normalize_handle(handle) for handle in requested_handles]
    rows = {row_handle(row): row for row in items if row_handle(row)}
    observations = {}
    for handle in requested:
        row = rows.get(handle)
        status, reason = classify_scrape_result(row)
        if row is None:
            reason = f"actor-{actor_status.lower()}-returned-no-row"
        observations[handle] = (status, reason, row)
    return observations


def make_profile_record(
    *,
    artist_id: str,
    handle: str,
    row: Mapping[str, Any],
    verdict: bool,
    filter_reason: str,
    filter_bypassed: bool,
    refreshed_at: str,
) -> dict[str, Any]:
    return {
        "artistId": artist_id,
        "handle": handle,
        "bio": row.get("biography") or row.get("bio") or None,
        "followers": row.get("followersCount") or row.get("followers"),
        "posts": row.get("postsCount") or row.get("posts"),
        "profilePic": row.get("profilePicUrlHD") or row.get("profilePicUrl"),
        "images": extract_images(row),
        "looksBookable": verdict,
        "filterReason": filter_reason,
        "filterBypassed": filter_bypassed,
        "refreshedAt": refreshed_at,
    }


def load_json(path: Path, fallback: Any) -> Any:
    try:
        return json.loads(path.read_text())
    except FileNotFoundError:
        return fallback


def write_json_atomic(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n")
    temporary.replace(path)


def append_audit(path: Path, record: Mapping[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a") as stream:
        stream.write(json.dumps(record, sort_keys=True) + "\n")


def quarantine_profile(output_dir: Path, artist_id: str) -> bool:
    current = output_dir / f"{artist_id}.json"
    if not current.exists():
        return False
    quarantine = output_dir / "quarantine"
    quarantine.mkdir(parents=True, exist_ok=True)
    current.replace(quarantine / current.name)
    return True


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", type=int, default=0)
    parser.add_argument("--count", type=int, default=500)
    parser.add_argument("--chunk", type=int, default=100)
    parser.add_argument("--queue", type=Path, default=DEFAULT_QUEUE)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--status-ledger", type=Path, default=DEFAULT_LEDGER)
    parser.add_argument("--audit-log", type=Path, default=DEFAULT_AUDIT)
    parser.add_argument("--run-report", type=Path, default=DEFAULT_REPORT)
    parser.add_argument(
        "--sweep-id",
        default=None,
        help="cost/report grouping key; defaults to the UTC run date",
    )
    parser.add_argument("--dead-threshold", type=int, default=DEFAULT_DEAD_THRESHOLD)
    parser.add_argument(
        "--no-filter",
        action="store_true",
        help="deliberately enrich non-bookable profiles; bypass is audited",
    )
    args = parser.parse_args(argv)
    if args.dead_threshold < 1:
        parser.error("--dead-threshold must be at least 1")
    return args


def merge_run_report(
    existing: Mapping[str, Any] | None,
    *,
    sweep_id: str,
    checked_at: str,
    run_slice: Mapping[str, Any],
    summary: Mapping[str, Any],
    actor_runs: Iterable[Mapping[str, Any]],
) -> dict[str, Any]:
    """Accumulate one multi-process sweep without double-counting actor run IDs."""

    report = dict(existing or {})
    sweeps = dict(report.get("sweeps") or {})
    sweep = dict(sweeps.get(sweep_id) or {})
    by_id = {
        str(run["id"]): dict(run)
        for run in sweep.get("actorRuns") or []
        if run.get("id")
    }
    for run in actor_runs:
        if run.get("id"):
            by_id[str(run["id"])] = dict(run)

    def numeric_cost(value: Any) -> float | None:
        try:
            return float(value) if value is not None else None
        except (TypeError, ValueError):
            return None

    costs = [
        cost
        for run in by_id.values()
        if (cost := numeric_cost(run.get("usageTotalUsd"))) is not None
    ]
    sweep.update(
        {
            "startedAt": sweep.get("startedAt") or checked_at,
            "lastRunAt": checked_at,
            "actorRuns": sorted(by_id.values(), key=lambda run: str(run.get("id"))),
            "apifyUsageTotalUsd": sum(costs) if costs else None,
            # Preserve a value an operator added from the billing export.
            "gcsCostUsd": sweep.get("gcsCostUsd"),
            "gcsCostNote": sweep.get("gcsCostNote")
            or "Capture from the GCS billing export after hosting; not guessed here.",
            "lastInvocation": {
                "slice": dict(run_slice),
                "summary": dict(summary),
                "actorRuns": [dict(run) for run in actor_runs],
            },
        }
    )
    sweeps[sweep_id] = sweep
    return {"version": 2, "sweeps": sweeps}


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    token = load_token()
    args.out.mkdir(parents=True, exist_ok=True)

    queue = load_json(args.queue, [])[args.start : args.start + args.count]
    by_handle = {
        normalize_handle(item.get("ig")): str(item["id"])
        for item in queue
        if normalize_handle(item.get("ig")) and item.get("id")
    }
    handles = list(by_handle)
    ledger = load_json(
        args.status_ledger,
        {"version": 1, "deadThreshold": args.dead_threshold, "handles": {}},
    )
    ledger.setdefault("handles", {})
    checked_at = utc_now()
    summary = {
        "requested": len(handles),
        "written": 0,
        "rejected": 0,
        "dead": 0,
        "transient": 0,
        "quarantined": 0,
        "withImages": 0,
    }
    actor_runs = []

    print(
        f"START Apify enrich slice={args.start}:{args.start + args.count} "
        f"handles={len(handles)} chunk={args.chunk} filter={not args.no_filter}"
    )
    for offset in range(0, len(handles), args.chunk):
        chunk = handles[offset : offset + args.chunk]
        try:
            run, items = run_chunk(chunk, token)
            actor_status = str(run.get("status") or "UNKNOWN")
            actor_runs.append(
                {
                    "id": run.get("id"),
                    "status": actor_status,
                    "usageTotalUsd": run.get("usageTotalUsd"),
                    "startedAt": run.get("startedAt"),
                    "finishedAt": run.get("finishedAt"),
                }
            )
        except (OSError, RuntimeError, urllib.error.URLError) as error:
            actor_status = "ERROR"
            items = []
            actor_runs.append(
                {"id": None, "status": actor_status, "usageTotalUsd": None, "error": str(error)}
            )

        observations = build_chunk_observations(chunk, items, actor_status)
        for handle, (status, refresh_reason, row) in observations.items():
            artist_id = by_handle[handle]
            previous = ledger["handles"].get(handle)
            state = update_handle_state(
                previous,
                status=status,
                checked_at=checked_at,
                reason=refresh_reason,
                dead_threshold=args.dead_threshold,
            )
            state["artistId"] = artist_id
            ledger["handles"][handle] = state

            audit = {
                "artistId": artist_id,
                "handle": handle,
                "observedAt": checked_at,
                "refreshStatus": status,
                "refreshReason": refresh_reason,
                "stale": state["stale"],
                "consecutiveDeadRefreshes": state["consecutiveDeadRefreshes"],
            }

            if status in {"not_found", "private"}:
                summary["dead"] += 1
                if quarantine_profile(args.out, artist_id):
                    summary["quarantined"] += 1
                append_audit(args.audit_log, {**audit, "action": "quarantined-dead"})
                continue
            if status != "active" or row is None:
                summary["transient"] += 1
                append_audit(args.audit_log, {**audit, "action": "preserved-transient"})
                continue

            verdict, filter_reason = looks_bookable(row)
            # Persist the verdict independently from the local profile file so
            # the TatT status applier can suppress an already-imported
            # brand/shop account without deleting its node.
            state["looksBookable"] = verdict
            state["bookabilityReason"] = filter_reason
            audit.update({"looksBookable": verdict, "filterReason": filter_reason})
            if not verdict and not args.no_filter:
                summary["rejected"] += 1
                if quarantine_profile(args.out, artist_id):
                    summary["quarantined"] += 1
                append_audit(args.audit_log, {**audit, "action": "quarantined-filter"})
                continue

            record = make_profile_record(
                artist_id=artist_id,
                handle=handle,
                row=row,
                verdict=verdict,
                filter_reason=filter_reason,
                filter_bypassed=bool(not verdict and args.no_filter),
                refreshed_at=checked_at,
            )
            write_json_atomic(args.out / f"{artist_id}.json", record)
            append_audit(
                args.audit_log,
                {**audit, "action": "written-bypass" if not verdict else "written"},
            )
            summary["written"] += 1
            if record["images"]:
                summary["withImages"] += 1

        print(
            f"chunk {offset // args.chunk + 1}: status={actor_status} "
            f"rows={len(items)} cumulative={summary}"
        )

    ledger.update(
        {
            "version": 1,
            "deadThreshold": args.dead_threshold,
            "lastRunAt": checked_at,
        }
    )
    write_json_atomic(args.status_ledger, ledger)
    sweep_id = args.sweep_id or checked_at[:10]
    run_slice = {"start": args.start, "count": args.count, "requested": len(handles)}
    report = merge_run_report(
        load_json(args.run_report, {}),
        sweep_id=sweep_id,
        checked_at=checked_at,
        run_slice=run_slice,
        summary=summary,
        actor_runs=actor_runs,
    )
    write_json_atomic(
        args.run_report,
        report,
    )
    stale_count = sum(1 for state in ledger["handles"].values() if state.get("stale"))
    print(f"DONE summary={summary} stale-in-ledger={stale_count}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
