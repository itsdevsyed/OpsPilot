"""Unit tests for incident repository deduplication and persistence."""
from datetime import datetime, timedelta, timezone
from app.db.models import Incident
from app.services.incident_repository import (
    bump_occurrence,
    find_open_incident,
    save_incident,
)


def test_save_incident(test_db):
    event = {
        "type": "DISK_PRESSURE",
        "service": "elasticsearch",
    }
    analysis = {
        "severity": "high",
        "problem": "Disk space utilized over 95%",
        "root_cause": "Old index retention not purging",
        "suggested_fix": "Execute curator retention policy",
        "evidence": ["Disk usage 96% on /var/lib/data"],
        "commands": ["podman exec elasticsearch curl -X DELETE localhost:9200/*-2026.09*"],
    }

    incident = save_incident(event, analysis)
    assert incident.id is not None
    assert incident.service == "elasticsearch"
    assert incident.type == "DISK_PRESSURE"
    assert incident.severity == "high"
    assert incident.occurrences == 1
    assert incident.status == "open"


def test_find_open_incident_dedup_window(test_db):
    event = {"type": "CPU_HIGH", "service": "payment-api"}
    analysis = {"severity": "medium", "problem": "High load"}

    saved = save_incident(event, analysis)

    # Looking for matching service and type should return the open incident
    found = find_open_incident("payment-api", "CPU_HIGH")
    assert found is not None
    assert found.id == saved.id

    # Looking for different service should return None
    assert find_open_incident("auth-api", "CPU_HIGH") is None

    # Looking for different type should return None
    assert find_open_incident("payment-api", "MEMORY_HIGH") is None


def test_find_open_incident_ignores_closed(test_db):
    event = {"type": "NETWORK_SPIKE", "service": "redis-cache"}
    analysis = {"severity": "low", "problem": "Temporary spike"}

    saved = save_incident(event, analysis)

    # Mark as resolved/closed
    with test_db() as session:
        inc = session.get(Incident, saved.id)
        inc.status = "resolved"
        session.commit()

    # Closed incident should not be matched for dedup
    found = find_open_incident("redis-cache", "NETWORK_SPIKE")
    assert found is None


def test_bump_occurrence(test_db):
    event = {"type": "RESTART_LOOP", "service": "worker-queue"}
    analysis = {"severity": "critical", "problem": "Crash looping"}

    saved = save_incident(event, analysis)
    assert saved.occurrences == 1

    bump_occurrence(saved.id)

    with test_db() as session:
        updated = session.get(Incident, saved.id)
        assert updated.occurrences == 2
        assert updated.last_seen is not None
