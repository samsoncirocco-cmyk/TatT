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


def test_discovery_requires_explicit_valid_queue(tmp_path):
    with pytest.raises(SystemExit):
        discovery.main(["stats"])
    with pytest.raises(RuntimeError, match="does not exist"):
        discovery.main(["--queue", str(tmp_path / "missing.json"), "stats"])
    empty = tmp_path / "empty.json"
    empty.write_text("[]")
    with pytest.raises(RuntimeError, match="non-empty"):
        discovery.main(["--queue", str(empty), "stats"])
