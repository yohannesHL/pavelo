/**
 * Client for the RAG search service (agent Python service).
 * Handles timeouts and graceful fallback.
 */

export interface RAGSearchParams {
  query: string;
  limit?: number;
  minScore?: number;
  filters?: Record<string, unknown>;
}

export interface RAGSearchResult {
  score: number;
  text: string;
  property_id: string;
  chunk_type: string;
  address: string;
  price: number;
  bedrooms: number;
  listing_url: string;
}

export interface RAGSearchResponse {
  query: string;
  results: RAGSearchResult[];
  count: number;
}

const RAG_SERVICE_URL = process.env.AGENT_SERVICE_URL || process.env.ML_SERVICE_URL || "http://localhost:8000";
const RAG_TIMEOUT_MS = 3000;

export async function ragSearch(params: RAGSearchParams): Promise<RAGSearchResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RAG_TIMEOUT_MS);

  try {
    const body = {
      query: params.query,
      limit: params.limit ?? 20,
      min_score: params.minScore ?? 0.2,
      filters: params.filters,
    };

    const res = await fetch(`${RAG_SERVICE_URL}/api/v1/rag/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`RAG service error: ${res.status}`);
    }

    return await res.json() as RAGSearchResponse;
  } finally {
    clearTimeout(timeout);
  }
}
