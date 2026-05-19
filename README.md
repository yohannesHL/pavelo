# 🏠 Pavelo — AI Estate Agent Platform

> **Xara** — Your AI estate agent that listens, remembers, and delivers.

Pavelo is a next-generation real estate SaaS platform powered by **Xara**, a voice-first AI estate agent capable of conducting full buyer and seller conversations, executing complex multi-step property searches, and surfacing rich visual intelligence — all through a unified chat/voice interface.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                  │
│  Browser (Next.js 16 SPA)  ·  Mobile (PWA)  ·  Voice (LiveKit)  │
└────────┬──────────────────────┬──────────────────┬──────────────┘
         │ HTTPS                │ tRPC/WS          │ WebRTC
         ▼                     ▼                   ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│  Next.js 16 SPA  │ │  Fastify API     │ │  LiveKit Server  │
│  (apps/web)      │ │  (apps/api)      │ │  (WebRTC SFU)    │
│  Port: 3000      │ │  Port: 4000      │ │  Port: 7880      │
└──────────────────┘ └────────┬─────────┘ └────────┬─────────┘
                              │                     │
         ┌────────────────────┴─────────────────────┘
         ▼
┌───────────────────────────────────────────────┐
│  LangGraph AI Agent (services/agent)          │
│  Port: 8000                                   │
│                                               │
│  ┌─────────────┐  ┌─────────────────────────┐│
│  │ RAG Pipeline│  │ Voice Pipeline (Pipecat) ││
│  │ Chunk→Embed │  │ VAD→STT→Agent→TTS       ││
│  │ →Qdrant     │  │                          ││
│  └──────┬──────┘  └──────────────────────────┘│
│         │                                      │
└─────────┼──────────────────────────────────────┘
          │
    ┌─────┴──────┐ ┌────────┐ ┌──────────────┐
    │ Qdrant     │ │ Redis  │ │ PostgreSQL   │
    │ :6333      │ │ :6379  │ │ :5432        │
    └────────────┘ └────────┘ └──────────────┘
```

## Key Features

- **Unified Chat + Voice** — Single `/chat` interface with togglable voice mode (mic button next to send)
- **Agentic AI System** — LangGraph-based multi-node orchestration with intent classification, memory retrieval, tool execution, and streaming response generation
- **Production RAG Pipeline** — Property ingestion → semantic chunking (4 strategies) → OpenAI embeddings → Qdrant vector store → cosine similarity retrieval
- **Voice Pipeline** — LiveKit WebRTC → Deepgram/OpenRouter STT → LangGraph agent → Cartesia/OpenRouter TTS
- **Provider Adapter Pattern** — Pluggable LLM/STT/TTS with env-var-based resolution (OpenRouter default, dedicated keys override)
- **Conversation Memory** — Mem0 episodic memory with consolidation and long-term preference learning
- **Property Scraping** — Playwright-based Rightmove scraper for real UK listings
- **Real-time WebSocket** — Streaming responses, typing indicators, visual payloads (property cards, comparisons, charts)

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16 (SPA mode), TypeScript, Tailwind CSS 4, Framer Motion, Zustand |
| **API Gateway** | Fastify 5, tRPC 11, Zod, WebSocket |
| **AI Agent** | Python, LangGraph StateGraph, LangChain, Mem0 |
| **RAG** | Semantic chunking, OpenAI text-embedding-3-small, Qdrant (cosine similarity) |
| **Voice** | LiveKit (WebRTC), Pipecat, Deepgram Nova-3 / OpenRouter STT, Cartesia Sonic / OpenRouter TTS |
| **LLM** | OpenRouter (default, free tier) / OpenAI direct — adapter pattern |
| **Vector Search** | Qdrant |
| **Database** | PostgreSQL (Supabase), Prisma ORM, Redis |
| **Auth** | Supabase Auth (JWT) |
| **Scraping** | Playwright (headless Chromium) |
| **Testing** | Vitest (integration), Playwright (E2E) |
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
# Edit .env with your API keys
```

**Minimum for chat (LLM only):**
```env
OPENROUTER_API_KEY=sk-or-...     # Free tier: google/gemini-2.0-flash-exp
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
DATABASE_URL=postgresql://...
```

**For voice (add to above):**
```env
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
DEEPGRAM_API_KEY=...             # Optional: dedicated STT (overrides OpenRouter)
CARTESIA_API_KEY=...             # Optional: dedicated TTS (overrides OpenRouter)
```

**For RAG embeddings:**
```env
OPENAI_API_KEY=sk-...            # Used for text-embedding-3-small
QDRANT_URL=http://localhost:6333
```

### 4. Initialize Database

```bash
cd apps/api
pnpm exec prisma migrate dev
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

## RAG Pipeline

The RAG system ingests property listings into a Qdrant vector store for semantic retrieval.

### How It Works

```
Property Data → Chunking → Embedding → Qdrant
                   │
                   ├── Chunk 1: Overview (title, price, beds, address)
                   ├── Chunk 2: Full description text
                   ├── Chunk 3: Features list
                   └── Chunk 4: Search-optimized summary
```

### Triggers

| Trigger | How |
|---------|-----|
| **Property create/update** | Automatic — API fires event to agent service |
| **Manual (single)** | `POST /api/v1/rag/ingest` with `property_data` body |
| **Manual (batch)** | `POST /api/v1/rag/ingest/batch` with `properties` array |
| **From scraped file** | `POST /api/v1/rag/ingest/from-file` (reads `scripts/output/rightmove-listings.json`) |

### Endpoints (Agent Service :8000)

```bash
# Ingest a property
curl -X POST http://localhost:8000/api/v1/rag/ingest \
  -H "Content-Type: application/json" \
  -d '{"property_data": {"id":"p1", "title":"3 Bed Semi", "address":"London", "price":500000, "bedrooms":3}}'

# Semantic search
curl -X POST http://localhost:8000/api/v1/rag/search \
  -H "Content-Type: application/json" \
  -d '{"query": "3 bedroom house with garden in south London", "limit": 5}'

# Collection stats
curl http://localhost:8000/api/v1/rag/stats
```

## Property Scraper

Scrape real UK property listings from Rightmove using Playwright:

```bash
cd scripts
npm install
npx playwright install chromium
npx tsx scrape-rightmove.ts
```

Output: `scripts/output/rightmove-listings.json` (10 structured listings)

Then ingest into RAG:
```bash
curl -X POST http://localhost:8000/api/v1/rag/ingest/from-file
```

## Provider Adapter Pattern

LLM, STT, and TTS providers are pluggable via environment variables:

```
Priority: Dedicated API Key → OPENROUTER_API_KEY → Stub (no-op fallback)
```

| Provider | Env Var | Default Model |
|----------|---------|---------------|
| **LLM** | `OPENAI_API_KEY` or `OPENROUTER_API_KEY` | `google/gemini-2.0-flash-exp:free` |
| **STT** | `DEEPGRAM_API_KEY` or `OPENROUTER_API_KEY` | `openai/whisper-large-v3` |
| **TTS** | `CARTESIA_API_KEY` or `OPENROUTER_API_KEY` | `openai/tts-1` |

Override models: `LLM_MODEL`, `STT_MODEL`, `TTS_MODEL`, `TTS_VOICE`

## Testing

```bash
# Integration tests (API + RAG)
cd test/int
npm install
npx vitest run

# E2E tests (browser)
cd apps/web
pnpm test:e2e

# Load tests
k6 run tests/load/api-endpoints.js
```

## Project Structure

```
pavelo/
├── apps/
│   ├── web/                  # Next.js 16 SPA frontend
│   │   └── src/
│   │       ├── app/          # App Router pages (all "use client")
│   │       ├── components/   # React components (chat/, voice/, etc.)
│   │       ├── hooks/        # useVoiceSession, etc.
│   │       ├── stores/       # Zustand (chat-store, auth-store)
│   │       └── styles/       # Tailwind + design tokens
│   │
│   └── api/                  # Fastify API gateway
│       ├── src/
│       │   ├── routes/       # tRPC routers (voice, conversation, etc.)
│       │   ├── lib/          # Prisma, Redis, Supabase, LiveKit
│       │   └── context.ts    # Auth context (JWT → user upsert)
│       └── prisma/           # Schema + migrations
│
├── services/
│   └── agent/                # Python LangGraph AI agent
│       └── src/
│           ├── nodes/        # intent_classifier, response_generator
│           ├── rag/          # ingest, retrieve, router (Qdrant)
│           ├── providers/    # LLM/STT/TTS adapters + factory
│           ├── memory/       # Mem0 integration
│           ├── tools/        # Agent tools (search, booking, etc.)
│           └── voice/        # Pipecat pipeline (STT/TTS/VAD)
│
├── scripts/
│   └── scrape-rightmove.ts   # Playwright property scraper
│
├── test/
│   └── int/                  # Integration tests (Vitest)
│       ├── api.test.ts       # API health + auth
│       ├── chat.test.ts      # WebSocket chat flow
│       └── rag.test.ts       # RAG ingest + search
│
├── packages/shared/          # Shared types
├── docs/                     # Sprint docs, API docs, QA sign-offs
├── docker-compose.yml        # Dev infrastructure
└── turbo.json                # Turborepo config
```

## API Overview

| Router | Description | Auth |
|---|---|---|
| `search.query` | Hybrid property search | Public |
| `property.*` | Property CRUD | Mixed |
| `conversation.*` | Chat sessions | Protected |
| `voice.*` | Voice session lifecycle | Protected |
| `agency.*` | Agency dashboard, leads, handovers | Protected |
| `billing.*` | Stripe subscriptions | Protected |
| `memory.*` | User memory/preferences | Protected |
| `viewing.*` | Viewing booking | Protected |
| `/api/v1/rag/*` | RAG ingest/search (agent service) | Internal |
| `/api/v1/chat` | Agent chat (streaming SSE) | Internal |

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make changes, commit: `git commit -m "feat: description"`
4. Push and create a PR

### Commit Convention

- `feat:` — new feature
- `fix:` — bug fix
- `docs:` — documentation
- `refactor:` — code refactoring
- `test:` — test additions

## License

Private — All rights reserved.
