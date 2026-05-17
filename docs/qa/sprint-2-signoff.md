# Sprint 2 QA Sign-off

**Sprint:** 2 — Auth, Property Schema & Core APIs
**QA Engineer:** Ivy
**Date:** 2025-05-17
**Branch:** `feature/sprint-2`

---

## Overall Verdict: ❌ BLOCKED

One **blocker** issue found. Sprint 2 cannot ship until #8 is resolved.

---

## Test Summary

| Category | Passed | Failed | Blocked |
|---|---|---|---|
| Bug Fix Verification (Sprint 1) | 4 | 0 | 0 |
| Property CRUD API (S2-02) | 4 | 1 | 0 |
| Shared Types (S2-10) | 3 | 1 | 0 |
| Onboarding Flow (S2-01) | 5 | 0 | 0 |
| Auth Flows (S2-05) | 4 | 1 | 0 |
| Property Listing Page (S2-03) | 6 | 0 | 0 |
| Property Detail Page (S2-05) | 4 | 0 | 0 |
| Image Upload (S2-04) | 3 | 0 | 0 |
| LangGraph Agent (S2-06) | 5 | 0 | 0 |
| Mem0 Integration (S2-07) | 4 | 0 | 0 |
| Embedding Pipeline (S2-08, S2-09) | 6 | 0 | 0 |
| Python Syntax | 24 | 0 | 0 |
| **TOTAL** | **72** | **3** | **0** |

---

## Sprint 1 Bug Fix Verification

### ✅ Issue #2 — tRPC router registered with Fastify
- `apps/api/src/index.ts` now imports `fastifyTRPCPlugin` from `@trpc/server/adapters/fastify` (line 6)
- tRPC is registered at `/trpc` prefix with `appRouter` and `createContext` (lines 35–41)
- **Verified fixed.**

### ✅ Issue #3 — Next.js 15 async params type
- `apps/web/src/app/property/[id]/page.tsx` declares `params: Promise<{ id: string }>` (line 78)
- Uses `const { id } = use(params)` with React's `use()` hook (line 80)
- **Verified fixed.** Correct Next.js 15 pattern.

### ✅ Issue #4 — Circular CSS variable reference
- `apps/web/src/styles/globals.css` `@theme` block now uses literal hex values (lines 6–16)
- Comment on line 5 explicitly notes this: "literal values to avoid circular reference with tokens.css"
- `tokens.css` still defines the same variables in `:root` for runtime use
- **Verified fixed.**

### ✅ Issue #5 — pnpm-lock.yaml exists
- File exists at repo root: `pnpm-lock.yaml` (195KB)
- **Verified fixed.**

---

## Feature-by-Feature Verification

### S2-02: Property CRUD API ✅ (with 1 blocker issue)

- [x] Prisma schema has full attributes: title, description, price, propertyType, status, bedrooms, bathrooms, squareFeet, yearBuilt, address fields, coordinates, images, features, epcRating, tenure, councilTaxBand
- [x] 7 database indexes on key query fields (postcode, city, propertyType, status, price, ownerId, bedrooms)
- [x] tRPC endpoints: `property.create`, `property.get`, `property.list`, `property.update`, `property.delete`
- [x] Cursor-based pagination with `limit + 1` pattern
- [x] 7 filter fields: query (text search across 4 fields), minPrice, maxPrice, propertyType, minBedrooms, maxBedrooms, city, postcode, status
- [x] 4 sort fields: price, createdAt, bedrooms, squareFeet
- [x] Zod validation on all inputs with proper constraints (price min 0, bedrooms 0-20, year 1600-2030, etc.)
- [x] Soft-delete pattern (`deletedAt` field, `where: { deletedAt: null }`)
- [x] Ownership verification on update and delete
- [x] `protectedProcedure` middleware for write operations
- **❌ BLOCKER:** Auth middleware not wired to tRPC context — see Issue #8

### S2-10: Shared Types ✅ (with 1 issue)

- [x] `packages/shared` exports: Property, User, Conversation, Message, VisualPayload, AgentState, BuyerPreferences, AuthSession
- [x] All types use Zod schemas with runtime validation
- [x] PropertyCard and PropertyFilter types for frontend use
- [x] PaginatedProperty response type
- [x] TypeScript compilation passes (`tsc --noEmit` clean)
- **⚠️ Issue #7:** PropertyType enum uses `"semi-detached"` in shared but `"semi_detached"` in API/Prisma. Same for Tenure `"share-of-freehold"` vs `"share_of_freehold"`.

### S2-01: Onboarding Flow ✅

- [x] Role selection page with Buyer/Seller/Agent cards, icons, radio group a11y
- [x] Profile creation form: name, email, password (min 8 chars), phone (optional)
- [x] Client-side validation: `isValid` checks name, email, password
- [x] Buyer preference wizard: locations (Enter-to-add tags), budget range, bedrooms range, property types (toggle), features (toggle)
- [x] Animated multi-step with Framer Motion (`AnimatePresence`, `motion.div`)
- [x] Progress indicator bar
- [x] Connected to Supabase Auth via `signUp()` with role/preferences metadata
- [x] Non-buyers (seller/agent) skip preference wizard and go directly to account creation
- [x] Error display with `role="alert"`
- [x] Keyboard accessible (proper `aria-pressed`, `aria-checked`, `role="radio"/"radiogroup"`)

### S2-05: Auth Flows ✅ (with 1 minor issue)

- [x] Login page with email/password form, error display, loading state
- [x] Signup page exists (but see Issue #9)
- [x] Zustand auth store: `signUp`, `signIn`, `signOut`, `refreshSession`, `initialize`
- [x] `AuthProvider` in root layout initializes auth on mount
- [x] `onAuthStateChange` listener for session updates
- [x] Next.js middleware protects routes: `/voice`, `/chat`, `/saved`, `/agent-dashboard`, `/dashboard`
- [x] Unauthenticated users redirected to `/onboarding`
- [x] Dashboard page: role-aware cards, sign-out button, loading skeleton
- [x] Sign-out clears state and redirects
- **⚠️ Issue #9:** Signup page is a placeholder — just redirects to onboarding

### S2-03: Property Listing Page ✅

- [x] Search bar with text input and search icon
- [x] Filter toggle button with active filter count badge
- [x] Filter panel: min/max price, property type dropdown, bedrooms dropdown, location text input
- [x] Sort controls: sort field (newest/price/bedrooms) + sort order (high→low / low→high)
- [x] Reset filters button
- [x] Responsive grid: `sm:grid-cols-2 lg:grid-cols-3`
- [x] Property cards: gradient placeholder image, status badge, type badge, price, title, address, beds/baths/sqft, feature badges (max 3 + overflow count)
- [x] Empty state: "No properties found" with icon and guidance text
- [x] Loading skeleton component (`PropertyGridSkeleton`)
- [x] Client-side filtering of 6 mock properties works correctly
- [x] All inputs have `aria-label` attributes

### S2-05: Property Detail Page ✅

- [x] Breadcrumb: Home → Properties → [Title] with `aria-label="Breadcrumb"`
- [x] Photo gallery: main image (2-col span) + 4 thumbnails with gradient placeholders
- [x] Photo count badge
- [x] Full attribute display: price, title, address, beds, baths, sqft, type, year built
- [x] Description card
- [x] Features grid (2-col mobile, 3-col desktop) with check marks
- [x] Map placeholder with coordinates display
- [x] Sidebar: Book a Viewing, Ask Xara, Request Valuation buttons
- [x] Property details card: status, tenure, EPC, council tax, listing date
- [x] Save (heart) and Share buttons with aria-labels
- [x] Correctly uses `use(params)` for Next.js 15 async params

### S2-04: Image Upload ✅

- [x] Multipart upload endpoint at `POST /upload/images/:propertyId`
- [x] Auth required via `preHandler: authMiddleware`
- [x] Ownership verification before upload
- [x] File type validation: JPEG, PNG, WebP, AVIF
- [x] File size validation: 10MB max
- [x] Max 20 files per request
- [x] Error reporting per file (invalid type, too large)
- [x] Placeholder URL generation (production: Cloudflare R2)
- [x] Property images array updated after upload

### S2-06: LangGraph Agent ✅

- [x] `StateGraph(AgentState)` defined with typed dataclass (11 fields)
- [x] 5 nodes: memory_retrieval, intent_classifier, property_search, response_generator, memory_writer
- [x] Conditional routing: `route_by_intent` routes search/detail/comparison → property_search, others → response_generator
- [x] Edge flow: memory_retrieval → intent_classifier → [conditional] → response_generator → memory_writer → END
- [x] MemorySaver checkpointing configured
- [x] 11 intent types defined as `Literal` type
- [x] Keyword-based classifier with 8 intent categories and 45+ keywords
- [x] Response generator returns template AIMessages per intent
- [x] All 24 Python files pass `ast.parse()` syntax check
- [x] 10 unit tests in `tests/test_graph.py` covering state, intents, response, memory nodes

### S2-07: Mem0 Integration ✅

- [x] `Mem0Client` wrapper class with lazy initialization
- [x] Methods: `search`, `add`, `get_all`, `delete`
- [x] Graceful fallback if Mem0 not installed/configured (returns empty lists, `{"status": "skipped"}`)
- [x] Structured logging throughout
- [x] `RedisSessionCache` for short-term context (2-hour TTL)
- [x] `ProfileStore` for long-term preferences (HTTP → API)
- [x] `memory_search` tool stub wrapping Mem0 client
- [x] Module-level singletons (`mem0_client`, `session_cache`, `profile_store`)

### S2-08 / S2-09: Embedding Pipeline ✅

- [x] `synthesise_description()` generates rich text from property attributes (title, type, beds, baths, sqft, year, location, price, features, description, tenure, EPC)
- [x] `generate_embedding()` uses OpenAI `text-embedding-3-large` (3072 dimensions, async)
- [x] `upsert_property_embedding()` upserts to Qdrant with named vector `"text"`
- [x] `build_qdrant_payload()` creates flat payload dict for structured filtering (16 fields)
- [x] `embed_property()` full pipeline: synthesise → embed → upsert
- [x] `batch_embed_properties()` with configurable batch size and `asyncio.gather`
- [x] Qdrant collection setup: dense (cosine, 3072d) + sparse (BM25)
- [x] 9 payload indexes (price, bedrooms, bathrooms, propertyType, status, city, postcode, tenure, ownerId)
- [x] `generate_sparse_vector()` with simple hash-based BM25 tokenisation
- [x] `upsert_with_sparse()` for hybrid dense+sparse upsert
- [x] `on_property_write_trigger()` re-embed trigger concept (logs for future queue integration)

---

## Issues Filed

| # | Title | Severity | Status |
|---|---|---|---|
| #7 | Shared types PropertyType/Tenure enum mismatch with API/Prisma | major | Open |
| #8 | tRPC protected procedures always UNAUTHORIZED — auth middleware not wired to context | **blocker** | Open |
| #9 | Signup page has no form — just a redirect link to onboarding | minor | Open |

---

## Observations (Not Bugs)

1. **Mock data throughout** — Property grid and detail pages use hardcoded mock data. Known limitation, documented in `done.md`. Acceptable for Sprint 2.
2. **Photo gallery is placeholder** — Gradient backgrounds with emoji instead of actual images. Known limitation.
3. **BM25 uses simple hash tokenisation** — Noted as placeholder in code comments. Fine for Sprint 2.
4. **Agent responses are templates** — LLM streaming planned for Sprint 5. Appropriate for current sprint.
5. **Property filters panel uses `bg-white`** — Hardcoded white instead of `var(--background)`. Will break in dark mode.
6. **`onNext` called with step=-1 for non-buyer roles** — Safe in current code path (guarded by `onComplete`), but fragile.
7. **Nav links use `<a>` tags instead of Next.js `<Link>`** — Causes full page reloads. Minor perf issue.

---

## Sign-off

**❌ BLOCKED — Cannot ship Sprint 2.**

Issue #8 is a **blocker**: tRPC authenticated mutations (property create/update/delete) are completely non-functional because the Supabase JWT validation middleware is not wired to the tRPC request context. The `ctx.userId` will always be `undefined` for tRPC calls, making all `protectedProcedure` endpoints throw `UNAUTHORIZED`.

Issue #7 is **major**: Shared type enums don't match API output, which will cause Zod parse failures on the frontend for `semi-detached` properties and `share-of-freehold` tenure.

**Once #8 and #7 are fixed, Sprint 2 is ready to ship.** The overall code quality is high — well-structured, properly typed, good error handling, solid a11y, and comprehensive feature coverage across all 10 S2 tasks.
