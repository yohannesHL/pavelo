"""ML service configuration."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment."""

    port: int = 8001
    host: str = "0.0.0.0"
    debug: bool = False
    qdrant_url: str = "http://localhost:6333"
    qdrant_api_key: str = ""
    openai_api_key: str = ""
    database_url: str = "postgresql://postgres:postgres@localhost:5432/pavelo"

    # Redis / Celery
    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/1"
    celery_result_backend: str = "redis://localhost:6379/2"

    # Embedding configuration
    text_embedding_model: str = "text-embedding-3-large"
    text_embedding_dimensions: int = 3072
    image_embedding_dimensions: int = 768  # CLIP ViT-L/14

    # CLIP configuration
    clip_model_name: str = "ViT-L-14"
    clip_pretrained: str = "openai"
    clip_device: str = "cpu"  # "cuda" for GPU
    clip_batch_size: int = 16

    # Qdrant collection names
    property_collection: str = "properties"

    # Job queue
    max_retries: int = 3
    retry_backoff: int = 60  # seconds base for exponential backoff

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
