#!/usr/bin/env python3
"""
Generate Vertex AI embeddings for artist portfolios.

Reads artist data from Firestore or Neo4j, generates text-embedding-004 embeddings,
and stores them back in Firestore.
"""

import argparse
import os
import sys
import time
from typing import List, Dict, Any

def get_artists_from_firestore(project_id: str) -> List[Dict[str, Any]]:
    """Fetch artists from Firestore."""
    from google.cloud import firestore

    client = firestore.Client(project=project_id)
    artists_ref = client.collection("artists")

    artists = []
    for doc in artists_ref.stream():
        data = doc.to_dict()
        data['id'] = doc.id
        artists.append(data)

    return artists

def get_artists_from_neo4j() -> List[Dict[str, Any]]:
    """Fetch artists from Neo4j."""
    from neo4j import GraphDatabase

    uri = os.environ.get("NEO4J_URI")
    user = os.environ.get("NEO4J_USER", "neo4j")
    password = os.environ.get("NEO4J_PASSWORD")

    if not all([uri, password]):
        raise ValueError("NEO4J_URI and NEO4J_PASSWORD must be set")

    driver = GraphDatabase.driver(uri, auth=(user, password))
    artists = []

    with driver.session() as session:
        # Fetch artists with their styles and specialties
        result = session.run("""
            MATCH (a:Artist)
            OPTIONAL MATCH (a)-[:HAS_STYLE]->(s:Style)
            OPTIONAL MATCH (a)-[:SPECIALIZES_IN]->(sp:Specialty)
            RETURN a.name as name,
                   a.location as location,
                   collect(DISTINCT s.name) as styles,
                   collect(DISTINCT sp.name) as specialties
        """)

        for record in result:
            artists.append({
                'id': record['name'].lower().replace(' ', '_'),
                'name': record['name'],
                'location': record['location'] or '',
                'styles': [s for s in record['styles'] if s],
                'specialties': [sp for sp in record['specialties'] if sp]
            })

    driver.close()
    return artists

def create_embedding_text(artist: Dict[str, Any]) -> str:
    """Create text representation of artist for embedding."""
    parts = [artist.get('name', '')]

    styles = artist.get('styles', [])
    if styles:
        parts.append(f"Styles: {', '.join(styles)}")

    specialties = artist.get('specialties', [])
    if specialties:
        parts.append(f"Specialties: {', '.join(specialties)}")

    location = artist.get('location', '')
    if location:
        parts.append(f"Location: {location}")

    return ". ".join(parts)

def generate_embeddings_batch(
    texts: List[str],
    project_id: str
) -> List[List[float]]:
    """Generate embeddings using Vertex AI."""
    from vertexai.language_models import TextEmbeddingModel

    model = TextEmbeddingModel.from_pretrained("text-embedding-004")
    embeddings = model.get_embeddings(texts)

    return [emb.values for emb in embeddings]

def store_embedding_in_firestore(
    project_id: str,
    artist_id: str,
    embedding: List[float]
) -> None:
    """Store embedding in Firestore artist document."""
    from google.cloud import firestore

    client = firestore.Client(project=project_id)
    doc_ref = client.collection("artists").document(artist_id)

    doc_ref.set({
        'embedding': embedding
    }, merge=True)

def main() -> int:
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Generate Vertex AI embeddings for artist portfolios"
    )
    parser.add_argument(
        "--project-id",
        required=True,
        help="GCP project ID"
    )
    parser.add_argument(
        "--source",
        choices=["firestore", "neo4j"],
        default="firestore",
        help="Data source for artist data"
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=10,
        help="Number of embeddings to generate per batch"
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=1.0,
        help="Delay in seconds between batches"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be embedded without calling APIs"
    )
    args = parser.parse_args()

    try:
        print("=== Vertex AI Embedding Generation ===\n")

        # Fetch artists
        print(f"Fetching artists from {args.source}...")
        if args.source == "firestore":
            artists = get_artists_from_firestore(args.project_id)
        else:
            artists = get_artists_from_neo4j()

        print(f"Found {len(artists)} artists")

        if args.dry_run:
            print("\nDRY RUN: Sample embedding texts:")
            for i, artist in enumerate(artists[:5]):
                text = create_embedding_text(artist)
                print(f"\n  Artist {i+1} ({artist.get('name')}):")
                print(f"    Text: {text[:100]}...")
            if len(artists) > 5:
                print(f"\n  ... and {len(artists) - 5} more")
            return 0

        # Generate embeddings in batches
        total = len(artists)
        processed = 0

        for i in range(0, total, args.batch_size):
            batch = artists[i:i + args.batch_size]
            texts = [create_embedding_text(a) for a in batch]

            # Generate embeddings
            embeddings = generate_embeddings_batch(texts, args.project_id)

            # Store embeddings
            for artist, embedding in zip(batch, embeddings):
                store_embedding_in_firestore(
                    args.project_id,
                    artist['id'],
                    embedding
                )
                processed += 1

            print(f"Generated {processed}/{total} embeddings")

            # Rate limiting
            if i + args.batch_size < total:
                time.sleep(args.delay)

        print(f"\n✓ Successfully generated {processed} embeddings")
        return 0

    except Exception as e:
        print(f"ERROR: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
