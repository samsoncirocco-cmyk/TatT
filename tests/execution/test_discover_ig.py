import json

import pytest

import execution.discover_ig as discovery


def write_queue(path):
    path.write_text(json.dumps([{"id": "artist-1", "ig": "@ink.sam"}]))


def test_discovery_token_is_environment_only(monkeypatch):
    monkeypatch.delenv("APIFY_TOKEN", raising=False)
    with pytest.raises(RuntimeError, match="APIFY_TOKEN is required"):
        discovery.load_token()
    monkeypatch.setenv("APIFY_TOKEN", "secret")
    assert discovery.load_token() == "secret"


def test_discovery_api_uses_bearer_header_and_clean_url(monkeypatch):
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

    monkeypatch.setattr(discovery.urllib.request, "urlopen", fake_urlopen)
    result = discovery.api("secret-value", "GET", "/actor-runs/run-1")
    assert result["data"]["ok"] is True
    assert captured["request"].get_header("Authorization") == "Bearer secret-value"
    assert "secret-value" not in captured["request"].full_url
    assert "token=" not in captured["request"].full_url


def test_paid_discovery_is_dry_run_without_execute(tmp_path, monkeypatch, capsys):
    queue = tmp_path / "queue.json"
    write_queue(queue)
    monkeypatch.setattr(
        discovery,
        "load_token",
        lambda: (_ for _ in ()).throw(AssertionError("token loaded during dry run")),
    )
    assert (
        discovery.main(
            [
                "--queue",
                str(queue),
                "--out",
                str(tmp_path / "out"),
                "collect-followees",
                "--seeds",
                "ink.seed",
            ]
        )
        == 0
    )
    assert "DRY RUN" in capsys.readouterr().out
    assert not (tmp_path / "out").exists()


def test_paid_discovery_requires_sweep_id_before_loading_token(tmp_path, monkeypatch):
    queue = tmp_path / "queue.json"
    write_queue(queue)
    monkeypatch.setattr(
        discovery,
        "load_token",
        lambda: (_ for _ in ()).throw(AssertionError("token loaded without sweep ID")),
    )
    with pytest.raises(SystemExit):
        discovery.main(
            [
                "--queue",
                str(queue),
                "--execute",
                "collect-followees",
                "--seeds",
                "ink.seed",
            ]
        )


def test_discovery_requires_explicit_valid_queue(tmp_path):
    with pytest.raises(SystemExit):
        discovery.main(["stats"])
    with pytest.raises(RuntimeError, match="does not exist"):
        discovery.main(["--queue", str(tmp_path / "missing.json"), "stats"])
    empty = tmp_path / "empty.json"
    empty.write_text("[]")
    with pytest.raises(RuntimeError, match="non-empty"):
        discovery.main(["--queue", str(empty), "stats"])


def test_ambiguous_discovery_post_is_durably_reported_and_not_cached(
    tmp_path,
    monkeypatch,
):
    queue = tmp_path / "queue.json"
    write_queue(queue)
    report = tmp_path / "discovery-report.json"
    out = tmp_path / "out"
    monkeypatch.setattr(discovery, "load_token", lambda: "secret")
    monkeypatch.setattr(
        discovery,
        "api",
        lambda *_args, **_kwargs: (_ for _ in ()).throw(
            OSError("unknown POST result")
        ),
    )

    with pytest.raises(RuntimeError, match="failed and was not cached"):
        discovery.main(
            [
                "--queue",
                str(queue),
                "--out",
                str(out),
                "--run-report",
                str(report),
                "--sweep-id",
                "discovery-1",
                "--execute",
                "collect-followees",
                "--seeds",
                "ink.seed",
            ]
        )

    sweep = json.loads(report.read_text())["sweeps"]["discovery-1"]
    assert len(sweep["actorRuns"]) == 1
    assert sweep["actorRuns"][0]["status"] == "POST_ERROR"
    assert sweep["apifyUsageAmbiguousAttemptCount"] == 1
    assert sweep["apifyUsagePricingStatus"] == "incomplete"
    assert not (out / "raw_followees.json").exists()


@pytest.mark.parametrize("actor_status", ["RUNNING", "FAILED"])
def test_nonterminal_or_failed_discovery_actor_never_fetches_or_caches(
    actor_status,
    monkeypatch,
):
    requests = []

    def fake_api(_token, method, path, body=None, timeout=180):
        requests.append((method, path))
        if method == "POST":
            return {
                "data": {
                    "id": "run-1",
                    "defaultDatasetId": "dataset-1",
                    "status": "READY",
                }
            }
        return {
            "data": {
                "id": "run-1",
                "status": actor_status,
                "usageTotalUsd": 0.25,
            }
        }

    monkeypatch.setattr(discovery, "api", fake_api)
    monkeypatch.setattr(discovery.time, "sleep", lambda _seconds: None)
    checkpoints = []
    with pytest.raises(RuntimeError, match="did not succeed"):
        discovery.run_actor(
            "secret",
            discovery.FOLLOW_ACTOR,
            {"username": "ink.seed"},
            checkpoint=checkpoints.append,
            operation="collect-followees:ink.seed",
            poll_max=1,
            attempt_id="attempt-1",
        )
    assert all("/datasets/" not in path for _, path in requests)
    assert checkpoints[-1]["status"] == actor_status
    assert checkpoints[-1]["terminal"] is (actor_status == "FAILED")


def test_failed_discovery_seed_remains_retryable_until_terminal_success(
    tmp_path,
    monkeypatch,
):
    raw_path = tmp_path / "raw_followees.json"
    calls = {"count": 0}

    def fake_run_actor(*_args, **_kwargs):
        calls["count"] += 1
        if calls["count"] == 1:
            raise RuntimeError("actor failed")
        return "SUCCEEDED", [{"username": "new.artist"}]

    monkeypatch.setattr(discovery, "run_actor", fake_run_actor)
    with pytest.raises(RuntimeError, match="failed and was not cached"):
        discovery.collect_followees(
            "secret",
            ["ink.seed"],
            100,
            raw_path,
            lambda _record: None,
        )
    assert not raw_path.exists()

    result = discovery.collect_followees(
        "secret",
        ["ink.seed"],
        100,
        raw_path,
        lambda _record: None,
    )
    assert calls["count"] == 2
    assert result["ink.seed"] == ["new.artist"]
