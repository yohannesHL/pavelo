"""ML service configuration."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment."""

    port: int = 8001
    host: str = "0.0.0.0"
    debug: bool = False
    qdrant_url: str = "http://localhost:6333"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
