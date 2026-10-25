"""Unit tests for incident analysis agent and JSON output parsing."""
import json
from unittest.mock import MagicMock, patch
from app.services.incident_service import run_incident_agent


def test_run_incident_agent_valid_json(mock_llm_response):
    sample_analysis = {
        "problem": "Connection pool exhaustion",
        "root_cause": "Leak in billing connection handle",
        "evidence": ["PoolTimeout: 5.0 seconds", "psycopg.OperationalError"],
        "suggested_fix": "Restart payment service container",
        "commands": ["podman restart opspilot_backend_1"],
        "severity": "critical",
    }

    mock_resp = mock_llm_response(json.dumps(sample_analysis))

    with patch("app.services.incident_service.llm") as mock_llm:
        mock_bound = MagicMock()
        mock_bound.invoke.return_value = mock_resp
        mock_llm.bind.return_value = mock_bound

        event = {"type": "CPU_HIGH", "service": "payment-service"}
        result = run_incident_agent(event)

        assert result["event"] == event
        analysis = result["analysis"]
        assert analysis["problem"] == "Connection pool exhaustion"
        assert analysis["severity"] == "critical"
        assert len(analysis["commands"]) == 1
        assert analysis["commands"][0] == "podman restart opspilot_backend_1"


def test_run_incident_agent_markdown_wrapped_json(mock_llm_response):
    sample_analysis = {
        "problem": "High Memory",
        "root_cause": "Cache leak",
        "evidence": ["RAM 98%"],
        "suggested_fix": "Flush Redis cache",
        "commands": ["redis-cli flushall"],
        "severity": "high",
    }

    markdown_json = f"```json\n{json.dumps(sample_analysis)}\n```"
    mock_resp = mock_llm_response(markdown_json)

    with patch("app.services.incident_service.llm") as mock_llm:
        mock_bound = MagicMock()
        mock_bound.invoke.return_value = mock_resp
        mock_llm.bind.return_value = mock_bound

        event = {"type": "MEMORY_PRESSURE", "service": "redis"}
        result = run_incident_agent(event)

        analysis = result["analysis"]
        assert analysis["problem"] == "High Memory"
        assert analysis["severity"] == "high"


def test_run_incident_agent_invalid_json_fallback(mock_llm_response):
    mock_resp = mock_llm_response("Not a JSON object at all")

    with patch("app.services.incident_service.llm") as mock_llm:
        mock_bound = MagicMock()
        mock_bound.invoke.return_value = mock_resp
        mock_llm.bind.return_value = mock_bound

        event = {"type": "DISK_FULL", "service": "storage"}
        result = run_incident_agent(event)

        analysis = result["analysis"]
        assert analysis["problem"] == "DISK_FULL"
        assert analysis["severity"] == "unknown"
        assert analysis["raw"] == "Not a JSON object at all"
