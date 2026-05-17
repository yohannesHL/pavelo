# Brainstorm — Sprint 1: Infrastructure Foundations
## Summary

> **Date:** Sprint 1 kickoff
> **Participants:** Remy (Producer), Kira (Product), Milo (Art), Nova (Frontend), Sage (Backend), Ivy (QA)

---

## What We Decided

Sprint 1 ships a **fully scaffolded monorepo** with typed contracts between all four services, a design system foundation, CI/CD pipeline, and Docker Compose local dev — all green in CI.

### The 12 Deliverables

| # | Deliverable | Owner | Notes |
|---|---|---|---|
| 1 | Turborepo + pnpm monorepo scaffold | Sage / Dash | 5 workspaces: `apps/web`, `apps/api`, `services/agent`, `services/ml`, `packages/shared` |
| 2 | Next.js 15 app with App Router + Turbopack | Nova | Strict TS, route skeleton for all core pages |
| 3 | Tailwind 4 + design tokens in CSS custom properties | Milo / Nova | `tokens.css` → Tailwind theme, `(dev)/tokens` page |
| 4 | `shadcn/ui` cherry-picked components (8 components) | Nova | Button, Input, Card, Badge, Skeleton, Dialog, DropdownMenu, Tabs |
| 5 | Fastify + tRPC + Zod API gateway | Sage | Rate limiting, CORS, health endpoint, AppRouter type export |
| 6 | Prisma schema (`User`, `Property`) + Supabase RLS | Sage | UUID PKs, soft delete, timestamps, RLS policies |
| 7 | Python agent service skeleton (FastAPI + uv) | Sage | Health endpoint, Pydantic models, Dockerfile |
| 8 | Python ML service skeleton (FastAPI + uv) | Sage | Health endpoint, Pydantic models, Dockerfile |
| 9 | `@pavelo/shared` types package | Sage / Nova | Zod schemas for User, Property; shared between frontend and API |
| 10 | Docker Compose (Postgres, Redis, Qdrant stub, LiveKit stub) | Dash | App services run outside Docker via `pnpm dev` |
| 11 | GitHub Actions CI (lint, typecheck, Vitest, pytest) | Dash / Ivy | Must be green. Branch protection enforced. |
| 12 | `.env.example` with full documentation | Sage / Ivy | Every variable commented with source and required/optional flag |

### What We Cut

| Cut Item | Reason | When Instead |
|---|---|---|
| Storybook | Not blocking. Adds config overhead. | Sprint 2 |
| Playwright E2E | No pages to test yet. | Sprint 2 |
| `Conversation` Prisma model | Not needed until chat (Sprint 5). | Sprint 5 |
| Qdrant collections + client | Vector search is Sprint 4. | Sprint 4 |
| LiveKit SDK integration | Voice is Sprint 6. | Sprint 6 |
| Supabase Auth integration (S1-05) | Depends on Sprint 2 UI. Scaffold only. | Sprint 2 |

### Key Disagreements & Resolutions

**1. Design tokens page location** — Milo wanted a dev route; Nova wanted zero dev routes in App Router. **Resolution:** `(dev)` route group — clean compromise that keeps tokens visible without polluting production.

**2. Prisma model scope** — Sage proposed 3 models; Ivy argued `Conversation` was premature. **Resolution:** 2 models only. YAGNI wins. Build what Sprint 2 actually needs.

### Architecture Principles Locked

- **CSS custom properties first** — Tailwind 4 theme references CSS vars, enabling future theme switching
- **Type-only cross-workspace imports** — tRPC `AppRouter` type flows from API to frontend without runtime dependency
- **RLS from day one** — Security is not a Sprint 10 afterthought
- **`uv` for Python** — Fast, lockfile-based, CI-verified with `--frozen`
- **Health endpoints everywhere** — Every service exposes `GET /health`; CI verifies they respond
- **Stubs over premature integration** — Qdrant and LiveKit are Docker entries, not codebases

### Sprint 1 Success Criteria

1. ✅ `pnpm install && pnpm dev` starts all four services
2. ✅ `docker compose up -d` starts Postgres + Redis
3. ✅ `apps/web` renders at `localhost:3000` with design tokens applied
4. ✅ `apps/api` responds to `GET /health` at `localhost:4000`
5. ✅ `services/agent` responds to `GET /health` at `localhost:8000`
6. ✅ `services/ml` responds to `GET /health` at `localhost:8001`
7. ✅ `pnpm lint && pnpm typecheck` passes with zero errors
8. ✅ `vitest run` passes at least 1 test per TS workspace
9. ✅ `pytest` passes at least 1 test per Python service
10. ✅ GitHub Actions CI pipeline is green on the Sprint 1 PR
11. ✅ Prisma schema has `User` + `Property` models with RLS
12. ✅ `.env.example` is complete and documented

---

*Brainstorm complete. Ready for sprint plan creation.*
