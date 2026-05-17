"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  X,
  Home,
  DollarSign,
  BedDouble,
  MapPin,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { RangeSlider } from "@/components/ui/range-slider";

export interface SearchFilterState {
  minPrice: number;
  maxPrice: number;
  minBedrooms: number;
  maxBedrooms: number;
  propertyTypes: string[];
  location: string;
  status: string;
  sortBy: string;
}

interface FilterSidebarProps {
  filters: SearchFilterState;
  onChange: (filters: Partial<SearchFilterState>) => void;
  onReset: () => void;
  onClose?: () => void;
  activeCount: number;
  isMobile?: boolean;
}

const PROPERTY_TYPES = [
  { value: "detached", label: "Detached", icon: "🏠" },
  { value: "semi_detached", label: "Semi-Detached", icon: "🏘️" },
  { value: "terraced", label: "Terraced", icon: "🏚️" },
  { value: "flat", label: "Flat", icon: "🏢" },
  { value: "bungalow", label: "Bungalow", icon: "🏡" },
  { value: "cottage", label: "Cottage", icon: "🛖" },
  { value: "mansion", label: "Mansion", icon: "🏰" },
];

const BEDROOM_OPTIONS = [
  { value: 0, label: "Any" },
  { value: 1, label: "1" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 4, label: "4" },
  { value: 5, label: "5+" },
];

const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "price_asc", label: "Price: Low → High" },
  { value: "price_desc", label: "Price: High → Low" },
  { value: "newest", label: "Newest First" },
  { value: "bedrooms", label: "Most Bedrooms" },
];

const formatPrice = (v: number) => {
  if (v >= 1_000_000) return `£${(v / 1_000_000).toFixed(1)}m`;
  if (v >= 1_000) return `£${(v / 1_000).toFixed(0)}k`;
  return `£${v}`;
};

function Section({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-[var(--border)] last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-[var(--muted)] transition-colors"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-[var(--color-accent)]" />
          {title}
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-[var(--muted-foreground)]" />
        ) : (
          <ChevronDown className="h-4 w-4 text-[var(--muted-foreground)]" />
        )}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

export function FilterSidebar({
  filters,
  onChange,
  onReset,
  onClose,
  activeCount,
  isMobile = false,
}: FilterSidebarProps) {
  const togglePropertyType = (type: string) => {
    const current = filters.propertyTypes;
    const updated = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    onChange({ propertyTypes: updated });
  };

  const content = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-[var(--color-primary)]" />
          <span className="text-sm font-semibold">Filters</span>
          {activeCount > 0 && (
            <Badge variant="accent" className="h-5 min-w-5 items-center justify-center p-0 text-[10px]">
              {activeCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <Button variant="ghost" size="sm" onClick={onReset} className="text-xs">
              Reset
            </Button>
          )}
          {isMobile && onClose && (
            <button onClick={onClose} className="p-1 rounded hover:bg-[var(--muted)]" aria-label="Close filters">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Price Range */}
      <Section title="Price Range" icon={DollarSign}>
        <RangeSlider
          min={0}
          max={5_000_000}
          step={25_000}
          value={[filters.minPrice, filters.maxPrice]}
          onChange={([min, max]) => onChange({ minPrice: min, maxPrice: max })}
          formatLabel={formatPrice}
          aria-label="Price range"
        />
      </Section>

      {/* Bedrooms */}
      <Section title="Bedrooms" icon={BedDouble}>
        <div className="flex flex-wrap gap-1.5">
          {BEDROOM_OPTIONS.map((opt) => {
            const isSelected = filters.minBedrooms === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => onChange({ minBedrooms: opt.value })}
                className={`rounded-[var(--radius-input)] border px-3 py-1.5 text-xs font-medium transition-all duration-[200ms] ease-out ${
                  isSelected
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
                    : "border-[var(--border)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                }`}
                aria-pressed={isSelected}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </Section>

      {/* Property Type */}
      <Section title="Property Type" icon={Home}>
        <div className="grid grid-cols-2 gap-1.5">
          {PROPERTY_TYPES.map((type) => {
            const isSelected = filters.propertyTypes.includes(type.value);
            return (
              <button
                key={type.value}
                onClick={() => togglePropertyType(type.value)}
                className={`flex items-center gap-1.5 rounded-[var(--radius-input)] border px-2.5 py-2 text-xs transition-all duration-[200ms] ease-out ${
                  isSelected
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)]/5 text-[var(--color-accent)] font-medium"
                    : "border-[var(--border)] hover:border-[var(--color-accent)]/50"
                }`}
                aria-pressed={isSelected}
              >
                <span>{type.icon}</span>
                <span>{type.label}</span>
              </button>
            );
          })}
        </div>
      </Section>

      {/* Location */}
      <Section title="Location" icon={MapPin}>
        <Input
          placeholder="City, area, or postcode…"
          value={filters.location}
          onChange={(e) => onChange({ location: e.target.value })}
          aria-label="Location filter"
          className="text-sm"
        />
      </Section>

      {/* Sort */}
      <div className="border-t border-[var(--border)] px-4 py-3">
        <label className="mb-1.5 block text-xs font-medium text-[var(--muted-foreground)]">
          Sort By
        </label>
        <div className="flex flex-wrap gap-1.5">
          {SORT_OPTIONS.map((opt) => {
            const isSelected = filters.sortBy === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => onChange({ sortBy: opt.value })}
                className={`rounded-full border px-3 py-1 text-[11px] font-medium transition-all duration-[200ms] ease-out ${
                  isSelected
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                    : "border-[var(--border)] hover:border-[var(--color-primary)]/50"
                }`}
                aria-pressed={isSelected}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        {/* Bottom sheet */}
        <div className="relative mt-auto max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white animate-in slide-in-from-bottom duration-300">
          <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-[var(--muted)]" />
          {content}
          {/* Apply button */}
          <div className="sticky bottom-0 border-t border-[var(--border)] bg-white p-4">
            <Button onClick={onClose} className="w-full" variant="accent">
              Show Results
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-72 shrink-0 overflow-y-auto rounded-[var(--radius-card)] border border-[var(--border)] bg-white shadow-[var(--shadow-sm)]">
      {content}
    </div>
  );
}
