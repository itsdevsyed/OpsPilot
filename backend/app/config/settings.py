from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    GROQ_API_KEY: str
    MODEL_NAME: str = "llama-3.3-70b-versatile"

    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:9092"
    KAFKA_INCIDENTS_TOPIC: str = "incidents"
    KAFKA_CONSUMER_GROUP: str = "opspilot-incidents"

    DATABASE_URL: str = "postgresql+psycopg://opspilot:opspilot@localhost:5432/opspilot"

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"
    )


settings = Settings()
