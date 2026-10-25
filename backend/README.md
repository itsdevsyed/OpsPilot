# OpsPilot Backend Service

The OpsPilot backend is a high-performance agentic DevOps service built with **FastAPI**, **LangGraph**, **Apache Kafka (aiokafka)**, **SQLAlchemy 2.0**, and **Groq Cloud (LLaMA 3.3 70B)**.

---

## Architecture & Subsystems

- **`app/main.py`**: FastAPI application entry point, lifespan event hooks (auto DB initialization & Kafka consumer lifecycle), CORS middleware, and HTTP routes.
- **`app/agent/`**: LangGraph state machine orchestrating conditional intent routing (`route_question`), log diagnosis (`analyze_logs`), and direct answer synthesis (`answer_directly`).
- **`app/kafka/`**: Real-time async Kafka event streaming:
  - `consumer.py`: Background consumer listening on topic `incidents` with automated 5-minute deduplication window.
  - `producer.py`: Event publisher utility.
- **`app/services/`**:
  - `incident_service.py`: Context-augmented LLM prompt engine generating structured JSON incident diagnosis with root causes and remediation commands.
  - `incident_repository.py`: Incident persistence, dedup lookup, and occurrence counter increment.
  - `agent_service.py` & `chat_service.py`: High-level service wrappers.
- **`app/inventory/`**: Infrastructure loader reading `infra_inventory.yaml` to ensure LLM suggestions only target legitimate container topology.
- **`app/tools/`**: DevOps diagnostic tools including `log_tool.py` for reading application and container logs.
- **`app/db/`**: SQLAlchemy Declarative models (`Incident`), session factory, and schema initialization.

---

## Prerequisites

1. **Python**: Python 3.12+ (Python 3.14 compatible)
2. **Package Manager**: [uv](https://docs.astral.sh/uv/) (recommended) or `pip`
3. **LLM API Key**: [Groq Cloud API Key](https://console.groq.com/keys) (free tier available)
4. **Dependencies**: Docker / Podman (for Kafka & PostgreSQL services)

---

## Quickstart

### 1. Environment Configuration

Copy the example environment file and add your Groq API key:

```bash
cp .env.example .env
```

Edit `.env`:
```env
# Groq Cloud API Key
GROQ_API_KEY=gsk_your_actual_key_here
MODEL_NAME=llama-3.3-70b-versatile

# Kafka Broker Configuration
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
KAFKA_INCIDENTS_TOPIC=incidents
KAFKA_CONSUMER_GROUP=opspilot-incidents

# Database Configuration
# Use PostgreSQL (recommended for production):
DATABASE_URL=postgresql+psycopg://opspilot:opspilot@localhost:5432/opspilot
# Or SQLite (zero-dependency for fast local testing):
# DATABASE_URL=sqlite:///./opspilot.db
```

### 2. Install Dependencies

Using `uv`:
```bash
uv sync
```

### 3. Run the Backend Server

Start the FastAPI application with Uvicorn:

```bash
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The interactive Swagger API documentation will be available at:
`http://localhost:8000/docs`

---

## Running Automated Tests

OpsPilot comes with a comprehensive test suite covering routing, database models, deduplication logic, Kafka consumers, and API endpoints using in-memory SQLite:

```bash
# Run all tests
uv run pytest -v

# Run with coverage report
uv run pytest --cov=app -v
```

---

## Testing Kafka Incident Ingestion

With the backend and Kafka running, you can publish a test incident event via HTTP:

```bash
curl -X POST http://localhost:8000/test-event
```

To view the triaged incident saved to the database:

```bash
curl -X GET http://localhost:8000/incidents
```

To test interactive agent chat:

```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Why is the payment service returning 500 errors?"}'
```
