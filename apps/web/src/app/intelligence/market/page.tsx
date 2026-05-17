"use client";

/**
 * Market Trends Page (S7-08)
 *
 * Standalone page at /intelligence/market
 */

import { useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import {
  MarketTrendDashboard,
  generateMockMarketData,
} from "@/components/intelligence/market-trend-dashboard";
import Link from "next/link";

export default function MarketPage() {
  const { indices, forecast } = useMemo(() => generateMockMarketData(), []);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to Dashboard
          </Link>
        </div>

        <MarketTrendDashboard indices={indices} forecast={forecast} />
      </div>
    </div>
  );
}
