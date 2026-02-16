"""
Tests for execution/seed_artists.py
"""

import pytest
import json
import tempfile
from unittest.mock import patch, MagicMock
from execution.seed_artists import (
    parse_artist_json,
    create_artist_cypher,
    import_artists,
    main
)


def test_parse_artist_json(sample_artist_data, tmp_path):
    """Test parsing valid artist JSON."""
    # Write sample data to temp file
    json_file = tmp_path / "artists.json"
    json_file.write_text(json.dumps(sample_artist_data))

    artists = parse_artist_json(str(json_file))

    assert len(artists) == 3
    assert artists[0]["name"] == "Artist One"
    assert "Traditional" in artists[0]["styles"]


def test_parse_artist_json_invalid_format(tmp_path):
    """Test parsing invalid JSON format."""
    json_file = tmp_path / "invalid.json"
    json_file.write_text(json.dumps({"invalid": "format"}))

    with pytest.raises(ValueError, match="array of artist objects"):
        parse_artist_json(str(json_file))


def test_parse_artist_json_missing_name(tmp_path):
    """Test parsing artist with missing name field."""
    json_file = tmp_path / "no_name.json"
    json_file.write_text(json.dumps([{"location": "Portland"}]))

    with pytest.raises(ValueError, match="missing 'name' field"):
        parse_artist_json(str(json_file))


def test_create_artist_cypher():
    """Test Cypher query generation."""
    artist = {
        "name": "Test Artist",
        "location": "Portland, OR",
        "portfolio_url": "https://example.com",
        "styles": ["Traditional", "Japanese"],
        "specialties": ["Sleeves"]
    }

    cypher = create_artist_cypher(artist)

    assert "MERGE (a:Artist {name: 'Test Artist'})" in cypher
    assert "a.location = 'Portland, OR'" in cypher
    assert "MERGE (s:Style {name: 'Traditional'})" in cypher
    assert "HAS_STYLE" in cypher
    assert "SPECIALIZES_IN" in cypher


def test_create_artist_cypher_escapes_quotes():
    """Test that single quotes are properly escaped."""
    artist = {
        "name": "O'Brien Tattoo",
        "location": "Dublin",
        "portfolio_url": "",
        "styles": [],
        "specialties": []
    }

    cypher = create_artist_cypher(artist)

    assert "O\\'Brien" in cypher


def test_import_artists_dry_run(sample_artist_data, capsys):
    """Test dry run doesn't call Neo4j."""
    with patch('neo4j.GraphDatabase.driver') as mock_driver:
        exit_code = import_artists(sample_artist_data, batch_size=100, dry_run=True)

        # Should not have called driver
        mock_driver.assert_not_called()

        # Should have printed summary
        captured = capsys.readouterr()
        assert "DRY RUN" in captured.out
        assert "Would import 3 artists" in captured.out
        assert "Artist One" in captured.out

        assert exit_code == 0


def test_import_artists_batch_processing(sample_artist_data, mock_neo4j_driver, env_vars, capsys):
    """Test batch processing with batch size smaller than total."""
    # Create 10 artists
    many_artists = sample_artist_data * 4  # 12 artists

    exit_code = import_artists(many_artists, batch_size=5, dry_run=False)

    assert exit_code == 0
    captured = capsys.readouterr()
    assert "12/12 artists" in captured.out


def test_import_artists_missing_env_vars(sample_artist_data, monkeypatch, capsys):
    """Test import fails gracefully when env vars missing."""
    monkeypatch.delenv("NEO4J_URI", raising=False)
    monkeypatch.delenv("NEO4J_PASSWORD", raising=False)

    exit_code = import_artists(sample_artist_data, batch_size=100, dry_run=False)

    assert exit_code == 1
    captured = capsys.readouterr()
    assert "ERROR" in captured.out


def test_import_artists_connection_error(sample_artist_data, env_vars, capsys):
    """Test import handles connection errors."""
    with patch('neo4j.GraphDatabase.driver') as mock_driver:
        mock_driver.side_effect = Exception("Connection failed")

        exit_code = import_artists(sample_artist_data, batch_size=100, dry_run=False)

        assert exit_code == 1
        captured = capsys.readouterr()
        assert "ERROR" in captured.out


def test_main_file_not_found(capsys):
    """Test main with non-existent file."""
    with patch('sys.argv', ['seed_artists.py', '--input', '/nonexistent/file.json']):
        exit_code = main()

    assert exit_code == 1
    captured = capsys.readouterr()
    assert "File not found" in captured.out


def test_main_invalid_json(tmp_path, capsys):
    """Test main with invalid JSON."""
    json_file = tmp_path / "invalid.json"
    json_file.write_text("not valid json")

    with patch('sys.argv', ['seed_artists.py', '--input', str(json_file)]):
        exit_code = main()

    assert exit_code == 1
    captured = capsys.readouterr()
    assert "Invalid JSON" in captured.out


def test_main_dry_run_flag(sample_artist_data, tmp_path, capsys):
    """Test main with --dry-run flag."""
    json_file = tmp_path / "artists.json"
    json_file.write_text(json.dumps(sample_artist_data))

    with patch('sys.argv', ['seed_artists.py', '--input', str(json_file), '--dry-run']):
        exit_code = main()

    assert exit_code == 0
    captured = capsys.readouterr()
    assert "DRY RUN" in captured.out
