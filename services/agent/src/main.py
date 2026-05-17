"""Pavelo Agent Service — AI orchestration with LangGraph."""

from fastapi import FastAPI
from contextlib import asynccontextmanager
import structlog

from src.config import settings

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan — startup and shutdown."""
    logger.info("agent_service_starting", port=settings.port)
    yield
    logger.info("agent_service_stopping")


app = FastAPI(
    title="Pavelo Agent Service",
    version="0.1.0",
    description="AI Agent orchestration service for Pavelo/Xara",
    lifespan=lifespan,
)


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "agent",
        "version": "0.1.0",
    }
