"""
Tests for execution/generate_embeddings.py
"""

import pytest
from unittest.mock import patch, MagicMock, call
import time
from execution.generate_embeddings import (
    get_artists_from_firestore,
    get_artists_from_neo4j,
    create_embedding_text,
    generate_embeddings_batch,
    store_embedding_in_firestore,
    main
)


def test_get_artists_from_firestore(mock_firestore_client):
    """Test fetching artists from Firestore."""
    # Setup mock documents
    mock_doc1 = MagicMock()
    mock_doc1.id = "artist1"
    mock_doc1.to_dict.return_value = {"name": "Artist 1", "styles": ["Traditional"]}

    mock_doc2 = MagicMock()
    mock_doc2.id = "artist2"
    mock_doc2.to_dict.return_value = {"name": "Artist 2", "styles": ["Japanese"]}

    mock_collection = MagicMock()
    mock_collection.stream.return_value = [mock_doc1, mock_doc2]

    mock_firestore_client.collection.return_value = mock_collection

    artists = get_artists_from_firestore("test-project")

    assert len(artists) == 2
    assert artists[0]["id"] == "artist1"
    assert artists[0]["name"] == "Artist 1"


def test_get_artists_from_neo4j(mock_neo4j_driver, env_vars):
    """Test fetching artists from Neo4j."""
    # Setup mock result
    mock_record1 = {
        "name": "Artist One",
        "location": "Portland",
        "styles": ["Traditional", "Japanese"],
        "specialties": ["Sleeves"]
    }

    mock_session = mock_neo4j_driver.return_value.session.return_value.__enter__.return_value
    mock_result = MagicMock()
    mock_result.__iter__.return_value = [mock_record1]
    mock_session.run.return_value = mock_result

    artists = get_artists_from_neo4j()

    assert len(artists) == 1
    assert artists[0]["name"] == "Artist One"
    assert artists[0]["id"] == "artist_one"


def test_create_embedding_text():
    """Test embedding text creation."""
    artist = {
        "name": "Test Artist",
        "styles": ["Traditional", "Japanese"],
        "specialties": ["Sleeves", "Portraits"],
        "location": "Portland, OR"
    }

    text = create_embedding_text(artist)

    assert "Test Artist" in text
    assert "Traditional" in text
    assert "Japanese" in text
    assert "Sleeves" in text
    assert "Portland" in text


def test_create_embedding_text_minimal():
    """Test embedding text with minimal artist data."""
    artist = {"name": "Minimal Artist"}

    text = create_embedding_text(artist)

    assert text == "Minimal Artist"


def test_generate_embeddings_batch():
    """Test batch embedding generation."""
    with patch('vertexai.language_models.TextEmbeddingModel') as mock_model_class:
        # Setup mock embeddings
        mock_embedding1 = MagicMock()
        mock_embedding1.values = [0.1, 0.2, 0.3]

        mock_embedding2 = MagicMock()
        mock_embedding2.values = [0.4, 0.5, 0.6]

        mock_model = MagicMock()
        mock_model.get_embeddings.return_value = [mock_embedding1, mock_embedding2]
        mock_model_class.from_pretrained.return_value = mock_model

        texts = ["Artist 1 text", "Artist 2 text"]
        embeddings = generate_embeddings_batch(texts, "test-project")

        assert len(embeddings) == 2
        assert embeddings[0] == [0.1, 0.2, 0.3]
        assert embeddings[1] == [0.4, 0.5, 0.6]


def test_store_embedding_in_firestore(mock_firestore_client):
    """Test storing embedding in Firestore."""
    embedding = [0.1, 0.2, 0.3]

    mock_doc_ref = MagicMock()
    mock_collection = MagicMock()
    mock_collection.document.return_value = mock_doc_ref

    mock_firestore_client.collection.return_value = mock_collection

    store_embedding_in_firestore("test-project", "artist1", embedding)

    # Verify set was called with embedding
    mock_doc_ref.set.assert_called_once()
    call_args = mock_doc_ref.set.call_args
    assert call_args[0][0]["embedding"] == embedding
    assert call_args[1]["merge"] is True


def test_main_dry_run(mock_firestore_client, capsys):
    """Test main with --dry-run flag."""
    # Setup mock data
    mock_doc = MagicMock()
    mock_doc.id = "artist1"
    mock_doc.to_dict.return_value = {
        "name": "Test Artist",
        "styles": ["Traditional"],
        "specialties": ["Sleeves"]
    }

    mock_collection = MagicMock()
    mock_collection.stream.return_value = [mock_doc]
    mock_firestore_client.collection.return_value = mock_collection

    with patch('sys.argv', ['generate_embeddings.py', '--project-id', 'test-project', '--dry-run']):
        exit_code = main()

    assert exit_code == 0
    captured = capsys.readouterr()
    assert "DRY RUN" in captured.out
    assert "Test Artist" in captured.out


def test_main_batch_delay(mock_firestore_client):
    """Test that delay is respected between batches."""
    # Setup mock data with 3 artists
    artists = []
    for i in range(3):
        mock_doc = MagicMock()
        mock_doc.id = f"artist{i}"
        mock_doc.to_dict.return_value = {"name": f"Artist {i}", "styles": []}
        artists.append(mock_doc)

    mock_collection = MagicMock()
    mock_collection.stream.return_value = artists
    mock_firestore_client.collection.return_value = mock_collection

    with patch('vertexai.language_models.TextEmbeddingModel') as mock_model_class:
        mock_embedding = MagicMock()
        mock_embedding.values = [0.1] * 768

        mock_model = MagicMock()
        mock_model.get_embeddings.return_value = [mock_embedding]
        mock_model_class.from_pretrained.return_value = mock_model

        with patch('time.sleep') as mock_sleep:
            with patch('sys.argv', ['generate_embeddings.py', '--project-id', 'test-project', '--batch-size', '1', '--delay', '0.5']):
                exit_code = main()

            # Should have called sleep between batches (3 artists, batch size 1 = 2 sleeps)
            assert mock_sleep.call_count == 2
            mock_sleep.assert_called_with(0.5)


def test_main_source_neo4j(mock_neo4j_driver, env_vars, capsys):
    """Test main with --source neo4j."""
    # Setup mock Neo4j data
    mock_record = {
        "name": "Neo4j Artist",
        "location": "Portland",
        "styles": ["Traditional"],
        "specialties": ["Sleeves"]
    }

    mock_session = mock_neo4j_driver.return_value.session.return_value.__enter__.return_value
    mock_result = MagicMock()
    mock_result.__iter__.return_value = [mock_record]
    mock_session.run.return_value = mock_result

    with patch('sys.argv', ['generate_embeddings.py', '--project-id', 'test-project', '--source', 'neo4j', '--dry-run']):
        exit_code = main()

    assert exit_code == 0
    captured = capsys.readouterr()
    assert "neo4j" in captured.out.lower()


def test_main_embedding_stored(mock_firestore_client):
    """Test that embeddings are actually stored."""
    # Setup mock data
    mock_doc = MagicMock()
    mock_doc.id = "artist1"
    mock_doc.to_dict.return_value = {"name": "Test Artist", "styles": []}

    mock_collection = MagicMock()
    mock_collection.stream.return_value = [mock_doc]
    mock_firestore_client.collection.return_value = mock_collection

    mock_doc_ref = MagicMock()
    mock_collection.document.return_value = mock_doc_ref

    with patch('vertexai.language_models.TextEmbeddingModel') as mock_model_class:
        mock_embedding = MagicMock()
        mock_embedding.values = [0.1] * 768

        mock_model = MagicMock()
        mock_model.get_embeddings.return_value = [mock_embedding]
        mock_model_class.from_pretrained.return_value = mock_model

        with patch('sys.argv', ['generate_embeddings.py', '--project-id', 'test-project']):
            exit_code = main()

        # Verify embedding was stored
        mock_doc_ref.set.assert_called_once()
