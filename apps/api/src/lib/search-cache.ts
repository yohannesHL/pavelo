/**
 * Search Query Cache (S10-04)
 *
 * Redis-based caching layer for Qdrant search queries.
 * Caches frequent search results with TTL for fast repeated lookups.
 * Popular area queries are pre-computed on a schedule.
 */

import { redis } from "./redis.js";
import crypto from "crypto";

const CACHE_PREFIX = "search:cache:";
const POPULAR_PREFIX = "search:popular:";
const METRICS_PREFIX = "search:metrics:";
const DEFAULT_TTL = 300; // 5 minutes
const POPULAR_TTL = 900; // 15 minutes

/**
 * Generate a deterministic cache key from search parameters.
 */
function cacheKey(query: string, filters?: Record<string, unknown>): string {
  const normalized = JSON.stringify({ q: query.toLowerCase().trim(), f: filters || {} });
  const hash = crypto.createHash("sha256").update(normalized).digest("hex").slice(0, 16);
  return `${CACHE_PREFIX}${hash}`;
}

/**
 * Get cached search results.
 */
export async function getCachedSearch(
  query: string,
  filters?: Record<string, unknown>
): Promise<unknown | null> {
  try {
    const key = cacheKey(query, filters);
    const cached = await redis.get(key);
    if (cached) {
      await redis.incr(`${METRICS_PREFIX}hits`);
      return JSON.parse(cached);
    }
    await redis.incr(`${METRICS_PREFIX}misses`);
    return null;
  } catch {
    return null;
  }
}

/**
 * Cache search results.
 */
export async function setCachedSearch(
  query: string,
  filters: Record<string, unknown> | undefined,
  results: unknown,
  ttl: number = DEFAULT_TTL
): Promise<void> {
  try {
    const key = cacheKey(query, filters);
    await redis.setex(key, ttl, JSON.stringify(results));
  } catch {
    // Cache write failures are non-critical
  }
}

/**
 * Pre-compute results for popular areas.
 */
const POPULAR_AREAS = [
  "London", "Manchester", "Birmingham", "Leeds", "Bristol",
  "Edinburgh", "Glasgow", "Liverpool", "Sheffield", "Brighton",
  "Islington", "Camden", "Hackney", "Brixton", "Clapham",
  "Chelsea", "Kensington", "Richmond", "Greenwich", "Shoreditch",
];

export async function preComputePopularAreas(
  searchFn: (query: string) => Promise<unknown>
): Promise<{ computed: number; errors: number }> {
  let computed = 0;
  let errors = 0;

  for (const area of POPULAR_AREAS) {
    try {
      const query = `properties in ${area}`;
      const results = await searchFn(query);
      const key = `${POPULAR_PREFIX}${area.toLowerCase()}`;
      await redis.setex(key, POPULAR_TTL, JSON.stringify(results));
      computed++;
    } catch {
      errors++;
    }
  }

  return { computed, errors };
}

/**
 * Get pre-computed results for a popular area.
 */
export async function getPopularAreaResults(area: string): Promise<unknown | null> {
  try {
    const key = `${POPULAR_PREFIX}${area.toLowerCase()}`;
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

/**
 * Get search cache performance metrics.
 */
export async function getSearchCacheMetrics(): Promise<{
  hits: number;
  misses: number;
  hitRate: number;
  cachedKeys: number;
  popularAreas: number;
}> {
  try {
    const [hits, misses] = await Promise.all([
      redis.get(`${METRICS_PREFIX}hits`).then((v) => parseInt(v || "0", 10)),
      redis.get(`${METRICS_PREFIX}misses`).then((v) => parseInt(v || "0", 10)),
    ]);

    const total = hits + misses;
    const hitRate = total > 0 ? Math.round((hits / total) * 100) : 0;

    // Count cached keys (approximate)
    const cachedKeys = await redis.keys(`${CACHE_PREFIX}*`).then((k) => k.length);
    const popularAreas = await redis.keys(`${POPULAR_PREFIX}*`).then((k) => k.length);

    return { hits, misses, hitRate, cachedKeys, popularAreas };
  } catch {
    return { hits: 0, misses: 0, hitRate: 0, cachedKeys: 0, popularAreas: 0 };
  }
}

/**
 * Clear all search caches.
 */
export async function clearSearchCache(): Promise<void> {
  try {
    const keys = await redis.keys(`${CACHE_PREFIX}*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch {
    // Non-critical
  }
}
