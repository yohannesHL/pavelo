"use client";

import { SearchPropertyCard } from "./search-property-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Search, Loader2 } from "lucide-react";

interface SearchResultProperty {
  id: string;
  title: string;
  price: number;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  city: string;
  postcode: string;
  images: string[];
  searchScore?: number | null;
  [key: string]: unknown;
}

interface SearchResultsGridProps {
  properties: SearchResultProperty[];
  totalCount: number;
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  activePropertyId: string | null;
  onPropertyHover: (id: string | null) => void;
  onPropertyClick: (id: string) => void;
  layout: "grid" | "list";
  query: string;
}

export function SearchResultsGrid({
  properties,
  totalCount,
  isLoading,
  hasMore,
  onLoadMore,
  activePropertyId,
  onPropertyHover,
  onPropertyClick,
  layout,
  query,
}: SearchResultsGridProps) {
  // Loading state
  if (isLoading && properties.length === 0) {
    return <SearchGridSkeleton layout={layout} />;
  }

  // Empty state
  if (!isLoading && properties.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--muted)]">
          <Search className="h-7 w-7 text-[var(--muted-foreground)]" />
        </div>
        <h3 className="text-lg font-semibold">No properties match</h3>
        <p className="mt-1 max-w-md text-sm text-[var(--muted-foreground)]">
          {query
            ? `We couldn't find properties matching "${query}". Try adjusting your filters or broadening your search.`
            : "Start searching to discover your ideal property."}
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Results count */}
      <p className="mb-4 text-sm text-[var(--muted-foreground)]">
        <span className="font-[var(--font-data)] font-semibold text-[var(--foreground)]">
          {totalCount}
        </span>{" "}
        {totalCount === 1 ? "property" : "properties"} found
        {query && (
          <span>
            {" "}
            for <span className="font-medium text-[var(--foreground)]">"{query}"</span>
          </span>
        )}
      </p>

      {/* Grid/List */}
      <div
        className={
          layout === "grid"
            ? "grid gap-6 sm:grid-cols-2 xl:grid-cols-3"
            : "flex flex-col gap-3"
        }
      >
        {properties.map((property) => (
          <SearchPropertyCard
            key={property.id}
            property={property}
            isActive={activePropertyId === property.id}
            onHover={onPropertyHover}
            onClick={onPropertyClick}
            layout={layout}
          />
        ))}
      </div>

      {/* Load more / Loading indicator */}
      {isLoading && properties.length > 0 && (
        <div className="mt-6 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--color-accent)]" />
        </div>
      )}

      {hasMore && !isLoading && (
        <div className="mt-6 flex justify-center">
          <Button variant="outline" onClick={onLoadMore} className="gap-2">
            Load more results
          </Button>
        </div>
      )}
    </div>
  );
}

function SearchGridSkeleton({ layout }: { layout: "grid" | "list" }) {
  if (layout === "list") {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="flex overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)]"
          >
            <Skeleton className="h-32 w-48 shrink-0 rounded-none" />
            <div className="flex-1 p-3 space-y-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)]"
        >
          <Skeleton className="aspect-video w-full rounded-none" />
          <div className="p-4 space-y-3">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <div className="flex gap-4">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
