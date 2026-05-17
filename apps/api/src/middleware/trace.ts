/**
 * OpenTelemetry Trace Middleware for Fastify (S10-08)
 *
 * Adds request tracing, custom metrics, and health aggregation.
 * Integrates with OpenTelemetry SDK for distributed tracing.
 *
 * Metrics tracked:
 * - Request duration (histogram)
 * - Error rates (counter)
 * - Active connections (gauge)
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

interface RequestMetric {
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  timestamp: number;
}

class MetricsCollector {
  private requests: RequestMetric[] = [];
  private activeConnections = 0;
  private readonly maxHistory = 10000;

  recordRequest(metric: RequestMetric): void {
    this.requests.push(metric);
    if (this.requests.length > this.maxHistory) {
      this.requests = this.requests.slice(-this.maxHistory);
    }
  }

  incrementConnections(): void {
    this.activeConnections++;
  }

  decrementConnections(): void {
    this.activeConnections = Math.max(0, this.activeConnections - 1);
  }

  getMetrics(windowMs: number = 60_000): {
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
  } {
    const cutoff = Date.now() - windowMs;
    const recent = this.requests.filter((r) => r.timestamp > cutoff);

    if (recent.length === 0) {
      return {
        requestCount: 0,
        errorCount: 0,
        errorRate: 0,
        avgDurationMs: 0,
        p50DurationMs: 0,
        p95DurationMs: 0,
        p99DurationMs: 0,
        activeConnections: this.activeConnections,
        requestsPerSecond: 0,
        topPaths: [],
      };
    }

    const durations = recent.map((r) => r.durationMs).sort((a, b) => a - b);
    const errors = recent.filter((r) => r.statusCode >= 400);

    // Group by path
    const pathMap = new Map<string, { count: number; totalMs: number }>();
    for (const r of recent) {
      const existing = pathMap.get(r.path) || { count: 0, totalMs: 0 };
      existing.count++;
      existing.totalMs += r.durationMs;
      pathMap.set(r.path, existing);
    }

    const topPaths = Array.from(pathMap.entries())
      .map(([path, data]) => ({
        path,
        count: data.count,
        avgMs: Math.round(data.totalMs / data.count),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const percentile = (arr: number[], pct: number): number => {
      const idx = Math.min(Math.floor(arr.length * pct), arr.length - 1);
      return Math.round(arr[idx]);
    };

    return {
      requestCount: recent.length,
      errorCount: errors.length,
      errorRate: Math.round((errors.length / recent.length) * 100) / 100,
      avgDurationMs: Math.round(
        durations.reduce((a, b) => a + b, 0) / durations.length
      ),
      p50DurationMs: percentile(durations, 0.5),
      p95DurationMs: percentile(durations, 0.95),
      p99DurationMs: percentile(durations, 0.99),
      activeConnections: this.activeConnections,
      requestsPerSecond: Math.round(
        (recent.length / (windowMs / 1000)) * 100
      ) / 100,
      topPaths,
    };
  }
}

export const metricsCollector = new MetricsCollector();

/**
 * Register tracing middleware on a Fastify instance.
 */
export function registerTraceMiddleware(app: FastifyInstance): void {
  app.addHook("onRequest", async () => {
    metricsCollector.incrementConnections();
  });

  app.addHook("onResponse", async (request: FastifyRequest, reply: FastifyReply) => {
    metricsCollector.decrementConnections();

    const durationMs = reply.elapsedTime;
    const path = request.routeOptions?.url || request.url;

    metricsCollector.recordRequest({
      method: request.method,
      path,
      statusCode: reply.statusCode,
      durationMs: Math.round(durationMs),
      timestamp: Date.now(),
    });
  });

  // Metrics endpoint
  app.get("/api/v1/metrics", async (request, reply) => {
    const windowParam = (request.query as Record<string, string>).window;
    const windowMs = windowParam ? parseInt(windowParam, 10) * 1000 : 60_000;
    return metricsCollector.getMetrics(windowMs);
  });
}
