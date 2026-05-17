# Brainstorm — Sprint 1: Infrastructure Foundations
## Phase 3: Final Decisions

> **Facilitator:** Remy (Producer)
> **Status:** Decisions locked. These are the marching orders for Sprint 1.

---

## 1. Monorepo Structure

| Decision | Detail |
|---|---|
| **Tool** | Turborepo + pnpm workspaces |
| **Workspace layout** | `apps/web`, `apps/api`, `services/agent`, `services/ml`, `packages/shared` |
| **Package naming** | `@pavelo/web`, `@pavelo/api`, `@pavelo/agent`, `@pavelo/ml`, `@pavelo/shared` |
| **pnpm workspace protocol** | `"@pavelo/shared": "workspace:*"` in all consuming packages |
| **Turbo pipeline** | `build`, `dev`, `lint`, `typecheck`, `test` tasks defined in `turbo.json` |
| **Node version** | Pin to Node 20 LTS via `.nvmrc` and `engines` field |

**Owner:** Sage (Backend) sets up the root scaffold. Dash (DevOps) reviews Turborepo config.

---

## 2. Frontend Scaffolding

| Decision | Detail |
|---|---|
| **Framework** | Next.js 15, App Router, React Server Components |
| **TypeScript** | `strict: true`, no implicit `any` |
| **Dev server** | `--turbopack` flag for fast HMR |
| **Styling** | Tailwind CSS 4, CSS-first config with custom properties |
| **Components** | `shadcn/ui` cherry-picked: `Button`, `Input`, `Card`, `Badge`, `Skeleton`, `Dialog`, `DropdownMenu`, `Tabs` |
| **Fonts** | `next/font/google` for Inter + Playfair Display; `next/font/local` for JetBrains Mono |
| **Route skeleton** | Empty `page.tsx` files for: `/`, `/onboarding`, `/voice`, `/chat`, `/property/[id]`, `/saved`, `/market`, `/agent-dashboard` |
| **Tokens page** | `app/(dev)/tokens/page.tsx` — renders all design tokens visually. Dev-only route group. |
| **Storybook** | Deferred to Sprint 2 |
| **tRPC client** | `@trpc/react-query` configured, importing `AppRouter` type from `@pavelo/api` |

**Owner:** Nova (Frontend) builds scaffold. Milo (Art) owns token definitions and Tailwind theme.

---

## 3. API Gateway

| Decision | Detail |
|---|---|
| **Server** | Fastify |
| **Router** | tRPC with Zod validation on every procedure |
| **Structure** | `src/routes/` (tRPC procedures), `src/middleware/` (auth, rate limit), `src/lib/` (Prisma, Redis, Supabase clients) |
| **AppRouter type** | Exported from `apps/api/src/router.ts`, consumed by frontend as type-only import |
| **Rate limiting** | `@fastify/rate-limit` configured from Sprint 1 |
| **CORS** | Strict origin allowlist, permissive only in `development` |
| **Health endpoint** | `GET /health` → `{ status: "ok", version, uptime }` |
| **Shared schemas** | Zod schemas for `User`, `Property` in `@pavelo/shared`, used by both API and frontend |

**Owner:** Sage (Backend).

---

## 4. Database Schema

| Decision | Detail |
|---|---|
| **Provider** | Supabase (PostgreSQL) |
| **ORM** | Prisma, schema in `apps/api/prisma/schema.prisma` |
| **Sprint 1 models** | `User` and `Property` only. `Conversation` deferred to Sprint 5. |
| **ID strategy** | UUID (`@default(uuid())`) on all models |
| **Timestamps** | `createdAt`, `updatedAt` on all models |
| **Soft delete** | `deletedAt DateTime?` on all models |
| **RLS** | Enabled from Sprint 1. `User`: owner-only access via `auth.uid()`. `Property`: public read, owner write. |
| **Migrations** | `prisma migrate dev` locally, `prisma migrate deploy` in CI/production |

**Owner:** Sage (Backend). Ivy (QA) verifies RLS policies work as expected.

---

## 5. Python Services

| Decision | Detail |
|---|---|
| **Framework** | FastAPI (both `services/agent` and `services/ml`) |
| **Models** | Pydantic v2 |
| **Package manager** | `uv` with `pyproject.toml` and `uv.lock` |
| **Python version** | 3.12 |
| **Async** | All endpoints async by default |
| **Health endpoint** | `GET /health` on both services |
| **Docker** | Multi-stage Dockerfiles (builder + runtime) |
| **Logging** | `structlog` for structured JSON logging |
| **Sprint 1 scope** | Skeleton only — health endpoints, config loading, Pydantic base models. No LangGraph, no CLIP, no ML logic. |

**Owner:** Sage (Backend).

---

## 6. CI/CD Pipeline

| Decision | Detail |
|---|---|
| **Platform** | GitHub Actions |
| **Trigger** | On PR to `main`: lint + typecheck + test. On merge to `main`: build + deploy. |
| **TypeScript CI** | `turbo lint`, `turbo typecheck`, `turbo test` (Vitest) |
| **Python CI** | `uv sync --frozen`, `ruff check`, `ruff format --check`, `pytest` |
| **Docker** | Build all four Dockerfiles in CI, verify they start and pass health checks |
| **Deploy target** | Railway (staging) on merge to `main`. Production deploys are manual gate for now. |
| **Playwright** | Deferred to Sprint 2 |
| **CI must be green** | No merges with red CI. Branch protection rules enforced. |

**Owner:** Dash (DevOps) builds pipelines. Sage provides Dockerfiles. Ivy validates CI catches failures.

---

## 7. Design System Bootstrap

| Decision | Detail |
|---|---|
| **Token source** | `tokens.css` file with CSS custom properties |
| **Colours** | `--color-primary: #1B3A6B`, `--color-accent: #2E86AB`, `--color-gold: #F4A261` |
| **Typography** | Inter (UI), Playfair Display (headings), JetBrains Mono (data) |
| **Radii** | `--radius-card: 12px`, `--radius-input: 8px`, `--radius-badge: 4px` |
| **Motion** | `--motion-ui: 200ms ease-out`, `--motion-map: 600ms ease-in-out` |
| **Tailwind 4 config** | References CSS custom properties. Theme extends from tokens. |
| **Accessibility** | All token combinations verified for WCAG 2.1 AA contrast. Gold on white flagged for review — may need a darker variant for text use. |
| **Tokens page** | Living style guide at `/(dev)/tokens` showing all tokens rendered |

**Owner:** Milo (Art) defines tokens. Nova (Frontend) implements in Tailwind config. Kira (Product) validates accessibility.

---

## 8. Voice & Vector DB Infrastructure (Stubs Only)

| Decision | Detail |
|---|---|
| **Qdrant** | Docker Compose entry only. No collections, no client code. Sprint 4 work. |
| **LiveKit** | Docker Compose entry only. No SDK integration. Sprint 6 work. |
| **Redis** | Docker Compose entry. Used for rate limiting and session cache in Sprint 1. |
| **Pipecat** | No work in Sprint 1. Sprint 6. |

**Owner:** Dash (DevOps) adds Docker Compose entries.

---

## 9. Docker Compose (Local Dev)

Services in `docker-compose.yml`:

| Service | Image | Port | Sprint 1 Status |
|---|---|---|---|
| `postgres` | `supabase/postgres:15` or `postgres:16` | 5432 | Active — used by Prisma |
| `redis` | `redis:7-alpine` | 6379 | Active — used by API |
| `qdrant` | `qdrant/qdrant:latest` | 6333 | Stub — no integration code |
| `livekit` | `livekit/livekit-server:latest` | 7880 | Stub — no integration code |

App services (`web`, `api`, `agent`, `ml`) run via `pnpm dev` / `uvicorn` locally, NOT inside Docker. Docker is for infrastructure deps only.

**Owner:** Dash (DevOps).

---

## 10. Environment Variables

A comprehensive `.env.example` with comments:

```bash
# === Database ===
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pavelo  # Required

# === Supabase ===
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co                  # Required
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...                              # Required
SUPABASE_SERVICE_ROLE_KEY=eyJ...                                  # Required (API only)

# === Redis ===
REDIS_URL=redis://localhost:6379                                   # Required

# === OpenAI ===
OPENAI_API_KEY=sk-...                                             # Required (Sprint 2+)

# === Qdrant ===
QDRANT_URL=http://localhost:6333                                  # Sprint 4+
QDRANT_API_KEY=                                                   # Sprint 4+ (cloud only)

# === LiveKit ===
LIVEKIT_URL=ws://localhost:7880                                   # Sprint 6+
LIVEKIT_API_KEY=                                                  # Sprint 6+
LIVEKIT_API_SECRET=                                               # Sprint 6+

# === Deepgram ===
DEEPGRAM_API_KEY=                                                 # Sprint 6+

# === Cartesia ===
CARTESIA_API_KEY=                                                 # Sprint 6+

# === Mapbox ===
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ...                                # Sprint 4+

# === App ===
NODE_ENV=development
API_PORT=4000
AGENT_PORT=8000
ML_PORT=8001
```

**Owner:** Sage (Backend) creates the file. Ivy (QA) verifies completeness.

---

## Disagreements Resolved

| # | Disagreement | Resolution |
|---|---|---|
| 1 | **Milo** wanted a `/dev/tokens` page as a route; **Nova** wanted to avoid dev routes in App Router | Compromise: `(dev)` route group — keeps it out of production routing while giving Milo the visual contract |
| 2 | **Sage** wanted 3 Prisma models including `Conversation`; **Ivy** pushed back as unnecessary for Sprint 1 | Resolved: 2 models only (`User`, `Property`). `Conversation` deferred to Sprint 5. |

---

*Phase 3 complete. Decisions locked for Sprint 1.*
