"""Pavelo ML Service — Image intelligence and embedding generation."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import structlog

from src.config import settings

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan — startup and shutdown."""
    logger.info("ml_service_starting", port=settings.port)

    # Pre-load CLIP model on startup if not in test mode
    if not settings.debug:
        try:
            from src.models.clip import clip_loader
            await clip_loader.load()
        except Exception as e:
            logger.warning("clip_preload_skipped", error=str(e))

    yield
    logger.info("ml_service_stopping")


app = FastAPI(
    title="Pavelo ML Service",
    version="0.3.0",
    description="Image intelligence and embedding generation for Pavelo",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register route modules
from src.routes.embed import router as embed_router
from src.routes.classify import router as classify_router
from src.routes.jobs import router as jobs_router
from src.routes.analyse import router as analyse_router
from src.routes.aggregate import router as aggregate_router

app.include_router(embed_router)
app.include_router(classify_router)
app.include_router(jobs_router)
app.include_router(analyse_router)
app.include_router(aggregate_router)


@app.get("/health")
async def health():
    """Health check endpoint."""
    from src.models.clip import clip_loader

    return {
        "status": "ok",
        "service": "ml",
        "version": "0.3.0",
        "clip_loaded": clip_loader.is_loaded,
    }
