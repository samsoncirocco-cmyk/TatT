#!/usr/bin/env python3
"""Unattended national scrape scheduler: one city per tick, stop at target.

Designed to run from cron/launchd every ~20 minutes with no model or human
in the loop. All state lives in a workspace directory (default
~/tatt-scraper/data) so any session or scheduled job can resume it:

  queue.json    ordered [city, state] pairs, statuses: pending|done|failed
  state.json    running totals + per-city log
  master.json   merged {artists, cities, styles} dataset (importer shape)
  scrape.log    one line per tick
  tick.lock     prevents overlapping ticks (stale after 2h)
  DONE          written when target reached; future ticks exit immediately

Commands:
  init      create queue.json/state.json (idempotent; keeps existing state)
  tick      process the next pending city, merge results, update totals
  status    print progress summary

Usage from launchd/cron:
  python execution/scrape_scheduler.py tick --workspace ~/tatt-scraper/data

The target counts unique artists + unique shops. Every tick uses the
scrape_artists pipeline (Places API discover -> polite site crawl ->
normalize), so costs and etiquette are identical to a manual run.
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from execution.scrape_artists import (  # noqa: E402
    normalize_dataset,
    places_search_city,
    crawl_shop,
    USER_AGENT,
)

import requests  # noqa: E402

DEFAULT_TARGET = 10_000
LOCK_STALE_SECONDS = 2 * 60 * 60

# Largest US metros first: best shop density per Places query. AZ cities
# excluded (covered by the initial run whose output seeds master.json).
CITY_QUEUE = [
    ("New York", "NY"), ("Los Angeles", "CA"), ("Chicago", "IL"),
    ("Houston", "TX"), ("Philadelphia", "PA"), ("San Antonio", "TX"),
    ("San Diego", "CA"), ("Dallas", "TX"), ("Austin", "TX"),
    ("Jacksonville", "FL"), ("Fort Worth", "TX"), ("Columbus", "OH"),
    ("Charlotte", "NC"), ("San Francisco", "CA"), ("Indianapolis", "IN"),
    ("Seattle", "WA"), ("Denver", "CO"), ("Washington", "DC"),
    ("Boston", "MA"), ("El Paso", "TX"), ("Nashville", "TN"),
    ("Detroit", "MI"), ("Oklahoma City", "OK"), ("Portland", "OR"),
    ("Las Vegas", "NV"), ("Memphis", "TN"), ("Louisville", "KY"),
    ("Baltimore", "MD"), ("Milwaukee", "WI"), ("Albuquerque", "NM"),
    ("Fresno", "CA"), ("Sacramento", "CA"), ("Kansas City", "MO"),
    ("Atlanta", "GA"), ("Omaha", "NE"), ("Colorado Springs", "CO"),
    ("Raleigh", "NC"), ("Miami", "FL"), ("Long Beach", "CA"),
    ("Virginia Beach", "VA"), ("Oakland", "CA"), ("Minneapolis", "MN"),
    ("Tampa", "FL"), ("Tulsa", "OK"), ("New Orleans", "LA"),
    ("Wichita", "KS"), ("Cleveland", "OH"), ("Bakersfield", "CA"),
    ("Aurora", "CO"), ("Anaheim", "CA"), ("Honolulu", "HI"),
    ("Santa Ana", "CA"), ("Riverside", "CA"), ("Corpus Christi", "TX"),
    ("Lexington", "KY"), ("San Juan", "PR"), ("Stockton", "CA"),
    ("St. Paul", "MN"), ("Cincinnati", "OH"), ("St. Louis", "MO"),
    ("Pittsburgh", "PA"), ("Greensboro", "NC"), ("Lincoln", "NE"),
    ("Anchorage", "AK"), ("Plano", "TX"), ("Orlando", "FL"),
    ("Irvine", "CA"), ("Newark", "NJ"), ("Durham", "NC"),
    ("Chula Vista", "CA"), ("Toledo", "OH"), ("Fort Wayne", "IN"),
    ("St. Petersburg", "FL"), ("Laredo", "TX"), ("Jersey City", "NJ"),
    ("Chandler", "AZ"), ("Madison", "WI"), ("Lubbock", "TX"),
    ("Buffalo", "NY"), ("Winston-Salem", "NC"), ("Reno", "NV"),
    ("Norfolk", "VA"), ("Irving", "TX"), ("Boise", "ID"),
    ("Richmond", "VA"), ("Spokane", "WA"), ("Baton Rouge", "LA"),
    ("Tacoma", "WA"), ("San Bernardino", "CA"), ("Modesto", "CA"),
    ("Fontana", "CA"), ("Des Moines", "IA"), ("Moreno Valley", "CA"),
    ("Santa Clarita", "CA"), ("Fayetteville", "NC"), ("Birmingham", "AL"),
    ("Oxnard", "CA"), ("Rochester", "NY"), ("Port St. Lucie", "FL"),
    ("Grand Rapids", "MI"), ("Huntsville", "AL"), ("Salt Lake City", "UT"),
    ("Frisco", "TX"), ("Yonkers", "NY"), ("Amarillo", "TX"),
    ("Glendale", "CA"), ("Huntington Beach", "CA"), ("McKinney", "TX"),
    ("Montgomery", "AL"), ("Augusta", "GA"), ("Akron", "OH"),
    ("Little Rock", "AR"), ("Grand Prairie", "TX"), ("Columbus", "GA"),
    ("Tallahassee", "FL"), ("Overland Park", "KS"), ("Tempe", "AZ"),
    ("Knoxville", "TN"), ("Providence", "RI"), ("Chattanooga", "TN"),
    ("Fort Lauderdale", "FL"), ("Newport News", "VA"), ("Cape Coral", "FL"),
    ("Santa Rosa", "CA"), ("Sioux Falls", "SD"), ("Oceanside", "CA"),
    ("Jackson", "MS"), ("Garden Grove", "CA"), ("Elk Grove", "CA"),
    ("Pembroke Pines", "FL"), ("Salem", "OR"), ("Eugene", "OR"),
    ("Corona", "CA"), ("Cary", "NC"), ("Springfield", "MO"),
    ("Fort Collins", "CO"), ("Alexandria", "VA"), ("Hayward", "CA"),
    ("Lancaster", "CA"), ("Lakewood", "CO"), ("Clarksville", "TN"),
    ("Palmdale", "CA"), ("Salinas", "CA"), ("Hollywood", "FL"),
    ("Springfield", "MA"), ("Macon", "GA"), ("Kansas City", "KS"),
    ("Sunnyvale", "CA"), ("Pomona", "CA"), ("Killeen", "TX"),
    ("Escondido", "CA"), ("Pasadena", "TX"), ("Naperville", "IL"),
    ("Bellevue", "WA"), ("Joliet", "IL"), ("Murfreesboro", "TN"),
    ("Midland", "TX"), ("Rockford", "IL"), ("Paterson", "NJ"),
    ("Savannah", "GA"), ("Bridgeport", "CT"), ("Torrance", "CA"),
    ("McAllen", "TX"), ("Syracuse", "NY"), ("Surprise", "AZ"),
    ("Denton", "TX"), ("Roseville", "CA"), ("Thornton", "CO"),
    ("Miramar", "FL"), ("Pasadena", "CA"), ("Mesquite", "TX"),
    ("Olathe", "KS"), ("Santa Maria", "CA"), ("Charleston", "SC"),
    ("Columbia", "SC"), ("Portland", "ME"), ("Burlington", "VT"),
    ("Asheville", "NC"), ("Savannah", "GA"), ("Key West", "FL"),
    ("Missoula", "MT"), ("Billings", "MT"), ("Fargo", "ND"),
    ("Rapid City", "SD"), ("Cheyenne", "WY"), ("Santa Fe", "NM"),
    ("Boulder", "CO"), ("Ann Arbor", "MI"), ("Madison", "WI"),
    ("Iowa City", "IA"), ("Lawrence", "KS"), ("Athens", "GA"),
    ("Gainesville", "FL"), ("Wilmington", "NC"), ("Myrtle Beach", "SC"),
]


def load_json(path, default):
    try:
        return json.loads(path.read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        return default


def log_line(ws, message):
    stamp = time.strftime("%Y-%m-%d %H:%M:%S")
    with open(ws / "scrape.log", "a") as f:
        f.write(f"{stamp} {message}\n")
    print(message)


def cmd_init(ws, args):
    queue_path = ws / "queue.json"
    if queue_path.exists() and not args.reset_queue:
        print(f"queue.json already exists ({queue_path}); keeping it")
    else:
        seen, queue = set(), []
        for city, state in CITY_QUEUE:
            key = (city.lower(), state)
            if key not in seen:
                seen.add(key)
                queue.append({"city": city, "state": state, "status": "pending"})
        queue_path.write_text(json.dumps(queue, indent=1))
        print(f"queue.json: {len(queue)} cities")
    state_path = ws / "state.json"
    if not state_path.exists():
        state_path.write_text(json.dumps({
            "target": args.target,
            "total_artists": 0,
            "total_shops": 0,
            "cities_done": 0,
            "cities_failed": 0,
            "history": [],
        }, indent=1))
        print("state.json initialized")


def merge_into_master(ws, dataset, shops):
    master = load_json(ws / "master.json", {"artists": [], "cities": [],
                                            "styles": [], "shops": []})
    known_handles = {a["instagram"] for a in master["artists"]}
    known_places = {s["place_id"] for s in master["shops"]}
    new_artists = [a for a in dataset["artists"]
                   if a["instagram"] not in known_handles]
    new_shops = [{k: s.get(k) for k in
                  ("place_id", "shopName", "address", "city", "state",
                   "lat", "lng", "rating", "reviewCount", "website")}
                 for s in shops if s["place_id"] not in known_places]
    master["artists"].extend(new_artists)
    master["shops"].extend(new_shops)
    master["cities"] = sorted(set(master["cities"]) | set(dataset["cities"]))
    master["styles"] = sorted(set(master["styles"]) | set(dataset["styles"]))
    (ws / "master.json").write_text(json.dumps(master, indent=1))
    return len(new_artists), len(new_shops), master


def cmd_tick(ws, args):
    if (ws / "DONE").exists():
        print("target reached; nothing to do (delete DONE to resume)")
        return

    lock = ws / "tick.lock"
    if lock.exists():
        age = time.time() - lock.stat().st_mtime
        if age < LOCK_STALE_SECONDS:
            print(f"previous tick still running ({int(age)}s); skipping")
            return
        log_line(ws, f"WARN stale lock ({int(age)}s) — taking over")
    lock.write_text(str(os.getpid()))

    try:
        api_key = args.key or os.environ.get("GOOGLE_PLACES_API_KEY")
        if not api_key and (ws / "places-key.txt").exists():
            api_key = (ws / "places-key.txt").read_text().strip()
        if not api_key:
            log_line(ws, "ERROR no Places API key (env or places-key.txt)")
            return

        queue = load_json(ws / "queue.json", [])
        state = load_json(ws / "state.json", {})
        entry = next((c for c in queue if c["status"] == "pending"), None)
        if entry is None:
            log_line(ws, "queue exhausted before target; add more cities")
            (ws / "DONE").write_text("queue exhausted")
            return

        city, st = entry["city"], entry["state"]
        log_line(ws, f"tick: {city}, {st}")
        try:
            shops = places_search_city(city, st, api_key, args.max_shops)
            session = requests.Session()
            session.headers["User-Agent"] = USER_AGENT
            raw_shops = []
            for shop in shops:
                found = crawl_shop(session, shop, args.max_pages, args.delay)
                shop_out = dict(shop)
                shop_out["artists"] = list(found.values())
                raw_shops.append(shop_out)
            dataset = normalize_dataset(raw_shops)
            new_a, new_s, master = merge_into_master(ws, dataset, shops)
            entry["status"] = "done"
            state["cities_done"] = state.get("cities_done", 0) + 1
        except Exception as e:  # noqa: BLE001 — unattended: log, mark, move on
            entry["status"] = "failed"
            entry["error"] = f"{type(e).__name__}: {e}"
            state["cities_failed"] = state.get("cities_failed", 0) + 1
            log_line(ws, f"FAILED {city}, {st}: {entry['error']}")
            (ws / "queue.json").write_text(json.dumps(queue, indent=1))
            (ws / "state.json").write_text(json.dumps(state, indent=1))
            return

        state["total_artists"] = len(master["artists"])
        state["total_shops"] = len(master["shops"])
        state.setdefault("history", []).append({
            "city": f"{city}, {st}",
            "new_artists": new_a,
            "new_shops": new_s,
            "at": time.strftime("%Y-%m-%dT%H:%M:%S"),
        })
        (ws / "queue.json").write_text(json.dumps(queue, indent=1))
        (ws / "state.json").write_text(json.dumps(state, indent=1))

        total = state["total_artists"] + state["total_shops"]
        log_line(ws, f"done: {city}, {st} +{new_a} artists +{new_s} shops "
                     f"| total {state['total_artists']} artists + "
                     f"{state['total_shops']} shops = {total}/{state.get('target', DEFAULT_TARGET)}")
        if total >= state.get("target", DEFAULT_TARGET):
            (ws / "DONE").write_text(f"target reached: {total}")
            log_line(ws, f"TARGET REACHED ({total}); scheduler will idle")
    finally:
        lock.unlink(missing_ok=True)


def cmd_status(ws, _args):
    state = load_json(ws / "state.json", {})
    queue = load_json(ws / "queue.json", [])
    pending = sum(1 for c in queue if c["status"] == "pending")
    total = state.get("total_artists", 0) + state.get("total_shops", 0)
    print(json.dumps({
        "artists": state.get("total_artists", 0),
        "shops": state.get("total_shops", 0),
        "combined": total,
        "target": state.get("target", DEFAULT_TARGET),
        "cities_done": state.get("cities_done", 0),
        "cities_failed": state.get("cities_failed", 0),
        "cities_pending": pending,
        "done": (ws / "DONE").exists(),
        "last_5": state.get("history", [])[-5:],
    }, indent=1))


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("command", choices=["init", "tick", "status"])
    parser.add_argument("--workspace", default=os.path.expanduser("~/tatt-scraper/data"))
    parser.add_argument("--target", type=int, default=DEFAULT_TARGET)
    parser.add_argument("--key")
    parser.add_argument("--max-shops", type=int, default=20)
    parser.add_argument("--max-pages", type=int, default=25)
    parser.add_argument("--delay", type=float, default=0.7)
    parser.add_argument("--reset-queue", action="store_true")
    args = parser.parse_args()

    ws = Path(args.workspace)
    ws.mkdir(parents=True, exist_ok=True)
    {"init": cmd_init, "tick": cmd_tick, "status": cmd_status}[args.command](ws, args)


if __name__ == "__main__":
    main()
