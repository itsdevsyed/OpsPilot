import asyncio
import json
import logging

from aiokafka import AIOKafkaConsumer

from app.config.settings import settings
from app.db.session import SessionLocal  # noqa: F401  (ensures DB module loads)
from app.services.incident_repository import (
    bump_occurrence,
    find_open_incident,
    save_incident,
)
from app.services.incident_service import run_incident_agent

logger = logging.getLogger(__name__)


class KafkaConsumerService:
    def __init__(self):
        self.consumer: AIOKafkaConsumer | None = None
        self._task: asyncio.Task | None = None
        self._running = False

    async def start(self):
        self.consumer = AIOKafkaConsumer(
            settings.KAFKA_INCIDENTS_TOPIC,
            bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
            group_id=settings.KAFKA_CONSUMER_GROUP,
            value_deserializer=lambda v: json.loads(v.decode("utf-8")),
            auto_offset_reset="earliest",
            enable_auto_commit=True,
        )
        await self.consumer.start()
        self._running = True
        self._task = asyncio.create_task(self._consume_loop())
        logger.info("Kafka consumer started")

    async def stop(self):
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        if self.consumer:
            await self.consumer.stop()
        logger.info("Kafka consumer stopped")

    async def _consume_loop(self):
        assert self.consumer is not None
        try:
            async for msg in self.consumer:
                if not self._running:
                    break
                await self._handle_message(msg.value)
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("Consumer loop crashed")

    async def _handle_message(self, event: dict):
        logger.info("Received incident event: %s", event)

        try:
            service = event.get("service", "unknown")
            incident_type = event.get("type", "unknown")

            existing = await asyncio.to_thread(
                find_open_incident, service, incident_type
            )
            if existing:
                await asyncio.to_thread(bump_occurrence, existing.id)
                logger.info(
                    "Deduped event into open incident id=%s (occurrences now +1)",
                    existing.id,
                )
                return

            result = await asyncio.to_thread(run_incident_agent, event)
            analysis = result["analysis"]

            incident = await asyncio.to_thread(save_incident, event, analysis)
            logger.info("Saved incident id=%s: %s", incident.id, analysis)

        except Exception:
            logger.exception("Failed to process incident event")


kafka_consumer = KafkaConsumerService()
