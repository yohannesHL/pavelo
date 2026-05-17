/**
 * Observability Dashboard — Admin (S10-08)
 *
 * Shows API metrics, health status, request durations,
 * error rates, and top paths.
 */

"use client";

import { useState, useEffect, useCallback } from "react";

interface Metrics {
  requestCount: number;
  errorCount: number;
  errorRate: number;
  avgDurationMs: number;
  p50DurationMs: number;
  p95DurationMs: number;
  p99DurationMs: number;
  activeConnections: number;
  requestsPerSecond: number;
  topPaths: { path: string; count: number; avgMs: number }[];
}

interface ServiceHealth {
  name: string;
  url: string;
  status: "healthy" | "degraded" | "down" | "checking";
  latencyMs?: number;
  version?: string;
}

const SERVICES: { name: string; url: string }[] = [
  { name: "API Gateway", url: "/health" },
  { name: "Agent Service", url: "http://localhost:8000/health" },
  { name: "ML Service", url: "http://localhost:8001/health" },
];

export default function ObservabilityPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [services, setServices] = useState<ServiceHealth[]>(
    SERVICES.map((s) => ({ ...s, status: "checking" as const }))
  );
  const [window, setWindow] = useState<"60" | "300" | "900">("60");

  const fetchMetrics = useCallback(async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(`${apiUrl}/api/v1/metrics?window=${window}`);
      if (res.ok) {
        setMetrics(await res.json());
      }
    } catch {
      // Non-critical
    }
  }, [window]);

  const checkHealth = useCallback(async () => {
    const results = await Promise.all(
      SERVICES.map(async (service) => {
        const start = performance.now();
        try {
          const url = service.url.startsWith("http")
            ? service.url
            : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}${service.url}`;
          const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
          const latencyMs = Math.round(performance.now() - start);
          const data = await res.json().catch(() => ({}));
          return {
            ...service,
            status: res.ok ? ("healthy" as const) : ("degraded" as const),
            latencyMs,
            version: data.version,
          };
        } catch {
          return {
            ...service,
            status: "down" as const,
            latencyMs: Math.round(performance.now() - start),
          };
        }
      })
    );
    setServices(results);
  }, []);

  useEffect(() => {
    fetchMetrics();
    checkHealth();
    const interval = setInterval(() => {
      fetchMetrics();
      checkHealth();
    }, 10_000);
    return () => clearInterval(interval);
  }, [fetchMetrics, checkHealth]);

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0D1B2A]">Observability</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          System health, API metrics, and performance monitoring.
        </p>
      </div>

      {/* Service Health */}
      <div className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-[#0D1B2A]">Service Health</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {services.map((service) => (
            <div
              key={service.name}
              className="rounded-xl border border-[var(--border)] bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[#0D1B2A]">{service.name}</span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    service.status === "healthy"
                      ? "bg-emerald-50 text-emerald-600"
                      : service.status === "degraded"
                      ? "bg-amber-50 text-amber-600"
                      : service.status === "down"
                      ? "bg-red-50 text-red-600"
                      : "bg-gray-50 text-gray-500"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      service.status === "healthy"
                        ? "bg-emerald-500"
                        : service.status === "degraded"
                        ? "bg-amber-500"
                        : service.status === "down"
                        ? "bg-red-500"
                        : "bg-gray-400"
                    }`}
                  />
                  {service.status}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-3 text-[10px] text-[var(--muted-foreground)]">
                {service.latencyMs !== undefined && (
                  <span style={{ fontFamily: "var(--font-data)" }}>
                    {service.latencyMs}ms
                  </span>
                )}
                {service.version && <span>v{service.version}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Time Window */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#0D1B2A]">API Metrics</h2>
        <div className="flex rounded-lg border border-[var(--border)] bg-white p-0.5 shadow-sm">
          {(["60", "300", "900"] as const).map((w) => (
            <button
              key={w}
              onClick={() => setWindow(w)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                window === w
                  ? "bg-[#0D1B2A] text-white"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
              }`}
            >
              {w === "60" ? "1 min" : w === "300" ? "5 min" : "15 min"}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Grid */}
      {metrics && (
        <>
          <div className="grid gap-4 sm:grid-cols-4 lg:grid-cols-8">
            {[
              { label: "Requests", value: metrics.requestCount },
              { label: "Errors", value: metrics.errorCount, alert: metrics.errorCount > 0 },
              { label: "Error Rate", value: `${(metrics.errorRate * 100).toFixed(1)}%` },
              { label: "RPS", value: metrics.requestsPerSecond.toFixed(1) },
              { label: "Avg", value: `${metrics.avgDurationMs}ms` },
              { label: "p50", value: `${metrics.p50DurationMs}ms` },
              { label: "p95", value: `${metrics.p95DurationMs}ms`, alert: metrics.p95DurationMs > 500 },
              { label: "Active", value: metrics.activeConnections },
            ].map((stat) => (
              <div
                key={stat.label}
                className={`rounded-xl border bg-white p-3 shadow-sm ${
                  stat.alert ? "border-red-200" : "border-[var(--border)]"
                }`}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                  {stat.label}
                </p>
                <p
                  className={`mt-1 text-lg font-bold ${
                    stat.alert ? "text-red-600" : "text-[#0D1B2A]"
                  }`}
                  style={{ fontFamily: "var(--font-data)" }}
                >
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {/* Top Paths */}
          {metrics.topPaths.length > 0 && (
            <div className="mt-6 rounded-xl border border-[var(--border)] bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-xs font-semibold text-[#0D1B2A]">Top Endpoints</h3>
              <div className="space-y-2">
                {metrics.topPaths.map((path) => {
                  const maxCount = Math.max(...metrics.topPaths.map((p) => p.count));
                  return (
                    <div key={path.path} className="flex items-center gap-3">
                      <span className="w-48 truncate text-xs text-[#0D1B2A]" title={path.path}>
                        {path.path}
                      </span>
                      <div className="flex-1 h-4 rounded bg-[var(--muted)] overflow-hidden">
                        <div
                          className="h-full rounded bg-[var(--color-accent)]"
                          style={{ width: `${(path.count / maxCount) * 100}%` }}
                        />
                      </div>
                      <span
                        className="w-12 text-right text-xs font-semibold"
                        style={{ fontFamily: "var(--font-data)" }}
                      >
                        {path.count}
                      </span>
                      <span
                        className="w-16 text-right text-[10px] text-[var(--muted-foreground)]"
                        style={{ fontFamily: "var(--font-data)" }}
                      >
                        {path.avgMs}ms
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
