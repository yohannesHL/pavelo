"use client";

import { Grid3X3, List, Map, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ViewControlsProps {
  view: "grid" | "list" | "map";
  onViewChange: (view: "grid" | "list" | "map") => void;
  onToggleFilters: () => void;
  activeFilterCount: number;
  totalResults: number;
}

export function ViewControls({
  view,
  onViewChange,
  onToggleFilters,
  activeFilterCount,
  totalResults,
}: ViewControlsProps) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {/* Filter toggle (mobile) */}
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleFilters}
          className="relative gap-1.5 lg:hidden"
          aria-label="Toggle filters"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <Badge
              variant="accent"
              className="absolute -right-1.5 -top-1.5 h-4 min-w-4 items-center justify-center p-0 text-[9px]"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* View toggles */}
      <div className="flex items-center rounded-[var(--radius-input)] border border-[var(--border)] p-0.5">
        <button
          onClick={() => onViewChange("grid")}
          className={`flex items-center gap-1 rounded-[calc(var(--radius-input)-2px)] px-2.5 py-1 text-xs font-medium transition-all duration-[200ms] ease-out ${
            view === "grid"
              ? "bg-[var(--color-primary)] text-white shadow-sm"
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
          aria-label="Grid view"
          aria-pressed={view === "grid"}
        >
          <Grid3X3 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Grid</span>
        </button>
        <button
          onClick={() => onViewChange("list")}
          className={`flex items-center gap-1 rounded-[calc(var(--radius-input)-2px)] px-2.5 py-1 text-xs font-medium transition-all duration-[200ms] ease-out ${
            view === "list"
              ? "bg-[var(--color-primary)] text-white shadow-sm"
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
          aria-label="List view"
          aria-pressed={view === "list"}
        >
          <List className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">List</span>
        </button>
        <button
          onClick={() => onViewChange("map")}
          className={`flex items-center gap-1 rounded-[calc(var(--radius-input)-2px)] px-2.5 py-1 text-xs font-medium transition-all duration-[200ms] ease-out ${
            view === "map"
              ? "bg-[var(--color-primary)] text-white shadow-sm"
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
          aria-label="Map view"
          aria-pressed={view === "map"}
        >
          <Map className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Map</span>
        </button>
      </div>
    </div>
  );
}
