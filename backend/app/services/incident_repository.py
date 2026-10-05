import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.db.models import Incident
from app.db.session import SessionLocal

logger = logging.getLogger(__name__)

DEDUP_WINDOW = timedelta(minutes=5)


def find_open_incident(service: str, incident_type: str) -> Incident | None:
    """Return an open incident for the same service+type within the dedup window."""
    cutoff = datetime.now(timezone.utc) - DEDUP_WINDOW

    with SessionLocal() as session:
        stmt = (
            select(Incident)
            .where(Incident.service == service)
            .where(Incident.type == incident_type)
            .where(Incident.status == "open")
            .where(Incident.last_seen >= cutoff)
            .order_by(Incident.last_seen.desc())
            .limit(1)
        )
        return session.scalars(stmt).first()


def bump_occurrence(incident_id: int) -> None:
    with SessionLocal() as session:
        incident = session.get(Incident, incident_id)
        if incident:
            incident.occurrences += 1
            incident.last_seen = datetime.now(timezone.utc)
            session.commit()


def save_incident(event: dict, analysis: dict) -> Incident:
    with SessionLocal() as session:
        incident = Incident(
            type=event.get("type", "unknown"),
            service=event.get("service", "unknown"),
            severity=analysis.get("severity", "unknown"),
            problem=analysis.get("problem"),
            root_cause=analysis.get("root_cause"),
            suggested_fix=analysis.get("suggested_fix"),
            evidence=analysis.get("evidence", []),
            commands=analysis.get("commands", []),
            raw_event=event,
        )
        session.add(incident)
        session.commit()
        session.refresh(incident)
        return incident
