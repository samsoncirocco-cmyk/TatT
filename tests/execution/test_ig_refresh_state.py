from execution.ig_refresh_state import classify_scrape_result, update_handle_state


def test_classifies_confirmed_dead_private_and_transient_results_separately():
    assert classify_scrape_result({"username": "ink.sam"}) == ("active", None)
    assert classify_scrape_result({"username": "ink.sam", "private": True}) == (
        "private",
        "profile-private",
    )
    assert classify_scrape_result({"error": "Instagram user not found"})[0] == "not_found"
    assert classify_scrape_result({"error": "proxy timeout"})[0] == "transient"
    assert classify_scrape_result(None) == ("transient", "actor-returned-no-row")


def test_only_marks_stale_after_consecutive_confirmed_dead_refreshes():
    state = None
    for attempt in range(1, 4):
        state = update_handle_state(
            state,
            status="not_found",
            checked_at=f"2026-0{attempt}-01T00:00:00Z",
            dead_threshold=3,
        )
        assert state["stale"] is (attempt == 3)
        assert state["consecutiveDeadRefreshes"] == attempt


def test_transient_failure_never_creates_or_clears_stale_and_active_recovers():
    first = update_handle_state(
        None,
        status="not_found",
        checked_at="2026-01-01T00:00:00Z",
        dead_threshold=1,
    )
    transient = update_handle_state(
        first,
        status="transient",
        checked_at="2026-02-01T00:00:00Z",
        reason="actor timeout",
    )
    assert transient["stale"] is True
    assert transient["consecutiveDeadRefreshes"] == 0

    active = update_handle_state(
        transient,
        status="active",
        checked_at="2026-03-01T00:00:00Z",
    )
    assert active["stale"] is False
    assert active["lastSeenAt"] == "2026-03-01T00:00:00Z"
