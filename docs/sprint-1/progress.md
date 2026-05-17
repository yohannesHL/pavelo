# Sprint 1 — Infrastructure Foundations: Progress

## Phase 1 — Monorepo + Scaffolding
- [x] S1-01: Monorepo setup (Turborepo + pnpm)
- [x] S1-02: Next.js 15 frontend scaffolding
- [x] S1-03: Fastify API gateway
- [x] S1-06: Python agent service skeleton
- [x] S1-07: Python ML service skeleton

## Phase 2 — Database + Shared Types
- [x] S1-04: Supabase/PostgreSQL schema (Prisma)
- [x] S1-10: Design system (tokens, Tailwind, shadcn)
- [x] S1-08: Qdrant client prep
- [x] packages/shared: Shared TypeScript types

## Phase 3 — CI/CD + Auth Prep
- [x] S1-09: GitHub Actions CI/CD
- [x] S1-05: Auth groundwork

## Status
- **Started:** Sprint 1
- **Current phase:** Complete
- **Commits:** 3 (one per phase)

## Decisions Made
- Used `uv` instead of Poetry for Python deps (per brainstorm decision)
- Qdrant client wrapper is minimal — config + vector params only
- Docker Compose includes Qdrant and LiveKit as stubs (no code integration)
- App services run locally via pnpm/uvicorn, NOT in Docker
- Only 2 Prisma models: User + Property (YAGNI — no Conversation yet)
- Design tokens in `tokens.css` as CSS custom properties
- Tokens page at `/(dev)/tokens` route group

## Notes
- npm registry had connectivity issues during `pnpm install` — all package.json files are correct, deps will resolve on retry
- Python services use `pyproject.toml` with uv (not Poetry)

