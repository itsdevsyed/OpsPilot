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


from fastapi.middleware.cors import CORSMiddleware

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        init_db()
    except Exception as exc:
        logger.warning("Database initialization deferred: %s", exc)

    try:
        await kafka_consumer.start()
    except Exception as exc:
        logger.warning("Kafka consumer could not be started (is Kafka broker running?): %s", exc)

    yield

    try:
        await kafka_consumer.stop()
    except Exception as exc:
        logger.warning("Kafka consumer stop error: %s", exc)


app = FastAPI(
    title="OpsPilot AI",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
