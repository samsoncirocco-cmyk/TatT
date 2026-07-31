#!/usr/bin/env python3
"""
Migrate localStorage version history to Firestore.

Converts exported browser localStorage data to Firestore subcollection structure.
Handles data: URI image uploads to Cloud Storage.
"""

import argparse
import base64
import hashlib
import json
import os
import re
import sys
from typing import Dict, Any


def design_id_for_version(version: Dict[str, Any]) -> str:
    """Return the deterministic parent design ID for a source version."""
    version_id = version.get("id")
    if not version_id:
        raise ValueError("Version missing 'id' field")
    digest = hashlib.sha256(version_id.encode()).hexdigest()[:16]
    return f"design_{digest}"


def parse_version_history(file_path: str) -> Dict[str, Any]:
    """Parse localStorage export JSON."""
    with open(file_path, 'r') as f:
        data = json.load(f)

    # Validate structure
    if not isinstance(data, dict):
        raise ValueError("JSON must be an object")

    # Should have session ID as key with versions array
    if not any('version_history_' in k for k in data.keys()):
        raise ValueError("No version_history_* key found in export")

    return data

def is_data_uri(url: str) -> bool:
    """Check if URL is a data: URI."""
    return url.startswith('data:')

def upload_data_uri_to_storage(
    data_uri: str,
    bucket_name: str,
    user_id: str,
    design_id: str
) -> str:
    """Upload data: URI to Cloud Storage and return public URL."""
    from google.cloud import storage

    # Parse data URI
    match = re.match(r'data:([^;]+);base64,(.+)', data_uri)
    if not match:
        raise ValueError("Invalid data URI format")

    mime_type = match.group(1)
    base64_data = match.group(2)

    # Decode (localStorage exports sometimes strip base64 padding — restore it)
    padded = base64_data + "=" * (-len(base64_data) % 4)
    file_data = base64.b64decode(padded)

    # Generate filename from content hash
    content_hash = hashlib.sha256(file_data).hexdigest()[:16]
    extension = mime_type.split('/')[-1]
    filename = f"{content_hash}.{extension}"

    # Upload to Cloud Storage
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob_path = f"users/{user_id}/designs/{design_id}/images/{filename}"
    blob = bucket.blob(blob_path)

    blob.upload_from_string(file_data, content_type=mime_type)
    blob.make_public()

    return blob.public_url

def migrate_version_to_firestore(
    project_id: str,
    user_id: str,
    design_id: str,
    version: Dict[str, Any],
    bucket_name: str,
    dry_run: bool
) -> None:
    """Migrate a single version to Firestore."""
    if dry_run:
        return

    from google.cloud import firestore

    client = firestore.Client(project=project_id)

    version_id = version.get('id')
    if not version_id:
        raise ValueError("Version missing 'id' field")

    design_ref = client.collection("users").document(user_id) \
        .collection("designs").document(design_id)
    version_ref = design_ref.collection("versions").document(version_id)

    # Handle image URL (upload if data: URI)
    image_url = version.get('imageUrl', '')
    if is_data_uri(image_url):
        image_url = upload_data_uri_to_storage(
            image_url,
            bucket_name,
            user_id,
            design_id
        )

    timestamp = version.get('timestamp', '')
    parameters = version.get('parameters', {})
    metadata = version.get('metadata', {})

    # Firestore does not materialize parent documents when a subcollection is
    # written. Create the parent explicitly so the design appears in list views.
    # create() is intentional: migrations must fail instead of overwriting an
    # existing customer's design.
    design_data = {
        'id': design_id,
        'createdAt': timestamp,
        'updatedAt': timestamp,
        'currentVersionId': version_id,
        'bodyPart': parameters.get('bodyPart') or metadata.get('bodyPart') or 'forearm',
        'canvas': {'width': 1024, 'height': 1024, 'aspectRatio': 1},
        'isFavorite': version.get('isFavorite', False),
        'migratedFrom': 'localStorage'
    }
    design_ref.create(design_data)

    # Create version document without overwriting any existing record.
    version_data = {
        'versionNumber': version.get('versionNumber', 0),
        'timestamp': timestamp,
        'prompt': version.get('prompt', ''),
        'enhancedPrompt': version.get('enhancedPrompt', ''),
        'parameters': version.get('parameters', {}),
        'imageUrl': image_url,
        'isFavorite': version.get('isFavorite', False),
        'branchedFrom': version.get('branchedFrom'),
        'mergedFrom': version.get('mergedFrom')
    }

    version_ref.create(version_data)

    # Migrate layers as subcollection
    layers = version.get('layers', [])
    for layer in layers:
        layer_id = layer.get('id')
        if not layer_id:
            continue

        layer_ref = version_ref.collection("layers").document(layer_id)

        # Handle layer image URL
        layer_image_url = layer.get('imageUrl', '')
        if is_data_uri(layer_image_url):
            layer_image_url = upload_data_uri_to_storage(
                layer_image_url,
                bucket_name,
                user_id,
                design_id
            )

        layer_data = {
            'type': layer.get('type', 'subject'),
            'imageUrl': layer_image_url,
            'visible': layer.get('visible', True),
            'opacity': layer.get('opacity', 1.0),
            'blendMode': layer.get('blendMode', 'normal'),
            'transform': layer.get('transform', {}),
            'zIndex': layer.get('zIndex', 0)
        }

        layer_ref.create(layer_data)

def main(argv=None) -> int:
    """Main entry point.

    Accepts an explicit ``argv`` list (defaults to ``sys.argv[1:]``) so callers
    such as tests can invoke it without leaking the host process arguments.
    """
    parser = argparse.ArgumentParser(
        description="Migrate localStorage version history to Firestore"
    )
    parser.add_argument(
        "--input",
        required=True,
        help="Path to localStorage export JSON file"
    )
    parser.add_argument(
        "--user-id",
        required=True,
        help="Firestore user ID"
    )
    parser.add_argument(
        "--project-id",
        help="GCP project ID (defaults to GCP_PROJECT_ID env var)"
    )
    parser.add_argument(
        "--bucket",
        help="Cloud Storage bucket name (defaults to {project_id}-designs)"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Parse and validate without writing to Firestore"
    )
    args = parser.parse_args(argv)

    try:
        print("=== localStorage to Firestore Migration ===\n")
        print(f"Reading {args.input}...")

        data = parse_version_history(args.input)

        # Extract session data
        session_key = [k for k in data.keys() if 'version_history_' in k][0]
        versions = data[session_key]

        if not isinstance(versions, list):
            raise ValueError(f"{session_key} must be an array of versions")

        print(f"Found {len(versions)} versions")

        if args.dry_run:
            print("\nDRY RUN: Complete recovery manifest (no writes):")
            for i, version in enumerate(versions):
                design_id = design_id_for_version(version)
                version_id = version.get('id')
                print(f"\n  Version {version.get('versionNumber', i+1)}:")
                print(f"    Design: users/{args.user_id}/designs/{design_id}")
                print(f"    Version: users/{args.user_id}/designs/{design_id}/versions/{version_id}")
                layers = version.get('layers', [])
                print(f"    Layers: {len(layers)}")
                for layer in layers:
                    if layer.get('id'):
                        print(
                            "      - "
                            f"users/{args.user_id}/designs/{design_id}/versions/"
                            f"{version_id}/layers/{layer['id']}"
                        )
                print(f"    Image URL type: {'data URI' if is_data_uri(version.get('imageUrl', '')) else 'URL'}")

            return 0

        # Real migration — GCP credentials only required past this point,
        # so dry runs work without a project ID.
        project_id = args.project_id or os.environ.get("GCP_PROJECT_ID")
        if not project_id:
            print("ERROR: --project-id or GCP_PROJECT_ID must be set")
            return 1

        bucket_name = args.bucket or f"{project_id}-designs"

        migrated = 0
        for version in versions:
            design_id = design_id_for_version(version)

            migrate_version_to_firestore(
                project_id,
                args.user_id,
                design_id,
                version,
                bucket_name,
                args.dry_run
            )

            migrated += 1
            print(f"Migrated {migrated}/{len(versions)} designs")

        print(f"\n✓ Successfully migrated {migrated} designs")
        return 0

    except FileNotFoundError:
        print(f"ERROR: File not found: {args.input}")
        return 1
    except json.JSONDecodeError as e:
        print(f"ERROR: Invalid JSON: {e}")
        return 1
    except Exception as e:
        print(f"ERROR: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
