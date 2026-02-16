"""
Tests for execution/check_budget.py
"""

import pytest
import json
from unittest.mock import patch, MagicMock
from execution.check_budget import (
    count_generations_from_firestore,
    calculate_spend,
    main
)


def test_count_generations_from_firestore_events_collection(mock_firestore_client):
    """Test counting from generation_events collection."""
    # Setup mock events
    events = []
    for i in range(5):
        mock_doc = MagicMock()
        mock_doc.to_dict.return_value = {"model": "sdxl", "timestamp": "2026-01-15"}
        events.append(mock_doc)

    for i in range(3):
        mock_doc = MagicMock()
        mock_doc.to_dict.return_value = {"model": "imagen", "timestamp": "2026-01-16"}
        events.append(mock_doc)

    # Mock the collection
    mock_collection = MagicMock()
    mock_collection.limit.return_value.stream.return_value = [events[0]]  # Has events
    mock_collection.stream.return_value = events

    mock_firestore_client.collection.return_value = mock_collection

    counts = count_generations_from_firestore("test-project")

    assert counts["sdxl"] == 5
    assert counts["imagen"] == 3


def test_count_generations_from_firestore_fallback_versions(mock_firestore_client):
    """Test fallback to counting version documents."""
    # Setup empty generation_events
    mock_events_collection = MagicMock()
    mock_events_collection.limit.return_value.stream.return_value = []

    # Setup users/designs/versions
    mock_version1 = MagicMock()
    mock_version2 = MagicMock()

    mock_versions_collection = MagicMock()
    mock_versions_collection.stream.return_value = [mock_version1, mock_version2]

    mock_design = MagicMock()
    mock_design.reference.collection.return_value = mock_versions_collection

    mock_designs_collection = MagicMock()
    mock_designs_collection.stream.return_value = [mock_design]

    mock_user = MagicMock()
    mock_user.reference.collection.return_value = mock_designs_collection

    mock_users_collection = MagicMock()
    mock_users_collection.stream.return_value = [mock_user]

    # Configure client to return different collections
    def collection_side_effect(name):
        if name == "generation_events":
            return mock_events_collection
        elif name == "users":
            return mock_users_collection
        return MagicMock()

    mock_firestore_client.collection.side_effect = collection_side_effect

    counts = count_generations_from_firestore("test-project")

    assert counts["default"] == 2


def test_calculate_spend():
    """Test spend calculation."""
    generation_counts = {
        "sdxl": 10,
        "imagen": 5,
        "flux": 2,
        "unknown": 3
    }

    spend_data = calculate_spend(generation_counts)

    # sdxl: 10 * $0.02 = $0.20
    # imagen: 5 * $0.05 = $0.25
    # flux: 2 * $0.03 = $0.06
    # unknown: 3 * $0.025 = $0.075
    expected_total = 0.20 + 0.25 + 0.06 + 0.075

    assert spend_data["total_generations"] == 20
    assert abs(spend_data["total_spend"] - expected_total) < 0.001
    assert spend_data["breakdown"]["sdxl"]["count"] == 10
    assert spend_data["breakdown"]["sdxl"]["spend"] == 0.20


def test_main_under_budget(mock_firestore_client, capsys):
    """Test main when spend is under budget."""
    # Setup mock with low generation count
    mock_doc = MagicMock()
    mock_doc.to_dict.return_value = {"model": "sdxl"}

    mock_collection = MagicMock()
    mock_collection.limit.return_value.stream.return_value = [mock_doc]
    mock_collection.stream.return_value = [mock_doc] * 10  # 10 gens * $0.02 = $0.20

    mock_firestore_client.collection.return_value = mock_collection

    with patch('sys.argv', ['check_budget.py', '--project-id', 'test-project', '--budget', '500']):
        exit_code = main()

    assert exit_code == 0
    captured = capsys.readouterr()
    assert "below" in captured.out.lower() or "✓" in captured.out


def test_main_over_threshold(mock_firestore_client, capsys):
    """Test main when spend exceeds threshold."""
    # Setup mock with high generation count
    mock_doc = MagicMock()
    mock_doc.to_dict.return_value = {"model": "sdxl"}

    mock_collection = MagicMock()
    mock_collection.limit.return_value.stream.return_value = [mock_doc]
    mock_collection.stream.return_value = [mock_doc] * 20000  # 20000 * $0.02 = $400

    mock_firestore_client.collection.return_value = mock_collection

    with patch('sys.argv', ['check_budget.py', '--project-id', 'test-project', '--budget', '500', '--warn-threshold', '0.75']):
        exit_code = main()

    # $400 / $500 = 80%, exceeds 75% threshold
    assert exit_code == 1
    captured = capsys.readouterr()
    assert "WARNING" in captured.out or "exceeds" in captured.out.lower()


def test_main_json_output(mock_firestore_client):
    """Test main with --json flag."""
    mock_doc = MagicMock()
    mock_doc.to_dict.return_value = {"model": "sdxl"}

    mock_collection = MagicMock()
    mock_collection.limit.return_value.stream.return_value = [mock_doc]
    mock_collection.stream.return_value = [mock_doc] * 10

    mock_firestore_client.collection.return_value = mock_collection

    with patch('sys.argv', ['check_budget.py', '--project-id', 'test-project', '--json']):
        with patch('builtins.print') as mock_print:
            exit_code = main()

        # Verify JSON output
        output = mock_print.call_args[0][0]
        data = json.loads(output)

        assert "budget" in data
        assert "spend" in data
        assert "remaining" in data
        assert "percent_used" in data
        assert "breakdown" in data


def test_main_missing_project_id(capsys):
    """Test main without project ID."""
    with patch('sys.argv', ['check_budget.py']):
        with patch.dict('os.environ', {}, clear=True):
            exit_code = main()

    assert exit_code == 1
    captured = capsys.readouterr()
    assert "ERROR" in captured.out


def test_main_custom_budget(mock_firestore_client, capsys):
    """Test main with custom budget."""
    mock_doc = MagicMock()
    mock_doc.to_dict.return_value = {"model": "sdxl"}

    mock_collection = MagicMock()
    mock_collection.limit.return_value.stream.return_value = [mock_doc]
    mock_collection.stream.return_value = [mock_doc] * 100  # 100 * $0.02 = $2.00

    mock_firestore_client.collection.return_value = mock_collection

    with patch('sys.argv', ['check_budget.py', '--project-id', 'test-project', '--budget', '10.00']):
        exit_code = main()

    # $2 / $10 = 20%, below default 75% threshold
    assert exit_code == 0
    captured = capsys.readouterr()
    assert "$2.00 / $10.00" in captured.out
