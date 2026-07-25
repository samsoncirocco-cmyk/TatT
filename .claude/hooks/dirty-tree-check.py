#!/usr/bin/env python3
"""SessionStart guard: surface uncommitted work in this repo's primary checkout.

Multiple Claude sessions share one clone of this repo. Work left uncommitted in
the primary checkout belongs to whoever left it there, is not backed up
anywhere, and is one `git checkout .` from gone. This hook makes that state
loud at session start instead of letting the next session discover it by
destroying it.

Exits silently (status 0, no output) when the tree is clean, so a normal
session start stays quiet.
"""

import json
import subprocess
import sys

MAX_FILES_SHOWN = 20


def git(args, cwd=None):
    try:
        r = subprocess.run(
            ["git", *args],
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=10,
        )
    except (OSError, subprocess.SubprocessError):
        return None
    return r.stdout.strip() if r.returncode == 0 else None


def main():
    repo_root = git(["rev-parse", "--show-toplevel"])
    if not repo_root:
        return  # not a git repo; nothing to say

    # First entry of `worktree list` is always the primary checkout.
    listing = git(["worktree", "list", "--porcelain"]) or ""
    main_tree = repo_root
    for line in listing.splitlines():
        if line.startswith("worktree "):
            main_tree = line[len("worktree "):].strip()
            break

    status = git(["status", "--porcelain"], cwd=main_tree)
    if not status:
        return  # clean, or unreadable — either way, stay quiet

    lines = status.splitlines()
    count = len(lines)
    branch = git(["rev-parse", "--abbrev-ref", "HEAD"], cwd=main_tree) or "unknown"

    shown = lines[:MAX_FILES_SHOWN]
    if count > MAX_FILES_SHOWN:
        shown.append(f"... and {count - MAX_FILES_SHOWN} more")

    if repo_root == main_tree:
        where = (
            "You are working IN that checkout, so these changes are in your way and "
            "you may be tempted to clear them. Do not."
        )
    else:
        where = (
            f"You are in a separate worktree ({repo_root}), so these are not yours "
            "and clearing them is never part of your task."
        )

    context = (
        f"UNCOMMITTED WORK — {count} file(s) in the primary checkout {main_tree}, "
        f"on branch '{branch}'.\n\n"
        f"{where}\n\n"
        "This work is unsaved and exists nowhere else — not on GitHub, not in any "
        "other branch. Another session probably owns it.\n\n"
        "RULES:\n"
        "- Never run `git checkout .`, `git restore`, `git stash`, `git clean`, or "
        "`git reset --hard` against this checkout.\n"
        "- Do not layer new edits on top of these files.\n"
        "- Do not sweep them into an unrelated commit (`git add -A` / `git commit -a`).\n"
        "- If your task needs these files, ask the user who owns the changes first.\n"
        "- Prefer a git worktree for your own work so the primary checkout stays "
        "untouched.\n\n"
        + "\n".join(shown)
    )

    print(json.dumps({
        "systemMessage": (
            f"⚠️  {count} uncommitted file(s) in {main_tree} on '{branch}' — "
            "unsaved work, possibly another session's. Don't clear or commit it blindly."
        ),
        "hookSpecificOutput": {
            "hookEventName": "SessionStart",
            "additionalContext": context,
        },
    }))


if __name__ == "__main__":
    try:
        main()
    except Exception:
        sys.exit(0)  # a guard that breaks the session start is worse than no guard
