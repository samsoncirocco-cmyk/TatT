#!/usr/bin/env python3
"""Compatibility entrypoint for the audited Instagram refresh runner."""

try:
    from execution.apify_ig_enrich import main
except ModuleNotFoundError:  # direct ``python execution/enrich_artists.py``
    from apify_ig_enrich import main


if __name__ == "__main__":
    raise SystemExit(main())
