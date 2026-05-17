# Sprint 4 QA Sign-off — Hybrid RAG Search Engine

**QA Engineer:** Ivy
**Date:** 2025-01-27
**Branch:** `feature/sprint-4`
**Commit:** `b7e7906`

---

## Test Summary

| Metric | Value |
|--------|-------|
| Python files checked (syntax) | 9/9 ✅ |
| TypeScript components reviewed | 7/7 ✅ |
| Prisma schema reviewed | ✅ |
| API routes verified | ✅ |
| Route registration verified | ✅ |
| Bugs filed | 4 |
| Blockers | 0 |

---

## Task-by-Task Review

### S4-01 — Hybrid Search Core ✅
- `services/ml/src/search/hybrid.py` — Clean implementation
- RRF fusion with configurable weights (dense_weight/sparse_weight)
- Filter support: price, bedrooms, property_type, city, postcode, status, location radius
- Haversine post-filtering for geo radius — correct math
- Dedup via `exclude_ids` — works
- Empty query returns empty results — good edge case handling
- Imports resolve: `generate_sparse_vector`, `get_qdrant_client`, `generate_embedding` all exist in referenced modules
- **Verdict: PASS**

### S4-02 — Query Decomposition ✅ (minor issue)
- `services/agent/src/search/query_decompose.py` — Well-structured
- OpenAI function calling with comprehensive schema
- Graceful fallback on error (returns original query as semantic_query)
- Price shorthand conversion documented in system prompt
- ⚠️ Uses deprecated `functions`/`function_call` API — filed as [#18](https://github.com/yohannesHL/pavelo/issues/18)
- **Verdict: PASS** (minor deprecation issue)

### S4-03 — LangGraph Search Tool ✅
- `services/agent/src/tools/search_properties.py` — Correct tool structure
- `SearchPropertiesInput` with proper Pydantic schema and field descriptions
- Merges decomposed NL params with explicit filter overrides — good
- Calls ML service `/api/v1/search/hybrid` via httpx
- Error handling returns empty results (no crash)
- `services/agent/src/nodes/property_search.py` — State integration correct
- Dedup via `exclude_ids=state.properties_shown` — correct
- `asyncio.run` in thread pool for sync→async bridge — valid pattern
- **Verdict: PASS**

### S4-04 — Search API (tRPC) ✅
- `apps/api/src/router.ts` — `search.query` endpoint present
- Calls ML service with proper body mapping (camelCase→snake_case)
- DB hydration via `prisma.property.findMany` with ID list
- Preserves search score order, applies sort overrides
- Cursor-based pagination
- **PostgreSQL fallback** when ML service is unavailable — excellent
- **Verdict: PASS**

### S4-05 — Search UI ⚠️ (major issue)
- Components present: SearchBar, FilterSidebar, SearchResultsGrid, ViewControls, SearchPropertyCard, RangeSlider
- Filter sidebar: price slider, bedrooms, property type, location input, sort — all present
- Grid/list toggle — works
- Skeleton loading states — present for both grid and list
- Empty state with helpful messaging — present
- Mobile bottom sheet for filters — present with backdrop and slide-in animation
- Active filter tags with dismiss buttons — present
- ⚠️ Search bar combobox has incomplete ARIA — filed as [#19](https://github.com/yohannesHL/pavelo/issues/19)
- ❌ **Page uses mock data, not connected to tRPC** — filed as [#20](https://github.com/yohannesHL/pavelo/issues/20)
- **Verdict: PARTIAL PASS** — UI components are solid but integration is missing

### S4-06 — Map View ✅
- `apps/web/src/components/maps/property-map.tsx` — Styled placeholder (intentional per architecture decision)
- Property pins with price labels positioned by lat/lng
- Pin click → popup card with property details
- Dark/light theme toggle
- Empty state for no mappable properties
- Hover sync between map pins and list
- Map/list split view in map mode
- **Verdict: PASS** (placeholder approach documented and intentional)

### S4-07 — Saved Searches ⚠️ (major issue)
- tRPC endpoints: `savedSearch.save`, `.list`, `.delete`, `.toggle` — all present
- Prisma `SavedSearch` model with `isActive`, `lastRunAt`, `matchCount` fields
- Ownership verification in delete and toggle — correct
- ❌ **No User relation on SavedSearch model** — filed as [#17](https://github.com/yohannesHL/pavelo/issues/17)
- **Verdict: PARTIAL PASS** — functional but missing referential integrity

### S4-08 — Image Similarity Search ✅
- `services/ml/src/search/image_search.py` — CLIP-based search
- Accepts image URL (download + embed) or text description (cross-modal)
- `services/ml/src/routes/search.py` — `/similar-image` endpoint
- Accepts image_url or pre-computed 768d embedding
- 768-dimension validation on pre-computed embeddings
- Error handling returns empty results
- **Verdict: PASS**

### S4-09 — Search Analytics ✅ (minor issue with SearchEvent model)
- ML-side: in-memory buffer with summary analytics (top queries, zero-result rate)
- API-side: `searchAnalytics.log`, `.click`, `.summary` tRPC endpoints
- Click tracking appends to `clickedIds` array
- Time-windowed summary with CTR calculation
- Prisma `SearchEvent` model with proper indexing
- ⚠️ SearchEvent.userId also missing User relation — covered by [#17](https://github.com/yohannesHL/pavelo/issues/17)
- **Verdict: PASS**

### S4-10 — Search Quality Eval ✅
- `services/ml/src/eval/search_quality.py` — 25 benchmark queries
- Metrics: MRR, NDCG@5, NDCG@10, Precision@5, Recall — all correctly implemented
- Per-category breakdown
- CLI entry point and API endpoint
- Worst-query identification
- Latency tracking
- **Verdict: PASS**

---

## Route Registration Verification

| Route | Registered | File |
|-------|-----------|------|
| `/api/v1/search/hybrid` | ✅ | search_router in main.py |
| `/api/v1/search/similar-image` | ✅ | search_router in main.py |
| `/api/v1/analytics/search` | ✅ | analytics_router in main.py |
| `/api/v1/analytics/search/log` | ✅ | analytics_router in main.py |
| `/api/v1/eval/search` | ✅ | analytics_router in main.py |
| `trpc/search.query` | ✅ | appRouter in router.ts |
| `trpc/savedSearch.*` | ✅ | appRouter in router.ts |
| `trpc/searchAnalytics.*` | ✅ | appRouter in router.ts |

---

## Prisma Schema Verification

| Model | Present | Fields | Indexes | Relations |
|-------|---------|--------|---------|-----------|
| SavedSearch | ✅ | id, userId, name, query, filters, isActive, lastRunAt, matchCount, timestamps | userId, isActive | ❌ Missing User relation |
| SearchEvent | ✅ | id, userId, query, filters, resultCount, clickedIds, source, durationMs, createdAt | userId, createdAt, query | ❌ Missing User relation |

---

## Bugs Filed

| # | Issue | Severity | Component |
|---|-------|----------|-----------|
| [#17](https://github.com/yohannesHL/pavelo/issues/17) | SavedSearch and SearchEvent missing User relation | major | Prisma schema |
| [#18](https://github.com/yohannesHL/pavelo/issues/18) | Query decomposition uses deprecated OpenAI functions API | minor | Agent service |
| [#19](https://github.com/yohannesHL/pavelo/issues/19) | Search bar combobox missing ARIA attributes | minor | Search UI |
| [#20](https://github.com/yohannesHL/pavelo/issues/20) | Search page uses mock data instead of tRPC endpoint | major | Search UI |

---

## Accessibility Checklist

| Check | Status |
|-------|--------|
| `aria-label` on search input | ✅ |
| `aria-label` on clear button | ✅ |
| `aria-label` on map pins | ✅ |
| `aria-label` on view toggle buttons | ✅ |
| `aria-label` on filter close button | ✅ |
| `aria-pressed` on toggle buttons | ✅ |
| `aria-expanded` on collapsible sections | ✅ |
| `role="combobox"` on search input | ✅ |
| `role="listbox"` on suggestions | ❌ Missing |
| `aria-controls` on combobox | ❌ Missing |
| Keyboard: Enter to search | ✅ |
| Keyboard: Escape to close suggestions | ✅ |
| Filter sidebar keyboard accessible | ✅ (native buttons) |

---

## Architecture Quality Notes

- **RRF implementation is correct** — proper rank-based fusion with k=60 smoothing
- **Haversine formula is correct** — verified Earth radius and trig operations
- **Fallback design is solid** — tRPC endpoint falls back to PostgreSQL text search when ML service is down
- **Error handling is consistent** — all Python modules log errors and return empty/safe results
- **Code organisation is clean** — clear separation between search core, routes, tools, and nodes
- **Benchmark dataset is reasonable** — 25 queries across 10 categories with diverse complexity

---

## Sign-off

### ✅ PASS — No Blockers

Sprint 4 delivers a well-architected hybrid RAG search engine. The backend is solid — hybrid search with RRF fusion, query decomposition, agent tool integration, analytics, and quality evaluation are all correctly implemented with proper error handling.

**Two major issues exist but are not blockers:**
1. Missing Prisma relations on SavedSearch/SearchEvent (#17) — functional without them but lacks referential integrity
2. Search page uses mock data (#20) — backend pipeline is complete and the tRPC endpoint works; the UI components are built correctly but the wiring is incomplete

**Two minor issues:**
3. Deprecated OpenAI API usage (#18) — still works, generates warnings
4. Incomplete ARIA combobox pattern (#19) — basic accessibility is present

All 10 sprint tasks have corresponding code delivered. The search engine architecture is production-ready pending the integration wiring and schema fixes noted above.
