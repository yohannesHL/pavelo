"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PropertySearchProps {
  query: string;
  onQueryChange: (query: string) => void;
  onToggleFilters: () => void;
  activeFilterCount: number;
}

export function PropertySearch({
  query,
  onQueryChange,
  onToggleFilters,
  activeFilterCount,
}: PropertySearchProps) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
        <Input
          placeholder="Search by location, postcode, or keywords…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className="pl-10"
          aria-label="Search properties"
        />
      </div>
      <Button
        variant="outline"
        onClick={onToggleFilters}
        className="relative gap-2"
        aria-label="Toggle filters"
      >
        <SlidersHorizontal className="h-4 w-4" />
        <span className="hidden sm:inline">Filters</span>
        {activeFilterCount > 0 && (
          <Badge variant="accent" className="absolute -right-1.5 -top-1.5 h-5 w-5 items-center justify-center p-0 text-[10px]">
            {activeFilterCount}
          </Badge>
        )}
      </Button>
    </div>
  );
}
