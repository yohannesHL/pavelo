/**
 * SearchPerformance Admin Component (S10-04)
 *
 * Displays search cache metrics, hit rates, and Qdrant query performance.
 */

"use client";

import { useState, useEffect, useCallback } from "react";

interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  cachedKeys: number;
  popularAreas: number;
}

interface SearchMetrics {
  totalSearches: number;
  avgResults: number;
  zeroResultCount: number;
  zeroResultRate: number;
  clickThroughRate: number;
  topQueries: { query: string; count: number }[];
  period: string;
}

export function SearchPerformance() {
  const [cacheMetrics, setCacheMetrics] = useState<CacheMetrics | null>(null);
  const [searchMetrics, setSearchMetrics] = useState<SearchMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = useCallback(async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

      const [cacheRes, searchRes] = await Promise.all([
        fetch(`${apiUrl}/api/v1/search/cache-metrics`).then((r) =>
          r.ok ? r.json() : null
        ),
        fetch(
          `${apiUrl}/trpc/searchAnalytics.summary?input=${encodeURIComponent(
            JSON.stringify({ json: { days: 30 } })
          )}`
        ).then((r) => (r.ok ? r.json() : null)),
      ]);

      if (cacheRes) setCacheMetrics(cacheRes);
      if (searchRes?.result?.data) setSearchMetrics(searchRes.result.data);
    } catch {
      // Non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30_000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 rounded bg-[var(--muted)]" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-[var(--muted)]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-[#0D1B2A]">Search Performance</h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          Cache metrics, query performance, and search analytics.
        </p>
      </div>

      {/* Cache Metrics */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-[#0D1B2A]">Redis Cache</h3>
        <div className="grid gap-4 sm:grid-cols-5">
          {[
            {
              label: "Hit Rate",
              value: cacheMetrics ? `${cacheMetrics.hitRate}%` : "—",
              color: (cacheMetrics?.hitRate ?? 0) > 60 ? "text-emerald-600" : "text-amber-600",
            },
            { label: "Hits", value: cacheMetrics?.hits ?? "—" },
            { label: "Misses", value: cacheMetrics?.misses ?? "—" },
            { label: "Cached Keys", value: cacheMetrics?.cachedKeys ?? "—" },
            { label: "Popular Areas", value: cacheMetrics?.popularAreas ?? "—" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-[var(--border)] bg-white p-4 shadow-sm"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                {stat.label}
              </p>
              <p
                className={`mt-1 text-xl font-bold ${("color" in stat && stat.color) || "text-[#0D1B2A]"}`}
                style={{ fontFamily: "var(--font-data)" }}
              >
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Search Analytics */}
      {searchMetrics && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-[#0D1B2A]">
            Search Analytics ({searchMetrics.period})
          </h3>
          <div className="grid gap-4 sm:grid-cols-4">
            {[
              { label: "Total Searches", value: searchMetrics.totalSearches },
              { label: "Avg Results", value: searchMetrics.avgResults },
              { label: "Zero Results", value: `${(searchMetrics.zeroResultRate * 100).toFixed(1)}%` },
              { label: "Click-Through", value: `${(searchMetrics.clickThroughRate * 100).toFixed(1)}%` },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-[var(--border)] bg-white p-4 shadow-sm"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                  {stat.label}
                </p>
                <p
                  className="mt-1 text-xl font-bold text-[#0D1B2A]"
                  style={{ fontFamily: "var(--font-data)" }}
                >
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {/* Top Queries */}
          {searchMetrics.topQueries.length > 0 && (
            <div className="mt-4 rounded-xl border border-[var(--border)] bg-white p-4 shadow-sm">
              <h4 className="mb-3 text-xs font-semibold text-[#0D1B2A]">Top Queries</h4>
              <div className="space-y-2">
                {searchMetrics.topQueries.slice(0, 10).map((q, i) => (
                  <div key={q.query} className="flex items-center gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--muted)] text-[10px] font-semibold text-[var(--muted-foreground)]">
                      {i + 1}
                    </span>
                    <span className="flex-1 truncate text-xs text-[#0D1B2A]">{q.query}</span>
                    <span
                      className="text-xs font-semibold text-[var(--color-accent)]"
                      style={{ fontFamily: "var(--font-data)" }}
                    >
                      {q.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
