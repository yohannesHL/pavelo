# Sprint 4 — Hybrid RAG Search Engine — Progress

## Status: 🚧 In Progress

### Phase 1 — Qdrant Hybrid Search Core (S4-01, S4-02) ✅
- [x] S4-01: Qdrant hybrid search (dense + sparse fusion, RRF, filters)
  - `services/ml/src/search/hybrid.py` — full hybrid search engine
  - `services/ml/src/routes/search.py` — POST /api/v1/search/hybrid + /similar-image
  - RRF fusion with configurable dense/sparse weights
  - Filter post-processing: price range, bedrooms, property type, city, postcode, status, geo-radius
  - Haversine distance for location-based filtering
  - Image similarity search via CLIP embeddings
- [x] S4-02: Natural language → search params (LLM query decomposition)
  - `services/agent/src/search/query_decompose.py` — OpenAI function calling
  - Parses: price ranges (500k→500000), bedrooms, property type, area, postcode, style, era, features
  - Returns both structured params + semantic query for dense search
  - Graceful fallback on LLM error

### Phase 2 — Agent Search Tool & API (S4-03, S4-04) ✅
- [x] S4-03: search_properties LangGraph tool
  - `services/agent/src/tools/search_properties.py` — full LangGraph tool
  - Structured input schema, calls ML hybrid search, result formatting
  - Dedup against properties_shown list in agent state
  - Updated `nodes/property_search.py` to use real search
- [x] S4-04: Search API endpoint (tRPC)
  - `apps/api/src/router.ts` — `search.query` tRPC endpoint
  - Calls ML service, hydrates from PostgreSQL, pagination, sort controls
  - Fallback to DB text search if ML service unavailable
  - Added SavedSearch + SearchEvent Prisma models

### Phase 3 — Search UI & Map (S4-05, S4-06)
- [ ] S4-05: Search results UI (revamp)
- [ ] S4-06: Mapbox integration

### Phase 4 — Advanced Features (S4-07, S4-08, S4-09, S4-10)
- [ ] S4-07: Saved searches + alerts
- [ ] S4-08: Image similarity search
- [ ] S4-09: Search analytics
- [ ] S4-10: Search quality eval
