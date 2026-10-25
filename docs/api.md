# OpsPilot API & Integration Reference

This document specifies the REST API endpoints and Kafka message schemas for OpsPilot.

Base URL: `http://localhost:8000`

---

## 1. REST API Endpoints

### 1.1 Root / Health Check
Check API gateway liveness and LLM configuration status.

- **URL**: `/`
- **Method**: `GET`
- **Response `200 OK`**:
  ```json
  {
    "message": "OpsPilot AI is running on Groq Cloud"
  }
  ```

---

### 1.2 List Incidents
Retrieve the 50 most recent incidents sorted by `last_seen` in descending order.

- **URL**: `/incidents`
- **Method**: `GET`
- **Query Parameters**: None (default limit: 50)
- **Response `200 OK`**:
  ```json
  [
    {
      "id": 1,
      "type": "CPU_HIGH",
      "service": "payment-service",
      "severity": "critical",
      "problem": "CPU usage exceeded 94% on payment-service worker pod",
      "root_cause": "Deadlock during concurrent order transactions causing thread spinning",
      "suggested_fix": "Restart payment container and review transaction isolation level",
      "evidence": [
        "CPU usage 94.8%",
        "PoolTimeout: Failed to obtain database connection within 5.0 seconds"
      ],
      "commands": [
        "podman restart opspilot_backend_1",
        "podman logs --tail 50 opspilot_backend_1"
      ],
      "occurrences": 4,
      "status": "open",
      "first_seen": "2026-10-25T14:15:00.000Z",
      "last_seen": "2026-10-25T14:18:22.000Z"
    }
  ]
  ```

---

### 1.3 Interactive AI Chat (LangGraph)
Ask technical DevOps questions, perform root cause investigations, or ask the agent to analyze the current system logs.

- **URL**: `/api/chat`
- **Method**: `POST`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "message": "What is causing the timeout errors in the payment-service?"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "response": "Problem:\nDatabase connection pool exhaustion on payment-service.\n\nEvidence:\nLogs indicate psycopg_pool.PoolTimeout: Failed to obtain database connection within 5.0 seconds.\n\nSuggested Fix:\nRecycle idle database connections and restart the payment-service container."
  }
  ```

---

### 1.4 Emit Test Incident Event
Trigger a test event onto the Kafka `incidents` topic to test the full real-time triage and deduplication pipeline.

- **URL**: `/test-event`
- **Method**: `POST`
- **Response `200 OK`**:
  ```json
  {
    "status": "sent"
  }
  ```

---

## 2. Kafka Event Ingestion Specification

Monitored microservices, Prometheus Alertmanager, or log forwarders send events to Kafka.

- **Topic**: `incidents`
- **Message Format**: JSON (UTF-8 encoded string)

### Standard Schema
```json
{
  "type": "string (Required: e.g., CPU_HIGH, OOM, DATABASE_TIMEOUT)",
  "service": "string (Required: microservice identifier)",
  "cpu": "number (Optional: metric value)",
  "memory": "number (Optional: metric value)",
  "error_message": "string (Optional: raw error text)",
  "timestamp": "string (Optional: ISO-8601 timestamp)"
}
```

### Example Event Payloads

#### High CPU Usage Alert
```json
{
  "type": "CPU_HIGH",
  "service": "payment-service",
  "cpu": 92
}
```

#### Out of Memory (OOM) Alert
```json
{
  "type": "OUT_OF_MEMORY",
  "service": "checkout-service",
  "exit_code": 137
}
```

#### Database Pool Exhaustion
```json
{
  "type": "DATABASE_TIMEOUT",
  "service": "auth-service",
  "error_message": "PoolTimeout: connection wait timeout > 5000ms"
}
```

---

## 3. Command Line & cURL Examples

### Test Root Endpoint
```bash
curl -X GET http://localhost:8000/
```

### Query Open Incidents
```bash
curl -X GET http://localhost:8000/incidents
```

### Trigger Test Event
```bash
curl -X POST http://localhost:8000/test-event
```

### Ask AI DevOps Agent
```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Check application logs for recent failures"}'
```
