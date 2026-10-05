import json
import logging

from app.llm.client import llm
from app.tools.log_tool import read_logs

logger = logging.getLogger(__name__)


INCIDENT_PROMPT = """
You are a Senior DevOps Engineer analyzing a production incident.

Incident event:
{event}

Relevant application logs:
{logs}

Rules:
1. Base your answer ONLY on the event and logs above.
2. Do NOT invent services, causes, or metrics.
3. If evidence is insufficient, say so explicitly.
4. Be concise and technical.

Respond in EXACTLY this JSON format (no markdown, no preamble):
{{
  "problem": "...",
  "root_cause": "...",
  "evidence": ["...", "..."],
  "suggested_fix": "...",
  "severity": "low|medium|high|critical"
}}
"""


def run_incident_agent(event: dict) -> dict:
    logs = read_logs.invoke({})

    prompt = INCIDENT_PROMPT.format(
        event=json.dumps(event, indent=2),
        logs=logs,
    )

    response = llm.invoke(prompt)
    raw = response.content.strip()

    if raw.startswith("```"):
        raw = raw.strip("`")
        if raw.startswith("json"):
            raw = raw[4:].strip()

    try:
        analysis = json.loads(raw)
    except json.JSONDecodeError:
        logger.warning("LLM did not return valid JSON, falling back to raw text")
        analysis = {
            "problem": event.get("type", "unknown"),
            "root_cause": None,
            "evidence": [],
            "suggested_fix": None,
            "severity": "unknown",
            "raw": raw,
        }

    return {
        "event": event,
        "analysis": analysis,
    }
