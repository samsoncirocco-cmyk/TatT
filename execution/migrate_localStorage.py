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
from typing import Dict, Any, List


def decode_data_uri(data_uri: str) -> tuple[str, bytes]:
    """Validate and decode a base64 data URI."""
    match = re.match(r'data:([^;]+);base64,(.+)', data_uri)
    if not match:
        raise ValueError("Invalid data URI format")

    mime_type = match.group(1)
    base64_data = match.group(2)
    padded = base64_data + "=" * (-len(base64_data) % 4)
    return mime_type, base64.b64decode(padded, validate=True)


def storage_object_path(
    data_uri: str,
    user_id: str,
    design_id: str
) -> str:
    """Return the deterministic Cloud Storage object path for a data URI."""
    mime_type, file_data = decode_data_uri(data_uri)
    content_hash = hashlib.sha256(file_data).hexdigest()[:16]
    extension = mime_type.split('/')[-1]
    filename = f"{content_hash}.{extension}"
    return f"users/{user_id}/designs/{design_id}/images/{filename}"


def design_id_for_history(history_key: str) -> str:
    """Return one deterministic parent ID for one exported version history."""
    marker = "version_history_"
    suffix = history_key.split(marker, 1)[-1]
    if suffix and re.fullmatch(r"[A-Za-z0-9_-]{1,128}", suffix):
        return suffix
    digest = hashlib.sha256(history_key.encode()).hexdigest()[:16]
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


def extract_histories(
    data: Dict[str, Any]
) -> List[tuple[str, List[Dict[str, Any]]]]:
    """Extract and validate every version-history entry in an export."""
    histories = []
    seen_design_ids = set()
    for history_key, versions in data.items():
        if "version_history_" not in history_key:
            continue
        if not isinstance(versions, list):
            raise ValueError(f"{history_key} must be an array of versions")
        if not versions:
            raise ValueError(f"{history_key} must contain at least one version")

        design_id = design_id_for_history(history_key)
        if design_id in seen_design_ids:
            raise ValueError(
                f"Multiple histories map to the same design id: {design_id}"
            )
        seen_design_ids.add(design_id)
        validate_versions(versions)
        histories.append((history_key, versions))

    return histories

def is_data_uri(url: str) -> bool:
    """Check if URL is a data: URI."""
    return url.startswith('data:')

def upload_data_uri_to_storage(
    data_uri: str,
    bucket_name: str,
    user_id: str,
    design_id: str,
    uploaded_urls: Dict[str, str] = None
) -> str:
    """Upload data: URI to Cloud Storage and return public URL."""
    from google.cloud import storage

    mime_type, file_data = decode_data_uri(data_uri)

    # Upload to Cloud Storage
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob_path = storage_object_path(data_uri, user_id, design_id)
    if uploaded_urls is not None and blob_path in uploaded_urls:
        return uploaded_urls[blob_path]
    blob = bucket.blob(blob_path)

    # The generation precondition makes this create-only even if another
    # process writes the same path after preflight.
    blob.upload_from_string(
        file_data,
        content_type=mime_type,
        if_generation_match=0
    )
    blob.make_public()

    if uploaded_urls is not None:
        uploaded_urls[blob_path] = blob.public_url
    return blob.public_url


def validate_versions(versions: List[Dict[str, Any]]) -> None:
    """Validate the complete export before any external reads or writes."""
    seen_versions = set()
    for version in versions:
        version_id = version.get('id')
        if not version_id:
            raise ValueError("Version missing 'id' field")
        if version_id in seen_versions:
            raise ValueError(f"Duplicate version id: {version_id}")
        seen_versions.add(version_id)

        image_url = version.get('imageUrl', '')
        if is_data_uri(image_url):
            decode_data_uri(image_url)

        layers = version.get('layers', [])
        if not isinstance(layers, list):
            raise ValueError(f"Version {version_id} layers must be an array")

        seen_layers = set()
        for layer in layers:
            layer_id = layer.get('id')
            if not layer_id:
                raise ValueError(f"Version {version_id} has a layer missing 'id'")
            if layer_id in seen_layers:
                raise ValueError(
                    f"Version {version_id} has duplicate layer id: {layer_id}"
                )
            seen_layers.add(layer_id)
            layer_url = layer.get('imageUrl', '')
            if is_data_uri(layer_url):
                decode_data_uri(layer_url)


def preflight_destination(
    project_id: str,
    bucket_name: str,
    user_id: str,
    histories: List[tuple[str, List[Dict[str, Any]]]]
) -> None:
    """Prove all destination paths are empty before any migration side effect."""
    from google.cloud import firestore, storage

    firestore_client = firestore.Client(project=project_id)
    designs = firestore_client.collection("users").document(user_id) \
        .collection("designs")

    if next(iter(designs.limit(1).stream()), None) is not None:
        raise ValueError("Target user already has designs; migration requires an empty target")

    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)

    for history_key, versions in histories:
        design_id = design_id_for_history(history_key)
        design_ref = designs.document(design_id)
        refs = [design_ref]
        for version in versions:
            version_id = version['id']
            version_ref = design_ref.collection("versions").document(version_id)
            refs.append(version_ref)
            refs.extend(
                version_ref.collection("layers").document(layer['id'])
                for layer in version.get('layers', [])
            )
        if any(ref.get().exists for ref in refs):
            raise ValueError(
                f"Destination already contains data for source history {history_key}"
            )

        for version in versions:
            urls = [version.get('imageUrl', '')]
            urls.extend(
                layer.get('imageUrl', '')
                for layer in version.get('layers', [])
            )
            for url in urls:
                if is_data_uri(url):
                    object_path = storage_object_path(url, user_id, design_id)
                    if bucket.blob(object_path).exists():
                        raise ValueError(
                            "Destination storage object already exists: "
                            f"gs://{bucket_name}/{object_path}"
                        )


def create_design_in_firestore(
    project_id: str,
    user_id: str,
    design_id: str,
    versions: List[Dict[str, Any]]
) -> None:
    """Create one visible parent design for a complete version history."""
    from google.cloud import firestore

    client = firestore.Client(project=project_id)
    design_ref = client.collection("users").document(user_id) \
        .collection("designs").document(design_id)

    first = versions[0]
    latest = versions[-1]
    parameters = first.get('parameters', {})
    metadata = first.get('metadata', {})
    design_ref.create({
        'id': design_id,
        'createdAt': first.get('timestamp', ''),
        'updatedAt': latest.get('timestamp', ''),
        'currentVersionId': latest['id'],
        'bodyPart': parameters.get('bodyPart') or metadata.get('bodyPart') or 'forearm',
        'canvas': parameters.get('canvas') or {
            'width': 1024,
            'height': 1024,
            'aspectRatio': 1
        },
        'isFavorite': any(version.get('isFavorite', False) for version in versions),
        'migratedFrom': 'localStorage'
    })

def migrate_version_to_firestore(
    project_id: str,
    user_id: str,
    design_id: str,
    version: Dict[str, Any],
    bucket_name: str,
    dry_run: bool,
    uploaded_urls: Dict[str, str] = None
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
            design_id,
            uploaded_urls
        )

    # Create version document without overwriting any existing record.
    version_data = {
        'versionNumber': version.get('versionNumber', 0),
        'timestamp': version.get('timestamp', ''),
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
        layer_id = layer['id']

        layer_ref = version_ref.collection("layers").document(layer_id)

        # Handle layer image URL
        layer_image_url = layer.get('imageUrl', '')
        if is_data_uri(layer_image_url):
            layer_image_url = upload_data_uri_to_storage(
                layer_image_url,
                bucket_name,
                user_id,
                design_id,
                uploaded_urls
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
        histories = extract_histories(data)
        total_versions = sum(len(versions) for _, versions in histories)
        history_word = "history" if len(histories) == 1 else "histories"
        print(
            f"Found {len(histories)} design {history_word} "
            f"containing {total_versions} versions"
        )

        if args.dry_run:
            project_id = args.project_id or os.environ.get("GCP_PROJECT_ID")
            bucket_name = args.bucket or (
                f"{project_id}-designs" if project_id else "[BUCKET_NAME]"
            )
            print("\nDRY RUN: Complete recovery manifest (no writes):")
            for history_key, versions in histories:
                design_id = design_id_for_history(history_key)
                print(f"    Design: users/{args.user_id}/designs/{design_id}")
                print(f"    Source: {history_key}")
                for i, version in enumerate(versions):
                    version_id = version['id']
                    print(f"\n      Version {version.get('versionNumber', i+1)}:")
                    print(
                        "        Document: "
                        f"users/{args.user_id}/designs/{design_id}/versions/"
                        f"{version_id}"
                    )
                    layers = version.get('layers', [])
                    print(f"        Layers: {len(layers)}")
                    for layer in layers:
                        print(
                            "          - "
                            f"users/{args.user_id}/designs/{design_id}/versions/"
                            f"{version_id}/layers/{layer['id']}"
                        )
                    urls = [version.get('imageUrl', '')]
                    urls.extend(layer.get('imageUrl', '') for layer in layers)
                    for url in urls:
                        if is_data_uri(url):
                            object_path = storage_object_path(
                                url, args.user_id, design_id
                            )
                            print(
                                f"        Storage: "
                                f"gs://{bucket_name}/{object_path}"
                            )
                    image_type = (
                        'data URI'
                        if is_data_uri(version.get('imageUrl', ''))
                        else 'URL'
                    )
                    print(f"        Image URL type: {image_type}")

            return 0

        # Real migration — GCP credentials only required past this point,
        # so dry runs work without a project ID.
        project_id = args.project_id or os.environ.get("GCP_PROJECT_ID")
        if not project_id:
            print("ERROR: --project-id or GCP_PROJECT_ID must be set")
            return 1

        bucket_name = args.bucket or f"{project_id}-designs"
        preflight_destination(
            project_id,
            bucket_name,
            args.user_id,
            histories
        )

        migrated_designs = 0
        migrated_versions = 0
        uploaded_urls = {}
        for history_key, versions in histories:
            design_id = design_id_for_history(history_key)
            create_design_in_firestore(
                project_id,
                args.user_id,
                design_id,
                versions
            )

            for version in versions:
                migrate_version_to_firestore(
                    project_id,
                    args.user_id,
                    design_id,
                    version,
                    bucket_name,
                    args.dry_run,
                    uploaded_urls
                )
                migrated_versions += 1
                print(
                    f"Migrated {migrated_versions}/{total_versions} versions"
                )

            migrated_designs += 1

        print(
            f"\n✓ Successfully migrated {migrated_designs} designs "
            f"and {migrated_versions} versions"
        )
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
