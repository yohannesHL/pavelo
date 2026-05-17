# PROJECT_BRIEF.md — Pavelo / Xara

> **Single source of truth** for every AI-team chat (Nova, Sage, Milo, Ivy, Kira, Dash, Remy).
> Updated by **Remy (Producer)** at the start of each sprint.
> Repository: `yohannesHL/pavelo`

---

## 1. Project Overview

| Field | Value |
|---|---|
| **Product** | Pavelo |
| **AI Agent** | Xara — voice-capable, personalised real estate AI agent |
| **Tagline** | Your AI estate agent that listens, remembers, and delivers. |
| **Repo** | `yohannesHL/pavelo` |
| **Monorepo** | Turborepo + pnpm workspaces |
| **Stack** | Next.js 15 · Fastify · Python (LangGraph) · Qdrant · LiveKit · Supabase |
| **MVP Target** | 10 sprints / 20 weeks |

---

## 2. Concept / Product Description

Pavelo is a next-generation real estate SaaS platform. Its core product is **Xara** — a persistent, intelligent AI estate agent capable of conducting full buyer and seller conversations via voice, executing complex multi-step property searches, and surfacing rich visual intelligence across properties, neighbourhoods, and market data.

### Xara — The AI Agent

Xara is not a chatbot. She is a **voice-first AI estate agent** with:

- **Real conversational intelligence** — full natural-language dialogue via WebRTC voice, not IVR menus or scripted flows.
- **Persistent cross-session memory** — Xara remembers your preferences, search history, and intent across every conversation (non-IID). Powered by Mem0 (episodic), Redis (short-term), and PostgreSQL (long-term profiles).
- **Hybrid RAG property search** — semantic + keyword querying via Qdrant over rich structured property embeddings. Xara doesn't just filter — she *understands* what you're looking for.
- **Image intelligence** — a CV pipeline (CLIP ViT-L/14, GPT-4V) extracts architectural style, era, interior attributes into queryable embeddings. Ask Xara for "a Victorian terrace with a modern kitchen" and she finds it.
- **Rich visual intelligence** — crime maps, amenity overlays, school catchments, price heatmaps, market trend charts, and more rendered inline during conversation.

### Buyer Flow

1. **Onboard** → Select "Buyer" role, set location, budget, preferences.
2. **Converse** → Talk to Xara via voice or chat. Describe what you want naturally.
3. **Search** → Xara runs hybrid RAG queries, surfaces property cards, maps, comparables.
4. **Explore** → Drill into property details, neighbourhood stats, school catchments, crime data, transport links.
5. **Compare** → Side-by-side property comparison with AI-generated summaries.
6. **Act** → Book viewings, get mortgage estimates, save favourites, share with partner.

### Seller Flow

1. **Onboard** → Select "Seller" role, enter property details.
2. **Valuation** → Xara provides AI-driven valuation using sold price comparables, market trends, and property attributes.
3. **Market Intel** → Review neighbourhood demand, price heatmaps, buyer activity.
4. **Optimise** → Xara suggests improvements to maximise sale price (based on image analysis and market data).
5. **Connect** → Link to estate agents via B2B Agent Dashboard (CRM sync, lead capture).

### Key Differentiators

- Voice-first AI estate agent: real conversational intelligence, not IVR menus
- Persistent cross-session memory: agent remembers preferences, history, intent
- Hybrid RAG property search: semantic + keyword querying via Qdrant
- Image intelligence pipeline: CV model extracts architectural attributes into queryable embeddings
- Rich visual intelligence: crime maps, school catchments, price heatmaps rendered inline
- Polyglot microservices: Next.js 15 · Fastify · Python LangGraph · Qdrant · LiveKit

---

## 3. Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| Next.js 15 (App Router) | React framework, SSR/SSG |
| TypeScript | Type safety |
| Tailwind CSS 4 | Utility-first styling |
| shadcn/ui | Component library |
| Mapbox GL JS | Interactive maps, heatmaps, isochrones |
| Recharts | Charts and data visualisation |
| Framer Motion | Animations and transitions |

### API Gateway
| Technology | Purpose |
|---|---|
| Node.js | Runtime |
| Fastify | HTTP framework |
| tRPC | End-to-end typesafe APIs |
| Zod | Schema validation |

### AI Orchestration
| Technology | Purpose |
|---|---|
| Python | Language |
| LangGraph | Agent state machine / orchestration |
| LangChain | LLM tooling and chains |
| Mem0 | Episodic memory for cross-session recall |

### Voice Pipeline
| Technology | Purpose |
|---|---|
| LiveKit | WebRTC infrastructure |
| Pipecat | Voice pipeline orchestration |
| Deepgram Nova-3 | Speech-to-text (STT) |
| Cartesia Sonic | Text-to-speech (TTS) |

### Vector Search
| Technology | Purpose |
|---|---|
| Qdrant | Vector database (hybrid dense + sparse) |
| OpenAI text-embedding-3-large | Text embeddings |
| CLIP ViT-L/14 | Image embeddings |

### ML Services
| Technology | Purpose |
|---|---|
| Python / FastAPI | ML service framework |
| CLIP ViT-L/14 | Image feature extraction |
| GPT-4V / Llama 3.2 Vision | Image understanding and captioning |

### Database & Cache
| Technology | Purpose |
|---|---|
| PostgreSQL (Supabase) | Primary relational database |
| Prisma ORM | Database access and migrations |
| Redis | Session cache, short-term memory |

### Auth
| Technology | Purpose |
|---|---|
| Supabase Auth | Authentication provider |
| JWT | Token-based auth |

### Infrastructure
| Technology | Purpose |
|---|---|
| Docker | Containerisation |
| Railway / Render | Cloud hosting |
| Cloudflare CDN | Edge caching and DDoS protection |
| GitHub Actions | CI/CD pipelines |
| Turborepo + pnpm | Monorepo tooling |

### Design Tokens
| Token | Value |
|---|---|
| **Font — UI** | Inter |
| **Font — Property Headings** | Playfair Display |
| **Font — Data Values** | JetBrains Mono |
| **Primary** | `#1B3A6B` (deep navy) |
| **Accent** | `#2E86AB` (steel blue) |
| **Gold** | `#F4A261` |
| **Radius — Cards** | 12px |
| **Radius — Inputs** | 8px |
| **Radius — Badges** | 4px |
| **Motion — UI** | 200ms ease-out |
| **Motion — Maps** | 600ms ease-in-out |

---

## 4. Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                     │
│   Browser (Next.js 15 SSR)  ·  Mobile (PWA)  ·  Voice (LiveKit SDK)     │
└──────────────┬──────────────────────┬──────────────────┬─────────────────┘
               │ HTTPS/WSS            │ HTTPS/tRPC       │ WebRTC
               ▼                      ▼                  ▼
┌──────────────────────┐  ┌─────────────────────┐  ┌──────────────────────┐
│   Next.js 15 App     │  │  Fastify API Gateway │  │  LiveKit Server      │
│   (apps/web)         │  │  (apps/api)          │  │  (WebRTC SFU)        │
│                      │  │                      │  │                      │
│  • App Router (SSR)  │  │  • tRPC routes       │  │  • Room management   │
│  • React Server Comp │  │  • Zod validation    │  │  • Media routing     │
│  • Tailwind 4 / shad │  │  • Auth middleware   │  │  • Track pub/sub     │
│  • Mapbox / Recharts │  │  • Rate limiting     │  │                      │
│  • Framer Motion     │  │  • WebSocket proxy   │  │                      │
└──────────┬───────────┘  └──────────┬──────────┘  └──────────┬───────────┘
           │                         │                         │
           │         ┌───────────────┴───────────────┐         │
           │         ▼                               │         │
           │  ┌─────────────────────────────┐        │         │
           │  │  LangGraph AI Agent         │        │         │
           │  │  (services/agent)           │        │         │
           │  │                             │        │         │
           │  │  • State machine orchestr.  │        │         │
           │  │  • Tool dispatch            │        │         │
           │  │  • Mem0 episodic memory     │        │         │
           │  │  • Conversation management  │        │         │
           │  │  • Multi-step planning      │        │         │
           │  └──────┬──────────┬───────────┘        │         │
           │         │          │                     │         │
           │         ▼          ▼                     │         │
           │  ┌────────────┐ ┌──────────────┐        │         │
           │  │  Qdrant    │ │  ML Service  │        │         │
           │  │  (Vector)  │ │  (svc/ml)    │        │         │
           │  │            │ │              │        │         │
           │  │ • Hybrid   │ │ • CLIP embed │        │         │
           │  │   search   │ │ • GPT-4V     │        │         │
           │  │ • Dense +  │ │ • Image      │        │         │
           │  │   sparse   │ │   classify   │        │         │
           │  └────────────┘ └──────────────┘        │         │
           │                                         │         │
           │         ┌───────────────────────┐       │         │
           ▼         ▼                       ▼       ▼         ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                          DATA LAYER                                      │
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │  PostgreSQL   │  │  Redis       │  │  Supabase    │  │ Cloudflare  │  │
│  │  (Supabase)   │  │  Cache       │  │  Auth + RLS  │  │ CDN + R2    │  │
│  │              │  │              │  │              │  │             │  │
│  │ • Properties │  │ • Sessions   │  │ • JWT        │  │ • Static    │  │
│  │ • Users      │  │ • Short-term │  │ • Row-level  │  │ • Images    │  │
│  │ • History    │  │   memory     │  │   security   │  │ • Assets    │  │
│  │ • Prisma ORM │  │ • Rate limit │  │ • OAuth      │  │             │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘

Voice Pipeline Detail:
┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐
│  Browser   │───▶│  LiveKit   │───▶│  Pipecat   │───▶│  LangGraph │
│  (WebRTC)  │◀───│  Server    │◀───│  Pipeline  │◀───│  Agent     │
└────────────┘    └────────────┘    └────────────┘    └────────────┘
                                     │          ▲
                                     ▼          │
                               ┌──────────┐ ┌──────────┐
                               │ Deepgram │ │ Cartesia │
                               │ STT      │ │ TTS      │
                               │ (Nova-3) │ │ (Sonic)  │
                               └──────────┘ └──────────┘
```

---

## 5. Key Files Map

```
pavelo/
├── PROJECT_BRIEF.md                  # ★ This file — single source of truth
├── turbo.json                        # Turborepo pipeline config
├── pnpm-workspace.yaml               # Workspace package definitions
├── package.json                       # Root package.json
├── .env.example                       # Environment variable template
│
├── apps/
│   ├── web/                           # ── Next.js 15 Frontend ──
│   │   ├── src/
│   │   │   ├── app/                   # App Router pages & layouts
│   │   │   │   ├── layout.tsx         # Root layout (fonts, providers)
│   │   │   │   ├── page.tsx           # Landing / dashboard
│   │   │   │   ├── onboarding/        # Buyer/seller role selection
│   │   │   │   ├── voice/             # Voice session view
│   │   │   │   ├── chat/              # Chat interface
│   │   │   │   ├── property/[id]/     # Property detail page
│   │   │   │   ├── saved/             # Saved properties board
│   │   │   │   ├── market/            # Market intelligence hub
│   │   │   │   └── agent-dashboard/   # B2B agent dashboard
│   │   │   ├── components/
│   │   │   │   ├── ui/               # shadcn/ui base components
│   │   │   │   ├── property/         # PropertyCard, Gallery, FloorPlan
│   │   │   │   ├── maps/            # MapView, Heatmap, Isochrone, CrimeMap
│   │   │   │   ├── charts/          # PriceHistory, MarketTrend, Demographics
│   │   │   │   ├── voice/           # Waveform, Transcription, VoiceControls
│   │   │   │   └── chat/            # ChatBubble, VisualEmbed, ToolResult
│   │   │   ├── hooks/               # Custom React hooks
│   │   │   ├── lib/                  # Utilities, API client, constants
│   │   │   └── styles/              # Global CSS, design tokens
│   │   ├── public/                   # Static assets
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   └── tsconfig.json
│   │
│   └── api/                           # ── Fastify API Gateway ──
│       ├── src/
│       │   ├── index.ts              # Server entry point
│       │   ├── router.ts            # tRPC router root
│       │   ├── routes/
│       │   │   ├── property.ts       # Property CRUD + search proxy
│       │   │   ├── auth.ts           # Auth routes (Supabase)
│       │   │   ├── voice.ts          # LiveKit token generation
│       │   │   ├── agent.ts          # Agent session management
│       │   │   └── market.ts         # Market data routes
│       │   ├── middleware/
│       │   │   ├── auth.ts           # JWT verification
│       │   │   └── rateLimit.ts      # Rate limiting
│       │   └── lib/
│       │       ├── supabase.ts       # Supabase client
│       │       ├── redis.ts          # Redis client
│       │       └── prisma.ts         # Prisma client
│       ├── prisma/
│       │   └── schema.prisma         # Database schema
│       └── tsconfig.json
│
├── services/
│   ├── agent/                         # ── Python LangGraph AI Agent ──
│   │   ├── src/
│   │   │   ├── graph.py              # LangGraph state machine definition
│   │   │   ├── nodes/
│   │   │   │   ├── router.py         # Intent classification node
│   │   │   │   ├── search.py         # Property search node
│   │   │   │   ├── detail.py         # Property detail node
│   │   │   │   ├── area.py           # Area intelligence node
│   │   │   │   ├── voice.py          # Voice response formatting
│   │   │   │   └── memory.py         # Memory read/write node
│   │   │   ├── tools/
│   │   │   │   ├── search_properties.py
│   │   │   │   ├── get_property_details.py
│   │   │   │   ├── analyse_property_images.py
│   │   │   │   ├── get_area_stats.py
│   │   │   │   ├── get_crime_data.py
│   │   │   │   ├── get_school_ratings.py
│   │   │   │   ├── get_transport_links.py
│   │   │   │   ├── get_price_history.py
│   │   │   │   ├── get_amenities.py
│   │   │   │   ├── book_viewing.py
│   │   │   │   ├── request_valuation.py
│   │   │   │   ├── get_mortgage_estimate.py
│   │   │   │   ├── compare_properties.py
│   │   │   │   └── web_search.py
│   │   │   ├── memory/
│   │   │   │   ├── mem0_client.py    # Mem0 episodic memory
│   │   │   │   ├── redis_cache.py    # Short-term session memory
│   │   │   │   └── profile.py        # Long-term user profiles (PG)
│   │   │   └── config.py
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   │
│   └── ml/                            # ── Python FastAPI ML Service ──
│       ├── src/
│       │   ├── main.py               # FastAPI entry point
│       │   ├── routes/
│       │   │   ├── embed.py          # Embedding generation endpoints
│       │   │   └── classify.py       # Image classification endpoints
│       │   ├── models/
│       │   │   ├── clip.py           # CLIP ViT-L/14 wrapper
│       │   │   └── vision.py         # GPT-4V / Llama Vision wrapper
│       │   └── pipelines/
│       │       ├── property_embed.py  # Property → embedding pipeline
│       │       └── image_intel.py     # Image → attributes pipeline
│       ├── requirements.txt
│       └── Dockerfile
│
├── packages/
│   └── shared/                        # ── Shared TypeScript Types ──
│       ├── src/
│       │   ├── types/
│       │   │   ├── property.ts       # Property, SearchResult, Filter
│       │   │   ├── user.ts           # User, Preferences, Role
│       │   │   ├── agent.ts          # AgentMessage, ToolCall, Session
│       │   │   ├── map.ts            # MapPin, Heatmap, Isochrone
│       │   │   └── market.ts         # MarketData, PriceHistory, Trend
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── docs/
│   ├── sprint-1/                     # Sprint plans, progress, done
│   ├── brainstorm/                   # Brainstorm outputs
│   └── qa/                           # QA sign-offs
│
├── docker-compose.yml                # Local dev orchestration
├── .github/
│   └── workflows/
│       ├── ci.yml                    # Lint, type-check, test on PR
│       └── deploy.yml                # Deploy on merge to main
└── .env.example                      # Environment variable template
```

---

## 6. Team Roles

| Agent | Name | Role | Scope |
|-------|------|------|-------|
| 🎬 Producer | **Remy** | Sprint plans, coordination, merging | NEVER writes application code |
| 🖥️ Frontend | **Nova** | UI components, state, client logic | Next.js, React, TypeScript |
| ⚙️ Backend | **Sage** | API, auth, database, AI services, security | Fastify, Python, LangGraph |
| 🎨 Art/CSS | **Milo** | Visual design, animations, CSS, design system | Tailwind, Framer Motion, tokens |
| 🧪 QA | **Ivy** | Testing, bug filing, sign-off | Playwright, pytest, Vitest |
| 📐 Product | **Kira** | UX design, mechanics, feature specs | Figma, user flows, wireframes |
| 🚀 DevOps | **Dash** | CI/CD, deployment, infrastructure | Docker, Railway, GitHub Actions |

### Delegation Rules
- **Nova** owns all files in `apps/web/`
- **Sage** owns all files in `apps/api/`, `services/agent/`, `services/ml/`
- **Milo** owns design tokens, global CSS, and component styling
- **Ivy** owns all `*.test.*`, `*.spec.*`, and `docs/qa/` files
- **Dash** owns `docker-compose.yml`, `Dockerfile`s, `.github/workflows/`, `turbo.json`
- **Remy** owns `PROJECT_BRIEF.md`, `docs/sprint-*/`, coordination docs
- **Kira** owns UX specs and user flow docs

---

## 7. Sprint Status

| Sprint | Title | Weeks | Status |
|--------|-------|-------|--------|
| **1** | Infrastructure Foundations | 1–2 | ✅ **Complete** |
| **2** | Auth, Property Schema & Core APIs | 3–4 | ✅ **Complete** |
| **3** | Image Intelligence ML Pipeline | 5–6 | ✅ **Complete** |
| **4** | Hybrid RAG Search Engine | 7–8 | ✅ **Complete** |
| **5** | Chat Interface & Text Agent | 9–10 | ✅ **Complete** |
| 6 | Voice Infrastructure | 11–12 | ✅ **Complete** |
| 7 | Visual Intelligence Components | 13–14 | 🔜 **Next** |
| 8 | Memory, Valuation & Seller Flow | 15–16 | ⬜ Planned |
| 9 | Agent Dashboard, B2B & Integrations | 17–18 | ⬜ Planned |
| 10 | Hardening, Performance & Launch Prep | 19–20 | ⬜ Planned |

### Sprint 1 — Infrastructure Foundations ✅
- [x] Turborepo + pnpm workspace scaffold
- [x] Next.js 15 app scaffold (`apps/web`)
- [x] Fastify API gateway scaffold (`apps/api`)
- [x] Python LangGraph agent scaffold (`services/agent`)
- [x] Python FastAPI ML service scaffold (`services/ml`)
- [x] Shared types package (`packages/shared`)
- [x] Supabase project + auth setup
- [x] Prisma schema (initial models: User, Property)
- [x] Docker Compose for local dev
- [x] GitHub Actions CI pipeline (lint, type-check, test)
- [x] Design system foundation (Tailwind config, tokens, shadcn/ui)
- [x] Environment variable template (`.env.example`)
- [x] README with setup instructions

### Sprint 2 — Auth, Property Schema & Core APIs ✅
- [x] Bug fixes from Sprint 1 QA (#2, #3, #4, #5)
- [x] Property CRUD API (create, get, list, update, soft-delete)
- [x] Expanded Prisma schema (yearBuilt, tenure, epcRating, etc.)
- [x] Shared types: Property, User, Conversation, Message, VisualPayload, AgentState
- [x] Onboarding flow: role selection, profile creation, preference wizard
- [x] Auth: login, signup, Zustand auth store, session management
- [x] Property listing page with search, filters, sorting
- [x] Property detail page with gallery, stats, features, map placeholder
- [x] Image upload endpoint with validation
- [x] LangGraph agent skeleton: StateGraph, 5 nodes, checkpointing
- [x] Mem0 client, memory search tool, Redis cache, profile store
- [x] Property embedding pipeline (OpenAI text-embedding-3-large)
- [x] Qdrant hybrid search setup (dense + BM25 sparse)

### Sprint 3 — Image Intelligence ML Pipeline ✅
- [x] CLIP ViT-L/14 model loader with quantised weights, batch inference
- [x] Scene classifier: exterior/interior/garden/floor-plan/aerial (CLIP zero-shot)
- [x] Architectural style classifier: 10-class with top-3 predictions
- [x] GPT-4V interior attribute extraction (flooring, kitchen, ceiling, light, features)
- [x] Era estimation (6 categories) + condition scoring (1-10 scale)
- [x] Feature tagging aggregation into PropertyAttributes JSON
- [x] Embedding regeneration with image-derived attributes
- [x] Admin ML dashboard at `/admin/ml` (job queue, results viewer, manual override)
- [x] Celery + Redis async job queue with retry policies
- [x] Bulk import tool (JSON + CSV property ingestion)

### Sprint 4 — Hybrid RAG Search Engine ✅
- [x] Qdrant hybrid search: dense + sparse fusion with RRF scoring, filter post-processing
- [x] Natural language query decomposition: LLM-powered param extraction (OpenAI function calling)
- [x] search_properties LangGraph tool: structured input, Qdrant call, result ranking, dedup
- [x] Search API: tRPC search.query endpoint with ML service call + PostgreSQL hydration
- [x] Revamped search UI: NL search bar, filter sidebar (price slider, bedrooms, type, location), grid/list views
- [x] Map view: property pins with price labels, card popups, dark/light toggle, split view
- [x] Saved searches + alerts: CRUD endpoints, SavedSearch Prisma model
- [x] Image similarity search: CLIP embedding query, POST /api/v1/search/similar-image
- [x] Search analytics: query logging, click-through tracking, zero-results analysis
- [x] Search quality eval: 25 benchmark queries, MRR/NDCG/Precision/Recall metrics

### Sprint 5 — Chat Interface & Text Agent ✅
- [x] Chat UI: message stream, markdown render, typing indicator, input toolbar, keyboard shortcuts
- [x] WebSocket infrastructure: Fastify ws plugin, JWT auth on upgrade, room-based routing, heartbeat
- [x] Conversation persistence: Prisma Conversation/Message models, tRPC CRUD, pagination, search
- [x] LangGraph agent full integration: OpenAI intent classifier, Mem0 memory, streaming responses
- [x] Agent tools: get_property_details, compare_properties, get_mortgage_estimate
- [x] Streaming response relay: Python SSE → Node WebSocket → Next.js chat UI
- [x] Visual payload protocol: JSON schema, render router, inline rendering in chat
- [x] Property card visual: inline property card, carousel, comparison table
- [x] Conversation list/history: sidebar, search, delete, resume, new chat
- [x] Agent persona system: configurable name/tone/formality, system prompt template

### Sprint 6 — Voice Infrastructure ✅
- [x] LiveKit server setup: docker-compose, token generation, room management
- [x] LiveKit React SDK: useVoiceSession hook, audio tracks, connection state
- [x] Pipecat pipeline: VAD → Deepgram STT → LangGraph Agent → Cartesia TTS
- [x] Silero VAD: configurable thresholds, barge-in handling
- [x] Voice session UI: waveform, transcription, controls, Xara avatar
- [x] Voice-to-chat transcript: unified timeline with source tagging
- [x] Voice session management: Prisma model, session limits, state tracking
- [x] Multi-language support: 6 languages, auto-detect, multilingual TTS
- [x] Voice persona: voice-optimized prompt, affirmations, handover phrases
- [x] Voice quality monitoring: TTFB, WER placeholder, session metrics

---

## 8. Current State

| Component | Status | Notes |
|---|---|---|
| Monorepo scaffold | ✅ Complete | Turborepo + pnpm workspaces |
| Next.js 15 app | ✅ Complete | App Router, Tailwind 4, shadcn/ui |
| Fastify API | ✅ Complete | tRPC + REST, property CRUD, search |
| LangGraph agent | ✅ Integrated | StateGraph, 5 nodes, search tool, Mem0 |
| ML service | ✅ Complete | CLIP, GPT-4V, classifiers, hybrid search |
| Supabase Auth | ✅ Complete | Login, signup, middleware, Zustand store |
| Prisma schema | ✅ Expanded | User, Property, SavedSearch, SearchEvent |
| Docker Compose | ✅ Complete | PostgreSQL, Redis, Qdrant, LiveKit |
| CI/CD | ✅ Complete | GitHub Actions |
| Design system | ✅ Complete | Tailwind + shadcn + design tokens |
| Property pages | ✅ Revamped | Search bar, filter sidebar, grid/list/map views |
| Onboarding | ✅ Complete | Role selection, profile, preferences |
| Image upload | ✅ Complete | Multipart, validation, URL storage |
| Embedding pipeline | ✅ Complete | OpenAI + Qdrant + image enrichment |
| Qdrant | ✅ Hybrid search | Dense + sparse + RRF fusion + filters |
| Image classifiers | ✅ Complete | Scene (5-class), style (10-class), era (6-class) |
| Vision LLM | ✅ Complete | GPT-4V interior analysis, condition scoring |
| Feature aggregation | ✅ Complete | PropertyAttributes model, 20+ feature tags |
| Admin dashboard | ✅ Complete | ML pipeline at /admin/ml |
| Bulk import | ✅ Complete | JSON + CSV property ingestion |
| Async job queue | ✅ Complete | Celery + Redis, retry policies |
| Hybrid search | ✅ Complete | Dense + sparse RRF, NL decomposition, image search |
| Search UI | ✅ Complete | NL bar, filter sidebar, grid/list/map, map pins |
| Saved searches | ✅ Complete | CRUD, alert toggle, recheck ready |
| Search analytics | ✅ Complete | Query log, CTR, zero-results analysis |
| Search eval | ✅ Complete | 25 benchmarks, MRR/NDCG metrics, CLI + API |
| Chat UI | ✅ Complete | Message stream, markdown, typing indicator, property cards |
| WebSocket infra | ✅ Complete | JWT auth, rooms, heartbeat, agent relay |
| Conversation DB | ✅ Complete | Prisma models, tRPC CRUD, pagination |
| LangGraph agent | ✅ Integrated | OpenAI intent + response, Mem0 memory, tools |
| Agent tools | ✅ Complete | property_details, compare, mortgage_estimate |
| Streaming relay | ✅ Complete | Python SSE → Node WS → React UI |
| Visual payloads | ✅ Complete | property_card, carousel, comparison_table, mortgage |
| Agent persona | ✅ Complete | Configurable name/tone/formality, Xara default |
| LiveKit voice | ✅ Complete | Room management, token gen, React SDK |
| Voice pipeline | ✅ Complete | Pipecat: VAD + Deepgram STT + Cartesia TTS |
| Voice UI | ✅ Complete | Waveform, avatar, controls, transcription |
| Voice sessions | ✅ Complete | Prisma model, 1-per-user limit, metrics |
| Multi-language | ✅ Complete | 6 languages, auto-detect, i18n setup |
| Voice persona | ✅ Complete | Voice-optimized prompts, affirmations |
| Voice monitoring | ✅ Complete | TTFB, WER placeholder, session metadata |

> **Last updated:** Sprint 6 complete — full voice infrastructure with LiveKit WebRTC, Pipecat pipeline (VAD + Deepgram STT + Cartesia TTS), voice session management, animated voice UI, multi-language support, voice persona, and quality monitoring.

---

## 9. Security Rules

1. **Secrets in env vars only** — never commit secrets to code or git. Use `.env.local` for local dev, platform env vars in production.
2. **Supabase Auth with JWT** — all auth flows go through Supabase. API gateway validates JWT on every request.
3. **Row-level security (RLS)** — enabled on all Supabase tables for multi-tenancy isolation.
4. **GDPR compliance** — explicit consent for voice recording, no persistent audio storage, data deletion API endpoint required.
5. **OWASP top 10 audit** — full audit before launch (Sprint 10).
6. **WebSocket auth** — all WebSocket/LiveKit connections require valid auth tokens.
7. **API key rotation** — all third-party API keys must support rotation; no hard-coded keys.
8. **Input validation** — Zod schemas on every API endpoint; never trust client input.
9. **CORS** — strict origin allowlist in production.
10. **Rate limiting** — per-user and per-IP rate limits on all public endpoints.

---

## 10. How to Run Locally

```bash
# 1. Clone the repo
git clone git@github.com:yohannesHL/pavelo.git
cd pavelo

# 2. Install dependencies
pnpm install

# 3. Set up environment variables
cp .env.example .env.local
# Fill in: SUPABASE_URL, SUPABASE_ANON_KEY, OPENAI_API_KEY, QDRANT_URL,
#          LIVEKIT_URL, LIVEKIT_API_KEY, DEEPGRAM_API_KEY, CARTESIA_API_KEY,
#          MAPBOX_TOKEN, REDIS_URL, DATABASE_URL

# 4. Start infrastructure (Postgres, Redis, Qdrant)
docker compose up -d

# 5. Run database migrations
pnpm --filter api prisma migrate dev

# 6. Start all services in dev mode
pnpm dev
# This runs (via Turborepo):
#   - apps/web        → http://localhost:3000
#   - apps/api        → http://localhost:4000
#   - services/agent  → http://localhost:8000
#   - services/ml     → http://localhost:8001

# Individual services:
pnpm --filter web dev          # Frontend only
pnpm --filter api dev          # API gateway only
cd services/agent && uvicorn src.main:app --reload --port 8000
cd services/ml && uvicorn src.main:app --reload --port 8001
```

---

## 11. How to Deploy

```bash
# CI/CD runs automatically on push to main via GitHub Actions

# Manual deploy (if needed):
pnpm build                     # Build all packages

# Frontend (Vercel / Railway)
pnpm --filter web build        # Produces .next/ output
# Deploy via platform CLI or git push

# API Gateway (Railway / Render)
pnpm --filter api build
# Deploy via Dockerfile or platform CLI

# Python Services (Railway / Render)
# Each service has its own Dockerfile
docker build -t pavelo-agent services/agent/
docker build -t pavelo-ml services/ml/

# Infrastructure:
# - Supabase: managed (supabase.com)
# - Qdrant: Qdrant Cloud or self-hosted
# - Redis: Upstash or Railway addon
# - LiveKit: LiveKit Cloud
```

### Environment Matrix

| Service | Dev Port | Prod URL (example) |
|---|---|---|
| Web | :3000 | app.pavelo.ai |
| API | :4000 | api.pavelo.ai |
| Agent | :8000 | agent.pavelo.ai |
| ML | :8001 | ml.pavelo.ai |

---

## 12. Cross-Chat Handoff Protocol

When an agent finishes a task and another agent needs to pick it up:

### Format
```
## HANDOFF → [Target Agent]

**From:** [Source Agent]
**Sprint:** [Sprint N]
**Task:** [Brief description]

### What was done
- [Bullet list of completed work]

### Files changed
- `path/to/file.ts` — [what changed]

### What's needed next
- [Bullet list of remaining work for target agent]

### Dependencies / blockers
- [Any blockers or required context]
```

### Rules
1. **Always reference file paths** — never say "the component" without the path.
2. **Include the branch name** — all work happens on feature branches.
3. **Tag the PR** — if a PR is open, include the PR number.
4. **Remy coordinates** — all handoffs go through Remy for sprint tracking.
5. **Update PROJECT_BRIEF.md** — Remy updates Current State after each handoff.

---

## 13. Bug & Fix Tracking

### Bug Report Format
```
## 🐛 BUG-[NNN]: [Short title]

**Severity:** Critical / High / Medium / Low
**Reporter:** [Agent name]
**Sprint:** [Sprint N]
**Status:** Open / In Progress / Fixed / Won't Fix

### Reproduction
1. [Step 1]
2. [Step 2]
3. [Expected vs actual]

### Environment
- Browser / OS / Node / Python version
- Relevant env vars or config

### Files involved
- `path/to/file.ts:L42` — [description]

### Fix (when resolved)
- **Fixed by:** [Agent name]
- **PR:** #[number]
- **Root cause:** [Brief explanation]
```

### Bug Log

| ID | Title | Severity | Status | Reporter | Assignee |
|----|-------|----------|--------|----------|----------|
| — | No bugs yet | — | — | — | — |

---

## 14. Success Metrics (MVP)

| Metric | Target | How Measured |
|---|---|---|
| Voice session latency (TTFB) | < 800ms | LiveKit + Pipecat instrumentation |
| Qdrant hybrid search latency | < 100ms P95 | Qdrant metrics + API tracing |
| STT Word Error Rate | < 8% | Deepgram dashboard + manual audit |
| Agent response relevance | > 4.2 / 5 | User ratings + internal eval set |
| Property search click-through | > 35% | Analytics (PostHog / Mixpanel) |
| Voice session completion | > 70% | Session tracking (start vs. end) |
| Cross-session memory recall | > 85% | Automated memory retrieval tests |
| Image classification accuracy | > 88% top-1 | CLIP eval on labelled test set |

---

*Last updated by Remy (Producer) — project kickoff.*
