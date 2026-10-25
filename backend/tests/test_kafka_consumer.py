"""Unit tests for Kafka consumer incident handling and deduplication."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.kafka.consumer import KafkaConsumerService
from app.db.models import Incident


@pytest.mark.anyio
async def test_handle_message_deduplication(test_db):
    # Setup existing open incident
    with test_db() as session:
        inc = Incident(
            type="CPU_HIGH",
            service="payment-service",
            severity="medium",
            occurrences=1,
            status="open",
        )
        session.add(inc)
        session.commit()
        inc_id = inc.id

    consumer_service = KafkaConsumerService()
    event = {"type": "CPU_HIGH", "service": "payment-service", "cpu": 95}

    # Handling the message should increment occurrence count and NOT call run_incident_agent
    with patch("app.kafka.consumer.run_incident_agent") as mock_agent:
        await consumer_service._handle_message(event)
        mock_agent.assert_not_called()

    with test_db() as session:
        updated = session.get(Incident, inc_id)
        assert updated.occurrences == 2


@pytest.mark.anyio
async def test_handle_message_new_incident(test_db):
    consumer_service = KafkaConsumerService()
    event = {"type": "MEMORY_LEAK", "service": "billing-service"}

    analysis = {
        "problem": "Unbounded cache growth",
        "root_cause": "Cache key missing TTL",
        "severity": "high",
        "suggested_fix": "Add TTL to billing cache keys",
        "evidence": ["Heap used: 92%"],
        "commands": ["podman restart billing-service"],
    }

    with patch("app.kafka.consumer.run_incident_agent", return_value={"event": event, "analysis": analysis}):
        await consumer_service._handle_message(event)

    with test_db() as session:
        from sqlalchemy import select
        saved = session.scalars(select(Incident).where(Incident.service == "billing-service")).first()
        assert saved is not None
        assert saved.type == "MEMORY_LEAK"
        assert saved.severity == "high"
        assert saved.problem == "Unbounded cache growth"
        assert saved.occurrences == 1
