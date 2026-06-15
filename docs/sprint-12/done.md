# Sprint 12 Done — SPA Mode + RAG Pipeline

## Summary
All 7 tasks completed. The app now runs in SPA mode (client-only rendering) and has a complete RAG pipeline for property data.

## Key Decisions

1. **SPA without `output: "export"`**: Next.js 16 Turbopack has a bug where `generateStaticParams` is not recognized in pages that re-export from `"use client"` modules. We achieve SPA behavior through all-client pages + removed middleware instead.

2. **RAG Embedding Fallback**: When no OpenAI API key is available, the RAG pipeline uses deterministic SHA-512 hash-based embeddings. This allows development/testing without API costs while maintaining the full pipeline flow.

3. **Non-blocking RAG Triggers**: Property create/update in the API gateway triggers RAG ingestion as fire-and-forget. This ensures the CRUD operations are never slowed by the RAG pipeline.

## Files Changed
- `apps/web/next.config.ts` — SPA configuration
- `apps/web/src/middleware.ts` — DELETED (incompatible with SPA)
- `apps/web/src/app/voice/page.tsx` — client-side redirect
- `apps/web/src/app/chat/page.tsx` — Suspense boundary
- `apps/api/src/index.ts` — RAG trigger webhook
- `apps/api/src/router.ts` — fire-and-forget RAG ingest
- `apps/api/src/routes/websocket.ts` — improved error handling
- `services/agent/src/rag/` — full RAG pipeline (4 files)
- `services/agent/src/main.py` — mounted RAG router
- `scripts/` — Rightmove scraper
- `test/int/` — integration tests (6 files)

## How to Test

```bash
# Run integration tests (requires services running)
cd test/int && pnpm test

# Run scraper
cd scripts && npx tsx scrape-rightmove.ts

# Test RAG pipeline (requires agent service + Qdrant)
curl -X POST http://localhost:8000/api/v1/rag/ingest \
  -H "Content-Type: application/json" \
  -d '{"property_data": {"id": "test-1", "title": "Test", "address": "London", "price": 500000}}'
```
