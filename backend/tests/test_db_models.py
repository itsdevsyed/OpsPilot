"""Unit tests for Incident database model."""
from app.db.models import Incident


def test_incident_model_instantiation():
    incident = Incident(
        type="OUT_OF_MEMORY",
        service="checkout-service",
        severity="critical",
        problem="OOM killed worker container",
        root_cause="Memory leak in transaction cache",
        suggested_fix="Increase container memory limits and patch cache eviction",
        evidence=["Exit code 137 in logs", "Memory spike to 100%"],
        commands=["docker restart checkout-service_1", "docker logs --tail 50 checkout-service_1"],
        raw_event={"type": "OUT_OF_MEMORY", "service": "checkout-service"},
    )

    assert incident.type == "OUT_OF_MEMORY"
    assert incident.service == "checkout-service"
    assert incident.severity == "critical"
    assert incident.problem == "OOM killed worker container"
    assert len(incident.evidence) == 2
    assert len(incident.commands) == 2
    assert incident.raw_event["service"] == "checkout-service"
