"""Tests for scrape_scheduler state handling (no network)."""

import json

from execution.scrape_scheduler import CITY_QUEUE, merge_into_master


def make_artist(handle, city="Denver", state="CO"):
    return {
        "id": f"artist_{handle}",
        "instagram": f"@{handle}",
        "name": handle.title(),
        "city": city,
        "state": state,
    }


def make_shop(place_id, city="Denver", state="CO"):
    return {
        "place_id": place_id,
        "shopName": f"Shop {place_id}",
        "address": "123 Main St",
        "city": city,
        "state": state,
        "lat": 39.7,
        "lng": -104.9,
        "rating": 4.5,
        "reviewCount": 10,
        "website": "https://example.com",
        "artists": [],  # crawl adds this; merge must not persist it
    }


class TestMergeIntoMaster:
    def test_first_merge_creates_master(self, tmp_path):
        dataset = {
            "artists": [make_artist("felix")],
            "cities": ["Denver, CO"],
            "styles": ["Realism"],
        }
        new_a, new_s, master = merge_into_master(
            tmp_path, dataset, [make_shop("p1")])
        assert (new_a, new_s) == (1, 1)
        assert master["artists"][0]["instagram"] == "@felix"
        on_disk = json.loads((tmp_path / "master.json").read_text())
        assert len(on_disk["shops"]) == 1
        assert "artists" not in on_disk["shops"][0]

    def test_dedupes_across_ticks(self, tmp_path):
        dataset = {
            "artists": [make_artist("felix")],
            "cities": ["Denver, CO"],
            "styles": ["Realism"],
        }
        merge_into_master(tmp_path, dataset, [make_shop("p1")])
        dataset2 = {
            "artists": [make_artist("felix"), make_artist("newguy")],
            "cities": ["Denver, CO", "Boulder, CO"],
            "styles": ["Realism", "Blackwork"],
        }
        new_a, new_s, master = merge_into_master(
            tmp_path, dataset2, [make_shop("p1"), make_shop("p2")])
        assert (new_a, new_s) == (1, 1)  # felix and p1 already known
        assert len(master["artists"]) == 2
        assert len(master["shops"]) == 2
        assert master["cities"] == ["Boulder, CO", "Denver, CO"]
        assert master["styles"] == ["Blackwork", "Realism"]


class TestCityQueue:
    def test_no_duplicate_city_state_pairs_after_init_dedupe(self):
        seen = set()
        deduped = []
        for city, state in CITY_QUEUE:
            key = (city.lower(), state)
            if key not in seen:
                seen.add(key)
                deduped.append(key)
        # enough cities to plausibly reach 10k artists+shops
        assert len(deduped) >= 150

    def test_queue_entries_are_city_state_tuples(self):
        for entry in CITY_QUEUE:
            assert len(entry) == 2
            city, state = entry
            assert city and 2 <= len(state) <= 2
