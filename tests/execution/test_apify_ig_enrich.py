import json
import multiprocessing
import time
from pathlib import Path

import pytest

import execution.apify_ig_enrich as enrich
from execution.apify_ig_enrich import (
    api,
    build_chunk_observations,
    extract_images,
    load_token,
    main,
    make_profile_record,
    merge_run_report,
    parse_args,
    row_handle,
    run_chunk,
    update_json_locked,
)
from execution.ig_refresh_state import update_handle_state


def _locked_worker(path: str, key: str) -> None:
    def merge(current):
        time.sleep(0.05)
        return {**current, key: True}

    update_json_locked(Path(path), {}, merge)


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
    assert parse_args([]).execute is False
    assert parse_args(["--execute"]).execute is True


def test_dry_run_never_loads_token_or_writes_artifacts(tmp_path, monkeypatch, capsys):
    queue = tmp_path / "queue.json"
    queue.write_text(json.dumps([{"id": "artist-1", "ig": "ink.sam"}]))
    monkeypatch.setattr(
        enrich,
        "load_token",
        lambda: (_ for _ in ()).throw(AssertionError("token loaded during dry run")),
    )
    ledger = tmp_path / "ledger.json"
    assert main(["--queue", str(queue), "--status-ledger", str(ledger)]) == 0
    assert "DRY RUN" in capsys.readouterr().out
    assert not ledger.exists()


def test_token_is_environment_only(monkeypatch):
    monkeypatch.delenv("APIFY_TOKEN", raising=False)
    with pytest.raises(RuntimeError, match="APIFY_TOKEN is required"):
        load_token()
    monkeypatch.setenv("APIFY_TOKEN", "secret")
    assert load_token() == "secret"


def test_api_uses_bearer_header(monkeypatch):
    captured = {}

    class Response:
        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return None

        def read(self):
            return b'{"data": {"ok": true}}'

    def fake_urlopen(request, timeout):
        captured["request"] = request
        captured["timeout"] = timeout
        return Response()

    monkeypatch.setattr(enrich.urllib.request, "urlopen", fake_urlopen)
    result = api(
        "GET",
        "https://api.apify.com/v2/example",
        token="secret-value",
    )
    assert result["data"]["ok"] is True
    assert captured["request"].get_header("Authorization") == "Bearer secret-value"
    assert "secret-value" not in captured["request"].full_url


def test_actor_urls_never_include_token(monkeypatch):
    requests = []

    def fake_api(method, url, body=None, timeout=120, *, token):
        requests.append((method, url, token))
        if "/acts/" in url:
            return {"data": {"id": "run-1", "defaultDatasetId": "dataset-1"}}
        if "/actor-runs/" in url:
            return {"data": {"id": "run-1", "status": "SUCCEEDED"}}
        return []

    monkeypatch.setattr(enrich, "api", fake_api)
    run_chunk(["ink.sam"], "secret-value")
    assert requests
    assert all(token == "secret-value" for _, _, token in requests)
    assert all("secret-value" not in url and "token=" not in url for _, url, _ in requests)


def test_paid_run_id_survives_a_polling_failure(monkeypatch):
    def fake_api(method, url, body=None, timeout=120, *, token):
        if "/acts/" in url:
            return {"data": {"id": "paid-run", "defaultDatasetId": "dataset-1"}}
        raise OSError("poll failed")

    monkeypatch.setattr(enrich, "api", fake_api)
    run, items = run_chunk(["ink.sam"], "secret-value")
    assert run["id"] == "paid-run"
    assert run["status"] == "ERROR"
    assert items == []


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


def test_cost_report_accumulates_a_sweep_and_dedupes_actor_runs():
    first = merge_run_report(
        {},
        sweep_id="2026-Q3",
        checked_at="2026-07-27T00:00:00Z",
        run_slice={"start": 0, "count": 100},
        summary={"written": 80},
        actor_runs=[{"id": "run-1", "usageTotalUsd": 1.25}],
    )
    second = merge_run_report(
        first,
        sweep_id="2026-Q3",
        checked_at="2026-07-28T00:00:00Z",
        run_slice={"start": 100, "count": 100},
        summary={"written": 75},
        actor_runs=[
            {"id": "run-1", "usageTotalUsd": 1.25},
            {"id": "run-2", "usageTotalUsd": "2.50"},
        ],
    )
    sweep = second["sweeps"]["2026-Q3"]
    assert len(sweep["actorRuns"]) == 2
    assert sweep["apifyUsageTotalUsd"] == 3.75
    assert sweep["apifyUsageKnownSubtotalUsd"] == 3.75
    assert sweep["apifyUsageMissingRunCount"] == 0
    assert sweep["apifyUsagePricingStatus"] == "complete"
    assert sweep["lastInvocation"]["slice"]["start"] == 100


def test_cost_total_is_unknown_when_any_actor_run_has_no_price():
    report = merge_run_report(
        {},
        sweep_id="2026-Q3",
        checked_at="2026-07-27T00:00:00Z",
        run_slice={"start": 0, "count": 100},
        summary={"written": 80},
        actor_runs=[
            {"id": "run-1", "usageTotalUsd": 1.25},
            {"id": "run-2", "usageTotalUsd": None},
        ],
    )
    sweep = report["sweeps"]["2026-Q3"]
    assert sweep["apifyUsageKnownSubtotalUsd"] == 1.25
    assert sweep["apifyUsageMissingRunCount"] == 1
    assert sweep["apifyUsagePricingStatus"] == "incomplete"
    assert sweep["apifyUsageTotalUsd"] is None


def test_locked_json_updates_merge_against_latest_file(tmp_path):
    path = tmp_path / "shared.json"
    update_json_locked(path, {}, lambda current: {**current, "worker-a": 1})
    update_json_locked(path, {}, lambda current: {**current, "worker-b": 2})
    assert json.loads(path.read_text()) == {"worker-a": 1, "worker-b": 2}


def test_parallel_locked_json_updates_do_not_lose_a_worker(tmp_path):
    path = tmp_path / "shared.json"
    context = multiprocessing.get_context("fork")
    workers = [
        context.Process(target=_locked_worker, args=(str(path), key))
        for key in ("worker-a", "worker-b")
    ]
    for worker in workers:
        worker.start()
    for worker in workers:
        worker.join(timeout=5)
        assert worker.exitcode == 0
    assert json.loads(path.read_text()) == {"worker-a": True, "worker-b": True}
