"""Agent service configuration."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment."""

    port: int = 8000
    host: str = "0.0.0.0"
    debug: bool = False
    redis_url: str = "redis://localhost:6379"
    database_url: str = "postgresql://postgres:postgres@localhost:5432/pavelo"
    qdrant_url: str = "http://localhost:6333"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    mem0_api_key: str = ""
    mem0_org_id: str = ""
    api_gateway_url: str = "http://localhost:4000"
    ml_service_url: str = "http://localhost:8001"

    # Agent persona defaults
    persona_name: str = "Xara"
    persona_tone: str = "professional"  # professional, friendly, casual
    persona_formality: str = "warm"  # formal, warm, casual

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
