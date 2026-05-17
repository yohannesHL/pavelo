# Sprint 3 — Image Intelligence ML Pipeline

## Status: ✅ Complete

## Summary

Sprint 3 implements the full image intelligence ML pipeline for Pavelo. This includes CLIP-based image classification, GPT-4V interior analysis, feature aggregation, embedding regeneration, an admin dashboard, and a bulk import tool.

## Completed Tasks

### Phase 1 — CLIP Model & Core Classifiers

| ID | Task | Status |
|----|------|--------|
| S3-01 | CLIP ViT-L/14 model loader with quantised weights, batch inference, preprocessing | ✅ |
| S3-02 | Scene classifier (exterior/interior/garden/floor-plan/aerial) | ✅ |
| S3-03 | Architectural style classifier (10-class, top-3 predictions) | ✅ |
| S3-09 | Celery + Redis async job queue with retry policies | ✅ |

### Phase 2 — Vision LLM & Attribute Extraction

| ID | Task | Status |
|----|------|--------|
| S3-04 | GPT-4V interior attribute extraction with Pydantic validation | ✅ |
| S3-05 | Era estimation (CLIP) + condition scoring (GPT-4V, 1-10 scale) | ✅ |

### Phase 3 — Aggregation & Re-embedding

| ID | Task | Status |
|----|------|--------|
| S3-06 | Feature tagging aggregation into PropertyAttributes JSON | ✅ |
| S3-07 | Embedding regeneration with image-derived attributes | ✅ |

### Phase 4 — Admin UI & Bulk Import

| ID | Task | Status |
|----|------|--------|
| S3-08 | Admin ML dashboard at `/admin/ml` | ✅ |
| S3-10 | Bulk import tool (JSON + CSV) | ✅ |

## Architecture Decisions

1. **CLIP via open_clip**: Used `open_clip` library for ViT-L/14 with OpenAI pretrained weights. Supports CPU quantisation (int8) for reduced memory.

2. **Zero-shot classification**: MVP uses carefully crafted prompts rather than fine-tuned classifiers. This is sufficient for the 5 scene categories and 10 architectural styles with good accuracy.

3. **GPT-4o for vision**: Used `gpt-4o` (latest vision model) instead of the older `gpt-4-vision-preview`. Structured JSON output via `response_format={"type": "json_object"}`.

4. **In-memory job store**: Job tracking uses in-memory dict for MVP. Production will migrate to Redis or PostgreSQL for persistence across restarts.

5. **Celery graceful fallback**: When Celery/Redis broker isn't available, tasks are stored as "pending" in the in-memory store. This allows the API to function without the full queue infrastructure.

6. **Feature tag detection**: Uses keyword matching against analysis results. 20+ feature tags detected including open-plan, en-suite, original-features, bi-fold-doors, etc.

## New Files

### Backend (services/ml/)
- `src/models/clip.py` — CLIP ViT-L/14 model loader
- `src/models/scene_classifier.py` — Scene classification
- `src/models/style_classifier.py` — Architectural style classification
- `src/models/vision.py` — GPT-4V interior attribute extraction
- `src/models/condition.py` — Era estimation + condition scoring
- `src/pipelines/aggregation.py` — Feature tagging aggregation
- `src/pipelines/reembed.py` — Embedding regeneration
- `src/tasks/celery_app.py` — Celery configuration
- `src/tasks/classify.py` — Classification task definitions
- `src/routes/embed.py` — CLIP embedding endpoints
- `src/routes/classify.py` — Scene/style classification endpoints
- `src/routes/analyse.py` — Interior/condition analysis endpoints
- `src/routes/aggregate.py` — Aggregation + re-embed endpoints
- `src/routes/jobs.py` — Job queue management endpoints
- `src/routes/bulk_import.py` — Bulk import endpoints

### Frontend (apps/web/)
- `src/app/admin/ml/page.tsx` — Admin ML dashboard page
- `src/app/admin/ml/layout.tsx` — Admin layout
- `src/components/admin/job-queue-stats.tsx` — Queue stats cards
- `src/components/admin/job-table.tsx` — Job table with status badges
- `src/components/admin/classification-viewer.tsx` — Results viewer
- `src/components/admin/manual-override.tsx` — Manual override UI
- `src/hooks/use-ml-jobs.ts` — ML jobs hook

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/clip/embed` | Generate CLIP embeddings (file upload) |
| POST | `/api/v1/clip/embed/url` | Generate CLIP embeddings (URL list) |
| POST | `/api/v1/classify/scene` | Scene classification |
| POST | `/api/v1/classify/style` | Architectural style classification |
| POST | `/api/v1/analyse/interior` | Interior attribute extraction |
| POST | `/api/v1/analyse/condition` | Era estimation + condition scoring |
| POST | `/api/v1/analyse/aggregate` | Feature tagging aggregation |
| POST | `/api/v1/analyse/reembed` | Embedding regeneration |
| POST | `/api/v1/jobs/submit` | Submit analysis job |
| GET | `/api/v1/jobs/{job_id}` | Get job status |
| GET | `/api/v1/jobs` | List jobs |
| POST | `/api/v1/import/bulk` | Bulk JSON import |
| POST | `/api/v1/import/bulk/csv` | Bulk CSV import |

## Dependencies Added

- `open-clip-torch>=2.26.0` — CLIP model
- `torch>=2.4.0` — PyTorch
- `Pillow>=10.4.0` — Image processing
- `celery[redis]>=5.4.0` — Task queue
- `redis>=5.0.0` — Redis client
- `python-multipart>=0.0.9` — File upload support
