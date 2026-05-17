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

    # Embedding configuration
    text_embedding_model: str = "text-embedding-3-large"
    text_embedding_dimensions: int = 3072
    image_embedding_dimensions: int = 768  # CLIP ViT-L/14

    # Qdrant collection names
    property_collection: str = "properties"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
