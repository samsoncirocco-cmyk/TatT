"""
Tests for execution/run_health_checks.py
"""

import pytest
from unittest.mock import patch, Mock
import requests
from execution.run_health_checks import health_check_get, health_check_post, main


def test_health_check_get_success():
    """Test GET health check with successful response."""
    with patch('requests.get') as mock_get:
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.elapsed.total_seconds.return_value = 0.123
        mock_get.return_value = mock_response

        result = health_check_get("http://example.com/health")

        assert result["success"] is True
        assert result["status_code"] == 200
        assert result["message"] == "OK"
        assert result["response_time_ms"] == 123
        assert result["method"] == "GET"


def test_health_check_get_failure():
    """Test GET health check with 500 error."""
    with patch('requests.get') as mock_get:
        mock_response = Mock()
        mock_response.status_code = 500
        mock_response.elapsed.total_seconds.return_value = 0.050
        mock_get.return_value = mock_response

        result = health_check_get("http://example.com/health")

        assert result["success"] is False
        assert result["status_code"] == 500
        assert "500" in result["message"]


def test_health_check_get_timeout():
    """Test GET health check with timeout."""
    with patch('requests.get') as mock_get:
        mock_get.side_effect = requests.exceptions.Timeout("Timeout")

        result = health_check_get("http://example.com/health")

        assert result["success"] is False
        assert result["status_code"] is None
        assert result["message"] == "Timeout"


def test_health_check_post_success():
    """Test POST health check with successful response."""
    with patch('requests.post') as mock_post:
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.elapsed.total_seconds.return_value = 0.150
        mock_post.return_value = mock_response

        result = health_check_post("http://example.com/query", {"test": "data"})

        assert result["success"] is True
        assert result["status_code"] == 200
        assert result["method"] == "POST"


def test_main_all_checks_healthy(capsys):
    """Test main when all health checks pass."""
    with patch('requests.get') as mock_get, patch('requests.post') as mock_post:
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.elapsed.total_seconds.return_value = 0.100
        mock_get.return_value = mock_response
        mock_post.return_value = mock_response

        with patch('sys.argv', ['run_health_checks.py']):
            exit_code = main()

        assert exit_code == 0
        captured = capsys.readouterr()
        assert "All health checks passed" in captured.out


def test_main_one_check_fails(capsys):
    """Test main when one health check fails."""
    with patch('requests.get') as mock_get, patch('requests.post') as mock_post:
        mock_get.side_effect = requests.exceptions.Timeout("Timeout")
        mock_post_response = Mock()
        mock_post_response.status_code = 200
        mock_post_response.elapsed.total_seconds.return_value = 0.100
        mock_post.return_value = mock_post_response

        with patch('sys.argv', ['run_health_checks.py']):
            exit_code = main()

        assert exit_code == 1
        captured = capsys.readouterr()
        assert "Some health checks failed" in captured.out


def test_main_specific_check():
    """Test main with --check flag for specific check."""
    with patch('requests.get') as mock_get:
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.elapsed.total_seconds.return_value = 0.100
        mock_get.return_value = mock_response

        with patch('sys.argv', ['run_health_checks.py', '--check', 'health']):
            exit_code = main()

        # Only one GET call should be made
        assert mock_get.call_count == 1


def test_main_custom_base_url():
    """Test main with custom base URL."""
    with patch('requests.get') as mock_get, patch('requests.post') as mock_post:
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.elapsed.total_seconds.return_value = 0.100
        mock_get.return_value = mock_response
        mock_post.return_value = mock_response

        with patch('sys.argv', ['run_health_checks.py', '--base-url', 'http://custom:8080']):
            exit_code = main()

        # Verify custom base URL was used
        assert 'http://custom:8080/api/health' in str(mock_get.call_args)
