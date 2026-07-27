"""Pure refresh-state transitions for Instagram artist profiles."""

from __future__ import annotations

import re
from typing import Any, Mapping


DEFAULT_DEAD_THRESHOLD = 3
DEAD_STATUSES = frozenset({"not_found", "private"})
NOT_FOUND = re.compile(
    r"not[\s_-]?found|does not exist|doesn't exist|no such user|"
    r"user unavailable|account (?:has been )?disabled|deleted account",
    re.I,
)
PRIVATE = re.compile(r"private account|account is private|profile is private", re.I)


def normalize_handle(raw: Any) -> str:
    return str(raw or "").strip().lstrip("@").lower()


def classify_scrape_result(row: Mapping[str, Any] | None) -> tuple[str, str | None]:
    """Classify an actor row without treating absence as confirmed death."""

    if row is None:
        return "transient", "actor-returned-no-row"
    if bool(row.get("private") or row.get("isPrivate")):
        return "private", "profile-private"

    error = " ".join(
        str(row.get(key) or "")
        for key in ("error", "errorDescription", "errorMessage", "message")
    ).strip()
    if error:
        if PRIVATE.search(error):
            return "private", error
        if NOT_FOUND.search(error):
            return "not_found", error
        return "transient", error

    if normalize_handle(row.get("username") or row.get("handle")):
        return "active", None
    return "transient", "actor-row-missing-username"


def update_handle_state(
    previous: Mapping[str, Any] | None,
    *,
    status: str,
    checked_at: str,
    reason: str | None = None,
    dead_threshold: int = DEFAULT_DEAD_THRESHOLD,
) -> dict[str, Any]:
    """Apply one observation without letting transient failures mark artists stale."""

    if status not in {"active", "not_found", "private", "transient"}:
        raise ValueError(f"unknown refresh status: {status}")
    if dead_threshold < 1:
        raise ValueError("dead_threshold must be at least 1")

    state = dict(previous or {})
    previous_dead = int(state.get("consecutiveDeadRefreshes") or 0)
    was_stale = bool(state.get("stale"))
    state.update(
        {
            "lastRefreshStatus": status,
            "lastRefreshAt": checked_at,
            "lastRefreshReason": reason,
        }
    )

    if status == "active":
        state.update(
            {
                "consecutiveDeadRefreshes": 0,
                "stale": False,
                "lastSeenAt": checked_at,
            }
        )
    elif status in DEAD_STATUSES:
        consecutive = previous_dead + 1
        state.update(
            {
                "consecutiveDeadRefreshes": consecutive,
                "stale": consecutive >= dead_threshold,
            }
        )
    else:
        # A network/actor failure is not evidence that an artist disappeared.
        # It also breaks a sequence of confirmed dead observations.  Once an
        # artist is stale, only a confirmed active profile clears that status.
        state.update(
            {
                "consecutiveDeadRefreshes": 0,
                "stale": was_stale,
            }
        )
    return state
