# Sprint 2 — Done

**Sprint:** 2 — Auth, Property Schema & Core APIs
**Branch:** `feature/sprint-2`
**Date:** 2025-05-17

---

## Summary

Sprint 2 delivers the core data layer, authentication, property browsing experience, AI agent skeleton, and embedding pipeline foundation. All 10 S2 tasks (S2-01 through S2-10) are addressed plus 4 bug fixes from Sprint 1.

## What Was Built

### Phase 0 — Bug Fixes (4 issues)
- ✅ tRPC router wired to Fastify via `@trpc/server/adapters/fastify` (Fixes #2)
- ✅ Next.js 15 async params type in `property/[id]` route (Fixes #3)
- ✅ Circular CSS variable reference fixed in `@theme` block (Fixes #4)
- ✅ `pnpm-lock.yaml` generated and committed (Fixes #5)

### Phase 1 — Property CRUD & Shared Types (S2-02, S2-10)
- ✅ Expanded Prisma schema: yearBuilt, tenure, epcRating, councilTaxBand, country
- ✅ Full property CRUD via tRPC: create, get, list, update, soft-delete
- ✅ Pagination (cursor-based), filtering (7 fields), sorting (4 fields)
- ✅ Protected procedures with auth middleware and ownership checks
- ✅ Comprehensive `@pavelo/shared` types: Property, User, Conversation, Message, VisualPayload, AgentState, BuyerPreferences, AuthSession

### Phase 2 — Auth & Onboarding (S2-01, S2-05)
- ✅ Role selection: Buyer/Seller/Agent cards with icons
- ✅ Profile form: name, email, password, phone
- ✅ Buyer preference wizard: locations, budget, property types, bedrooms, features
- ✅ Animated multi-step onboarding with Framer Motion
- ✅ Login page with email/password via Supabase Auth
- ✅ Zustand auth store with signUp, signIn, signOut, refreshSession
- ✅ AuthProvider in root layout
- ✅ Protected dashboard with role-aware navigation

### Phase 3 — Property Pages & Image Upload (S2-03, S2-04, S2-05)
- ✅ Property listing page with search bar + filter panel
- ✅ Filters: price range, property type, bedrooms, location
- ✅ Sort: price, date, bedrooms (asc/desc)
- ✅ Responsive grid: 1 col mobile, 2 tablet, 3 desktop
- ✅ Property cards: image, price, beds, baths, sqft, features, status badges
- ✅ Empty state and loading skeleton
- ✅ Multipart image upload endpoint with validation
- ✅ Property detail: gallery, stats, features, map placeholder, sidebar

### Phase 4 — AI Agent Skeleton (S2-06, S2-07)
- ✅ LangGraph StateGraph: 5 nodes, conditional routing, MemorySaver checkpointing
- ✅ Typed AgentState with 11 fields
- ✅ Node stubs: memory_retrieval, intent_classifier, property_search, response_generator, memory_writer
- ✅ Keyword-based intent classifier (11 intent types)
- ✅ Mem0Client wrapper with lazy init, search, add, get_all, delete
- ✅ Redis session cache for short-term context
- ✅ Profile store for long-term preferences
- ✅ memory_search tool stub
- ✅ 10 unit tests in test harness

### Phase 5 — Embedding Pipeline (S2-08, S2-09)
- ✅ Text description synthesis from property attributes
- ✅ OpenAI text-embedding-3-large integration (async, 3072d)
- ✅ Qdrant upsert for property embeddings
- ✅ Batch processor with concurrent processing
- ✅ Qdrant collection setup: dense + sparse vectors
- ✅ BM25 sparse vector generation
- ✅ Payload indexes for structured filtering
- ✅ Hybrid upsert (dense + sparse)
- ✅ Re-embed trigger concept

## Files Changed

### New Files (30+)
- `apps/api/src/context.ts` — tRPC request context
- `apps/api/src/routes/upload.ts` — Image upload endpoint
- `apps/web/src/stores/auth-store.ts` — Zustand auth state
- `apps/web/src/components/auth/auth-provider.tsx`
- `apps/web/src/components/onboarding/role-selection.tsx`
- `apps/web/src/components/onboarding/profile-form.tsx`
- `apps/web/src/components/onboarding/preference-wizard.tsx`
- `apps/web/src/components/property/property-card.tsx`
- `apps/web/src/components/property/property-grid.tsx`
- `apps/web/src/components/property/property-search.tsx`
- `apps/web/src/components/property/property-filters.tsx`
- `apps/web/src/components/ui/label.tsx`
- `apps/web/src/components/ui/select.tsx`
- `apps/web/src/components/ui/textarea.tsx`
- `apps/web/src/app/auth/login/page.tsx`
- `apps/web/src/app/auth/signup/page.tsx`
- `apps/web/src/app/dashboard/page.tsx`
- `apps/web/src/app/property/page.tsx`
- `packages/shared/src/types/conversation.ts`
- `packages/shared/src/types/agent.ts`
- `services/agent/src/state.py`
- `services/agent/src/graph.py`
- `services/agent/src/nodes/*.py` (5 files)
- `services/agent/src/memory/*.py` (3 files)
- `services/agent/src/tools/memory_search.py`
- `services/agent/tests/test_graph.py`
- `services/ml/src/pipelines/property_embed.py`
- `services/ml/src/pipelines/hybrid_search.py`

### Modified Files
- `apps/api/src/index.ts` — tRPC + upload route registration
- `apps/api/src/router.ts` — Full CRUD with Prisma
- `apps/api/prisma/schema.prisma` — Expanded property model
- `apps/web/src/app/layout.tsx` — AuthProvider, updated nav
- `apps/web/src/app/onboarding/page.tsx` — Multi-step wizard
- `apps/web/src/app/property/[id]/page.tsx` — Full detail page
- `apps/web/src/middleware.ts` — Protected dashboard route
- `packages/shared/src/types/property.ts` — Expanded types
- `packages/shared/src/types/user.ts` — Expanded types
- `packages/shared/src/index.ts` — New exports
- `services/agent/pyproject.toml` — New deps
- `services/agent/src/config.py` — New settings
- `services/ml/pyproject.toml` — New deps
- `services/ml/src/config.py` — New settings

## Dependencies Added
- `zustand` — Client state management
- `framer-motion` — Animations
- `@fastify/multipart` — File upload
- `langgraph` — Agent state machine
- `langchain-core` — LLM tooling
- `langchain-openai` — OpenAI integration
- `mem0ai` — Episodic memory
- `redis` — Session cache
- `openai` — Embeddings
- `qdrant-client` — Vector search

## Design Decisions
1. **Zustand over Context** — Simpler API, built-in devtools, no provider nesting hell
2. **Mock data in grids** — Allows frontend development without backend dependency
3. **Keyword intent classifier** — Simple baseline; LLM-based classification in Sprint 5
4. **MemorySaver checkpointing** — In-memory for dev, Redis for production
5. **Lazy Mem0 init** — Doesn't crash if Mem0 isn't configured yet
6. **Simple BM25 tokenisation** — Placeholder; will use fastembed in production

## Known Limitations
- Property grid uses mock data (will connect to tRPC queries)
- Image upload stores placeholder URLs (will use Cloudflare R2 in production)
- Photo gallery is placeholder (no lightbox yet)
- Intent classifier is keyword-based (LLM in Sprint 5)
- Agent responses are templates (LLM streaming in Sprint 5)
- BM25 uses simple hash tokenisation (proper encoder in Sprint 4)

## Ready for QA ✅
