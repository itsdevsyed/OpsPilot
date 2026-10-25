"""Tests for FastAPI HTTP endpoints."""
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from app.main import app
from app.db.models import Incident


def test_home_endpoint():
    client = TestClient(app)
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "OpsPilot AI" in data["message"]


def test_list_incidents_endpoint(test_db):
    # Populate test database with an incident
    with test_db() as session:
        inc = Incident(
            type="LATENCY_HIGH",
            service="checkout",
            severity="high",
            problem="P99 latency > 3000ms",
            root_cause="Slow query on orders table",
            suggested_fix="Add index on user_id",
            evidence=["P99: 3200ms"],
            commands=["podman exec postgres-1 psql -c 'CREATE INDEX ...'"],
            occurrences=3,
            status="open",
        )
        session.add(inc)
        session.commit()

    client = TestClient(app)
    response = client.get("/incidents")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    first = data[0]
    assert first["service"] == "checkout"
    assert first["type"] == "LATENCY_HIGH"
    assert first["severity"] == "high"
    assert first["occurrences"] == 3


def test_chat_endpoint():
    with patch("app.api.chat.run_agent", return_value="The database is running normally."):
        client = TestClient(app)
        response = client.post("/api/chat", json={"message": "What is the status of the database?"})
        assert response.status_code == 200
        data = response.json()
        assert data["response"] == "The database is running normally."


def test_test_event_endpoint():
    with patch("app.main.send_event", new_callable=AsyncMock) as mock_send:
        client = TestClient(app)
        response = client.post("/test-event")
        assert response.status_code == 200
        assert response.json() == {"status": "sent"}
        mock_send.assert_awaited_once()
