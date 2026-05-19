import { describe, it, expect } from "vitest";

const AGENT_URL = process.env.AGENT_URL || "http://localhost:8000";

describe("RAG Pipeline", () => {
  const testProperty = {
    id: "test-prop-001",
    title: "Modern 3 Bedroom Semi-Detached in Clapham",
    price: 650000,
    priceText: "£650,000",
    address: "42 Lavender Gardens, Clapham, London SW11",
    bedrooms: 3,
    bathrooms: 2,
    description: "A stunning three-bedroom semi-detached house located on a quiet tree-lined street in Clapham. The property features a modern open-plan kitchen, south-facing garden, and period features throughout. Recently refurbished to a high standard.",
    features: ["South-facing garden", "Open-plan kitchen", "Period features", "Newly refurbished", "Close to Clapham Common"],
    images: [],
    agent: "Foxtons Clapham",
    listingUrl: "https://www.rightmove.co.uk/properties/test-001",
    propertyType: "Semi-Detached",
    scrapedAt: new Date().toISOString(),
  };

  it("ingests a property successfully", async () => {
    const res = await fetch(`${AGENT_URL}/api/v1/rag/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ property_data: testProperty }),
    });
    
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("success");
    expect(body.chunks_created).toBeGreaterThan(0);
    expect(body.property_id).toBe("test-prop-001");
  });

  it("searches for properties by natural language", async () => {
    const res = await fetch(`${AGENT_URL}/api/v1/rag/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "3 bedroom house in Clapham with garden",
        limit: 5,
        min_score: 0.0,  // Low threshold for hash-based embeddings in test
      }),
    });
    
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results.length).toBeGreaterThan(0);
    expect(body.results[0].property_id).toBe("test-prop-001");
  });

  it("returns stats about the collection", async () => {
    const res = await fetch(`${AGENT_URL}/api/v1/rag/stats`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.points_count).toBeGreaterThan(0);
  });

  it("handles batch ingestion", async () => {
    const properties = [
      { ...testProperty, id: "test-prop-002", address: "10 King's Road, Chelsea, London SW3", price: 1200000, priceText: "£1,200,000" },
      { ...testProperty, id: "test-prop-003", address: "5 Park Lane, Mayfair, London W1", price: 2500000, priceText: "£2,500,000", bedrooms: 4 },
    ];

    const res = await fetch(`${AGENT_URL}/api/v1/rag/ingest/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ properties }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ingested).toBe(2);
  });
});
