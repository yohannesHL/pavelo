"use client";

import { useState } from "react";
import { PropertySearch } from "@/components/property/property-search";
import { PropertyGrid } from "@/components/property/property-grid";
import { PropertyFilters, type FilterState } from "@/components/property/property-filters";

const INITIAL_FILTERS: FilterState = {
  query: "",
  minPrice: undefined,
  maxPrice: undefined,
  propertyType: undefined,
  minBedrooms: undefined,
  location: "",
  sortBy: "createdAt",
  sortOrder: "desc",
};

export default function PropertyListingPage() {
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [showFilters, setShowFilters] = useState(false);

  const updateFilter = (partial: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  };

  const resetFilters = () => setFilters(INITIAL_FILTERS);

  const activeFilterCount = Object.entries(filters).filter(
    ([key, val]) => {
      if (key === "query" || key === "sortBy" || key === "sortOrder") return false;
      if (key === "location") return val && (val as string).length > 0;
      return val !== undefined && val !== "";
    }
  ).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-[var(--font-heading)] text-3xl font-bold tracking-tight">
          Property Search
        </h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Find your perfect property with Pavelo
        </p>
      </div>

      {/* Search bar */}
      <PropertySearch
        query={filters.query}
        onQueryChange={(query) => updateFilter({ query })}
        onToggleFilters={() => setShowFilters(!showFilters)}
        activeFilterCount={activeFilterCount}
      />

      {/* Filters panel */}
      {showFilters && (
        <PropertyFilters
          filters={filters}
          onChange={updateFilter}
          onReset={resetFilters}
        />
      )}

      {/* Results grid */}
      <PropertyGrid filters={filters} />
    </div>
  );
}
