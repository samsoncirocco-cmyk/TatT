"""
Tests for execution/validate_env.py
"""

import pytest
from unittest.mock import patch, MagicMock
from execution.validate_env import (
    check_env_var,
    check_secret_manager,
    check_firestore,
    check_neo4j,
    main
)


def test_check_env_var_present(monkeypatch):
    """Test check_env_var when variable is set."""
    monkeypatch.setenv("TEST_VAR", "test_value")
    passed, message = check_env_var("TEST_VAR")
    assert passed is True
    assert "TEST_VAR is set" in message


def test_check_env_var_missing(monkeypatch):
    """Test check_env_var when variable is missing."""
    monkeypatch.delenv("TEST_VAR", raising=False)
    passed, message = check_env_var("TEST_VAR")
    assert passed is False
    assert "TEST_VAR is missing" in message


def test_check_secret_manager_success(mock_secret_manager):
    """Test check_secret_manager with successful connection."""
    passed, message = check_secret_manager("test-project")
    assert passed is True
    assert "Secret Manager accessible" in message


def test_check_secret_manager_missing_secret():
    """Test check_secret_manager when secret is missing."""
    with patch('google.cloud.secretmanager.SecretManagerServiceClient') as mock_client:
        mock_client_instance = MagicMock()
        from google.api_core.exceptions import NotFound
        mock_client_instance.list_secrets.side_effect = NotFound("Secret not found")
        mock_client.return_value = mock_client_instance

        passed, message = check_secret_manager("test-project")
        assert passed is False
        assert "error" in message.lower()


def test_check_firestore_success(mock_firestore_client):
    """Test check_firestore with successful connection."""
    passed, message = check_firestore("test-project")
    assert passed is True
    assert "Firestore accessible" in message


def test_check_firestore_failure():
    """Test check_firestore with connection failure."""
    with patch('google.cloud.firestore.Client') as mock_client:
        mock_client.side_effect = Exception("Connection failed")

        passed, message = check_firestore("test-project")
        assert passed is False
        assert "Firestore error" in message


def test_check_neo4j_success(mock_neo4j_driver, env_vars):
    """Test check_neo4j with successful connection."""
    passed, message = check_neo4j()
    assert passed is True
    assert "Neo4j accessible" in message


def test_check_neo4j_connection_failure(env_vars):
    """Test check_neo4j with connection failure."""
    with patch('neo4j.GraphDatabase.driver') as mock_driver:
        mock_driver.side_effect = Exception("Connection failed")

        passed, message = check_neo4j()
        assert passed is False
        assert "Neo4j error" in message


def test_check_neo4j_missing_credentials(monkeypatch):
    """Test check_neo4j with missing credentials."""
    monkeypatch.delenv("NEO4J_URI", raising=False)
    monkeypatch.delenv("NEO4J_PASSWORD", raising=False)

    passed, message = check_neo4j()
    assert passed is False
    assert "credentials missing" in message.lower()


def test_main_all_pass(env_vars, mock_secret_manager, mock_firestore_client, mock_neo4j_driver, capsys):
    """Test main when all checks pass."""
    with patch('sys.argv', ['validate_env.py']):
        exit_code = main()

    assert exit_code == 0
    captured = capsys.readouterr()
    assert "All checks passed" in captured.out


def test_main_one_fails(env_vars, monkeypatch, capsys):
    """Test main when one check fails."""
    # Remove required env var
    monkeypatch.delenv("REPLICATE_API_TOKEN", raising=False)

    with patch('sys.argv', ['validate_env.py', '--skip-services']):
        exit_code = main()

    assert exit_code == 1
    captured = capsys.readouterr()
    assert "Some checks failed" in captured.out
    assert "REPLICATE_API_TOKEN is missing" in captured.out


def test_main_skip_services(env_vars, capsys):
    """Test main with --skip-services flag."""
    with patch('sys.argv', ['validate_env.py', '--skip-services']):
        exit_code = main()

    assert exit_code == 0
    captured = capsys.readouterr()
    # Should show env vars but not external services
    assert "Environment Variables:" in captured.out
    assert "External Services:" not in captured.out
