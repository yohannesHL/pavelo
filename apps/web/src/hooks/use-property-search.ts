"use client";

import { useState, useCallback, useRef } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export interface SearchFilters {
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  propertyType?: string;
  city?: string;
  postcode?: string;
  status?: string;
}

export interface SearchParams {
  query: string;
  filters?: SearchFilters;
  topK?: number;
  cursor?: number;
  sortBy?: "relevance" | "price_asc" | "price_desc" | "newest" | "bedrooms";
  excludeIds?: string[];
}

export interface SearchResult {
  id: string;
  title: string;
  price: number;
  propertyType: string;
  status: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number | null;
  addressLine1: string;
  city: string;
  postcode: string;
  latitude: number | null;
  longitude: number | null;
  images: string[];
  features: string[];
  searchScore: number | null;
  [key: string]: unknown;
}

export interface SearchResponse {
  items: SearchResult[];
  nextCursor: number | null;
  total: number;
  query: string;
  filtersApplied: Record<string, unknown>;
}

/**
 * Hook for calling the tRPC search.query endpoint via fetch.
 * Handles loading, error, pagination, and append-on-load-more.
 */
export function usePropertySearch() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback(
    async (params: SearchParams, opts?: { append?: boolean }) => {
      // Cancel any in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setError(null);

      // Build tRPC input — strip undefined/default values for cleaner requests
      const input: Record<string, any> = {
        query: params.query,
        topK: params.topK ?? 20,
        cursor: params.cursor ?? 0,
        sortBy: params.sortBy ?? "relevance",
      };

      if (params.filters) {
        const f: Record<string, any> = {};
        if (params.filters.minPrice && params.filters.minPrice > 0)
          f.minPrice = params.filters.minPrice;
        if (params.filters.maxPrice && params.filters.maxPrice < 5_000_000)
          f.maxPrice = params.filters.maxPrice;
        if (params.filters.minBedrooms && params.filters.minBedrooms > 0)
          f.minBedrooms = params.filters.minBedrooms;
        if (params.filters.maxBedrooms)
          f.maxBedrooms = params.filters.maxBedrooms;
        if (params.filters.propertyType)
          f.propertyType = params.filters.propertyType;
        if (params.filters.city) f.city = params.filters.city;
        if (params.filters.postcode) f.postcode = params.filters.postcode;
        if (params.filters.status) f.status = params.filters.status;
        if (Object.keys(f).length > 0) input.filters = f;
      }

      if (params.excludeIds?.length) input.excludeIds = params.excludeIds;

      try {
        const encoded = encodeURIComponent(JSON.stringify(input));
        const res = await fetch(`${API_BASE}/trpc/search.query?input=${encoded}`, {
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`Search API error: ${res.status}`);
        }

        const json = await res.json();
        // tRPC wraps response in { result: { data: ... } }
        const data: SearchResponse = json.result?.data ?? json;

        if (opts?.append) {
          setResults((prev) => [...prev, ...data.items]);
        } else {
          setResults(data.items);
        }
        setTotal(data.total);
        setNextCursor(data.nextCursor);
      } catch (e: unknown) {
        if (e instanceof DOMException && e.name === "AbortError") return; // Cancelled — ignore
        const message = e instanceof Error ? e.message : "Search failed";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const loadMore = useCallback(
    async (params: SearchParams) => {
      if (nextCursor === null) return;
      await search({ ...params, cursor: nextCursor }, { append: true });
    },
    [nextCursor, search]
  );

  const reset = useCallback(() => {
    setResults([]);
    setTotal(0);
    setNextCursor(null);
    setError(null);
  }, []);

  return {
    results,
    total,
    nextCursor,
    hasMore: nextCursor !== null,
    isLoading,
    error,
    search,
    loadMore,
    reset,
  };
}
