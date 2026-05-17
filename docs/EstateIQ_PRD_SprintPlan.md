# EstateIQ (Pavelo / Xara)

## AI-Powered Real Estate Voice & Intelligence Platform

> **PRODUCT REQUIREMENTS DOCUMENT · SPRINT PLAN · TECHNICAL ARCHITECTURE**
>
> Version 1.0 · MVP Release · May 2026
>
> *Confidential — Internal Use Only*

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement & Opportunity](#2-problem-statement--opportunity)
3. [System Architecture](#3-system-architecture)
4. [AI Agent Architecture](#4-ai-agent-architecture)
5. [Hybrid RAG Property Search Pipeline](#5-hybrid-rag-property-search-pipeline)
6. [Visual Intelligence Layer](#6-visual-intelligence-layer)
7. [UX & Design System](#7-ux--design-system)
8. [Sprint Plan — 10 Sprints · 20 Weeks](#8-sprint-plan--10-sprints--20-weeks)
9. [Risk Register](#9-risk-register)
10. [Success Metrics — MVP](#10-success-metrics--mvp)
11. [Dependencies & Third-Party Services](#11-dependencies--third-party-services)

---

## 1. Executive Summary

EstateIQ is a next-generation real estate SaaS platform where an AI agent acts as a persistent, intelligent estate agent — capable of conducting full buyer and seller conversations via voice, executing complex multi-step property searches, and surfacing rich visual intelligence across properties, neighbourhoods, and market data.

The primary innovation is **voice-first engagement**: potential buyers and sellers interact with an AI sales agent in natural spoken conversation — polyglot, always available, and contextually aware across every prior interaction. The agent orchestrates property search, market analysis, image-based property classification, and neighbourhood intelligence into a single seamless experience.

### Key Differentiators

- **Voice-first AI estate agent:** real conversational intelligence, not IVR menus
- **Persistent cross-session memory:** agent remembers preferences, history, intent (non-IID)
- **Hybrid RAG property search:** semantic + keyword querying via Qdrant over rich structured property embeddings
- **Image intelligence pipeline:** CV model extracts architectural style, era, interior attributes into queryable embeddings
- **Rich visual intelligence:** crime maps, amenity overlays, school catchments, price heatmaps, market charts rendered inline
- **Polyglot stack:** Next.js 15 frontend · Node.js API gateway · Python ML/AI services · LangGraph orchestration

---

## 2. Problem Statement & Opportunity

### The Problem

Traditional property portals (Rightmove, Zoopla, OnTheMarket) surface properties via rigid filter UIs. Buyers struggle to articulate nuanced preferences: *"a Victorian terrace with original fireplaces and a south-facing garden near a good primary school."* These portals cannot hold a conversation, remember context, or adapt to evolving buyer intent across sessions.

Estate agents provide the human layer but are limited to business hours, constrained by their portfolio, and expensive. The gap between a midnight property inspiration and a weekday morning call is where buyer intent evaporates.

### The Opportunity

- **£1.5T+** UK residential property market with digital engagement at an all-time high
- Conversational AI maturity has reached a point where voice quality rivals human agents
- Property search remains one of the most emotionally driven, context-rich consumer journeys — perfect for persistent memory
- No incumbent player has deployed a truly intelligent voice-first property assistant at scale

---

## 3. System Architecture

### 3.1 High-Level Stack

The platform is built as a polyglot microservices system coordinated through a Node.js API gateway:

| Layer | Technology | Responsibility |
|---|---|---|
| Frontend | Next.js 15 (App Router) · TypeScript · Tailwind · shadcn/ui | Chat UI, voice interface, visual renderers, auth flows |
| API Gateway | Node.js · Fastify · Zod · tRPC | Request routing, auth middleware, session management, WebSocket relay |
| AI Orchestration | Python · LangGraph · LangChain | Multi-step agent reasoning, tool dispatch, state machine for conversations |
| Voice Infrastructure | LiveKit (WebRTC) · Pipecat (pipeline) · Deepgram STT · Cartesia TTS | Real-time voice sessions, ASR/TTS pipeline, audio processing |
| Memory Layer | Mem0 · Redis (short-term) · PostgreSQL (long-term) | Per-user episodic memory, cross-session preference accumulation, fact extraction |
| Vector Search | Qdrant · OpenAI text-embedding-3-large · CLIP embeddings | Semantic property search, hybrid sparse+dense retrieval |
| ML Services | Python · FastAPI · CLIP · GPT-4V / Llama 3.2 Vision | Property image classification, attribute extraction, structured embedding generation |
| Database | PostgreSQL (Supabase) · Prisma ORM | Users, properties, conversations, agent state |
| Auth | Supabase Auth · JWT | Multi-tenant agency auth, buyer/seller roles |
| Infrastructure | Docker · Railway / Render · Cloudflare CDN · GitHub Actions | CI/CD, containerised services, edge caching |

### 3.2 Voice Infrastructure Decision: LiveKit + Pipecat

After assessment of LiveKit, Pipecat, Daily, and Agora, the recommended architecture is **LiveKit + Pipecat**:

- **LiveKit:** provides WebRTC infrastructure, scalable room management, Python/JS/React SDKs, and self-hostable SFU. Native support for AI Voice Agents via `livekit-agents` framework.
- **Pipecat:** open-source Python framework for building real-time voice pipelines. Integrates Deepgram STT → LLM → Cartesia TTS. Runs as a LiveKit participant. Highly composable.
- **Deepgram Nova-3:** sub-300ms STT latency, 130+ languages, streaming transcription with interim results for instant feedback.
- **Cartesia Sonic:** ultra-low latency TTS (<80ms TTFB), highly natural voice, multiple personas. Best-in-class for real-time estate agent persona.
- **Fallback:** ElevenLabs Turbo for premium voice scenarios.

Pipecat handles the pipeline composition: **VAD → STT → Interruption Handling → LangGraph Agent → TTS → LiveKit room output.** The agent runs as a LiveKit room participant, enabling seamless multi-party conferencing (e.g. connecting a human agent to the AI session).

---

## 4. AI Agent Architecture

### 4.1 LangGraph Multi-Step Reasoning System

The core agent is a LangGraph `StateGraph` with persistent checkpointing. Each conversation is a graph execution that can pause, resume, and branch across multiple turns and sessions.

#### Agent State Schema

The agent maintains a typed state object across the full conversation graph:

```
user_id, session_id, conversation_id
messages: List[BaseMessage] — full conversation history
memory_context: extracted facts, preferences, intent from Mem0
active_search_params: current structured property query in progress
tool_results: results from most recent tool invocations
properties_shown: list of property IDs presented to user (dedup)
pending_visuals: queue of visual components to render in UI
agent_persona: active voice persona, language setting
intent: classify(buyer | seller | valuation | general_enquiry)
```

#### LangGraph Nodes

- **memory_retrieval:** pull relevant episodic memories from Mem0 before each turn
- **intent_classifier:** classify user intent and route to appropriate subgraph
- **property_search:** invoke Qdrant hybrid search tools, score and rank results
- **market_analysis:** trigger external data tools for pricing, trends, crime, schools
- **image_analysis:** invoke Vision ML service for property photo intelligence
- **response_generator:** synthesise LLM response with context, results, visual directives
- **memory_writer:** extract and persist new facts/preferences to Mem0 after each turn
- **visual_dispatcher:** emit structured visual payloads to frontend via WebSocket

### 4.2 Memory Architecture (Mem0 + Non-IID)

EstateIQ implements a three-tier memory system to ensure **non-IID** (non-independent and identically distributed) memory — meaning every conversation is influenced by all prior interactions:

| Tier | Storage | Details |
|---|---|---|
| **Tier 1** — In-context window | Redis (24hr TTL) | Current conversation messages, tool results, retrieved memories |
| **Tier 2** — Episodic memory (Mem0) | Qdrant (embeddings + metadata) | Facts extracted per conversation. E.g. "prefers Victorian properties", "budget £650k-£800k", "needs 3 beds", "dislikes open-plan kitchens" |
| **Tier 3** — Long-term user profile | PostgreSQL | Accumulated preference vectors, interaction statistics, sentiment trends, property view history, search patterns. Updated after every session |

The memory retrieval node runs a semantic search over the user's episodic memories before every agent turn, injecting the top-k most relevant memories as context. This enables the agent to reference preferences stated weeks earlier without them being in the current conversation window.

### 4.3 Tool Catalogue

| Tool Name | Type | Description |
|---|---|---|
| `search_properties` | RAG · Qdrant | Hybrid dense+sparse search over property index. Accepts natural language + structured filters. |
| `get_property_details` | DB Lookup | Full property record, image gallery, agent contact. |
| `analyse_property_images` | ML Service | Invoke CV pipeline on property photos. Returns attributes JSON. |
| `get_area_stats` | External API | Population, demographics, deprivation index for postcode. |
| `get_crime_data` | Police API | Crime heatmap data for lat/lng radius. |
| `get_school_ratings` | Ofsted API | Schools within catchment, Ofsted ratings, distance. |
| `get_transport_links` | TfL / Rail API | Nearby stations, journey times to specified locations. |
| `get_price_history` | Land Registry | Historical sold prices for property/street/area. |
| `get_price_heatmap` | Internal | Price per sqft tile data for map overlay rendering. |
| `get_amenities` | Google Places | Restaurants, gyms, supermarkets, parks within radius. |
| `book_viewing` | CRM Integration | Schedule a property viewing. Triggers confirmation email/SMS. |
| `request_valuation` | CRM Integration | Submit seller valuation request with property details. |
| `get_mortgage_estimate` | Financial API | Indicative monthly cost for property at given LTV/rate. |
| `compare_properties` | Internal | Side-by-side structured comparison of 2-4 properties. |
| `memory_search` | Mem0 | Retrieve relevant user memories for current query. |
| `web_search` | Tavily | Real-time web search for news, planning permissions, developments. |

---

## 5. Hybrid RAG Property Search Pipeline

### 5.1 Property Indexing

Each property is represented in Qdrant as a rich embedding combining structured and unstructured attributes:

#### Dense Vector (OpenAI text-embedding-3-large, 3072-dim)

Generated from a structured natural-language description synthesised from all property attributes:

> *"A late-Victorian end-of-terrace house with original sash windows, decorative cornicing, and a cast-iron fireplace in the principal reception. The interior features engineered oak flooring throughout, a bespoke shaker kitchen with Calacatta marble worktops, and a secluded south-facing rear garden in Islington, N1."*

#### Sparse Vector (BM25 via Qdrant built-in)

Keyword index over structured fields: postcode, town, property type, number of bedrooms, listing status, price band, key feature tags.

#### Image Embedding (CLIP ViT-L/14)

Per-image CLIP embedding averaged across all property photos. Enables visual similarity search: *"find properties that look like this image."*

### 5.2 Image Intelligence Pipeline

A FastAPI ML service processes every property image through a multi-stage classification pipeline:

1. **Stage 1 — Scene classification:** exterior / interior / garden / floor-plan / aerial
2. **Stage 2 — Architectural style detection:** Victorian / Edwardian / Art Deco / Mid-Century / Contemporary / New Build / Georgian / Brutalist
3. **Stage 3 — Era estimation:** pre-1900 / 1900-1939 / 1945-1979 / 1980-1999 / 2000-2015 / post-2015
4. **Stage 4 — Interior attribute extraction** (via GPT-4V / Llama 3.2 Vision): flooring type, kitchen style, ceiling height, natural light level, period features, renovation quality
5. **Stage 5 — Condition scoring:** 1-10 scale across kitchen, bathroom, decor, garden, exterior
6. **Stage 6 — Feature tagging:** open-plan, en-suite, original features, bi-fold doors, underfloor heating, smart home, etc.

Output is a structured JSON payload stored in the property record and used to generate the natural-language embedding description. This enables queries like *"Victorian conversion with high ceilings and period features"* to retrieve semantically relevant results even when those exact words are not in the listing description.

---

## 6. Visual Intelligence Layer

When the agent answers a query requiring spatial or statistical insight, it emits a **visual directive** over the WebSocket channel. The Next.js frontend renders the appropriate component inline in the chat. Below is the full catalogue of visual components:

| Visual Component | Trigger | Data Source | Tech |
|---|---|---|---|
| Property Card Carousel | Property search results | Property DB + images | React · Embla Carousel |
| Interactive Map with Pins | Area / location query | Mapbox GL JS · Property coords | Mapbox · Deck.gl |
| Price Heatmap Overlay | Price per area query | Land Registry · Internal | Deck.gl HeatmapLayer |
| Crime Statistics Map | Safety / crime query | Police UK API | Mapbox choropleth |
| School Catchment Map | Schools query | Ofsted · OS Data Hub | Mapbox polygon layers |
| Transport Isochrone | Commute / transport query | TravelTime API · TfL | Mapbox fill-extrusion |
| Area Amenities Map | Lifestyle / amenities query | Google Places API | Mapbox clusters + popups |
| Price History Chart | Value / investment query | Land Registry | Recharts AreaChart |
| Sold Price Comparables | Valuation query | Land Registry | Recharts scatter + table |
| Market Trend Dashboard | Market overview query | Nationwide / Halifax indices | Recharts multi-series |
| Property Comparison Table | Compare properties | Property DB | Custom grid component |
| Floor Plan Viewer | Floor plan request | PDF/image render | React PDF + pan/zoom |
| Mortgage Calculator Widget | Finance / affordability | Internal calculation | React interactive widget |
| Neighbourhood Score Radar | Area quality query | Aggregated indices | Recharts RadarChart |
| Demographics Breakdown | Area demographics query | ONS Census 2021 | Recharts PieChart + bars |
| Flood Risk Map | Risk assessment query | Environment Agency | Mapbox raster overlay |
| Planning Applications | Development potential | PlanningAlert / LPA APIs | Mapbox point layer |
| Property Image Gallery | Photo exploration | S3 · Cloudflare Images | Lightbox · GSAP transitions |
| Investment ROI Calculator | Buy-to-let query | Internal + rental data | Interactive widget |
| Walkability Score Card | Lifestyle / walking query | Walk Score API | Animated score card |

---

## 7. UX & Design System

### 7.1 Design Principles

- **Calm intelligence:** the interface feels like consulting a knowledgeable friend, not a search engine
- **Voice-first, chat-capable:** both modalities are first-class; the experience degrades gracefully
- **Progressive disclosure:** show properties first, depth on demand
- **Spatial awareness:** map is never more than one tap away from any property result
- **Trust signals:** every AI insight shows its data source; transparency builds confidence

### 7.2 Core Screens

1. **Onboarding / role selection:** buyer vs seller journey diverge at this point
2. **Home / dashboard:** recent conversation, saved properties, market snapshot widget
3. **Voice session view:** animated voice waveform, live transcription, inline visual renders
4. **Chat interface:** markdown-capable message stream, visual embeds, property cards
5. **Property detail:** full-bleed images, AI-generated summary, attributes, map, comparables
6. **Saved properties:** board view with comparison mode, notes, share
7. **Market intelligence hub:** standalone analytical views per area
8. **Agent dashboard (B2B):** conversation summaries, lead capture, CRM sync

### 7.3 Design Tokens

| Token | Value |
|---|---|
| Typography | Inter (UI) · Playfair Display (property headings) · JetBrains Mono (data values) |
| Primary | `#1B3A6B` (deep navy) |
| Accent | `#2E86AB` (steel blue) |
| Gold | `#F4A261` |
| Radius | 12px cards · 8px inputs · 4px badges |
| Motion | Framer Motion · 200ms ease-out for UI · 600ms for map transitions |
| Maps | Custom dark/light Mapbox style matching brand palette |

---

## 8. Sprint Plan — 10 Sprints · 20 Weeks

Each sprint is **2 weeks**. Tasks are split by Sub-Agent for parallel execution. Points = story points (1 point ≈ half day). Total: ~10 sub-agents can work concurrently across the five specialist domains below.

| Sub-Agent | Domain | Colour |
|---|---|---|
| SA-1 | Frontend / Next.js / UI | 🔵 Blue |
| SA-2 | Node API Gateway / tRPC / Auth | 🟢 Green |
| SA-3 | Python AI / LangGraph / Agent | 🟡 Gold |
| SA-4 | Python ML / Image Pipeline / Qdrant | 🔴 Red |
| SA-5 | Voice Infrastructure / LiveKit / Pipecat | 🟣 Purple |

---

### Sprint 1 — Infrastructure Foundations (Weeks 1–2)

| ID | Task Description | Agent/Owner | Layer | Points | Dependencies |
|---|---|---|---|---|---|
| S1-01 | Monorepo setup: Turborepo + pnpm workspaces (`apps/web`, `apps/api`, `services/agent`, `services/ml`, `packages/shared`) | SA-2 | Infra | 3 | — |
| S1-02 | Next.js 15 app scaffolding: App Router, TypeScript strict, Tailwind 4, shadcn/ui init, Storybook | SA-1 | Frontend | 3 | S1-01 |
| S1-03 | Fastify API gateway: Zod validation, tRPC router, CORS, helmet, rate limiting, health check | SA-2 | API | 3 | S1-01 |
| S1-04 | Supabase project setup: PostgreSQL schema (users, properties, conversations, messages, memories), Prisma ORM, migrations | SA-2 | DB | 4 | S1-01 |
| S1-05 | Supabase Auth integration: Next.js middleware, JWT validation in API, buyer/seller/agent roles, protected routes | SA-1 | Auth | 3 | S1-02, S1-03 |
| S1-06 | Python FastAPI skeleton for agent service: Docker, poetry, async, Pydantic models, OpenTelemetry tracing | SA-3 | AI | 2 | S1-01 |
| S1-07 | Python FastAPI skeleton for ML service: Docker, GPU support flags, shared model loader, health endpoint | SA-4 | ML | 2 | S1-01 |
| S1-08 | Qdrant cloud setup: collections (properties, memories), schema, API key management, Python client wrapper | SA-4 | Vector DB | 2 | S1-01 |
| S1-09 | GitHub Actions CI/CD: lint, typecheck, unit tests, Docker build, deploy to Railway (staging) | SA-2 | Infra | 3 | S1-01 |
| S1-10 | Design system: Figma token export, CSS variables, color palette, typography scale, component spec | SA-1 | Design | 3 | — |

---

### Sprint 2 — Auth, Property Schema & Core APIs (Weeks 3–4)

| ID | Task Description | Agent/Owner | Layer | Points | Dependencies |
|---|---|---|---|---|---|
| S2-01 | Onboarding flow: role selection (buyer/seller/agent), profile creation, preference capture wizard | SA-1 | Frontend | 5 | S1-05 |
| S2-02 | Property CRUD API: create, update, list, get, soft-delete. Prisma schema with full property attributes, images, documents | SA-2 | API | 4 | S1-03, S1-04 |
| S2-03 | Property listing page: search UI with text input, basic filters, results grid with property cards | SA-1 | Frontend | 5 | S2-02 |
| S2-04 | Image upload pipeline: multipart upload → Cloudflare Images → extract URLs → store in DB → trigger ML classification job | SA-2 | API | 4 | S2-02 |
| S2-05 | Property detail page: photo gallery, attribute display, map pin, agent contact, breadcrumb navigation | SA-1 | Frontend | 5 | S2-02 |
| S2-06 | LangGraph agent skeleton: StateGraph definition, typed state schema, node stubs, checkpointing to Redis, test harness | SA-3 | AI | 5 | S1-06 |
| S2-07 | Mem0 integration: initialise client, memory_search tool, memory_writer node, user memory namespace setup | SA-3 | AI | 4 | S2-06 |
| S2-08 | Property embedding pipeline: text-embedding-3-large on synthesised description, upsert to Qdrant, batch processor | SA-4 | ML | 4 | S1-08, S2-02 |
| S2-09 | BM25 sparse index setup in Qdrant: tokeniser config, field mapping, update trigger on property write | SA-4 | ML | 3 | S2-08 |
| S2-10 | Shared TypeScript types package: property, user, conversation, message, visual payload — used by frontend and API | SA-2 | Infra | 2 | S1-01 |

---

### Sprint 3 — Image Intelligence ML Pipeline (Weeks 5–6)

| ID | Task Description | Agent/Owner | Layer | Points | Dependencies |
|---|---|---|---|---|---|
| S3-01 | CLIP ViT-L/14 model loader: quantised weights, batch inference endpoint, image preprocessing pipeline | SA-4 | ML | 4 | S1-07 |
| S3-02 | Scene classifier: exterior/interior/garden/floor-plan classifier fine-tuned on property image dataset | SA-4 | ML | 5 | S3-01 |
| S3-03 | Architectural style classifier: 10-class model (Victorian, Edwardian, Art Deco, etc.) with confidence scores | SA-4 | ML | 5 | S3-01 |
| S3-04 | GPT-4V / Llama 3.2 Vision integration: interior attribute extraction prompt, structured JSON output, retry logic | SA-4 | ML | 4 | S3-01 |
| S3-05 | Era estimation + condition scoring: regression heads on CLIP features, training data labelling pipeline | SA-4 | ML | 5 | S3-01 |
| S3-06 | Feature tagging aggregation: merge all classifier outputs into PropertyAttributes JSON, store in DB | SA-4 | ML | 3 | S3-02, S3-03, S3-04, S3-05 |
| S3-07 | Embedding regeneration: trigger re-embed when image analysis completes, update Qdrant payload | SA-4 | ML | 2 | S3-06, S2-08 |
| S3-08 | Admin ML dashboard: job queue visualiser, classification results viewer, manual override UI | SA-1 | Frontend | 4 | S3-06 |
| S3-09 | ML service async job queue: Celery + Redis broker, retry policies, dead letter queue, monitoring | SA-4 | Infra | 4 | S1-07 |
| S3-10 | Bulk import tool: CSV/API property ingestion, image download, classification trigger, progress tracking | SA-2 | API | 3 | S3-09 |

---

### Sprint 4 — Hybrid RAG Search Engine (Weeks 7–8)

| ID | Task Description | Agent/Owner | Layer | Points | Dependencies |
|---|---|---|---|---|---|
| S4-01 | Qdrant hybrid search implementation: dense + sparse fusion with RRF scoring, filter post-processing | SA-4 | Vector DB | 5 | S2-08, S2-09 |
| S4-02 | Natural language to search params: LLM-powered query decomposition (price, beds, area, style, era, features) | SA-3 | AI | 5 | S2-06, S4-01 |
| S4-03 | `search_properties` LangGraph tool: structured input schema, Qdrant call, result ranking, dedup against shown list | SA-3 | AI | 4 | S4-01, S4-02 |
| S4-04 | Search API endpoint: `POST /search`, query param extraction, Qdrant call, hydrate from DB, return ranked list | SA-2 | API | 3 | S4-01 |
| S4-05 | Search results UI: property card grid, sort controls, infinite scroll, map toggle view, filter sidebar | SA-1 | Frontend | 6 | S2-03, S4-04 |
| S4-06 | Mapbox integration: property pins, clustering, click-to-card, bounding box search, mobile gestures | SA-1 | Frontend | 5 | S4-05 |
| S4-07 | Saved searches + alerts: save search params, background recheck, email/push notification on new match | SA-2 | API | 4 | S4-04 |
| S4-08 | Image similarity search: CLIP embedding query endpoint, "find similar to this image" capability | SA-4 | ML | 3 | S3-01, S4-01 |
| S4-09 | Search analytics: query log, click-through tracking, zero-results analysis, embedding drift monitoring | SA-2 | Infra | 3 | S4-04 |
| S4-10 | Search quality eval: retrieval benchmark dataset, MRR/NDCG metrics, CI regression test | SA-4 | ML | 4 | S4-01 |

---

### Sprint 5 — Chat Interface & Text Agent (Weeks 9–10)

| ID | Task Description | Agent/Owner | Layer | Points | Dependencies |
|---|---|---|---|---|---|
| S5-01 | Chat UI component: message stream, markdown render, typing indicator, input toolbar, keyboard shortcuts | SA-1 | Frontend | 5 | S1-02 |
| S5-02 | WebSocket infrastructure: Fastify ws plugin, authenticated connections, room-based message routing, heartbeat | SA-2 | API | 4 | S1-03 |
| S5-03 | Conversation persistence: save messages to DB, load conversation history, pagination, thread management | SA-2 | API | 3 | S5-02, S1-04 |
| S5-04 | LangGraph agent full integration: intent classifier, memory retrieval, tool execution loop, response streaming | SA-3 | AI | 6 | S2-06, S2-07, S4-03 |
| S5-05 | Agent tool: `get_property_details`, `compare_properties`, `get_mortgage_estimate` — implement and wire to graph | SA-3 | AI | 4 | S5-04 |
| S5-06 | Streaming response relay: Python agent SSE → Node WebSocket → Next.js EventSource, token streaming UI | SA-2 | API | 4 | S5-02, S5-04 |
| S5-07 | Visual payload protocol: define JSON schema for visual directives, dispatch from agent, render router in UI | SA-1 | Frontend | 4 | S5-01, S5-06 |
| S5-08 | Property card visual: inline property card in chat with image, price, key stats, "view full details" CTA | SA-1 | Frontend | 3 | S5-07 |
| S5-09 | Conversation list / history view: sidebar with recent conversations, search, delete, resume session | SA-1 | Frontend | 3 | S5-03 |
| S5-10 | Agent persona system: configurable tone, formality, persona name — groundwork for multi-agency white-label | SA-3 | AI | 3 | S5-04 |

---

### Sprint 6 — Voice Infrastructure (Weeks 11–12)

| ID | Task Description | Agent/Owner | Layer | Points | Dependencies |
|---|---|---|---|---|---|
| S6-01 | LiveKit server setup: self-hosted via Docker on Railway, room management API, token generation service | SA-5 | Voice | 4 | S1-09 |
| S6-02 | LiveKit React SDK integration: `useRoom` hook, audio track management, connection state UI, error handling | SA-1 | Frontend | 4 | S6-01 |
| S6-03 | Pipecat pipeline: Deepgram STT → LangGraph agent → Cartesia TTS, LiveKit transport, async pipeline | SA-5 | Voice | 6 | S6-01, S5-04 |
| S6-04 | VAD (Voice Activity Detection): Silero VAD integration in Pipecat, threshold tuning, barge-in / interruption handling | SA-5 | Voice | 4 | S6-03 |
| S6-05 | Voice session UI: animated waveform visualiser, live transcription overlay, mute/end controls, status indicators | SA-1 | Frontend | 5 | S6-02 |
| S6-06 | Voice-to-chat transcript: save voice transcripts as conversation messages, sync with chat history | SA-5 | Voice | 3 | S6-03, S5-03 |
| S6-07 | Voice session management: initiate/terminate API, session token, user queue, concurrent session limits | SA-2 | API | 3 | S6-01 |
| S6-08 | Multi-language support: Deepgram language detection, Cartesia multilingual TTS, UI locale switching | SA-5 | Voice | 4 | S6-03 |
| S6-09 | Voice persona: estate agent persona prompt engineering, speaking style, pacing, affirmations, handover phrases | SA-3 | AI | 3 | S5-04, S6-03 |
| S6-10 | Voice quality monitoring: TTFB metrics, WER tracking, session recording (with consent), replay tool | SA-5 | Infra | 3 | S6-03 |

---

### Sprint 7 — Visual Intelligence Components (Weeks 13–14)

| ID | Task Description | Agent/Owner | Layer | Points | Dependencies |
|---|---|---|---|---|---|
| S7-01 | Crime map visual: Police UK API integration, choropleth tile layer, category filter, time range selector | SA-1 | Frontend | 5 | S5-07 |
| S7-02 | Price heatmap: Land Registry tile aggregation, Deck.gl HeatmapLayer, price/sqft colour scale, legend | SA-1 | Frontend | 5 | S5-07 |
| S7-03 | Area statistics dashboard: demographics radar, deprivation index, population density, ONS data integration | SA-1 | Frontend | 5 | S5-07 |
| S7-04 | School catchment map: Ofsted API, polygon catchment areas, rating colour coding, click-to-detail | SA-1 | Frontend | 4 | S5-07 |
| S7-05 | Transport isochrone: TravelTime API, 15/30/45min travel time polygons, mode selector (tube/bus/car) | SA-1 | Frontend | 4 | S5-07 |
| S7-06 | Amenities map: Google Places integration, category clusters, POI popups, radius selector | SA-1 | Frontend | 4 | S5-07 |
| S7-07 | Price history chart: Land Registry sold prices, Recharts AreaChart, street/area/national comparison toggle | SA-1 | Frontend | 3 | S5-07 |
| S7-08 | Market trend dashboard: Nationwide/Halifax indices, multi-series chart, YoY change indicators, forecast band | SA-1 | Frontend | 4 | S5-07 |
| S7-09 | External data API wrappers: Node service for Police, Ofsted, Land Registry, ONS, TravelTime, Google Places | SA-2 | API | 5 | S1-03 |
| S7-10 | Agent visual trigger tools: implement `get_area_stats`, `get_crime_data`, `get_school_ratings`, `get_transport_links` in LangGraph | SA-3 | AI | 4 | S7-09, S5-04 |

---

### Sprint 8 — Memory, Valuation & Seller Flow (Weeks 15–16)

| ID | Task Description | Agent/Owner | Layer | Points | Dependencies |
|---|---|---|---|---|---|
| S8-01 | Cross-session memory consolidation: nightly batch job extracts facts from all conversations, updates user profile vector | SA-3 | AI | 5 | S2-07 |
| S8-02 | Memory visualisation: "What I know about you" profile card in UI, preference editor, memory delete/correct | SA-1 | Frontend | 4 | S8-01 |
| S8-03 | Seller onboarding flow: property submission wizard, address lookup, photo upload, description generation via AI | SA-1 | Frontend | 5 | S2-02 |
| S8-04 | AI valuation agent: comparable search, price per sqft analysis, Zoopla/Rightmove scraper, valuation report generation | SA-3 | AI | 6 | S5-04, S4-03 |
| S8-05 | Valuation report visual: PDF-style report rendered in-browser, comparable properties map, confidence interval chart | SA-1 | Frontend | 5 | S8-04 |
| S8-06 | Viewing booking tool: calendar availability API, confirmation email/SMS (Resend), CRM webhook | SA-2 | API | 4 | S5-04 |
| S8-07 | Mortgage calculator widget: interactive LTV/rate sliders, monthly cost, stamp duty calculator, affordability check | SA-1 | Frontend | 3 | S5-07 |
| S8-08 | Property comparison table visual: side-by-side spec table, score cards, highlight differences | SA-1 | Frontend | 3 | S5-07 |
| S8-09 | Saved properties board: drag-to-shortlist, notes, tags, share with partner link, comparison mode toggle | SA-1 | Frontend | 4 | S2-05 |
| S8-10 | Push notification service: Web Push API, notification preferences, property alerts, viewing reminders | SA-2 | API | 3 | S4-07 |

---

### Sprint 9 — Agent Dashboard, B2B & Integrations (Weeks 17–18)

| ID | Task Description | Agent/Owner | Layer | Points | Dependencies |
|---|---|---|---|---|---|
| S9-01 | Agency admin dashboard: portfolio management, AI conversation overview, lead pipeline, team management | SA-1 | Frontend | 6 | S5-04 |
| S9-02 | Conversation analytics: message count, intent distribution, property interest heatmap, session duration | SA-1 | Frontend | 4 | S5-03 |
| S9-03 | Human agent handover: escalation trigger in agent graph, warm transfer via LiveKit, context packet to human | SA-5 | Voice | 5 | S6-03, S5-04 |
| S9-04 | CRM webhooks: outbound webhooks for lead capture, viewing bookings, valuation requests. Zapier/Make compatible | SA-2 | API | 3 | S8-06 |
| S9-05 | White-label configuration: agency branding (logo, colours, persona name), subdomain routing, custom TTS voice | SA-2 | API | 4 | S5-10 |
| S9-06 | Multi-agency tenancy: row-level security in Supabase, agency-scoped property index in Qdrant, billing isolation | SA-2 | Infra | 5 | S1-04 |
| S9-07 | Stripe billing integration: subscription plans (Starter/Growth/Enterprise), usage metering for voice minutes, invoicing | SA-2 | API | 4 | S9-06 |
| S9-08 | Feedback loop: thumbs up/down on agent responses, incorrect memory correction, training data collection pipeline | SA-3 | AI | 3 | S5-04 |
| S9-09 | Planning applications visual + tool: LPA API / PlanningAlert, map pins, application status, neighbour impact | SA-1 | Frontend | 3 | S7-09 |
| S9-10 | Flood & environmental risk: Environment Agency API, raster overlay, risk category badge on property card | SA-1 | Frontend | 3 | S7-09 |

---

### Sprint 10 — Hardening, Performance & Launch Prep (Weeks 19–20)

| ID | Task Description | Agent/Owner | Layer | Points | Dependencies |
|---|---|---|---|---|---|
| S10-01 | E2E test suite: Playwright tests for auth, search, chat, voice session initiation, visual renders | SA-2 | QA | 5 | All |
| S10-02 | Load testing: k6 scripts for API, WebSocket, Qdrant query latency under 500 concurrent users | SA-2 | Infra | 3 | All |
| S10-03 | Voice latency optimisation: pipeline profiling, parallel tool execution, streaming TTS onset, warm model pool | SA-5 | Voice | 5 | S6-03 |
| S10-04 | Qdrant query optimisation: HNSW param tuning, payload index, quantisation, query latency P95 < 100ms | SA-4 | ML | 4 | S4-01 |
| S10-05 | Security audit: OWASP top 10, SQL injection, WebSocket auth, API key rotation, GDPR data deletion | SA-2 | Security | 4 | All |
| S10-06 | WCAG 2.1 AA accessibility: keyboard navigation, screen reader, focus management, voice-only mode | SA-1 | Frontend | 4 | All |
| S10-07 | Mobile optimisation: responsive breakpoints, touch gestures on maps, voice UX on iOS/Android PWA | SA-1 | Frontend | 4 | All |
| S10-08 | Observability stack: OpenTelemetry traces, Grafana dashboards (API latency, agent token usage, voice TTFB) | SA-2 | Infra | 3 | All |
| S10-09 | Documentation: API docs (Scalar), agent architecture README, env variable guide, deployment runbook | SA-2 | Docs | 3 | All |
| S10-10 | Production deployment: multi-region Railway/Render, Cloudflare CDN config, DNS, SSL, staging → prod promotion | SA-2 | Infra | 3 | S10-01, S10-05 |

---

## 9. Risk Register

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| Voice latency exceeds 2s TTFB | High | Medium | Pre-warm Pipecat pipeline; stream TTS onset; geographically co-locate STT/TTS services with LiveKit SFU |
| GDPR / voice recording compliance | High | High | Explicit consent flow; no persistent audio storage (transcripts only); data deletion API; Mem0 memory purge endpoint |
| Property image data quality | Medium | High | Multi-stage classification with confidence thresholds; manual review queue for low-confidence; graceful fallback to text-only embed |
| Qdrant cold query latency | Medium | Medium | HNSW warm-up on startup; query result caching (Redis, 5min TTL); pre-compute popular search vectors |
| LLM hallucination in property details | High | Medium | Ground all property facts in DB; agent instructed to cite sources; structured output for property attributes |
| LiveKit scaling costs | Medium | Low | Per-minute billing; voice session caps per plan tier; timeout inactive sessions after 5min |
| External API rate limits (Police, Ofsted) | Low | High | Cache all external data with long TTL (24-72hrs); background refresh; graceful degradation with stale data notice |
| Multi-tenancy data leakage | High | Low | Row-level security enforced at DB + Qdrant collection level; E2E tenancy test suite; penetration test pre-launch |

---

## 10. Success Metrics — MVP

| Metric | Target | Measurement |
|---|---|---|
| Voice session latency (TTFB) | < 800ms | OpenTelemetry trace P95 |
| Qdrant hybrid search latency | < 100ms P95 | Query span in traces |
| STT Word Error Rate (English) | < 8% | Deepgram analytics dashboard |
| Agent response relevance | > 4.2 / 5 (user rating) | In-chat thumbs + rating widget |
| Property search click-through rate | > 35% | Analytics event: `result_click / search_executed` |
| Voice session completion rate | > 70% | Sessions with ≥ 2 agent turns / initiated sessions |
| Cross-session memory recall accuracy | > 85% | Synthetic eval: inject memory, test retrieval |
| Image classification accuracy (style) | > 88% top-1 | Held-out labelled test set |
| Time to first property shown (voice) | < 30 seconds | Session trace: `turn_1 → property_shown` event |
| Viewing booking conversion (chat) | > 8% of active users | CRM booking count / MAU |

---

## 11. Dependencies & Third-Party Services

| Service | Purpose | Tier / Cost Model |
|---|---|---|
| OpenAI (GPT-4o + text-embedding-3-large) | LLM reasoning + property embeddings | Pay-per-token |
| Deepgram Nova-3 | Speech-to-text, real-time streaming | Pay-per-minute |
| Cartesia Sonic | Text-to-speech, ultra-low latency | Pay-per-character |
| LiveKit Cloud (or self-hosted) | WebRTC voice infrastructure | Per-minute or self-hosted |
| Qdrant Cloud | Vector database | Per-cluster + storage |
| Mem0 Cloud | Episodic memory layer | Per-memory operation |
| Supabase | PostgreSQL + Auth + Storage | Per-project tier |
| Mapbox | Interactive maps, tile layers | Per-tile-load + API calls |
| Cloudflare Images | Image CDN, resizing, optimisation | Per-image stored + served |
| TravelTime API | Isochrone / commute time polygons | Per-request |
| Stripe | Billing, subscriptions, metering | 2.9% + 30p per transaction |
| Resend | Transactional email | Per-email |
| Railway / Render | Container hosting, managed infra | Per-service compute |
