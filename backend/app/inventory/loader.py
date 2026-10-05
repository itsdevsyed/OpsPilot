from pathlib import Path

import yaml

INVENTORY_PATH = Path(__file__).parent / "infra_inventory.yaml"


def load_inventory() -> dict:
    if not INVENTORY_PATH.exists():
        return {"namespace": "unknown", "runtime": "unknown", "containers": []}
    return yaml.safe_load(INVENTORY_PATH.read_text(encoding="utf-8"))


def format_inventory(inventory: dict) -> str:
    lines = [
        f"namespace: {inventory.get('namespace', 'unknown')}",
        f"runtime: {inventory.get('runtime', 'unknown')}",
        "containers:",
    ]
    for c in inventory.get("containers", []):
        role = f" ({c['role']})" if c.get("role") else ""
        lines.append(f"  - {c['name']} [{c['status']}]{role}")
    return "\n".join(lines)
