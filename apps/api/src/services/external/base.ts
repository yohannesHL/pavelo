/**
 * External API Base Utilities (S7-09)
 *
 * Shared infrastructure for all external data wrappers:
 * - Exponential backoff with jitter
 * - Redis caching with configurable TTL
 * - Graceful degradation with stale data notice
 * - Rate limit tracking
 */

import { redis } from "../../lib/redis.js";

// ---------- Rate Limiting / Backoff ----------

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

const DEFAULT_RETRY: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 500,
  maxDelayMs: 10_000,
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jitteredDelay(attempt: number, config: RetryConfig): number {
  const delay = Math.min(
    config.baseDelayMs * Math.pow(2, attempt),
    config.maxDelayMs
  );
  // Add ±25% jitter
  return delay * (0.75 + Math.random() * 0.5);
}

export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryConfig: RetryConfig = DEFAULT_RETRY
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(30_000),
      });

      // Rate limited — back off and retry
      if (response.status === 429) {
        const retryAfter = response.headers.get("retry-after");
        const waitMs = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : jitteredDelay(attempt, retryConfig);
        console.warn(
          `[ExternalAPI] Rate limited on ${url}, waiting ${waitMs}ms (attempt ${attempt + 1})`
        );
        await sleep(waitMs);
        continue;
      }

      return response;
    } catch (err: any) {
      lastError = err;
      if (attempt < retryConfig.maxRetries) {
        const waitMs = jitteredDelay(attempt, retryConfig);
        console.warn(
          `[ExternalAPI] Request failed for ${url}, retrying in ${waitMs}ms (attempt ${attempt + 1}): ${err.message}`
        );
        await sleep(waitMs);
      }
    }
  }

  throw new Error(
    `[ExternalAPI] All ${retryConfig.maxRetries + 1} attempts failed for ${url}: ${lastError?.message}`
  );
}

// ---------- Caching ----------

export interface CacheConfig {
  /** TTL in seconds */
  ttlSeconds: number;
  /** Key prefix for namespacing */
  prefix: string;
}

export interface CachedResult<T> {
  data: T;
  cached: boolean;
  stale: boolean;
  cachedAt?: string;
}

/**
 * Build a deterministic cache key from prefix + params.
 */
export function buildCacheKey(
  prefix: string,
  params: Record<string, unknown>
): string {
  const sorted = Object.keys(params)
    .sort()
    .filter((k) => params[k] !== undefined && params[k] !== null)
    .map((k) => `${k}=${JSON.stringify(params[k])}`)
    .join("&");
  return `ext:${prefix}:${sorted}`;
}

/**
 * Try to get cached data. Returns null if miss.
 * If data is past TTL but within 2x TTL, returns it marked as stale
 * (graceful degradation).
 */
export async function getFromCache<T>(
  key: string,
  ttlSeconds: number
): Promise<CachedResult<T> | null> {
  try {
    const raw = await redis.get(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as { data: T; cachedAt: string };
    const cachedTime = new Date(parsed.cachedAt).getTime();
    const age = (Date.now() - cachedTime) / 1000;

    if (age <= ttlSeconds) {
      return {
        data: parsed.data,
        cached: true,
        stale: false,
        cachedAt: parsed.cachedAt,
      };
    }

    // Stale but usable (within 2x TTL)
    if (age <= ttlSeconds * 2) {
      return {
        data: parsed.data,
        cached: true,
        stale: true,
        cachedAt: parsed.cachedAt,
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Store data in cache.
 */
export async function setInCache<T>(
  key: string,
  data: T,
  ttlSeconds: number
): Promise<void> {
  try {
    const payload = JSON.stringify({
      data,
      cachedAt: new Date().toISOString(),
    });
    // Store for 2x TTL to support stale reads
    await redis.setex(key, ttlSeconds * 2, payload);
  } catch (err: any) {
    console.warn(`[Cache] Failed to set key ${key}: ${err.message}`);
  }
}

/**
 * Wrapper that handles cache-first fetching with graceful degradation.
 */
export async function cachedFetch<T>(
  cacheKey: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<CachedResult<T>> {
  // Try cache first
  const cached = await getFromCache<T>(cacheKey, ttlSeconds);
  if (cached && !cached.stale) {
    return cached;
  }

  // Try fresh fetch
  try {
    const freshData = await fetcher();
    await setInCache(cacheKey, freshData, ttlSeconds);
    return { data: freshData, cached: false, stale: false };
  } catch (err: any) {
    // If we have stale data, return it with warning
    if (cached?.stale) {
      console.warn(
        `[ExternalAPI] Using stale cache for ${cacheKey}: ${err.message}`
      );
      return cached;
    }
    throw err;
  }
}

// ---------- Common types ----------

export interface GeoLocation {
  lat: number;
  lng: number;
}

export interface ExternalApiError {
  source: string;
  message: string;
  statusCode?: number;
}
