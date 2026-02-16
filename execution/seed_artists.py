#!/usr/bin/env python3
"""
Import artist data into Neo4j from JSON file.

Reads artist records from JSON and creates Neo4j nodes/relationships
for artists, styles, specialties, and locations.
"""

import argparse
import json
import os
import sys
from typing import List, Dict, Any

def parse_artist_json(file_path: str) -> List[Dict[str, Any]]:
    """Parse and validate artist JSON file."""
    with open(file_path, 'r') as f:
        data = json.load(f)

    if not isinstance(data, list):
        raise ValueError("JSON must be an array of artist objects")

    # Validate required fields
    for i, artist in enumerate(data):
        if not isinstance(artist, dict):
            raise ValueError(f"Artist {i} must be an object")
        if 'name' not in artist:
            raise ValueError(f"Artist {i} missing 'name' field")

    return data

def create_artist_cypher(artist: Dict[str, Any]) -> str:
    """Generate Cypher query to create artist node and relationships."""
    name = artist.get('name', '')
    location = artist.get('location', '')
    portfolio_url = artist.get('portfolio_url', '')
    styles = artist.get('styles', [])
    specialties = artist.get('specialties', [])

    # Escape single quotes in strings
    name = name.replace("'", "\\'")
    location = location.replace("'", "\\'")
    portfolio_url = portfolio_url.replace("'", "\\'")

    queries = []

    # Create or merge artist node
    queries.append(f"""
        MERGE (a:Artist {{name: '{name}'}})
        SET a.location = '{location}',
            a.portfolio_url = '{portfolio_url}'
    """)

    # Create style nodes and relationships
    for style in styles:
        style = style.replace("'", "\\'")
        queries.append(f"""
            MERGE (s:Style {{name: '{style}'}})
            MERGE (a:Artist {{name: '{name}'}})
            MERGE (a)-[:HAS_STYLE]->(s)
        """)

    # Create specialty nodes and relationships
    for specialty in specialties:
        specialty = specialty.replace("'", "\\'")
        queries.append(f"""
            MERGE (sp:Specialty {{name: '{specialty}'}})
            MERGE (a:Artist {{name: '{name}'}})
            MERGE (a)-[:SPECIALIZES_IN]->(sp)
        """)

    return "\n".join(queries)

def import_artists(
    artists: List[Dict[str, Any]],
    batch_size: int,
    dry_run: bool
) -> int:
    """Import artists to Neo4j in batches."""
    if dry_run:
        print(f"DRY RUN: Would import {len(artists)} artists")
        for i, artist in enumerate(artists[:5]):  # Show first 5
            print(f"\n  Artist {i+1}: {artist.get('name')}")
            print(f"    Styles: {', '.join(artist.get('styles', []))}")
            print(f"    Specialties: {', '.join(artist.get('specialties', []))}")
        if len(artists) > 5:
            print(f"\n  ... and {len(artists) - 5} more")
        return 0

    # Real import
    from neo4j import GraphDatabase

    uri = os.environ.get("NEO4J_URI")
    user = os.environ.get("NEO4J_USER", "neo4j")
    password = os.environ.get("NEO4J_PASSWORD")

    if not all([uri, password]):
        print("ERROR: NEO4J_URI and NEO4J_PASSWORD must be set")
        return 1

    try:
        driver = GraphDatabase.driver(uri, auth=(user, password))

        total = len(artists)
        imported = 0

        for i in range(0, total, batch_size):
            batch = artists[i:i + batch_size]

            with driver.session() as session:
                for artist in batch:
                    cypher = create_artist_cypher(artist)
                    # Execute each statement in the query
                    for statement in cypher.strip().split('\n\n'):
                        if statement.strip():
                            session.run(statement.strip())
                    imported += 1

                    if imported % 10 == 0 or imported == total:
                        print(f"Imported {imported}/{total} artists")

        driver.close()
        print(f"✓ Successfully imported {imported} artists")
        return 0

    except Exception as e:
        print(f"ERROR: {e}")
        return 1

def main() -> int:
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Import artist data into Neo4j from JSON"
    )
    parser.add_argument(
        "--input",
        required=True,
        help="Path to JSON file with artist data"
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=100,
        help="Number of artists to import per batch"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Parse and validate JSON without importing"
    )
    args = parser.parse_args()

    try:
        print("=== Neo4j Artist Import ===\n")
        print(f"Reading {args.input}...")

        artists = parse_artist_json(args.input)
        print(f"Found {len(artists)} artists")

        return import_artists(artists, args.batch_size, args.dry_run)

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
