#!/usr/bin/env python3
"""
Run health checks on TatTester services.

Smoke tests HTTP endpoints for API health status.
Exits 0 if all checks pass, 1 if any check fails.
"""

import argparse
import json
import sys
from typing import Dict, List
import requests

def health_check_get(url: str, timeout: int = 10) -> Dict[str, any]:
    """
    Perform GET health check on a URL.

    Returns dict with: url, status_code, success, message, response_time_ms
    """
    try:
        response = requests.get(url, timeout=timeout)
        success = 200 <= response.status_code < 300

        return {
            "url": url,
            "method": "GET",
            "status_code": response.status_code,
            "success": success,
            "message": "OK" if success else f"HTTP {response.status_code}",
            "response_time_ms": int(response.elapsed.total_seconds() * 1000)
        }
    except requests.exceptions.Timeout:
        return {
            "url": url,
            "method": "GET",
            "status_code": None,
            "success": False,
            "message": "Timeout",
            "response_time_ms": None
        }
    except Exception as e:
        return {
            "url": url,
            "method": "GET",
            "status_code": None,
            "success": False,
            "message": str(e),
            "response_time_ms": None
        }

def health_check_post(url: str, payload: dict, timeout: int = 10) -> Dict[str, any]:
    """
    Perform POST health check on a URL.

    Returns dict with: url, status_code, success, message, response_time_ms
    """
    try:
        response = requests.post(url, json=payload, timeout=timeout, headers={"Content-Type": "application/json"})
        success = 200 <= response.status_code < 300

        return {
            "url": url,
            "method": "POST",
            "status_code": response.status_code,
            "success": success,
            "message": "OK" if success else f"HTTP {response.status_code}",
            "response_time_ms": int(response.elapsed.total_seconds() * 1000)
        }
    except requests.exceptions.Timeout:
        return {
            "url": url,
            "method": "POST",
            "status_code": None,
            "success": False,
            "message": "Timeout",
            "response_time_ms": None
        }
    except Exception as e:
        return {
            "url": url,
            "method": "POST",
            "status_code": None,
            "success": False,
            "message": str(e),
            "response_time_ms": None
        }

def main() -> int:
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Run health checks on TatTester services"
    )
    parser.add_argument(
        "--base-url",
        default="http://localhost:3000",
        help="Base URL for the service (default: http://localhost:3000)"
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=10,
        help="Request timeout in seconds (default: 10)"
    )
    parser.add_argument(
        "--check",
        choices=["health", "startup", "neo4j"],
        help="Run only a specific check"
    )
    args = parser.parse_args()

    base_url = args.base_url.rstrip("/")

    # Define all checks
    all_checks = {
        "health": lambda: health_check_get(f"{base_url}/api/health", args.timeout),
        "startup": lambda: health_check_get(f"{base_url}/api/health/startup", args.timeout),
        "neo4j": lambda: health_check_post(
            f"{base_url}/api/neo4j/query",
            {"query": "RETURN 1 AS num"},
            args.timeout
        )
    }

    # Determine which checks to run
    if args.check:
        checks_to_run = {args.check: all_checks[args.check]}
    else:
        checks_to_run = all_checks

    # Run checks
    results = []
    for check_name, check_fn in checks_to_run.items():
        result = check_fn()
        result["check_name"] = check_name
        results.append(result)

    # Output results
    print("=== TatTester Health Checks ===\n")
    for result in results:
        status = "✅" if result["success"] else "❌"
        time_str = f" ({result['response_time_ms']}ms)" if result['response_time_ms'] else ""
        print(f"{status} {result['method']} {result['url']}: {result['message']}{time_str}")

    print()
    all_passed = all(r["success"] for r in results)
    if all_passed:
        print("✅ All health checks passed")
    else:
        print("❌ Some health checks failed", file=sys.stderr)

    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())
