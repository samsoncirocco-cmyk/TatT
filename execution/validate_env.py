#!/usr/bin/env python3
"""
Validate environment configuration for TatTester.

Checks that all required environment variables and external services are accessible.
Exits 0 if all checks pass, 1 if any check fails.
"""

import argparse
import json
import os
import sys
from typing import Tuple, List, Dict

def check_env_var(var_name: str) -> Tuple[bool, str]:
    """Check if an environment variable is set."""
    value = os.environ.get(var_name)
    if value:
        return True, f"{var_name} is set"
    return False, f"{var_name} is missing"

def check_secret_manager(project_id: str) -> Tuple[bool, str]:
    """Check that Secret Manager is reachable for the project (read-only)."""
    try:
        from google.cloud import secretmanager
        client = secretmanager.SecretManagerServiceClient()
        secrets = list(client.list_secrets(request={"parent": f"projects/{project_id}"}))
        return True, f"Secret Manager accessible ({len(secrets)} secrets visible)"
    except Exception as e:
        return False, f"Secret Manager error: {str(e)}"

def check_firestore(project_id: str) -> Tuple[bool, str]:
    """Check that Firestore is reachable (read-only)."""
    try:
        from google.cloud import firestore
        client = firestore.Client(project=project_id)
        # Read-only probe: streaming the health-check collection is enough to
        # surface auth/connectivity failures without writing anything.
        list(client.collection("_health_check").stream())
        return True, "Firestore accessible"
    except Exception as e:
        return False, f"Firestore error: {str(e)}"

def check_neo4j() -> Tuple[bool, str]:
    """Check if Neo4j is accessible."""
    uri = os.environ.get("NEO4J_URI")
    user = os.environ.get("NEO4J_USER", "neo4j")
    password = os.environ.get("NEO4J_PASSWORD")

    if not uri or not password:
        return False, "Neo4j credentials missing (NEO4J_URI / NEO4J_PASSWORD)"

    try:
        from neo4j import GraphDatabase
        driver = GraphDatabase.driver(uri, auth=(user, password))
        with driver.session() as session:
            record = session.run("RETURN 1 AS num").single()
            if record is None:
                return False, "Neo4j error: health query returned no result"
        driver.close()
        return True, "Neo4j accessible"
    except Exception as e:
        return False, f"Neo4j error: {str(e)}"

def check_cloud_storage() -> Tuple[bool, str]:
    """Check if Cloud Storage bucket is accessible."""
    try:
        from google.cloud import storage
        bucket_name = os.environ.get("GCS_BUCKET_NAME", "pangyo-tattoo-images")
        client = storage.Client()
        bucket = client.bucket(bucket_name)
        if not bucket.exists():
            return False, f"Bucket {bucket_name} does not exist"
        return True, f"Bucket {bucket_name} accessible"
    except Exception as e:
        return False, f"Cloud Storage error: {str(e)}"

def main(argv=None) -> int:
    """Main entry point.

    Accepts an explicit ``argv`` list (defaults to ``sys.argv[1:]``) so callers
    such as tests can invoke it without leaking the host process arguments.
    """
    parser = argparse.ArgumentParser(
        description="Validate TatTester environment configuration"
    )
    parser.add_argument(
        "--skip-services",
        action="store_true",
        help="Only validate environment variables; skip all external service checks"
    )
    parser.add_argument(
        "--skip",
        action="append",
        choices=["secrets", "firestore", "neo4j", "storage"],
        help="Skip specific service checks (can be used multiple times)"
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output results as JSON"
    )
    args = parser.parse_args(argv)

    skip_services = args.skip or []

    # Required environment variables
    required_vars = [
        "GCP_PROJECT_ID",
        "NEO4J_URI",
        "NEO4J_USER",
        "NEO4J_PASSWORD",
        "REPLICATE_API_TOKEN",
        "FRONTEND_AUTH_TOKEN"
    ]

    env_results: List[Dict] = []
    service_results: List[Dict] = []
    all_passed = True

    # Check environment variables
    for var in required_vars:
        passed, message = check_env_var(var)
        env_results.append({
            "service": f"EnvVar:{var}",
            "healthy": passed,
            "message": message
        })
        if not passed:
            all_passed = False

    # Check services
    project_id = os.environ.get("GCP_PROJECT_ID")

    checks = []

    if not args.skip_services:
        if "secrets" not in skip_services and project_id:
            checks.append(("Secret Manager", check_secret_manager, project_id))

        if "firestore" not in skip_services and project_id:
            checks.append(("Firestore", check_firestore, project_id))

        if "neo4j" not in skip_services:
            checks.append(("Neo4j", check_neo4j, None))

        # Cloud Storage is optional — only probed when a bucket is configured.
        if "storage" not in skip_services and os.environ.get("GCS_BUCKET_NAME"):
            checks.append(("Cloud Storage", check_cloud_storage, None))

    for service_name, check_fn, arg in checks:
        try:
            if arg:
                passed, message = check_fn(arg)
            else:
                passed, message = check_fn()
            service_results.append({
                "service": service_name,
                "healthy": passed,
                "message": message
            })
            if not passed:
                all_passed = False
        except Exception as e:
            service_results.append({
                "service": service_name,
                "healthy": False,
                "message": f"Unexpected error: {str(e)}"
            })
            all_passed = False

    # Output results
    if args.json:
        print(json.dumps({
            "healthy": all_passed,
            "checks": env_results + service_results
        }, indent=2))
    else:
        print("=== TatTester Environment Validation ===\n")

        print("Environment Variables:")
        for result in env_results:
            status = "✅" if result["healthy"] else "❌"
            print(f"  {status} {result['message']}")

        if service_results:
            print("\nExternal Services:")
            for result in service_results:
                status = "✅" if result["healthy"] else "❌"
                print(f"  {status} {result['service']}: {result['message']}")

        print()
        if all_passed:
            print("✅ All checks passed. System ready.")
        else:
            print("❌ Some checks failed. Container will not accept traffic.")

    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())
