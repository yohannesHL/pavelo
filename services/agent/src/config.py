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

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
