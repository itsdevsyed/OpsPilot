import json
import logging

from app.inventory.loader import format_inventory, load_inventory
from app.llm.client import llm
from app.tools.log_tool import read_logs

logger = logging.getLogger(__name__)


INCIDENT_PROMPT = """
You are a Senior DevOps Engineer analyzing a production incident.

Incident event:
{event}

Infrastructure inventory:
{inventory}

Relevant application logs:
{logs}

Rules:
1. Base your answer ONLY on the event, inventory, and logs above.
2. Only reference containers that exist in the inventory.
3. Give commands that match the listed runtime (podman / docker / kubectl).
4. Do NOT invent services, causes, or metrics.
5. If evidence is insufficient, say so explicitly.
6. Be concise and technical.

Respond in EXACTLY this JSON format. All fields are REQUIRED. Do not omit any field:
{{
  "problem": "string",
  "root_cause": "string",
  "evidence": ["string", "string"],
  "suggested_fix": "string",
  "commands": ["string", "string"],
  "severity": "low|medium|high|critical"
}}
"""


def run_incident_agent(event: dict) -> dict:
    logs = read_logs.invoke({})
    inventory = format_inventory(load_inventory())

    prompt = INCIDENT_PROMPT.format(
        event=json.dumps(event, indent=2),
        inventory=inventory,
        logs=logs,
    )

    llm_json = llm.bind(response_format={"type": "json_object"})
    response = llm_json.invoke(prompt)
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
            "commands": [],
            "severity": "unknown",
            "raw": raw,
        }

    analysis.setdefault("problem", None)
    analysis.setdefault("root_cause", None)
    analysis.setdefault("evidence", [])
    analysis.setdefault("suggested_fix", None)
    analysis.setdefault("commands", [])
    analysis.setdefault("severity", "unknown")

    return {
        "event": event,
        "analysis": analysis,
    }
