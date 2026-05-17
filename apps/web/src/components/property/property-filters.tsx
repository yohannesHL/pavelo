"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export interface FilterState {
  query: string;
  minPrice: number | undefined;
  maxPrice: number | undefined;
  propertyType: string | undefined;
  minBedrooms: number | undefined;
  location: string;
  sortBy: string;
  sortOrder: string;
}

interface PropertyFiltersProps {
  filters: FilterState;
  onChange: (partial: Partial<FilterState>) => void;
  onReset: () => void;
}

const PROPERTY_TYPES = [
  { value: "", label: "Any Type" },
  { value: "detached", label: "Detached" },
  { value: "semi_detached", label: "Semi-Detached" },
  { value: "terraced", label: "Terraced" },
  { value: "flat", label: "Flat" },
  { value: "bungalow", label: "Bungalow" },
  { value: "cottage", label: "Cottage" },
  { value: "mansion", label: "Mansion" },
];

const BEDROOM_OPTIONS = [
  { value: "", label: "Any" },
  { value: "1", label: "1+" },
  { value: "2", label: "2+" },
  { value: "3", label: "3+" },
  { value: "4", label: "4+" },
  { value: "5", label: "5+" },
];

export function PropertyFilters({ filters, onChange, onReset }: PropertyFiltersProps) {
  return (
    <div className="mb-6 rounded-[var(--radius-card)] border border-[var(--border)] bg-white p-4 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Price Range */}
        <div className="space-y-1.5">
          <Label className="text-xs">Min Price</Label>
          <Input
            type="number"
            placeholder="£0"
            value={filters.minPrice ?? ""}
            onChange={(e) =>
              onChange({ minPrice: e.target.value ? Number(e.target.value) : undefined })
            }
            min={0}
            aria-label="Minimum price"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Max Price</Label>
          <Input
            type="number"
            placeholder="No limit"
            value={filters.maxPrice ?? ""}
            onChange={(e) =>
              onChange({ maxPrice: e.target.value ? Number(e.target.value) : undefined })
            }
            min={0}
            aria-label="Maximum price"
          />
        </div>

        {/* Property Type */}
        <div className="space-y-1.5">
          <Label className="text-xs">Property Type</Label>
          <Select
            value={filters.propertyType ?? ""}
            onChange={(e) =>
              onChange({ propertyType: e.target.value || undefined })
            }
            aria-label="Property type filter"
          >
            {PROPERTY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </div>

        {/* Bedrooms */}
        <div className="space-y-1.5">
          <Label className="text-xs">Bedrooms</Label>
          <Select
            value={filters.minBedrooms?.toString() ?? ""}
            onChange={(e) =>
              onChange({ minBedrooms: e.target.value ? Number(e.target.value) : undefined })
            }
            aria-label="Minimum bedrooms"
          >
            {BEDROOM_OPTIONS.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </Select>
        </div>

        {/* Location */}
        <div className="space-y-1.5">
          <Label className="text-xs">Location</Label>
          <Input
            placeholder="City or postcode"
            value={filters.location}
            onChange={(e) => onChange({ location: e.target.value })}
            aria-label="Location filter"
          />
        </div>
      </div>

      {/* Sort + Reset */}
      <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-3">
        <div className="flex items-center gap-3">
          <Label className="text-xs text-[var(--muted-foreground)]">Sort by</Label>
          <Select
            value={filters.sortBy}
            onChange={(e) => onChange({ sortBy: e.target.value })}
            className="w-auto"
            aria-label="Sort by"
          >
            <option value="createdAt">Newest</option>
            <option value="price">Price</option>
            <option value="bedrooms">Bedrooms</option>
          </Select>
          <Select
            value={filters.sortOrder}
            onChange={(e) => onChange({ sortOrder: e.target.value })}
            className="w-auto"
            aria-label="Sort order"
          >
            <option value="desc">High → Low</option>
            <option value="asc">Low → High</option>
          </Select>
        </div>
        <Button variant="ghost" size="sm" onClick={onReset}>
          Reset Filters
        </Button>
      </div>
    </div>
  );
}
