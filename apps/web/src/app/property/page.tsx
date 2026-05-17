"use client";

import { useState, useCallback, useEffect } from "react";
import { SearchBar } from "@/components/search/search-bar";
import {
  FilterSidebar,
  type SearchFilterState,
} from "@/components/search/filter-sidebar";
import { SearchResultsGrid } from "@/components/search/search-results-grid";
import { ViewControls } from "@/components/search/view-controls";
import { PropertyMap } from "@/components/maps/property-map";
import { Badge } from "@/components/ui/badge";

// Mock data — connected to tRPC search.query in production
const MOCK_PROPERTIES = [
  {
    id: "1",
    title: "Victorian Terrace in Islington",
    price: 895000,
    propertyType: "terraced",
    status: "for_sale",
    bedrooms: 3,
    bathrooms: 2,
    squareFeet: 1200,
    addressLine1: "42 Arlington Road",
    city: "London",
    postcode: "N1 7BA",
    latitude: 51.5362,
    longitude: -0.1033,
    images: [],
    features: ["Garden", "Period Features", "Open Plan Kitchen"],
    searchScore: 0.94,
  },
  {
    id: "2",
    title: "Modern Penthouse with City Views",
    price: 1250000,
    propertyType: "flat",
    status: "for_sale",
    bedrooms: 2,
    bathrooms: 2,
    squareFeet: 950,
    addressLine1: "Tower Bridge House",
    city: "London",
    postcode: "SE1 2UP",
    latitude: 51.5055,
    longitude: -0.0754,
    images: [],
    features: ["Balcony", "Concierge", "Gym"],
    searchScore: 0.87,
  },
  {
    id: "3",
    title: "Detached Family Home with Garden",
    price: 650000,
    propertyType: "detached",
    status: "for_sale",
    bedrooms: 4,
    bathrooms: 3,
    squareFeet: 2100,
    addressLine1: "15 Oak Lane",
    city: "Oxford",
    postcode: "OX2 6HT",
    latitude: 51.7548,
    longitude: -1.2544,
    images: [],
    features: ["Double Garage", "South-Facing Garden", "En-suite"],
    searchScore: 0.82,
  },
  {
    id: "4",
    title: "Charming Cottage in the Cotswolds",
    price: 475000,
    propertyType: "cottage",
    status: "for_sale",
    bedrooms: 2,
    bathrooms: 1,
    squareFeet: 800,
    addressLine1: "Rose Cottage",
    city: "Burford",
    postcode: "OX18 4SN",
    latitude: 51.8095,
    longitude: -1.6385,
    images: [],
    features: ["Period Features", "Garden", "Fireplace"],
    searchScore: 0.78,
  },
  {
    id: "5",
    title: "Edwardian Semi in Leafy Suburb",
    price: 725000,
    propertyType: "semi_detached",
    status: "under_offer",
    bedrooms: 3,
    bathrooms: 2,
    squareFeet: 1400,
    addressLine1: "28 Elm Avenue",
    city: "Bristol",
    postcode: "BS6 6AT",
    latitude: 51.4688,
    longitude: -2.6005,
    images: [],
    features: ["Bay Windows", "Garden", "Cellar"],
    searchScore: 0.73,
  },
  {
    id: "6",
    title: "Luxury Mansion with Grounds",
    price: 2500000,
    propertyType: "mansion",
    status: "for_sale",
    bedrooms: 6,
    bathrooms: 5,
    squareFeet: 5500,
    addressLine1: "Westwood Manor",
    city: "Bath",
    postcode: "BA1 3NR",
    latitude: 51.3811,
    longitude: -2.3590,
    images: [],
    features: ["Swimming Pool", "Tennis Court", "Stables"],
    searchScore: 0.65,
  },
];

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
  const [isLoading, setIsLoading] = useState(false);
  const [properties, setProperties] = useState(MOCK_PROPERTIES);

  // Count active filters
  const activeFilterCount = [
    filters.minPrice > 0,
    filters.maxPrice < 5_000_000,
    filters.minBedrooms > 0,
    filters.propertyTypes.length > 0,
    filters.location.length > 0,
  ].filter(Boolean).length;

  // Handle search
  const handleSearch = useCallback(() => {
    setIsLoading(true);
    // In production: call tRPC search.query
    // For now, filter mock data client-side
    let items = [...MOCK_PROPERTIES];

    if (query) {
      const q = query.toLowerCase();
      items = items.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.city.toLowerCase().includes(q) ||
          p.postcode.toLowerCase().includes(q) ||
          p.features.some((f) => f.toLowerCase().includes(q))
      );
    }

    if (filters.minPrice > 0) items = items.filter((p) => p.price >= filters.minPrice);
    if (filters.maxPrice < 5_000_000) items = items.filter((p) => p.price <= filters.maxPrice);
    if (filters.minBedrooms > 0) items = items.filter((p) => p.bedrooms >= filters.minBedrooms);
    if (filters.propertyTypes.length > 0)
      items = items.filter((p) => filters.propertyTypes.includes(p.propertyType));
    if (filters.location) {
      const loc = filters.location.toLowerCase();
      items = items.filter(
        (p) => p.city.toLowerCase().includes(loc) || p.postcode.toLowerCase().includes(loc)
      );
    }

    // Sort
    if (filters.sortBy === "price_asc") items.sort((a, b) => a.price - b.price);
    else if (filters.sortBy === "price_desc") items.sort((a, b) => b.price - a.price);
    else if (filters.sortBy === "bedrooms") items.sort((a, b) => b.bedrooms - a.bedrooms);
    else if (filters.sortBy === "newest") { /* keep default order */ }
    // relevance = keep searchScore order (already sorted)

    setTimeout(() => {
      setProperties(items);
      setIsLoading(false);
    }, 300);
  }, [query, filters]);

  // Auto-search on filter change
  useEffect(() => {
    handleSearch();
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

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
              totalResults={properties.length}
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
                  totalCount={properties.length}
                  isLoading={isLoading}
                  hasMore={false}
                  onLoadMore={() => {}}
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
                totalCount={properties.length}
                isLoading={isLoading}
                hasMore={false}
                onLoadMore={() => {}}
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
