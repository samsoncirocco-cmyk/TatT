"""
Tests for execution/migrate_localStorage.py
"""

import pytest
import json
from unittest.mock import patch, MagicMock
from execution.migrate_localStorage import (
    parse_version_history,
    is_data_uri,
    upload_data_uri_to_storage,
    migrate_version_to_firestore,
    main
)


def test_parse_version_history(sample_version_history, tmp_path):
    """Test parsing valid version history JSON."""
    json_file = tmp_path / "version_history.json"
    json_file.write_text(json.dumps(sample_version_history))

    data = parse_version_history(str(json_file))

    assert "version_history_abc123" in data
    assert isinstance(data["version_history_abc123"], list)


def test_parse_version_history_invalid_format(tmp_path):
    """Test parsing invalid format."""
    json_file = tmp_path / "invalid.json"
    json_file.write_text(json.dumps([1, 2, 3]))

    with pytest.raises(ValueError, match="must be an object"):
        parse_version_history(str(json_file))


def test_parse_version_history_missing_key(tmp_path):
    """Test parsing without version_history key."""
    json_file = tmp_path / "no_key.json"
    json_file.write_text(json.dumps({"other_key": []}))

    with pytest.raises(ValueError, match="No version_history_"):
        parse_version_history(str(json_file))


def test_is_data_uri():
    """Test data URI detection."""
    assert is_data_uri("data:image/png;base64,iVBORw0KGg") is True
    assert is_data_uri("https://example.com/image.png") is False
    assert is_data_uri("http://localhost/image.jpg") is False


def test_upload_data_uri_to_storage(mock_storage_client):
    """Test uploading data URI to Cloud Storage."""
    data_uri = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

    mock_blob = MagicMock()
    mock_blob.public_url = "https://storage.googleapis.com/bucket/test.png"

    mock_bucket = MagicMock()
    mock_bucket.blob.return_value = mock_blob

    mock_storage_client.bucket.return_value = mock_bucket

    url = upload_data_uri_to_storage(data_uri, "test-bucket", "user123", "design456")

    assert url == "https://storage.googleapis.com/bucket/test.png"
    mock_blob.upload_from_string.assert_called_once()
    mock_blob.make_public.assert_called_once()


def test_upload_data_uri_invalid_format():
    """Test uploading invalid data URI."""
    invalid_uri = "data:invalid"

    with pytest.raises(ValueError, match="Invalid data URI"):
        upload_data_uri_to_storage(invalid_uri, "bucket", "user", "design")


def test_migrate_version_to_firestore_dry_run(sample_version_history, mock_firestore_client):
    """Test migration with dry run."""
    version = sample_version_history["version_history_abc123"][0]

    # Dry run should not call Firestore
    migrate_version_to_firestore(
        "test-project",
        "user123",
        "design456",
        version,
        "test-bucket",
        dry_run=True
    )

    # Should not have created any documents
    mock_firestore_client.collection.assert_not_called()


def test_migrate_version_to_firestore(sample_version_history, mock_firestore_client):
    """Test actual migration."""
    version = sample_version_history["version_history_abc123"][0]

    # Setup mocks
    mock_layer_ref = MagicMock()
    mock_layers_collection = MagicMock()
    mock_layers_collection.document.return_value = mock_layer_ref

    mock_version_ref = MagicMock()
    mock_version_ref.collection.return_value = mock_layers_collection

    mock_versions_collection = MagicMock()
    mock_versions_collection.document.return_value = mock_version_ref

    mock_design_ref = MagicMock()
    mock_design_ref.collection.return_value = mock_versions_collection

    mock_designs_collection = MagicMock()
    mock_designs_collection.document.return_value = mock_design_ref

    mock_user_ref = MagicMock()
    mock_user_ref.collection.return_value = mock_designs_collection

    mock_users_collection = MagicMock()
    mock_users_collection.document.return_value = mock_user_ref

    mock_firestore_client.collection.return_value = mock_users_collection

    migrate_version_to_firestore(
        "test-project",
        "user123",
        "design456",
        version,
        "test-bucket",
        dry_run=False
    )

    # Verify version document was created
    mock_version_ref.set.assert_called_once()

    # Verify layer document was created
    mock_layer_ref.set.assert_called_once()


def test_migrate_version_handles_data_uri(sample_version_history, mock_firestore_client, mock_storage_client):
    """Test migration converts data URIs to Cloud Storage URLs."""
    version = sample_version_history["version_history_abc123"][1]  # Has data URI

    # Setup Firestore mocks
    mock_layer_ref = MagicMock()
    mock_layers_collection = MagicMock()
    mock_layers_collection.document.return_value = mock_layer_ref

    mock_version_ref = MagicMock()
    mock_version_ref.collection.return_value = mock_layers_collection

    mock_versions_collection = MagicMock()
    mock_versions_collection.document.return_value = mock_version_ref

    mock_design_ref = MagicMock()
    mock_design_ref.collection.return_value = mock_versions_collection

    mock_designs_collection = MagicMock()
    mock_designs_collection.document.return_value = mock_design_ref

    mock_user_ref = MagicMock()
    mock_user_ref.collection.return_value = mock_designs_collection

    mock_users_collection = MagicMock()
    mock_users_collection.document.return_value = mock_user_ref

    mock_firestore_client.collection.return_value = mock_users_collection

    # Setup Storage mock
    mock_blob = MagicMock()
    mock_blob.public_url = "https://storage.googleapis.com/bucket/image.png"

    mock_bucket = MagicMock()
    mock_bucket.blob.return_value = mock_blob

    mock_storage_client.bucket.return_value = mock_bucket

    migrate_version_to_firestore(
        "test-project",
        "user123",
        "design456",
        version,
        "test-bucket",
        dry_run=False
    )

    # Verify data URI was uploaded
    mock_blob.upload_from_string.assert_called()


def test_main_dry_run(sample_version_history, tmp_path, capsys):
    """Test main with --dry-run flag."""
    json_file = tmp_path / "version_history.json"
    json_file.write_text(json.dumps(sample_version_history))

    with patch('sys.argv', ['migrate_localStorage.py', '--input', str(json_file), '--user-id', 'user123', '--dry-run']):
        exit_code = main()

    assert exit_code == 0
    captured = capsys.readouterr()
    assert "DRY RUN" in captured.out
    assert "users/user123/designs/" in captured.out


def test_main_version_mapping(sample_version_history, tmp_path, capsys):
    """Test version to Firestore path mapping."""
    json_file = tmp_path / "version_history.json"
    json_file.write_text(json.dumps(sample_version_history))

    with patch('sys.argv', ['migrate_localStorage.py', '--input', str(json_file), '--user-id', 'user123', '--dry-run']):
        exit_code = main()

    captured = capsys.readouterr()
    assert "Version 1:" in captured.out
    assert "Version 2:" in captured.out
    assert "Layers: 1" in captured.out


def test_main_data_uri_detection(sample_version_history, tmp_path, capsys):
    """Test data URI detection in dry run."""
    json_file = tmp_path / "version_history.json"
    json_file.write_text(json.dumps(sample_version_history))

    with patch('sys.argv', ['migrate_localStorage.py', '--input', str(json_file), '--user-id', 'user123', '--dry-run']):
        exit_code = main()

    captured = capsys.readouterr()
    # Version 1 has URL, version 2 has data URI
    assert "Image URL type: URL" in captured.out or "data URI" in captured.out


def test_main_file_not_found(capsys):
    """Test main with non-existent file."""
    with patch('sys.argv', ['migrate_localStorage.py', '--input', '/nonexistent.json', '--user-id', 'user123']):
        exit_code = main()

    assert exit_code == 1
    captured = capsys.readouterr()
    assert "File not found" in captured.out


def test_main_invalid_json(tmp_path, capsys):
    """Test main with invalid JSON."""
    json_file = tmp_path / "invalid.json"
    json_file.write_text("not valid json")

    with patch('sys.argv', ['migrate_localStorage.py', '--input', str(json_file), '--user-id', 'user123']):
        exit_code = main()

    assert exit_code == 1
    captured = capsys.readouterr()
    assert "Invalid JSON" in captured.out


def test_main_missing_project_id(tmp_path, capsys):
    """Test main without project ID."""
    json_file = tmp_path / "version_history.json"
    json_file.write_text(json.dumps({"version_history_test": []}))

    with patch('sys.argv', ['migrate_localStorage.py', '--input', str(json_file), '--user-id', 'user123']):
        with patch.dict('os.environ', {}, clear=True):
            exit_code = main()

    assert exit_code == 1
    captured = capsys.readouterr()
    assert "ERROR" in captured.out
