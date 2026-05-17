"""
Job Queue Routes (S3-09)

GET  /api/v1/jobs/{job_id}  — Get job status and results
GET  /api/v1/jobs           — List recent jobs with filtering
POST /api/v1/jobs/submit    — Submit a new analysis job

Tracks Celery task status via Redis backend, providing a unified
interface for monitoring async image processing tasks.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Any

import structlog
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from src.config import settings

logger = structlog.get_logger()
router = APIRouter(prefix="/api/v1/jobs", tags=["jobs"])


class JobStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    RETRYING = "retrying"


class JobSubmitRequest(BaseModel):
    """Request to submit a new ML analysis job."""
    property_id: str
    image_urls: list[str] = Field(..., min_length=1, max_length=50)
    tasks: list[str] = Field(
        default=["scene", "style"],
        description="Analysis tasks to run: scene, style, interior, condition",
    )


class JobStatusResponse(BaseModel):
    """Status of a submitted job."""
    job_id: str
    property_id: str
    status: JobStatus
    submitted_at: str
    completed_at: str | None = None
    tasks: dict[str, Any] = Field(default_factory=dict)
    results: dict[str, Any] | None = None
    error: str | None = None
    retry_count: int = 0


class JobListResponse(BaseModel):
    """List of jobs."""
    jobs: list[JobStatusResponse]
    total: int
    pending: int
    processing: int
    completed: int
    failed: int


# In-memory job store (production: Redis or PostgreSQL)
_job_store: dict[str, dict[str, Any]] = {}


@router.post("/submit", response_model=JobStatusResponse)
async def submit_job(request: JobSubmitRequest):
    """Submit a new ML analysis job for a property.

    Creates Celery tasks for each requested analysis type and tracks
    them under a single job ID for monitoring.
    """
    job_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    task_tracking: dict[str, Any] = {}

    try:
        from src.tasks.classify import classify_scene_task, classify_style_task

        for image_url in request.image_urls:
            image_tasks: dict[str, str] = {}

            if "scene" in request.tasks:
                result = classify_scene_task.apply_async(
                    args=[image_url, request.property_id, job_id],
                    countdown=0,
                )
                image_tasks["scene"] = result.id

            if "style" in request.tasks:
                result = classify_style_task.apply_async(
                    args=[image_url, request.property_id, job_id],
                    countdown=0,
                )
                image_tasks["style"] = result.id

            task_tracking[image_url] = image_tasks

    except Exception as e:
        logger.warning("celery_not_available", error=str(e), hint="Tasks queued in-memory")
        # Graceful fallback: store as pending without Celery
        for image_url in request.image_urls:
            task_tracking[image_url] = {task: "pending" for task in request.tasks}

    job_data = {
        "job_id": job_id,
        "property_id": request.property_id,
        "status": JobStatus.PENDING,
        "submitted_at": now,
        "completed_at": None,
        "tasks": task_tracking,
        "results": None,
        "error": None,
        "retry_count": 0,
    }

    _job_store[job_id] = job_data

    logger.info(
        "job_submitted",
        job_id=job_id,
        property_id=request.property_id,
        n_images=len(request.image_urls),
        tasks=request.tasks,
    )

    return JobStatusResponse(**job_data)


@router.get("/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str):
    """Get the status and results of a submitted job.

    Queries Celery result backend for task states and aggregates
    into a single job status response.
    """
    if job_id not in _job_store:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    job = _job_store[job_id]

    # Try to update task statuses from Celery
    try:
        from src.tasks.celery_app import celery_app

        all_completed = True
        any_failed = False
        any_processing = False
        results: dict[str, Any] = {}

        for image_url, tasks in job["tasks"].items():
            for task_name, task_id in tasks.items():
                if task_id == "pending":
                    all_completed = False
                    continue

                result = celery_app.AsyncResult(task_id)

                if result.state == "PENDING":
                    all_completed = False
                elif result.state == "STARTED":
                    all_completed = False
                    any_processing = True
                elif result.state == "SUCCESS":
                    results.setdefault(image_url, {})[task_name] = result.result
                elif result.state == "FAILURE":
                    any_failed = True
                    all_completed = False
                elif result.state == "RETRY":
                    all_completed = False
                    job["retry_count"] += 1

        if all_completed and results:
            job["status"] = JobStatus.COMPLETED
            job["results"] = results
            job["completed_at"] = datetime.now(timezone.utc).isoformat()
        elif any_failed:
            job["status"] = JobStatus.FAILED
        elif any_processing:
            job["status"] = JobStatus.PROCESSING

    except Exception:
        pass  # Celery not available, return stored status

    return JobStatusResponse(**job)


@router.get("", response_model=JobListResponse)
async def list_jobs(
    status: JobStatus | None = Query(None, description="Filter by status"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """List all jobs with optional status filtering.

    Returns summary counts for each status category.
    """
    jobs = list(_job_store.values())

    if status:
        jobs = [j for j in jobs if j["status"] == status]

    # Count by status across all jobs
    all_jobs = list(_job_store.values())
    counts = {
        "pending": sum(1 for j in all_jobs if j["status"] == JobStatus.PENDING),
        "processing": sum(1 for j in all_jobs if j["status"] == JobStatus.PROCESSING),
        "completed": sum(1 for j in all_jobs if j["status"] == JobStatus.COMPLETED),
        "failed": sum(1 for j in all_jobs if j["status"] == JobStatus.FAILED),
    }

    # Sort by submission time, newest first
    jobs.sort(key=lambda j: j["submitted_at"], reverse=True)
    paginated = jobs[offset : offset + limit]

    return JobListResponse(
        jobs=[JobStatusResponse(**j) for j in paginated],
        total=len(jobs),
        **counts,
    )
