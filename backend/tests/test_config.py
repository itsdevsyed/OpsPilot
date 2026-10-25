"""Tests for application settings and configuration."""
import os
from app.config.settings import Settings


def test_settings_default_values():
    settings = Settings(GROQ_API_KEY="test_key")
    assert settings.GROQ_API_KEY == "test_key"
    assert settings.MODEL_NAME == "llama-3.3-70b-versatile"
    assert settings.KAFKA_BOOTSTRAP_SERVERS == "localhost:9092"
    assert settings.KAFKA_INCIDENTS_TOPIC == "incidents"
    assert settings.KAFKA_CONSUMER_GROUP == "opspilot-incidents"


def test_settings_custom_values():
    settings = Settings(
        GROQ_API_KEY="custom_key",
        MODEL_NAME="custom-model",
        KAFKA_BOOTSTRAP_SERVERS="custom:9092",
        KAFKA_INCIDENTS_TOPIC="alerts",
        DATABASE_URL="sqlite:///test.db",
    )
    assert settings.MODEL_NAME == "custom-model"
    assert settings.KAFKA_BOOTSTRAP_SERVERS == "custom:9092"
    assert settings.KAFKA_INCIDENTS_TOPIC == "alerts"
    assert settings.DATABASE_URL == "sqlite:///test.db"
