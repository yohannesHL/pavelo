"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { SearchBar } from "@/components/search/search-bar";
import {
  FilterSidebar,
  type SearchFilterState,
} from "@/components/search/filter-sidebar";
import { SearchResultsGrid } from "@/components/search/search-results-grid";
import { ViewControls } from "@/components/search/view-controls";
import { PropertyMap } from "@/components/maps/property-map";
import { Badge } from "@/components/ui/badge";
import { usePropertySearch } from "@/hooks/use-property-search";

const DEFAULT_FILTERS: SearchFilterState = {
  minPrice: 0,
  maxPrice: 5_000_000,
  minBedrooms: 0,
  maxBedrooms: 20,
  propertyTypes: [],
  location: "",
  status: "for_sale",
  sortBy: "relevance",
};

export default function PropertySearchPage() {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilterState>(DEFAULT_FILTERS);
  const [view, setView] = useState<"grid" | "list" | "map">("grid");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [activePropertyId, setActivePropertyId] = useState<string | null>(null);

  const {
    results: properties,
    total: totalCount,
    hasMore,
    isLoading,
    error,
    search,
    loadMore,
    reset,
  } = usePropertySearch();

  // Track whether user has ever searched (to avoid auto-search on mount with empty query)
  const hasSearched = useRef(false);

  // Build search params from current UI state
  const buildSearchParams = useCallback(() => {
    return {
      query: query || "property", // tRPC requires min 1 char
      filters: {
        minPrice: filters.minPrice > 0 ? filters.minPrice : undefined,
        maxPrice: filters.maxPrice < 5_000_000 ? filters.maxPrice : undefined,
        minBedrooms: filters.minBedrooms > 0 ? filters.minBedrooms : undefined,
        propertyType: filters.propertyTypes.length === 1 ? filters.propertyTypes[0] : undefined,
        city: filters.location || undefined,
        status: filters.status || undefined,
      },
      sortBy: filters.sortBy as "relevance" | "price_asc" | "price_desc" | "newest" | "bedrooms",
    };
  }, [query, filters]);

  // Handle search
  const handleSearch = useCallback(() => {
    hasSearched.current = true;
    search(buildSearchParams());
  }, [search, buildSearchParams]);

  // Handle load more
  const handleLoadMore = useCallback(() => {
    loadMore(buildSearchParams());
  }, [loadMore, buildSearchParams]);

  // Auto-search on filter change (only after initial search)
  useEffect(() => {
    if (hasSearched.current) {
      search(buildSearchParams());
    }
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  // Count active filters
  const activeFilterCount = [
    filters.minPrice > 0,
    filters.maxPrice < 5_000_000,
    filters.minBedrooms > 0,
    filters.propertyTypes.length > 0,
    filters.location.length > 0,
  ].filter(Boolean).length;

  const updateFilters = (partial: Partial<SearchFilterState>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  };

  const resetFilters = () => setFilters(DEFAULT_FILTERS);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Hero search section */}
      <div className="border-b border-[var(--border)] bg-gradient-to-b from-[var(--color-primary)]/[0.03] to-transparent">
        <div className="mx-auto max-w-7xl px-4 pb-6 pt-8 sm:px-6">
          <div className="mb-6 text-center">
            <h1 className="font-[var(--font-heading)] text-3xl font-bold tracking-tight sm:text-4xl">
              Find Your Perfect Property
            </h1>
            <p className="mt-2 text-sm text-[var(--muted-foreground)] sm:text-base">
              Describe what you're looking for — Xara understands natural language
            </p>
          </div>
          <div className="mx-auto max-w-2xl">
            <SearchBar
              query={query}
              onQueryChange={setQuery}
              onSearch={handleSearch}
              isLoading={isLoading}
            />
          </div>
          {/* Error banner */}
          {error && (
            <div className="mx-auto mt-3 max-w-2xl rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              Search unavailable: {error}. Please try again.
            </div>
          )}
          {/* Active filter tags */}
          {activeFilterCount > 0 && (
            <div className="mx-auto mt-4 flex max-w-2xl flex-wrap items-center gap-2">
              <span className="text-xs text-[var(--muted-foreground)]">Active:</span>
              {filters.minPrice > 0 && (
                <Badge variant="outline" className="gap-1 text-[10px]">
                  Min £{(filters.minPrice / 1000).toFixed(0)}k
                  <button onClick={() => updateFilters({ minPrice: 0 })} className="ml-1" aria-label="Remove min price filter">×</button>
                </Badge>
              )}
              {filters.maxPrice < 5_000_000 && (
                <Badge variant="outline" className="gap-1 text-[10px]">
                  Max £{filters.maxPrice >= 1_000_000 ? `${(filters.maxPrice / 1_000_000).toFixed(1)}m` : `${(filters.maxPrice / 1000).toFixed(0)}k`}
                  <button onClick={() => updateFilters({ maxPrice: 5_000_000 })} className="ml-1" aria-label="Remove max price filter">×</button>
                </Badge>
              )}
              {filters.minBedrooms > 0 && (
                <Badge variant="outline" className="gap-1 text-[10px]">
                  {filters.minBedrooms}+ beds
                  <button onClick={() => updateFilters({ minBedrooms: 0 })} className="ml-1" aria-label="Remove bedrooms filter">×</button>
                </Badge>
              )}
              {filters.propertyTypes.map((t) => (
                <Badge key={t} variant="outline" className="gap-1 text-[10px]">
                  {t.replace("_", "-")}
                  <button
                    onClick={() =>
                      updateFilters({
                        propertyTypes: filters.propertyTypes.filter((x) => x !== t),
                      })
                    }
                    className="ml-1"
                    aria-label={`Remove ${t} filter`}
                  >×</button>
                </Badge>
              ))}
              {filters.location && (
                <Badge variant="outline" className="gap-1 text-[10px]">
                  📍 {filters.location}
                  <button onClick={() => updateFilters({ location: "" })} className="ml-1" aria-label="Remove location filter">×</button>
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main content area */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="flex gap-6">
          {/* Desktop filter sidebar */}
          <div className="hidden lg:block">
            <div className="sticky top-6">
              <FilterSidebar
                filters={filters}
                onChange={updateFilters}
                onReset={resetFilters}
                activeCount={activeFilterCount}
              />
            </div>
          </div>

          {/* Results area */}
          <div className="min-w-0 flex-1">
            <ViewControls
              view={view}
              onViewChange={setView}
              onToggleFilters={() => setShowMobileFilters(true)}
              activeFilterCount={activeFilterCount}
              totalResults={totalCount}
            />

            {view === "map" ? (
              <div className="grid gap-4 lg:grid-cols-2">
                <PropertyMap
                  properties={properties}
                  activePropertyId={activePropertyId}
                  onPropertySelect={setActivePropertyId}
                  onPropertyHover={setActivePropertyId}
                  className="h-[500px] lg:h-[calc(100vh-220px)] lg:sticky lg:top-6"
                />
                <SearchResultsGrid
                  properties={properties}
                  totalCount={totalCount}
                  isLoading={isLoading}
                  hasMore={hasMore}
                  onLoadMore={handleLoadMore}
                  activePropertyId={activePropertyId}
                  onPropertyHover={setActivePropertyId}
                  onPropertyClick={setActivePropertyId}
                  layout="list"
                  query={query}
                />
              </div>
            ) : (
              <SearchResultsGrid
                properties={properties}
                totalCount={totalCount}
                isLoading={isLoading}
                hasMore={hasMore}
                onLoadMore={handleLoadMore}
                activePropertyId={activePropertyId}
                onPropertyHover={setActivePropertyId}
                onPropertyClick={setActivePropertyId}
                layout={view}
                query={query}
              />
            )}
          </div>
        </div>
      </div>

      {/* Mobile filter bottom sheet */}
      {showMobileFilters && (
        <FilterSidebar
          filters={filters}
          onChange={updateFilters}
          onReset={resetFilters}
          onClose={() => setShowMobileFilters(false)}
          activeCount={activeFilterCount}
          isMobile
        />
      )}
    </div>
  );
}
