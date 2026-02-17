#!/usr/bin/env python3
"""
Self-Annealing Incident Logger

Appends properly formatted Known Issues entries to operational directives.
Part of the DOE framework's self-annealing loop - when incidents occur,
this tool captures them in the relevant directive for future reference.

Usage:
    python execution/log_incident.py \\
        --directive deploy \\
        --title "Docker build timeout on large dependencies" \\
        --symptom "npm install times out after 600s" \\
        --cause "package-lock.json includes large binary packages" \\
        --resolution "Increased Docker build timeout to 1200s" \\
        --prevention "Monitor package sizes, use .dockerignore"

    # Dry run (preview without modifying file)
    python execution/log_incident.py --dry-run --directive deploy --title "..." ...
"""

import argparse
import os
import re
from datetime import datetime
from pathlib import Path


def parse_args():
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(
        description="Append a Known Issues entry to an operational directive",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )

    parser.add_argument(
        "--directive",
        required=True,
        help="Directive name (e.g., 'deploy' or 'deploy.md')"
    )
    parser.add_argument(
        "--title",
        required=True,
        help="Short title for the incident"
    )
    parser.add_argument(
        "--symptom",
        required=True,
        help="What was observed"
    )
    parser.add_argument(
        "--cause",
        required=True,
        help="Root cause analysis"
    )
    parser.add_argument(
        "--resolution",
        required=True,
        help="How it was fixed"
    )
    parser.add_argument(
        "--prevention",
        required=True,
        help="How to avoid in future"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview the entry without modifying the file"
    )

    return parser.parse_args()


def resolve_directive_path(directive_name: str) -> Path:
    """
    Resolve directive name to full file path.

    Args:
        directive_name: Name of directive (e.g., "deploy" or "deploy.md")

    Returns:
        Path to directive file

    Raises:
        FileNotFoundError: If directive doesn't exist
    """
    # Add .md extension if not present
    if not directive_name.endswith(".md"):
        directive_name = f"{directive_name}.md"

    # Construct path to directives directory
    project_root = Path(__file__).parent.parent
    directive_path = project_root / "directives" / directive_name

    if not directive_path.exists():
        raise FileNotFoundError(
            f"Directive not found: {directive_path}\n"
            f"Available directives: {list((project_root / 'directives').glob('*.md'))}"
        )

    return directive_path


def find_next_ki_number(content: str) -> int:
    """
    Find the next KI number by parsing existing entries.

    Args:
        content: Full directive file content

    Returns:
        Next KI number (e.g., 3 if KI-001 and KI-002 exist)
    """
    # Find all KI-NNN entries
    ki_pattern = r"### KI-(\d+):"
    matches = re.findall(ki_pattern, content)

    if not matches:
        return 1

    # Get highest number and increment
    highest = max(int(num) for num in matches)
    return highest + 1


def format_ki_entry(ki_number: int, title: str, symptom: str, cause: str,
                   resolution: str, prevention: str) -> str:
    """
    Format a Known Issues entry.

    Args:
        ki_number: KI entry number
        title: Short title
        symptom: What was observed
        cause: Root cause
        resolution: How it was fixed
        prevention: How to avoid

    Returns:
        Formatted markdown entry
    """
    today = datetime.now().strftime("%Y-%m-%d")
    ki_id = f"KI-{ki_number:03d}"

    entry = f"""
### {ki_id}: {title}
**Discovered:** {today}
**Symptom:** {symptom}
**Root cause:** {cause}
**Resolution:** {resolution}
**Prevention:** {prevention}
"""

    return entry


def insert_ki_entry(content: str, entry: str) -> str:
    """
    Insert KI entry into directive content.

    Inserts before "## Post-Operation" section if it exists,
    otherwise appends to "## Known Issues" section.

    Args:
        content: Original directive content
        entry: Formatted KI entry to insert

    Returns:
        Updated directive content
    """
    # Try to insert before Post-Operation section
    post_op_pattern = r"(## Post-Operation)"
    if re.search(post_op_pattern, content):
        # Insert entry before Post-Operation
        updated = re.sub(
            post_op_pattern,
            f"{entry}\n\\1",
            content
        )
        return updated

    # Otherwise, append after Known Issues heading
    ki_heading_pattern = r"(## Known Issues\n)"
    if re.search(ki_heading_pattern, content):
        # Insert after heading
        updated = re.sub(
            ki_heading_pattern,
            f"\\1{entry}\n",
            content
        )
        return updated

    # Fallback: append at end
    return content + entry


def main():
    """Main execution flow."""
    args = parse_args()

    try:
        # Resolve directive path
        directive_path = resolve_directive_path(args.directive)

        # Read current content
        content = directive_path.read_text()

        # Find next KI number
        ki_number = find_next_ki_number(content)

        # Format entry
        entry = format_ki_entry(
            ki_number=ki_number,
            title=args.title,
            symptom=args.symptom,
            cause=args.cause,
            resolution=args.resolution,
            prevention=args.prevention
        )

        if args.dry_run:
            print(f"[DRY RUN] Would add to {directive_path}:")
            print(entry)
            return 0

        # Insert entry
        updated_content = insert_ki_entry(content, entry)

        # Write updated content
        directive_path.write_text(updated_content)

        ki_id = f"KI-{ki_number:03d}"
        print(f"Added {ki_id} to directives/{directive_path.name}")

        return 0

    except FileNotFoundError as e:
        print(f"Error: {e}")
        return 1
    except Exception as e:
        print(f"Unexpected error: {e}")
        return 1


if __name__ == "__main__":
    exit(main())
