import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy import select

from app.db.init_db import init_db
from app.db.models import Incident
from app.db.session import SessionLocal
from app.kafka.consumer import kafka_consumer
from app.kafka.producer import send_event
from app.api.chat import router as chat_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    await kafka_consumer.start()
    yield
    await kafka_consumer.stop()


app = FastAPI(
    title="OpsPilot AI",
    version="1.0.0",
    lifespan=lifespan,
)

app.include_router(chat_router, prefix="/api")


@app.get("/")
def home():
    return {"message": "OpsPilot AI is running on Groq Cloud"}


@app.post("/test-event")
async def test_event():
    event = {
        "type": "CPU_HIGH",
        "service": "payment-service",
        "cpu": 92,
    }
    await send_event("incidents", event)
    return {"status": "sent"}


@app.get("/incidents")
def list_incidents():
    with SessionLocal() as session:
        rows = session.scalars(
            select(Incident).order_by(Incident.last_seen.desc()).limit(50)
        ).all()

    return [
        {
            "id": r.id,
            "type": r.type,
            "service": r.service,
            "severity": r.severity,
            "problem": r.problem,
            "root_cause": r.root_cause,
            "suggested_fix": r.suggested_fix,
            "evidence": r.evidence,
            "commands": r.commands,
            "occurrences": r.occurrences,
            "status": r.status,
            "first_seen": r.first_seen.isoformat() if r.first_seen else None,
            "last_seen": r.last_seen.isoformat() if r.last_seen else None,
        }
        for r in rows
    ]
