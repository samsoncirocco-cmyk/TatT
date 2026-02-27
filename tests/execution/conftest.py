"""
Shared pytest fixtures for execution script tests.

All fixtures mock external services to avoid real network calls.
"""

import sys
from pathlib import Path

# Add project root to Python path
root_dir = Path(__file__).parent.parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

import pytest
from unittest.mock import Mock, MagicMock, patch
import json


@pytest.fixture
def mock_neo4j_driver():
    """Mock Neo4j driver and session."""
    with patch('neo4j.GraphDatabase.driver') as mock_driver:
        # Create mock session
        mock_session = MagicMock()
        mock_result = MagicMock()
        mock_result.single.return_value = 1

        mock_session.run.return_value = mock_result
        mock_session.__enter__.return_value = mock_session
        mock_session.__exit__.return_value = None

        # Mock driver
        mock_driver_instance = MagicMock()
        mock_driver_instance.session.return_value = mock_session
        mock_driver.return_value = mock_driver_instance

        yield mock_driver


@pytest.fixture
def mock_firestore_client():
    """Mock Firestore client."""
    with patch('google.cloud.firestore.Client') as mock_client:
        # Create mock document
        mock_doc = MagicMock()
        mock_doc.id = "test_doc_id"
        mock_doc.to_dict.return_value = {"test": "data"}

        # Create mock collection
        mock_collection = MagicMock()
        mock_collection.stream.return_value = [mock_doc]
        mock_collection.document.return_value = mock_doc

        # Mock client instance
        mock_client_instance = MagicMock()
        mock_client_instance.collection.return_value = mock_collection

        mock_client.return_value = mock_client_instance

        yield mock_client_instance


@pytest.fixture
def mock_storage_client():
    """Mock Cloud Storage client."""
    with patch('google.cloud.storage.Client') as mock_client:
        # Create mock blob
        mock_blob = MagicMock()
        mock_blob.public_url = "https://storage.googleapis.com/bucket/object.png"
        mock_blob.upload_from_string = MagicMock()
        mock_blob.make_public = MagicMock()

        # Create mock bucket
        mock_bucket = MagicMock()
        mock_bucket.blob.return_value = mock_blob

        # Mock client instance
        mock_client_instance = MagicMock()
        mock_client_instance.bucket.return_value = mock_bucket

        mock_client.return_value = mock_client_instance

        yield mock_client_instance


@pytest.fixture
def mock_secret_manager():
    """Mock Secret Manager client."""
    with patch('google.cloud.secretmanager.SecretManagerServiceClient') as mock_client:
        # Create mock secret
        mock_secret = MagicMock()
        mock_secret.name = "test-secret"

        # Mock client instance
        mock_client_instance = MagicMock()
        mock_client_instance.list_secrets.return_value = [mock_secret]

        mock_client.return_value = mock_client_instance

        yield mock_client_instance


@pytest.fixture
def env_vars(monkeypatch):
    """Set common environment variables."""
    env = {
        "GCP_PROJECT_ID": "test-project",
        "NEO4J_URI": "neo4j+s://test.neo4j.io",
        "NEO4J_USER": "neo4j",
        "NEO4J_PASSWORD": "test-password",
        "REPLICATE_API_TOKEN": "r8_test_token",
        "FRONTEND_AUTH_TOKEN": "test-auth-token"
    }

    for key, value in env.items():
        monkeypatch.setenv(key, value)

    return env


@pytest.fixture
def sample_artist_data():
    """Sample artist data for testing seed_artists.py."""
    return [
        {
            "name": "Artist One",
            "location": "Portland, OR",
            "portfolio_url": "https://example.com/artist1",
            "styles": ["Traditional", "Japanese"],
            "specialties": ["Full sleeves", "Cover-ups"]
        },
        {
            "name": "Artist Two",
            "location": "Austin, TX",
            "portfolio_url": "https://example.com/artist2",
            "styles": ["Neo-traditional", "Color"],
            "specialties": ["Portraits", "Realism"]
        },
        {
            "name": "Artist Three",
            "location": "Brooklyn, NY",
            "portfolio_url": "https://example.com/artist3",
            "styles": ["Blackwork", "Geometric"],
            "specialties": ["Mandalas", "Sacred geometry"]
        }
    ]


@pytest.fixture
def sample_version_history():
    """Sample localStorage version history for migration testing."""
    return {
        "version_history_abc123": [
            {
                "id": "v1",
                "versionNumber": 1,
                "timestamp": "2026-01-15T12:00:00Z",
                "prompt": "Dragon tattoo",
                "enhancedPrompt": "Detailed Japanese dragon tattoo",
                "parameters": {"model": "sdxl", "size": "1024x1024"},
                "imageUrl": "https://example.com/image1.png",
                "isFavorite": False,
                "layers": [
                    {
                        "id": "layer1",
                        "type": "subject",
                        "imageUrl": "https://example.com/layer1.png",
                        "visible": True,
                        "opacity": 1.0,
                        "blendMode": "normal",
                        "transform": {},
                        "zIndex": 0
                    }
                ]
            },
            {
                "id": "v2",
                "versionNumber": 2,
                "timestamp": "2026-01-15T12:30:00Z",
                "prompt": "Dragon with fire",
                "enhancedPrompt": "Japanese dragon breathing fire",
                "parameters": {"model": "sdxl", "size": "1024x1024"},
                "imageUrl": "data:image/png;base64,iVBORw0KGgoAAAANS",
                "isFavorite": True,
                "layers": []
            }
        ]
    }
