"""
Celery Application Configuration (S3-09)

Configures Celery with Redis broker for async image processing tasks.
Includes retry policies, dead letter queue, and task routing.
"""

from __future__ import annotations

from celery import Celery

from src.config import settings

celery_app = Celery(
    "pavelo_ml",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
)

celery_app.conf.update(
    # Serialisation
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],

    # Timezone
    timezone="UTC",
    enable_utc=True,

    # Task execution
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,

    # Result expiry (24 hours)
    result_expires=86400,

    # Default retry policy
    task_default_retry_delay=settings.retry_backoff,
    task_max_retries=settings.max_retries,

    # Dead letter queue — failed tasks route here after max retries
    task_routes={
        "src.tasks.classify.*": {"queue": "ml_classify"},
        "src.tasks.analyse.*": {"queue": "ml_analyse"},
        "src.tasks.embed.*": {"queue": "ml_embed"},
        "src.tasks.import_tasks.*": {"queue": "ml_import"},
    },

    # Dead letter exchange for tasks that exceed max retries
    task_queue_max_priority=10,

    # Concurrency — limit to avoid OOM with large models
    worker_concurrency=2,
)

# Auto-discover tasks in the tasks package
celery_app.autodiscover_tasks(["src.tasks"])
