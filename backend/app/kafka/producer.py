from aiokafka import AIOKafkaProducer
import json

from app.config.settings import settings


async def send_event(topic: str, event: dict):
    producer = AIOKafkaProducer(
        bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS
    )

    await producer.start()

    try:
        await producer.send_and_wait(
            topic,
            json.dumps(event).encode("utf-8")
        )
    finally:
        await producer.stop()
