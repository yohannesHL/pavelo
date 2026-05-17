"""Pavelo ML Service — Image intelligence and embedding generation."""

from fastapi import FastAPI
from contextlib import asynccontextmanager
import structlog

from src.config import settings

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan — startup and shutdown."""
    logger.info("ml_service_starting", port=settings.port)
    yield
    logger.info("ml_service_stopping")


app = FastAPI(
    title="Pavelo ML Service",
    version="0.1.0",
    description="Image intelligence and embedding generation for Pavelo",
    lifespan=lifespan,
)


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "ml",
        "version": "0.1.0",
    }
