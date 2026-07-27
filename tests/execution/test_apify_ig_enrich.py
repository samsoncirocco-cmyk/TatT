from execution.apify_ig_enrich import (
    build_chunk_observations,
    extract_images,
    make_profile_record,
    parse_args,
    row_handle,
)
from execution.ig_refresh_state import update_handle_state


def test_every_requested_handle_gets_an_observation():
    observations = build_chunk_observations(
        ["@active.artist", "gone.artist", "missing.row"],
        [
            {"username": "active.artist", "biography": "Tattoo artist"},
            {"requestedUsername": "gone.artist", "error": "User not found"},
        ],
        "SUCCEEDED",
    )
    assert observations["active.artist"][0] == "active"
    assert observations["gone.artist"][0] == "not_found"
    assert observations["missing.row"][:2] == (
        "transient",
        "actor-succeeded-returned-no-row",
    )


def test_row_handle_accepts_actor_error_and_url_shapes():
    assert row_handle({"requestedUsername": "@Ink.Sam"}) == "ink.sam"
    assert row_handle({"inputUrl": "https://instagram.com/Ink.Sam/"}) == "ink.sam"


def test_record_carries_filter_and_freshness_evidence():
    row = {
        "biography": "Blackwork tattoo artist",
        "followersCount": 42,
        "latestPosts": [
            {"displayUrl": "https://cdn.example/one.jpg"},
            {"displayUrl": "https://cdn.example/one.jpg"},
        ],
    }
    record = make_profile_record(
        artist_id="artist_1",
        handle="ink.sam",
        row=row,
        verdict=False,
        filter_reason="shop-account",
        filter_bypassed=True,
        refreshed_at="2026-07-27T00:00:00Z",
    )
    assert record["looksBookable"] is False
    assert record["filterReason"] == "shop-account"
    assert record["filterBypassed"] is True
    assert record["refreshedAt"] == "2026-07-27T00:00:00Z"
    assert extract_images(row) == ["https://cdn.example/one.jpg"]


def test_filter_is_on_by_default_and_bypass_is_explicit():
    assert parse_args([]).no_filter is False
    assert parse_args(["--no-filter"]).no_filter is True


def test_bookability_can_be_persisted_alongside_refresh_state():
    state = update_handle_state(
        None,
        status="active",
        checked_at="2026-07-27T00:00:00Z",
    )
    state["looksBookable"] = False
    state["bookabilityReason"] = "shop-account"
    assert state["lastRefreshStatus"] == "active"
    assert state["looksBookable"] is False
