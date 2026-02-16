#!/usr/bin/env python3
"""
Validate environment configuration for TatTester.

Checks that all required environment variables and external services are accessible.
"""

import argparse
import os
import sys
from typing import Tuple

def check_env_var(var_name: str) -> Tuple[bool, str]:
    """Check if an environment variable is set."""
    value = os.environ.get(var_name)
    if value:
        return True, f"✓ {var_name} is set"
    return False, f"✗ {var_name} is missing"

def check_secret_manager(project_id: str) -> Tuple[bool, str]:
    """Check if Secret Manager is accessible."""
    try:
        from google.cloud import secretmanager
        client = secretmanager.SecretManagerServiceClient()
        parent = f"projects/{project_id}"
        # List secrets to verify access
        list(client.list_secrets(request={"parent": parent}))
        return True, "✓ Secret Manager accessible"
    except Exception as e:
        return False, f"✗ Secret Manager error: {e}"

def check_firestore(project_id: str) -> Tuple[bool, str]:
    """Check if Firestore is accessible."""
    try:
        from google.cloud import firestore
        client = firestore.Client(project=project_id)
        # Test write/read
        doc_ref = client.collection("_health_check").document("test")
        doc_ref.set({"test": True})
        doc_ref.get()
        doc_ref.delete()
        return True, "✓ Firestore accessible"
    except Exception as e:
        return False, f"✗ Firestore error: {e}"

def check_neo4j() -> Tuple[bool, str]:
    """Check if Neo4j is accessible."""
    try:
        from neo4j import GraphDatabase
        uri = os.environ.get("NEO4J_URI")
        user = os.environ.get("NEO4J_USER", "neo4j")
        password = os.environ.get("NEO4J_PASSWORD")

        if not all([uri, password]):
            return False, "✗ Neo4j credentials missing"

        driver = GraphDatabase.driver(uri, auth=(user, password))
        with driver.session() as session:
            result = session.run("RETURN 1")
            result.single()
        driver.close()
        return True, "✓ Neo4j accessible"
    except Exception as e:
        return False, f"✗ Neo4j error: {e}"

def main() -> int:
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Validate TatTester environment configuration"
    )
    parser.add_argument(
        "--skip-services",
        action="store_true",
        help="Skip external service checks, only validate env vars"
    )
    args = parser.parse_args()

    print("=== TatTester Environment Validation ===\n")

    # Required environment variables
    required_vars = [
        "GCP_PROJECT_ID",
        "NEO4J_URI",
        "NEO4J_PASSWORD",
        "REPLICATE_API_TOKEN",
        "FRONTEND_AUTH_TOKEN"
    ]

    all_passed = True

    print("Environment Variables:")
    for var in required_vars:
        passed, message = check_env_var(var)
        print(f"  {message}")
        if not passed:
            all_passed = False

    if not args.skip_services:
        print("\nExternal Services:")

        project_id = os.environ.get("GCP_PROJECT_ID")
        if project_id:
            passed, message = check_secret_manager(project_id)
            print(f"  {message}")
            if not passed:
                all_passed = False

            passed, message = check_firestore(project_id)
            print(f"  {message}")
            if not passed:
                all_passed = False

        passed, message = check_neo4j()
        print(f"  {message}")
        if not passed:
            all_passed = False

    print()
    if all_passed:
        print("✓ All checks passed")
        return 0
    else:
        print("✗ Some checks failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())
