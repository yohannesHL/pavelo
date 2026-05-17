"use client";

/**
 * Valuation Report Page — /valuation/[id] (S8-05)
 *
 * Renders the AI-generated valuation report.
 * Uses demo data; in production, fetches from tRPC by ID.
 */

import { ValuationReport } from "@/components/valuation/valuation-report";

// Demo valuation data
const DEMO_VALUATION = {
  address: "34 Lavender Hill",
  postcode: "SW11 1JQ",
  propertyType: "terraced",
  bedrooms: 3,
  bathrooms: 2,
  squareFeet: 1100,
  estimateLow: 595000,
  estimateMid: 650000,
  estimateHigh: 710000,
  confidence: 0.78,
  pricePerSqft: 591,
  marketTrend: "up" as const,
  marketTrendLabel: "Rising market",
  comparables: [
    {
      id: "c1",
      address: "12 Falcon Road, SW11",
      price: 625000,
      squareFeet: 1050,
      bedrooms: 3,
      distance: 0.3,
      dateSold: "2024-09-15",
      pricePerSqft: 595,
    },
    {
      id: "c2",
      address: "89 St John's Road, SW11",
      price: 685000,
      squareFeet: 1200,
      bedrooms: 3,
      distance: 0.5,
      dateSold: "2024-07-22",
      pricePerSqft: 571,
    },
    {
      id: "c3",
      address: "7 Wandsworth Road, SW11",
      price: 640000,
      squareFeet: 1080,
      bedrooms: 3,
      distance: 0.7,
      dateSold: "2024-11-03",
      pricePerSqft: 593,
    },
    {
      id: "c4",
      address: "45 Battersea High Street, SW11",
      price: 710000,
      squareFeet: 1250,
      bedrooms: 4,
      distance: 0.9,
      dateSold: "2024-06-18",
      pricePerSqft: 568,
    },
    {
      id: "c5",
      address: "23 Queenstown Road, SW8",
      price: 575000,
      squareFeet: 950,
      bedrooms: 2,
      distance: 1.2,
      dateSold: "2024-08-30",
      pricePerSqft: 605,
    },
  ],
  adjustments: {
    items: [
      { factor: "2 bathrooms", impact: 19500, direction: "up" as const },
      { factor: "Period property", impact: 32500, direction: "up" as const },
      { factor: "Garden", impact: 26000, direction: "up" as const },
    ],
    total: 78000,
  },
  methodology:
    "This valuation is based on analysis of 5 comparable properties sold in the local area.\n\n" +
    "**Base Valuation:** £572,000 — derived from weighted average price per square foot of comparable sold properties, with closer properties given higher weighting.\n\n" +
    "**Adjustments:** 2 bathrooms (+£19,500), Period property (+£32,500), Garden (+£26,000)\n\n" +
    "**Market Trend:** Rising market — a up trend adjustment has been applied.\n\n" +
    "**Confidence:** High (78%) — based on comparable count, data quality, and market stability.\n\n" +
    "*Note: This is an AI-generated estimate for informational purposes only. We recommend obtaining a professional RICS valuation before making financial decisions.*",
  generatedAt: new Date().toISOString(),
};

export default function ValuationPage() {
  return (
    <div className="px-4 py-8">
      <ValuationReport
        valuation={DEMO_VALUATION}
        shareUrl={typeof window !== "undefined" ? window.location.href : ""}
      />
    </div>
  );
}
