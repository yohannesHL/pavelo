# Sprint 4 — Hybrid RAG Search Engine — Done

## Summary

Sprint 4 delivers the full hybrid RAG search engine for Pavelo. The system combines dense semantic search (OpenAI text-embedding-3-large) with sparse keyword search (BM25) using Reciprocal Rank Fusion to produce high-quality, ranked property search results. The search engine is accessible via the LangGraph agent, the API gateway, and a fully revamped search UI with map integration.

## Delivered (10/10 tasks)

### Phase 1 — Qdrant Hybrid Search Core
| Task | Description | Files |
|------|-------------|-------|
| S4-01 | Qdrant hybrid search: dense + sparse fusion, RRF scoring, filter post-processing | `services/ml/src/search/hybrid.py`, `services/ml/src/routes/search.py` |
| S4-02 | NL query decomposition: LLM-powered structured param extraction | `services/agent/src/search/query_decompose.py` |

### Phase 2 — Agent Search Tool & API
| Task | Description | Files |
|------|-------------|-------|
| S4-03 | search_properties LangGraph tool with Qdrant integration | `services/agent/src/tools/search_properties.py`, `services/agent/src/nodes/property_search.py` |
| S4-04 | Search API: tRPC search.query endpoint with hydration | `apps/api/src/router.ts` |

### Phase 3 — Search UI & Map
| Task | Description | Files |
|------|-------------|-------|
| S4-05 | Revamped search UI: NL search bar, filter sidebar, grid/list views | `apps/web/src/components/search/*`, `apps/web/src/app/property/page.tsx` |
| S4-06 | Map view: property pins, popups, dark/light toggle, split view | `apps/web/src/components/maps/property-map.tsx` |

### Phase 4 — Advanced Features
| Task | Description | Files |
|------|-------------|-------|
| S4-07 | Saved searches + alerts: CRUD endpoints, Prisma model | `apps/api/src/router.ts`, `apps/api/prisma/schema.prisma` |
| S4-08 | Image similarity search: CLIP embedding search | `services/ml/src/search/image_search.py`, `services/ml/src/routes/search.py` |
| S4-09 | Search analytics: query logging, CTR, zero-results | `apps/api/src/router.ts`, `services/ml/src/search/analytics.py`, `services/ml/src/routes/analytics.py` |
| S4-10 | Search quality eval: 25 benchmark queries, MRR/NDCG metrics | `services/ml/src/eval/search_quality.py` |

## Architecture Decisions

1. **RRF over weighted sum**: Chose Reciprocal Rank Fusion (k=60) to combine dense and sparse results because it's rank-based (not score-based), making it safe to combine heterogeneous scoring systems.

2. **Configurable weights**: Dense/sparse weights default to 0.6/0.4 but are configurable per request, allowing tuning based on query type (semantic vs keyword-heavy).

3. **Haversine post-filtering**: Location radius filtering uses Haversine distance in Python rather than Qdrant geo-queries, since our lat/lng are stored as regular payload fields. Works fine for our scale.

4. **DB fallback**: The tRPC search endpoint falls back to PostgreSQL text search if the ML service is unavailable, ensuring the search page always works.

5. **Map placeholder**: Built a styled map placeholder with coordinate-based pin positioning rather than integrating Mapbox GL JS directly. This avoids adding a heavy dependency before the token is configured. The component is architected to swap in Mapbox with minimal changes.

6. **Mobile bottom sheet**: Filter sidebar collapses to a bottom sheet on mobile via CSS + conditional rendering, no additional library needed.

## API Endpoints Added

| Endpoint | Method | Service | Description |
|----------|--------|---------|-------------|
| `/api/v1/search/hybrid` | POST | ML | Dense + sparse hybrid search |
| `/api/v1/search/similar-image` | POST | ML | CLIP image similarity search |
| `/api/v1/analytics/search` | GET | ML | Search analytics summary |
| `/api/v1/analytics/search/log` | POST | ML | Log search event |
| `/api/v1/eval/search` | POST | ML | Run search quality benchmark |
| `/trpc/search.query` | tRPC | API | Hybrid search with DB hydration |
| `/trpc/savedSearch.save` | tRPC | API | Save a search |
| `/trpc/savedSearch.list` | tRPC | API | List saved searches |
| `/trpc/savedSearch.delete` | tRPC | API | Delete saved search |
| `/trpc/savedSearch.toggle` | tRPC | API | Toggle saved search active |
| `/trpc/searchAnalytics.log` | tRPC | API | Log search event |
| `/trpc/searchAnalytics.click` | tRPC | API | Record click-through |
| `/trpc/searchAnalytics.summary` | tRPC | API | Analytics dashboard data |

## New Components

| Component | Path | Description |
|-----------|------|-------------|
| SearchBar | `components/search/search-bar.tsx` | NL search with autocomplete |
| FilterSidebar | `components/search/filter-sidebar.tsx` | Collapsible filter panel |
| SearchPropertyCard | `components/search/search-property-card.tsx` | Grid + list card layouts |
| SearchResultsGrid | `components/search/search-results-grid.tsx` | Results with infinite scroll |
| ViewControls | `components/search/view-controls.tsx` | Grid/list/map toggle |
| PropertyMap | `components/maps/property-map.tsx` | Map with property pins |
| RangeSlider | `components/ui/range-slider.tsx` | Dual-range slider |

## Database Changes

Two new Prisma models added:
- `SavedSearch` — user's saved search criteria with alert status
- `SearchEvent` — search query logs for analytics

## Known Limitations / Future Work

- Mapbox GL JS not yet integrated (placeholder map works with coordinates)
- Search autocomplete currently uses static suggestions; should query an endpoint
- Property images are still placeholders; real image rendering in Sprint 6+
- Saved search background recheck not yet implemented (cron job in Sprint 8)
- Email/push notifications for alerts are stubs (Sprint 8)
