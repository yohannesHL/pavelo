/**
 * k6 API Endpoint Stress Tests
 *
 * Tests: health, property list, property detail, search, property CRUD
 *
 * Run:
 *   k6 run tests/load/api-endpoints.js
 *   k6 run --env BASE_URL=https://api.pavelo.io tests/load/api-endpoints.js
 */

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend } from "k6/metrics";
import { loadTestOptions, BASE_URL } from "./config.js";

export const options = loadTestOptions;

const errorRate = new Rate("errors");
const searchDuration = new Trend("search_duration", true);
const propertyListDuration = new Trend("property_list_duration", true);

export default function () {
  group("Health Check", () => {
    const res = http.get(`${BASE_URL}/health`);
    check(res, {
      "health status 200": (r) => r.status === 200,
      "health body ok": (r) => {
        try {
          return JSON.parse(r.body).status === "ok";
        } catch {
          return false;
        }
      },
    }) || errorRate.add(1);
  });

  sleep(0.5);

  group("Property List (tRPC)", () => {
    const url = `${BASE_URL}/trpc/property.list?input=${encodeURIComponent(
      JSON.stringify({ json: { limit: 20, sortBy: "createdAt", sortOrder: "desc" } })
    )}`;
    const res = http.get(url, {
      headers: { "Content-Type": "application/json" },
    });
    propertyListDuration.add(res.timings.duration);
    check(res, {
      "property list status 200": (r) => r.status === 200,
    }) || errorRate.add(1);
  });

  sleep(0.5);

  group("Search Query (tRPC)", () => {
    const payload = JSON.stringify({
      json: {
        query: "3 bed house in London",
        topK: 10,
        cursor: 0,
        sortBy: "relevance",
      },
    });
    const res = http.post(`${BASE_URL}/trpc/search.query`, payload, {
      headers: { "Content-Type": "application/json" },
    });
    searchDuration.add(res.timings.duration);
    check(res, {
      "search status 200": (r) => r.status === 200,
    }) || errorRate.add(1);
  });

  sleep(1);
}

export function handleSummary(data) {
  return {
    stdout: textSummary(data, { indent: " ", enableColors: true }),
  };
}

function textSummary(data) {
  const metrics = data.metrics;
  return `
=== Pavelo API Load Test Summary ===
  Total Requests:   ${metrics.http_reqs?.values?.count || 0}
  Error Rate:       ${((metrics.http_req_failed?.values?.rate || 0) * 100).toFixed(2)}%
  p95 Duration:     ${(metrics.http_req_duration?.values?.["p(95)"] || 0).toFixed(0)}ms
  p99 Duration:     ${(metrics.http_req_duration?.values?.["p(99)"] || 0).toFixed(0)}ms
  Avg Duration:     ${(metrics.http_req_duration?.values?.avg || 0).toFixed(0)}ms
  Search p95:       ${(metrics.search_duration?.values?.["p(95)"] || 0).toFixed(0)}ms
  Property List p95: ${(metrics.property_list_duration?.values?.["p(95)"] || 0).toFixed(0)}ms
=====================================
`;
}
