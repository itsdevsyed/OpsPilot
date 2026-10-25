"""Pytest configuration and fixtures for OpsPilot backend."""
import os
import pytest
from unittest.mock import MagicMock, patch
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Ensure dummy API key is present for tests
os.environ["GROQ_API_KEY"] = "gsk_test_key_for_unit_tests"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from app.db.base import Base
import app.db.session as db_session_module
import app.services.incident_repository as incident_repo_module
import app.main as app_main_module


@pytest.fixture(autouse=True)
def test_db():
    """Create an isolated in-memory SQLite database for testing."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(
        bind=engine,
        autoflush=False,
        autocommit=False,
        expire_on_commit=False,
    )

    with patch.object(db_session_module, "SessionLocal", TestingSessionLocal), \
         patch.object(db_session_module, "engine", engine), \
         patch.object(incident_repo_module, "SessionLocal", TestingSessionLocal), \
         patch.object(app_main_module, "SessionLocal", TestingSessionLocal):
        yield TestingSessionLocal

    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def mock_llm_response():
    """Fixture providing standard mock LLM message responses."""
    def _create_response(content: str):
        mock = MagicMock()
        mock.content = content
        return mock
    return _create_response
