"""
Tests for execution/log_incident.py

Tests the self-annealing incident logging tool that appends
Known Issues entries to operational directives.
"""

import pytest
import subprocess
from pathlib import Path


def create_test_directive(tmp_path: Path, existing_content: str = "") -> Path:
    """
    Create a minimal test directive file.

    Args:
        tmp_path: pytest tmp_path fixture
        existing_content: Optional existing KI entries

    Returns:
        Path to created test directive
    """
    directive_path = tmp_path / "test-directive.md"
    content = f"""# Test Directive

## Known Issues

{existing_content}

## Post-Operation

- [ ] Test checklist item
"""
    directive_path.write_text(content)
    return directive_path


def test_log_incident_creates_first_entry(tmp_path):
    """Test that log_incident creates KI-001 when no entries exist."""
    directive_path = create_test_directive(tmp_path)

    # Import and run directly (avoids subprocess complexity)
    from execution.log_incident import (
        find_next_ki_number,
        format_ki_entry,
        insert_ki_entry
    )

    content = directive_path.read_text()
    ki_number = find_next_ki_number(content)
    assert ki_number == 1

    entry = format_ki_entry(
        ki_number=ki_number,
        title="Test incident",
        symptom="Test symptom",
        cause="Test cause",
        resolution="Test resolution",
        prevention="Test prevention"
    )

    updated_content = insert_ki_entry(content, entry)
    assert "### KI-001: Test incident" in updated_content
    assert "**Symptom:** Test symptom" in updated_content


def test_log_incident_increments_number(tmp_path):
    """Test that log_incident increments KI number when entries exist."""
    existing_ki = """### KI-001: First incident
**Discovered:** 2026-02-16
**Symptom:** Something happened
**Root cause:** Why it happened
**Resolution:** How it was fixed
**Prevention:** How to avoid
"""
    directive_path = create_test_directive(tmp_path, existing_ki)

    from execution.log_incident import find_next_ki_number, format_ki_entry

    content = directive_path.read_text()
    ki_number = find_next_ki_number(content)
    assert ki_number == 2

    entry = format_ki_entry(
        ki_number=ki_number,
        title="Second incident",
        symptom="Test",
        cause="Test",
        resolution="Test",
        prevention="Test"
    )

    assert "### KI-002: Second incident" in entry


def test_log_incident_dry_run(tmp_path):
    """Test that --dry-run doesn't modify the file."""
    directive_path = create_test_directive(tmp_path)
    original_content = directive_path.read_text()

    # Run via subprocess to test CLI
    result = subprocess.run(
        [
            "python3",
            "execution/log_incident.py",
            "--dry-run",
            "--directive", str(directive_path),
            "--title", "Test incident",
            "--symptom", "Test",
            "--cause", "Test",
            "--resolution", "Test",
            "--prevention", "Test"
        ],
        capture_output=True,
        text=True
    )

    # File should be unchanged
    assert directive_path.read_text() == original_content

    # Output should show what would be added
    assert "DRY RUN" in result.stdout
    assert "KI-001: Test incident" in result.stdout


def test_log_incident_missing_directive():
    """Test that non-existent directive returns exit code 1."""
    result = subprocess.run(
        [
            "python3",
            "execution/log_incident.py",
            "--directive", "nonexistent-directive",
            "--title", "Test",
            "--symptom", "Test",
            "--cause", "Test",
            "--resolution", "Test",
            "--prevention", "Test"
        ],
        capture_output=True,
        text=True
    )

    assert result.returncode == 1
    assert "Error" in result.stdout or "not found" in result.stdout.lower()


def test_log_incident_appends_before_post_operation(tmp_path):
    """Test that entry is inserted before Post-Operation section."""
    directive_path = create_test_directive(tmp_path)

    from execution.log_incident import (
        find_next_ki_number,
        format_ki_entry,
        insert_ki_entry
    )

    content = directive_path.read_text()
    ki_number = find_next_ki_number(content)

    entry = format_ki_entry(
        ki_number=ki_number,
        title="Test",
        symptom="Test",
        cause="Test",
        resolution="Test",
        prevention="Test"
    )

    updated_content = insert_ki_entry(content, entry)

    # Find positions
    ki_pos = updated_content.find("### KI-001")
    post_op_pos = updated_content.find("## Post-Operation")

    # KI entry should come before Post-Operation
    assert ki_pos != -1
    assert post_op_pos != -1
    assert ki_pos < post_op_pos
