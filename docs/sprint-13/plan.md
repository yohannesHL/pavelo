# Sprint 13 — RAG-Powered Search Integration

## Goal
Connect the RAG semantic search pipeline to the frontend property search experience. Users type natural language queries ("3-bed house near a park in Manchester under £300k") and get AI-ranked results with traditional filters still working as post-filters.

## Architecture Decision
**Proxy through API** — tRPC `search.query` calls the agent RAG service, merges with Prisma data for completeness, then returns unified results. Frontend doesn't call agent directly.

```
Frontend (usePropertySearch) 
  → tRPC search.query 
    → Agent RAG /api/v1/rag/search (semantic)
    → Prisma (structured fallback + enrichment)
  ← Merged, scored results
  → Client-side filter refinement (price, beds, type)
```

## Why proxy, not direct?
- Single API surface for frontend (auth, rate limiting, logging all in one place)
- RAG results may lack full property data — API enriches from Prisma
- Graceful fallback: if agent is down, fall back to Prisma full-text search
- Filters can be applied server-side on enriched data

## Tasks

### T1 — API: RAG search proxy route (Sage)
- Add `ragSearch` helper in `apps/api/src/lib/rag-client.ts`
  - Calls agent service `POST /api/v1/rag/search`
  - Handles timeout (3s), error fallback
- Update `search.query` in `apps/api/src/router.ts`:
  - If query is non-empty → call RAG, get scored property IDs
  - Enrich from Prisma (`property.findMany({ where: { id: { in: ids } } })`)
  - Merge RAG score + full property data
  - Apply server-side filters (price range, beds, type, location)
  - Fallback to Prisma `contains` search if RAG unavailable
- Return shape unchanged (items, nextCursor, total, query, filtersApplied)

### T2 — API: Search relevance scoring (Sage)
- Add `relevanceScore` field to search response items
- Sort by RAG score (descending) when semantic search used
- Sort by Prisma sort field when filters-only (no query text)
- Surface whether results are "AI-ranked" vs "filtered" in response metadata

### T3 — Frontend: AI search indicator + UX (Nova + Milo)
- When results come back AI-ranked, show subtle badge: "✨ AI-ranked results"
- Add skeleton loading state during RAG search (may be slower than DB)
- Show relevance score as a subtle confidence bar on each card
- Animate results appearing (stagger fade-in)

### T4 — Frontend: Smart search suggestions (Nova + Kira)
- Replace static example queries with contextual suggestions
- Add "Try asking:" chip row below search bar with natural language examples:
  - "Family home with garden in Leeds"
  - "Investment flat near university"
  - "Period property under £200k"
- On empty results, show "Refine your search" suggestions

### T5 — Frontend: Filter-as-refinement UX (Kira + Nova)
- When RAG results are shown, filters act as **post-filters** (client-side)
- Show active filter count badge
- Add "Clear all" button
- Filters narrow down the AI results, not re-query
- If all results filtered out → "No matches with these filters. Remove filters to see AI results"

### T6 — Integration test: RAG search E2E (Ivy)
- `test/int/search-rag.test.ts`:
  - Test: query with text → returns scored results
  - Test: query with filters → filters applied
  - Test: agent down → fallback to Prisma search
  - Test: empty query → returns all (Prisma paginated)

### T7 — Visual polish (Milo)
- Search results card: add relevance indicator (gradient bar or %)
- Loading skeleton that matches card layout
- "AI-powered" pill near search bar (subtle, not distracting)
- Responsive: filters collapse to bottom sheet on mobile (already exists, verify)

## Success Criteria
- [ ] Natural language query returns semantically relevant results
- [ ] Traditional filters (price, beds, type) narrow down AI results
- [ ] Graceful fallback when agent service unavailable
- [ ] No regression on existing search behavior
- [ ] Results display relevance indicator
- [ ] Integration tests pass

## Dependencies
- RAG pipeline must have ingested properties (Sprint 12 scraper → ingest)
- Agent service must be running for semantic search
- Prisma DB has property records for enrichment

## Branch
`feat/sprint-13-rag-search`
