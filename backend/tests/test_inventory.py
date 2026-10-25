"""Unit tests for infrastructure inventory loader and formatter."""
import yaml
from pathlib import Path
from app.inventory.loader import format_inventory, load_inventory


def test_load_inventory_existing_file():
    inv = load_inventory()
    assert isinstance(inv, dict)
    assert "namespace" in inv
    assert "runtime" in inv
    assert "containers" in inv
    assert isinstance(inv["containers"], list)


def test_format_inventory_with_data():
    inventory_data = {
        "namespace": "staging",
        "runtime": "docker",
        "containers": [
            {"name": "api_gateway_1", "status": "running", "role": "proxy"},
            {"name": "worker_1", "status": "restarting", "role": "queue-worker"},
        ],
    }

    formatted = format_inventory(inventory_data)
    assert "namespace: staging" in formatted
    assert "runtime: docker" in formatted
    assert "api_gateway_1 [running] (proxy)" in formatted
    assert "worker_1 [restarting] (queue-worker)" in formatted


def test_format_inventory_empty_containers():
    inventory_data = {
        "namespace": "prod",
        "runtime": "podman",
        "containers": [],
    }

    formatted = format_inventory(inventory_data)
    assert "namespace: prod" in formatted
    assert "runtime: podman" in formatted
    assert "containers:" in formatted
