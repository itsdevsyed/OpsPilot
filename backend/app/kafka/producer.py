from aiokafka import AIOKafkaProducer
import json

KAFKA_BOOTSTRAP_SERVERS = "kafka:9092"


async def send_event(topic: str, event: dict):
    producer = AIOKafkaProducer(
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS
    )

    await producer.start()

    try:
        await producer.send_and_wait(
            topic,
            json.dumps(event).encode("utf-8")
        )
    finally:
        await producer.stop()
