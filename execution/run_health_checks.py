#!/usr/bin/env python3
"""
Run health checks on TatTester services.

Checks HTTP endpoints for API health status.
"""

import argparse
import json
import sys
from typing import Dict, List
import requests

def health_check(url: str, timeout: int = 10) -> Dict[str, any]:
    """
    Perform health check on a URL.

    Returns dict with: url, status_code, success, message, response_time_ms
    """
    try:
        response = requests.get(url, timeout=timeout)
        success = 200 <= response.status_code < 300

        return {
            "url": url,
            "status_code": response.status_code,
            "success": success,
            "message": "OK" if success else f"HTTP {response.status_code}",
            "response_time_ms": int(response.elapsed.total_seconds() * 1000)
        }
    except requests.exceptions.Timeout:
        return {
            "url": url,
            "status_code": None,
            "success": False,
            "message": "Timeout",
            "response_time_ms": None
        }
    except Exception as e:
        return {
            "url": url,
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
        "--endpoints",
        nargs="+",
        default=[
            "http://127.0.0.1:3001/api/health",
            "http://127.0.0.1:3000"
        ],
        help="Endpoints to check"
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=10,
        help="Request timeout in seconds"
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output results as JSON"
    )
    args = parser.parse_args()

    results = []
    for endpoint in args.endpoints:
        result = health_check(endpoint, timeout=args.timeout)
        results.append(result)

    if args.json:
        print(json.dumps(results, indent=2))
    else:
        print("=== TatTester Health Checks ===\n")
        for result in results:
            status = "✓" if result["success"] else "✗"
            time_str = f" ({result['response_time_ms']}ms)" if result['response_time_ms'] else ""
            print(f"{status} {result['url']}: {result['message']}{time_str}")

    all_passed = all(r["success"] for r in results)
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())
