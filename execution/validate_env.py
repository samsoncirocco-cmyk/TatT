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
    """Check if Secret Manager is accessible and required secrets exist."""
    try:
        from google.cloud import secretmanager
        client = secretmanager.SecretManagerServiceClient()

        required_secrets = [
            'replicate-api-token',
            'neo4j-password',
            'firebase-private-key',
            'openrouter-api-key'
        ]

        for secret in required_secrets:
            try:
                name = f"projects/{project_id}/secrets/{secret}/versions/latest"
                response = client.access_secret_version(request={"name": name})
                if not response.payload.data:
                    return False, f"Secret {secret} is empty"
            except Exception as e:
                return False, f"Failed to access secret {secret}: {str(e)}"

        return True, f"All {len(required_secrets)} secrets accessible"
    except Exception as e:
        return False, f"Secret Manager error: {str(e)}"

def check_firestore(project_id: str) -> Tuple[bool, str]:
    """Check if Firestore is accessible."""
    try:
        from google.cloud import firestore
        client = firestore.Client(project=project_id)
        # Test write/read to health check collection
        doc_ref = client.collection("_health_check").document("startup_probe")
        doc_ref.set({"timestamp": firestore.SERVER_TIMESTAMP})
        doc = doc_ref.get()
        if not doc.exists:
            return False, "Health check document not created"
        return True, "Firestore connected"
    except Exception as e:
        return False, f"Firestore error: {str(e)}"

def check_neo4j() -> Tuple[bool, str]:
    """Check if Neo4j is accessible."""
    try:
        from neo4j import GraphDatabase
        uri = os.environ.get("NEO4J_URI")
        user = os.environ.get("NEO4J_USER", "neo4j")
        password = os.environ.get("NEO4J_PASSWORD")

        if not uri:
            return False, "NEO4J_URI not set"
        if not password:
            return False, "NEO4J_PASSWORD not set"

        driver = GraphDatabase.driver(uri, auth=(user, password))
        with driver.session() as session:
            result = session.run("RETURN 1 AS num")
            record = result.single()
            if record["num"] != 1:
                return False, "Query returned unexpected result"
        driver.close()
        return True, "Neo4j connected"
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

def main() -> int:
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Validate TatTester environment configuration"
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
    args = parser.parse_args()

    skip_services = args.skip or []

    # Required environment variables
    required_vars = [
        "GCP_PROJECT_ID",
        "NEO4J_URI",
        "NEO4J_USER",
        "NEO4J_PASSWORD",
        "GCS_BUCKET_NAME"
    ]

    results: List[Dict] = []
    all_passed = True

    # Check environment variables
    for var in required_vars:
        passed, message = check_env_var(var)
        results.append({
            "service": f"EnvVar:{var}",
            "healthy": passed,
            "message": message
        })
        if not passed:
            all_passed = False

    # Check services
    project_id = os.environ.get("GCP_PROJECT_ID")

    checks = []

    if "secrets" not in skip_services and project_id:
        checks.append(("Secret Manager", check_secret_manager, project_id))

    if "firestore" not in skip_services and project_id:
        checks.append(("Firestore", check_firestore, project_id))

    if "neo4j" not in skip_services:
        checks.append(("Neo4j", check_neo4j, None))

    if "storage" not in skip_services:
        checks.append(("Cloud Storage", check_cloud_storage, None))

    for service_name, check_fn, arg in checks:
        try:
            if arg:
                passed, message = check_fn(arg)
            else:
                passed, message = check_fn()
            results.append({
                "service": service_name,
                "healthy": passed,
                "message": message
            })
            if not passed:
                all_passed = False
        except Exception as e:
            results.append({
                "service": service_name,
                "healthy": False,
                "message": f"Unexpected error: {str(e)}"
            })
            all_passed = False

    # Output results
    if args.json:
        print(json.dumps({
            "healthy": all_passed,
            "checks": results
        }, indent=2))
    else:
        print("=== TatTester Environment Validation ===\n")
        for result in results:
            status = "✅" if result["healthy"] else "❌"
            print(f"{status} {result['service']}: {result['message']}")

        print()
        if all_passed:
            print("✅ All validation checks passed. System ready.")
        else:
            print("❌ Validation failed. Container will not accept traffic.", file=sys.stderr)

    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())
