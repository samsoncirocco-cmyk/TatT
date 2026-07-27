#!/usr/bin/env python3
"""Find and review new Instagram artist handles without writing to the graph.

Discovery and enrichment share ``execution.ig_quality.looks_bookable`` so a
verdict cannot be computed under one set of rules and imported under another.
All candidates, including rejected ones, remain in the review artifact.
"""

from __future__ import annotations

import argparse
import json
import os
import time
import urllib.parse
import urllib.request
from collections import Counter
from pathlib import Path
from typing import Any

try:
    from execution.ig_quality import looks_bookable
except ModuleNotFoundError:  # direct ``python execution/discover_ig.py``
    from ig_quality import looks_bookable


BASE = "https://api.apify.com/v2"
FOLLOW_ACTOR = "coderx~instagram-followers-following-scraper-no-cookies-login"
HASHTAG_ACTOR = "apify~instagram-hashtag-scraper"
PROFILE_ACTOR = "apify~instagram-profile-scraper"
ROOT = Path(__file__).resolve().parent.parent
QUEUE = ROOT / "data" / "enrichment" / "instagram" / "artist-queue.json"
OUT = ROOT / "data" / "discovery"
RAW_A = OUT / "raw_followees.json"
RAW_B = OUT / "raw_hashtags.json"
PROFILES = OUT / "profiles.json"
CANDIDATES = OUT / "candidates.json"


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


def load(path: Path, fallback: Any) -> Any:
    try:
        return json.loads(path.read_text())
    except FileNotFoundError:
        return fallback


def save(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n")
    temporary.replace(path)


def api(token: str, method: str, path: str, body: Any = None, timeout: int = 180) -> Any:
    separator = "&" if "?" in path else "?"
    url = f"{BASE}{path}{separator}token={urllib.parse.quote(token, safe='')}"
    data = json.dumps(body).encode() if body is not None else None
    request = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode())


def run_actor(token: str, actor: str, actor_input: dict[str, Any], poll_max: int = 180):
    run = api(token, "POST", f"/acts/{actor}/runs", actor_input)["data"]
    run_id = run["id"]
    dataset_id = run["defaultDatasetId"]
    status = run["status"]
    for _ in range(poll_max):
        status = api(token, "GET", f"/actor-runs/{run_id}")["data"]["status"]
        if status in {"SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"}:
            break
        time.sleep(4)
    items = api(token, "GET", f"/datasets/{dataset_id}/items?clean=true")
    return status, items


def existing_handles(queue_path: Path = QUEUE) -> set[str]:
    queue = load(queue_path, [])
    return {
        str(artist.get("ig", "")).lstrip("@").strip().lower()
        for artist in queue
        if artist.get("ig")
    }


def collect_followees(token: str, seeds: list[str], max_items: int) -> dict[str, list[str]]:
    raw = load(RAW_A, {})
    for original in seeds:
        seed = original.lstrip("@").strip().lower()
        if seed in raw:
            print(f"[followee] {seed}: cached ({len(raw[seed])})")
            continue
        try:
            status, items = run_actor(
                token,
                FOLLOW_ACTOR,
                {"username": seed, "scrape_type": "following", "max_items": max_items},
            )
        except Exception as error:
            print(f"[followee] {seed}: ERROR {error}")
            continue
        handles = {
            str(item.get("username") or item.get("handle") or item.get("user_name") or "")
            .lstrip("@")
            .lower()
            for item in items
        }
        raw[seed] = sorted(handle for handle in handles if handle)
        save(RAW_A, raw)
        print(f"[followee] {seed}: status={status} unique={len(raw[seed])}")
    return raw


def collect_hashtags(token: str, tags: list[str], limit: int) -> dict[str, list[str]]:
    raw = load(RAW_B, {})
    for original in tags:
        tag = original.lstrip("#").strip().lower()
        if tag in raw:
            print(f"[hashtag] #{tag}: cached ({len(raw[tag])})")
            continue
        try:
            status, items = run_actor(
                token,
                HASHTAG_ACTOR,
                {"hashtags": [tag], "resultsLimit": limit},
            )
        except Exception as error:
            print(f"[hashtag] #{tag}: ERROR {error}")
            continue
        handles = {
            str(item.get("ownerUsername") or item.get("owner_username") or "")
            .lstrip("@")
            .lower()
            for item in items
        }
        raw[tag] = sorted(handle for handle in handles if handle)
        save(RAW_B, raw)
        print(f"[hashtag] #{tag}: status={status} unique={len(raw[tag])}")
    return raw


def all_raw_candidates() -> dict[str, dict[str, set[str]]]:
    existing = existing_handles()
    candidates: dict[str, dict[str, set[str]]] = {}
    for seed, handles in load(RAW_A, {}).items():
        for handle in handles:
            if handle in existing or handle == seed:
                continue
            item = candidates.setdefault(handle, {"sources": set(), "seedFrom": set()})
            item["sources"].add("followee")
            item["seedFrom"].add(seed)
    for tag, handles in load(RAW_B, {}).items():
        for handle in handles:
            if handle in existing:
                continue
            item = candidates.setdefault(handle, {"sources": set(), "seedFrom": set()})
            item["sources"].add("hashtag")
            item["seedFrom"].add(f"#{tag}")
    return candidates


def enrich_candidates(token: str, maximum: int) -> None:
    candidates = all_raw_candidates()
    profiles = load(PROFILES, {})
    todo = [handle for handle in candidates if handle not in profiles][:maximum]
    print(
        f"candidates={len(candidates)} cached_profiles={len(profiles)} "
        f"scraping={len(todo)}"
    )
    for offset in range(0, len(todo), 50):
        chunk = todo[offset : offset + 50]
        status, items = run_actor(token, PROFILE_ACTOR, {"usernames": chunk})
        for row in items:
            username = str(row.get("username") or "").lower()
            if username:
                profiles[username] = {
                    "bio": row.get("biography") or "",
                    "followers": row.get("followersCount"),
                    "fullName": row.get("fullName") or "",
                    "url": row.get("externalUrl") or "",
                    "category": row.get("businessCategoryName") or row.get("category") or "",
                    "private": row.get("private"),
                    "verified": row.get("verified"),
                }
        save(PROFILES, profiles)
        print(f"profile chunk={offset // 50 + 1} status={status} rows={len(items)}")


def filter_candidates() -> None:
    candidates = all_raw_candidates()
    profiles = load(PROFILES, {})
    output = []
    for handle, metadata in candidates.items():
        profile = profiles.get(handle)
        if not profile:
            continue
        verdict, reason = looks_bookable(profile)
        bio = str(profile.get("bio") or "").replace("\n", " ").strip()
        output.append(
            {
                "handle": handle,
                "source": ",".join(sorted(metadata["sources"])),
                "seedFrom": ",".join(sorted(metadata["seedFrom"])),
                "bioSnippet": bio[:160],
                "followers": profile.get("followers"),
                "looksBookable": verdict,
                "filterReason": reason,
            }
        )
    output.sort(key=lambda item: (not item["looksBookable"], -(item["followers"] or 0)))
    save(CANDIDATES, output)
    accepted = sum(1 for item in output if item["looksBookable"])
    print(f"reviewed={len(output)} accepted={accepted} rejected={len(output) - accepted}")
    print("reasons:", dict(Counter(item["filterReason"] for item in output)))
    print(f"written -> {CANDIDATES}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    commands = parser.add_subparsers(dest="command", required=True)
    followees = commands.add_parser("collect-followees")
    followees.add_argument("--seeds", required=True)
    followees.add_argument("--max", type=int, default=100)
    hashtags = commands.add_parser("collect-hashtags")
    hashtags.add_argument("--tags", required=True)
    hashtags.add_argument("--limit", type=int, default=40)
    enrich = commands.add_parser("enrich")
    enrich.add_argument("--max", type=int, default=200)
    commands.add_parser("filter")
    commands.add_parser("stats")
    args = parser.parse_args(argv)

    if args.command == "filter":
        filter_candidates()
        return 0
    if args.command == "stats":
        print("raw deduped candidates:", len(all_raw_candidates()))
        return 0

    token = load_token()
    if args.command == "collect-followees":
        collect_followees(token, args.seeds.split(","), args.max)
    elif args.command == "collect-hashtags":
        collect_hashtags(token, args.tags.split(","), args.limit)
    else:
        enrich_candidates(token, args.max)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
