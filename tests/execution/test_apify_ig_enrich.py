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
    base = ["--queue", "queue.json"]
    assert parse_args(base).no_filter is False
    assert parse_args([*base, "--no-filter"]).no_filter is True
    assert parse_args(base).execute is False
    assert parse_args([*base, "--execute"]).execute is True
    assert parse_args(base).count is None


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
    checkpoints = []
    run_chunk(
        ["ink.sam"],
        "secret-value",
        attempt_id="attempt-1",
        checked_at="2026-07-27T00:00:00Z",
        checkpoint=checkpoints.append,
    )
    assert requests
    assert all(token == "secret-value" for _, _, token in requests)
    assert all("secret-value" not in url and "token=" not in url for _, url, _ in requests)


def test_paid_run_id_survives_a_polling_failure(monkeypatch):
    def fake_api(method, url, body=None, timeout=120, *, token):
        if "/acts/" in url:
            return {"data": {"id": "paid-run", "defaultDatasetId": "dataset-1"}}
        raise OSError("poll failed")

    monkeypatch.setattr(enrich, "api", fake_api)
    checkpoints = []
    run, items = run_chunk(
        ["ink.sam"],
        "secret-value",
        attempt_id="attempt-1",
        checked_at="2026-07-27T00:00:00Z",
        checkpoint=checkpoints.append,
    )
    assert run["id"] == "paid-run"
    assert run["status"] == "POLL_ERROR"
    assert checkpoints[0]["status"] == "POSTING"
    assert any(record.get("id") == "paid-run" for record in checkpoints)
    assert items == []


def test_ambiguous_post_failure_is_checkpointed_before_and_after_call(monkeypatch):
    monkeypatch.setattr(
        enrich,
        "api",
        lambda *_args, **_kwargs: (_ for _ in ()).throw(OSError("unknown POST result")),
    )
    checkpoints = []
    with pytest.raises(OSError, match="unknown POST result"):
        run_chunk(
            ["ink.sam"],
            "secret-value",
            attempt_id="attempt-1",
            checked_at="2026-07-27T00:00:00Z",
            checkpoint=checkpoints.append,
        )
    assert [record["status"] for record in checkpoints] == ["POSTING", "POST_ERROR"]
    assert all(record["attemptId"] == "attempt-1" for record in checkpoints)
    assert all(record["spendStatus"] == "ambiguous" for record in checkpoints)


def test_missing_or_empty_queue_fails_instead_of_succeeding_with_zero(tmp_path):
    with pytest.raises(RuntimeError, match="does not exist"):
        main(["--queue", str(tmp_path / "missing.json")])
    empty = tmp_path / "empty.json"
    empty.write_text("[]")
    with pytest.raises(RuntimeError, match="non-empty"):
        main(["--queue", str(empty)])


def _runner_args(tmp_path, queue):
    return [
        "--execute",
        "--queue",
        str(queue),
        "--out",
        str(tmp_path / "profiles"),
        "--status-ledger",
        str(tmp_path / "ledger.json"),
        "--audit-log",
        str(tmp_path / "audit.jsonl"),
        "--run-report",
        str(tmp_path / "report.json"),
        "--sweep-id",
        "sweep-1",
        "--chunk",
        "1",
    ]


def _fake_paid_run(outcomes):
    calls = {"count": 0}

    def fake(_chunk, _token, *, attempt_id, checked_at, checkpoint):
        calls["count"] += 1
        record = {
            "attemptId": attempt_id,
            "id": f"run-{calls['count']}",
            "status": "SUCCEEDED",
            "terminal": True,
            "spendStatus": "identified",
            "usageTotalUsd": 0.5,
            "startedAt": checked_at,
        }
        checkpoint(record)
        return record, outcomes[calls["count"] - 1]

    return fake


def test_successful_same_sweep_retry_replaces_transient_and_finishes_effects(
    tmp_path,
    monkeypatch,
):
    queue = tmp_path / "queue.json"
    queue.write_text(json.dumps([{"id": "artist-1", "ig": "@ink.sam"}]))
    active_row = {
        "username": "ink.sam",
        "biography": "Blackwork tattoo artist. Books open.",
        "latestPosts": [{"displayUrl": "https://cdn.example/one.jpg"}],
    }
    monkeypatch.setattr(enrich, "load_token", lambda: "secret")
    monkeypatch.setattr(enrich, "run_chunk", _fake_paid_run([[], [active_row], [active_row]]))
    args = _runner_args(tmp_path, queue)

    assert main(args) == 0
    first = json.loads((tmp_path / "ledger.json").read_text())
    assert first["handles"]["ink.sam"]["lastRefreshStatus"] == "transient"

    assert main(args) == 0
    second = json.loads((tmp_path / "ledger.json").read_text())
    assert second["handles"]["ink.sam"]["lastRefreshStatus"] == "active"
    assert (tmp_path / "profiles" / "artist-1.json").is_file()

    assert main(args) == 0
    audit = [
        json.loads(line)
        for line in (tmp_path / "audit.jsonl").read_text().splitlines()
    ]
    assert [record["refreshStatus"] for record in audit] == ["transient", "active"]
    assert len({record["eventId"] for record in audit}) == 2


def test_ledger_checkpoint_happens_after_idempotent_downstream_effects(
    tmp_path,
    monkeypatch,
):
    queue = tmp_path / "queue.json"
    queue.write_text(json.dumps([{"id": "artist-1", "ig": "@ink.sam"}]))
    active_row = {
        "username": "ink.sam",
        "biography": "Blackwork tattoo artist. Books open.",
    }
    monkeypatch.setattr(enrich, "load_token", lambda: "secret")
    monkeypatch.setattr(enrich, "run_chunk", _fake_paid_run([[active_row], [active_row]]))
    original_write = enrich.write_json_atomic
    failed = {"ledger": False}
    ledger_path = tmp_path / "ledger.json"

    def fail_first_ledger_write(path, value):
        if path == ledger_path and not failed["ledger"]:
            failed["ledger"] = True
            raise OSError("ledger checkpoint failed")
        return original_write(path, value)

    monkeypatch.setattr(enrich, "write_json_atomic", fail_first_ledger_write)
    args = _runner_args(tmp_path, queue)
    with pytest.raises(OSError, match="ledger checkpoint failed"):
        main(args)
    assert not ledger_path.exists()
    assert (tmp_path / "profiles" / "artist-1.json").is_file()

    assert main(args) == 0
    audit = (tmp_path / "audit.jsonl").read_text().splitlines()
    assert len(audit) == 1
    assert json.loads(audit[0])["eventId"] == "sweep-1:ink.sam:active:written"
    assert json.loads(ledger_path.read_text())["handles"]["ink.sam"]["lastRefreshStatus"] == "active"


def test_same_sweep_retry_repairs_legacy_ledger_without_effect_checkpoint(
    tmp_path,
    monkeypatch,
):
    queue = tmp_path / "queue.json"
    queue.write_text(json.dumps([{"id": "artist-1", "ig": "@ink.sam"}]))
    ledger = tmp_path / "ledger.json"
    ledger.write_text(
        json.dumps(
            {
                "version": 1,
                "handles": {
                    "ink.sam": {
                        "artistId": "artist-1",
                        "lastObservationSweepId": "sweep-1",
                        "lastRefreshStatus": "active",
                        "lastRefreshAt": "2026-07-27T00:00:00Z",
                        "lastRefreshReason": None,
                        "lastSeenAt": "2026-07-27T00:00:00Z",
                        "consecutiveDeadRefreshes": 0,
                        "stale": False,
                    }
                },
            }
        )
    )
    active_row = {
        "username": "ink.sam",
        "biography": "Blackwork tattoo artist. Books open.",
    }
    monkeypatch.setattr(enrich, "load_token", lambda: "secret")
    monkeypatch.setattr(enrich, "run_chunk", _fake_paid_run([[active_row]]))

    assert main(_runner_args(tmp_path, queue)) == 0
    repaired = json.loads(ledger.read_text())["handles"]["ink.sam"]
    assert repaired["lastEffectsSweepId"] == "sweep-1"
    assert repaired["lastEffectsStatus"] == "active"
    assert (tmp_path / "profiles" / "artist-1.json").is_file()


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
        actor_runs=[
            {
                "attemptId": "attempt-1",
                "id": "run-1",
                "status": "SUCCEEDED",
                "terminal": True,
                "usageTotalUsd": 1.25,
            }
        ],
    )
    second = merge_run_report(
        first,
        sweep_id="2026-Q3",
        checked_at="2026-07-28T00:00:00Z",
        run_slice={"start": 100, "count": 100},
        summary={"written": 75},
        actor_runs=[
            {
                "attemptId": "attempt-1",
                "id": "run-1",
                "status": "SUCCEEDED",
                "terminal": True,
                "usageTotalUsd": 1.25,
            },
            {
                "attemptId": "attempt-2",
                "id": "run-2",
                "status": "FAILED",
                "terminal": True,
                "usageTotalUsd": "2.50",
            },
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
            {
                "attemptId": "attempt-1",
                "id": "run-1",
                "status": "SUCCEEDED",
                "terminal": True,
                "usageTotalUsd": 1.25,
            },
            {
                "attemptId": "attempt-2",
                "id": "run-2",
                "status": "SUCCEEDED",
                "terminal": True,
                "usageTotalUsd": None,
            },
        ],
    )
    sweep = report["sweeps"]["2026-Q3"]
    assert sweep["apifyUsageKnownSubtotalUsd"] == 1.25
    assert sweep["apifyUsageMissingRunCount"] == 1
    assert sweep["apifyUsagePricingStatus"] == "incomplete"
    assert sweep["apifyUsageTotalUsd"] is None


def test_cost_total_is_unknown_for_priced_nonterminal_run():
    report = merge_run_report(
        {},
        sweep_id="2026-Q3",
        checked_at="2026-07-27T00:00:00Z",
        run_slice={"start": 0, "count": 100},
        summary={},
        actor_runs=[
            {
                "attemptId": "attempt-1",
                "id": "run-1",
                "status": "RUNNING",
                "terminal": False,
                "usageTotalUsd": 1.25,
            }
        ],
    )
    sweep = report["sweeps"]["2026-Q3"]
    assert sweep["apifyUsageKnownSubtotalUsd"] == 1.25
    assert sweep["apifyUsageNonterminalRunCount"] == 1
    assert sweep["apifyUsagePricingStatus"] == "incomplete"
    assert sweep["apifyUsageTotalUsd"] is None


@pytest.mark.parametrize("invalid_cost", ["NaN", "Infinity", -1, True])
def test_invalid_actor_price_never_completes_total(invalid_cost):
    report = merge_run_report(
        {},
        sweep_id="2026-Q3",
        checked_at="2026-07-27T00:00:00Z",
        run_slice={"start": 0, "count": 100},
        summary={},
        actor_runs=[
            {
                "attemptId": "attempt-1",
                "id": "run-1",
                "status": "SUCCEEDED",
                "terminal": True,
                "usageTotalUsd": invalid_cost,
            }
        ],
    )
    sweep = report["sweeps"]["2026-Q3"]
    assert sweep["apifyUsageMissingRunCount"] == 1
    assert sweep["apifyUsagePricingStatus"] == "incomplete"
    assert sweep["apifyUsageTotalUsd"] is None


def test_ambiguous_post_attempt_is_preserved_and_blocks_complete_total():
    report = merge_run_report(
        {},
        sweep_id="2026-Q3",
        checked_at="2026-07-27T00:00:00Z",
        run_slice={"start": 0, "count": 100},
        summary={},
        actor_runs=[
            {
                "attemptId": "attempt-1",
                "id": None,
                "status": "POST_ERROR",
                "terminal": False,
                "spendStatus": "ambiguous",
                "usageTotalUsd": None,
            }
        ],
    )
    sweep = report["sweeps"]["2026-Q3"]
    assert len(sweep["actorRuns"]) == 1
    assert sweep["apifyUsageAmbiguousAttemptCount"] == 1
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
