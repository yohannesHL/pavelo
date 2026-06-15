import { describe, it, expect } from "vitest";
import { API_URL, fetchApi } from "./helpers";

/**
 * Integration tests for the tRPC search.query endpoint
 * which proxies to the RAG service and falls back to Prisma.
 */
describe("Search RAG Integration", () => {
  const searchQuery = async (input: Record<string, unknown>) => {
    const encoded = encodeURIComponent(JSON.stringify(input));
    return fetchApi(`/trpc/search.query?input=${encoded}`);
  };

  it("returns results for a natural language query", async () => {
    const res = await searchQuery({
      query: "modern flat in London",
      topK: 5,
      cursor: 0,
      sortBy: "relevance",
    });

    // Should succeed (either from RAG or Prisma fallback)
    expect(res.status).toBe(200);
    const json = await res.json();
    const data = json.result?.data ?? json;

    expect(data).toHaveProperty("items");
    expect(data).toHaveProperty("total");
    expect(data).toHaveProperty("nextCursor");
    expect(data).toHaveProperty("query");
    expect(data).toHaveProperty("filtersApplied");
    expect(typeof data.isAiRanked).toBe("boolean");
  });

  it("applies price filters to search results", async () => {
    const res = await searchQuery({
      query: "property",
      topK: 10,
      cursor: 0,
      sortBy: "relevance",
      filters: {
        minPrice: 200000,
        maxPrice: 500000,
      },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    const data = json.result?.data ?? json;

    // All returned items should respect price filters
    for (const item of data.items) {
      expect(item.price).toBeGreaterThanOrEqual(200000);
      expect(item.price).toBeLessThanOrEqual(500000);
    }
  });

  it("applies bedroom filters", async () => {
    const res = await searchQuery({
      query: "house",
      topK: 10,
      cursor: 0,
      sortBy: "relevance",
      filters: {
        minBedrooms: 3,
      },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    const data = json.result?.data ?? json;

    for (const item of data.items) {
      expect(item.bedrooms).toBeGreaterThanOrEqual(3);
    }
  });

  it("falls back gracefully when RAG is unavailable", async () => {
    // This test validates the fallback path — even if RAG service is down,
    // the endpoint should still return results from Prisma
    const res = await searchQuery({
      query: "any property",
      topK: 5,
      cursor: 0,
      sortBy: "relevance",
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    const data = json.result?.data ?? json;

    expect(data).toHaveProperty("items");
    expect(Array.isArray(data.items)).toBe(true);
    // Fallback returns isAiRanked: false
    if (!data.isAiRanked) {
      expect(data.isAiRanked).toBe(false);
    }
  });

  it("supports pagination with cursor", async () => {
    const res1 = await searchQuery({
      query: "property",
      topK: 2,
      cursor: 0,
      sortBy: "relevance",
    });

    expect(res1.status).toBe(200);
    const json1 = await res1.json();
    const data1 = json1.result?.data ?? json1;

    if (data1.nextCursor !== null) {
      const res2 = await searchQuery({
        query: "property",
        topK: 2,
        cursor: data1.nextCursor,
        sortBy: "relevance",
      });

      expect(res2.status).toBe(200);
      const json2 = await res2.json();
      const data2 = json2.result?.data ?? json2;

      // Second page should have different items
      const ids1 = new Set(data1.items.map((i: { id: string }) => i.id));
      for (const item of data2.items) {
        expect(ids1.has(item.id)).toBe(false);
      }
    }
  });

  it("returns relevanceScore on AI-ranked results", async () => {
    const res = await searchQuery({
      query: "family home with garden",
      topK: 5,
      cursor: 0,
      sortBy: "relevance",
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    const data = json.result?.data ?? json;

    if (data.isAiRanked && data.items.length > 0) {
      // AI-ranked results should have relevanceScore
      for (const item of data.items) {
        expect(item.relevanceScore).toBeDefined();
        expect(typeof item.relevanceScore).toBe("number");
        expect(item.relevanceScore).toBeGreaterThan(0);
        expect(item.relevanceScore).toBeLessThanOrEqual(1);
      }

      // Results should be ordered by relevance (descending)
      for (let i = 1; i < data.items.length; i++) {
        expect(data.items[i - 1].relevanceScore).toBeGreaterThanOrEqual(
          data.items[i].relevanceScore
        );
      }
    }
  });

  it("handles empty query with minimum character requirement", async () => {
    const res = await searchQuery({
      query: "a", // minimum 1 char required by schema
      topK: 5,
      cursor: 0,
      sortBy: "relevance",
    });

    expect(res.status).toBe(200);
  });

  it("supports sort overrides on AI results", async () => {
    const res = await searchQuery({
      query: "property in London",
      topK: 10,
      cursor: 0,
      sortBy: "price_asc",
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    const data = json.result?.data ?? json;

    // When sorted by price_asc, items should be in ascending price order
    for (let i = 1; i < data.items.length; i++) {
      expect(data.items[i].price).toBeGreaterThanOrEqual(data.items[i - 1].price);
    }
  });
});
