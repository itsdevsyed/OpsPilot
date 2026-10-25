"""Incident agent interface for analyzing incidents and proposing remediation."""
from app.services.incident_service import INCIDENT_PROMPT, run_incident_agent

__all__ = ["INCIDENT_PROMPT", "run_incident_agent"]
