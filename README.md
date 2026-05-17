# 🏠 Pavelo — AI Estate Agent Platform

> **Xara** — Your AI estate agent that listens, remembers, and delivers.

Pavelo is a next-generation real estate SaaS platform powered by **Xara**, a voice-first AI estate agent capable of conducting full buyer and seller conversations, executing complex multi-step property searches, and surfacing rich visual intelligence.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                  │
│  Browser (Next.js 15 SSR)  ·  Mobile (PWA)  ·  Voice (LiveKit)  │
└────────┬──────────────────────┬──────────────────┬──────────────┘
         │ HTTPS                │ tRPC             │ WebRTC
         ▼                     ▼                   ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│  Next.js 15 App  │ │  Fastify API     │ │  LiveKit Server  │
│  (apps/web)      │ │  (apps/api)      │ │  (WebRTC SFU)    │
│  Port: 3000      │ │  Port: 4000      │ │  Port: 7880      │
└────────┬─────────┘ └────────┬─────────┘ └────────┬─────────┘
         │                    │                     │
         │    ┌───────────────┴──────────────┐      │
         │    ▼                              │      │
         │ ┌──────────────────────────┐      │      │
         │ │  LangGraph AI Agent      │      │      │
         │ │  (services/agent)        │      │      │
         │ │  Port: 8000              │      │      │
         │ └────────┬─────────────────┘      │      │
         │          │                        │      │
         │    ┌─────┴──────┐                 │      │
         │    ▼            ▼                 ▼      │
         │ ┌────────┐ ┌────────┐ ┌──────────────┐  │
         │ │ Qdrant │ │ Redis  │ │ PostgreSQL   │  │
         │ │ :6333  │ │ :6379  │ │ :5432        │  │
         │ └────────┘ └────────┘ └──────────────┘  │
         │                                          │
         │    ┌─────────────────────────┐           │
         │    │  ML Service (FastAPI)   │           │
         │    │  (services/ml)          │           │
         │    │  Port: 8001             │           │
         │    └─────────────────────────┘           │
         └──────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15, TypeScript, Tailwind CSS 4, shadcn/ui, Mapbox GL, Recharts, Framer Motion |
| **API Gateway** | Fastify, tRPC, Zod |
| **AI Agent** | Python, LangGraph, LangChain, Mem0 |
| **Voice** | LiveKit (WebRTC), Pipecat, Deepgram Nova-3, Cartesia Sonic |
| **Vector Search** | Qdrant (hybrid dense + sparse), OpenAI embeddings |
| **ML** | FastAPI, CLIP ViT-L/14, GPT-4V |
| **Database** | PostgreSQL (Supabase), Prisma ORM, Redis |
| **Auth** | Supabase Auth (JWT) |
| **Infra** | Docker, Turborepo, pnpm, GitHub Actions |

## Prerequisites

- **Node.js** ≥ 20.0.0
- **pnpm** ≥ 9.15.0
- **Python** ≥ 3.11
- **Docker** & Docker Compose
- **Git**

## Getting Started

### 1. Clone and Install

```bash
git clone https://github.com/yohannesHL/pavelo.git
cd pavelo
pnpm install
```

### 2. Start Infrastructure

```bash
docker compose up -d
```

This starts PostgreSQL, Redis, Qdrant, and LiveKit.

### 3. Set Up Environment

```bash
cp .env.example .env
# Edit .env with your API keys (Supabase, OpenAI, Deepgram, etc.)
```

### 4. Initialize Database

```bash
cd apps/api
pnpm exec prisma migrate dev
pnpm exec prisma db seed  # optional: seed sample data
cd ../..
```

### 5. Run All Services

```bash
pnpm dev
```

This starts:
- **Web app** → http://localhost:3000
- **API gateway** → http://localhost:4000
- **Agent service** → http://localhost:8000
- **ML service** → http://localhost:8001

## Project Structure

```
pavelo/
├── apps/
│   ├── web/                  # Next.js 15 frontend
│   │   ├── src/
│   │   │   ├── app/          # App Router pages
│   │   │   ├── components/   # React components
│   │   │   ├── hooks/        # Custom React hooks
│   │   │   ├── stores/       # Zustand state stores
│   │   │   ├── styles/       # Global CSS + tokens
│   │   │   └── lib/          # Client utilities
│   │   ├── e2e/              # Playwright E2E tests
│   │   └── public/           # Static assets, PWA manifest
│   │
│   └── api/                  # Fastify API gateway
│       ├── src/
│       │   ├── routes/       # tRPC route modules
│       │   ├── middleware/   # Auth, rate limit, tracing
│       │   ├── lib/          # Prisma, Redis, Supabase clients
│       │   └── services/     # Business logic services
│       └── prisma/           # Schema, migrations, seed
│
├── services/
│   ├── agent/                # Python LangGraph AI agent
│   │   └── src/
│   │       ├── nodes/        # Graph nodes (intent, response, tools)
│   │       ├── memory/       # Mem0 integration, consolidation
│   │       ├── search/       # Query decomposition
│   │       ├── tools/        # Agent tools (search, booking, etc.)
│   │       └── voice/        # Pipecat voice pipeline (STT/TTS)
│   │
│   └── ml/                   # Python ML service (FastAPI)
│       └── src/
│           ├── models/       # CLIP, embeddings
│           ├── pipelines/    # Image processing pipeline
│           ├── routes/       # API endpoints
│           └── search/       # Qdrant hybrid search
│
├── packages/
│   └── shared/               # Shared types and utilities
│
├── db/                       # Database scripts
├── tests/
│   └── load/                 # k6 load tests
├── docs/                     # Documentation
│   ├── api/                  # API documentation
│   ├── deployment/           # Deployment guide
│   ├── security/             # Security audit
│   └── accessibility/        # WCAG audit
│
├── docker-compose.yml                  # Development infrastructure
├── docker-compose.production.yml       # Production all-in-one
├── docker-compose.observability.yml    # Grafana + Prometheus
├── turbo.json                          # Turborepo config
├── pnpm-workspace.yaml                 # pnpm workspaces
└── package.json                        # Root package
```

## Environment Variables

See `.env.example` for all required variables. Key ones:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_URL` | ✅ | Redis connection string |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key |
| `OPENAI_API_KEY` | ✅ | OpenAI API key |
| `QDRANT_URL` | ✅ | Qdrant vector DB URL |
| `LIVEKIT_URL` | Voice | LiveKit WebRTC server URL |
| `LIVEKIT_API_KEY` | Voice | LiveKit API key |
| `DEEPGRAM_API_KEY` | Voice | Deepgram STT key |
| `CARTESIA_API_KEY` | Voice | Cartesia TTS key |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Maps | Mapbox GL access token |

## Scripts

```bash
pnpm dev          # Start all services in development
pnpm build        # Build all packages
pnpm lint         # Lint all packages
pnpm typecheck    # TypeScript checking
pnpm test         # Run unit tests
pnpm format       # Prettier formatting

# Web-specific
cd apps/web
pnpm test:e2e     # Playwright E2E tests
pnpm build        # Next.js production build

# Load tests
k6 run tests/load/api-endpoints.js
```

## API Overview

The API is built with tRPC (end-to-end type-safe). Key routers:

| Router | Endpoints | Auth |
|---|---|---|
| `search.query` | Hybrid property search | Public |
| `property.list/get/create/update/delete` | Property CRUD | Mixed |
| `conversation.*` | Chat sessions | Protected |
| `voice.*` | Voice session management | Protected |
| `agency.*` | Agency dashboard, leads | Protected |
| `billing.*` | Stripe subscription management | Protected |
| `memory.*` | User memory profiles | Protected |
| `viewing.*` | Viewing booking system | Protected |
| `savedProperty.*` | Saved property boards | Protected |
| `intelligence.*` | Area data, crime, schools | Public |

See `docs/api/README.md` for full API documentation.

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make changes, commit: `git commit -m "feat: description"`
4. Push and create a PR
5. Wait for CI checks and code review

### Commit Convention

- `feat:` — new feature
- `fix:` — bug fix
- `docs:` — documentation
- `refactor:` — code refactoring
- `test:` — test additions
- `chore:` — tooling/config changes

## License

Private — All rights reserved.
