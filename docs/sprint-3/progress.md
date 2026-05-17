# Sprint 3 Progress

## Phase 1 — CLIP Model & Core Classifiers ✅
- [x] S3-01: CLIP ViT-L/14 model loader
- [x] S3-02: Scene classifier
- [x] S3-03: Architectural style classifier
- [x] S3-09: Async job queue

**Commit**: `feat(ml): CLIP model loader, scene/style classifiers, async job queue`

## Phase 2 — Vision LLM & Attribute Extraction ✅
- [x] S3-04: GPT-4V interior analysis
- [x] S3-05: Era estimation + condition scoring

**Commit**: `feat(ml): GPT-4V interior analysis, era estimation, condition scoring`

## Phase 3 — Aggregation & Re-embedding ✅
- [x] S3-06: Feature tagging aggregation
- [x] S3-07: Embedding regeneration

**Commit**: `feat(ml): feature aggregation pipeline, embedding regeneration`

## Phase 4 — Admin UI & Bulk Import ✅
- [x] S3-08: Admin ML dashboard
- [x] S3-10: Bulk import tool

**Commit**: `feat(web,ml): admin ML dashboard, bulk import tool`

## Notes
- Used gpt-4o instead of gpt-4-vision-preview (newer, better structured output support)
- Job store is in-memory for MVP; production should use Redis/PostgreSQL
- CLIP quantisation applied on CPU only (int8 dynamic quantisation)

## QA Bug Fixes ✅
- [x] #13 (minor): Removed redundant `zero_shot_classify()` call in scene classifier — was causing 2x inference cost
- [x] #11 (minor): Added 3 missing feature tag rules (garden, basement, listed-building) to reach 20 documented tags
- [x] #14 (major): Replaced deprecated `asyncio.get_event_loop()` with `asyncio.run()` in all Celery tasks — required for Python 3.12+
- [x] #15 (major): Added Celery task definitions for `analyse_interior_task` and `analyse_condition_task`, wired into job submission route
- [x] #12 (major): Replaced hardcoded mock data in admin ML dashboard with real job result extraction, added loading/error/empty states
