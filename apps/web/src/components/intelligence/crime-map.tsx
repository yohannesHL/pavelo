"use client";

/**
 * CrimeMap — Choropleth crime density visualization (S7-01)
 *
 * - Police UK API integration via tRPC
 * - Category filter (burglary, robbery, ASB, vehicle crime, etc.)
 * - Time range selector (1/3/6/12 months)
 * - Color scale: green (safe) → red (high crime)
 * - Legend with category counts
 * - Works both standalone and inline in chat
 */

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, AlertTriangle, Filter, Clock, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  MapContainer,
  MapPin,
  MapLegend,
  geoToRelative,
  calculateBounds,
} from "./map-container";

// ---------- Types ----------

interface CrimeRecord {
  id: string;
  category: string;
  location: {
    latitude: string;
    longitude: string;
    street: { id: number; name: string };
  };
  month: string;
}

interface CrimeCategoryCount {
  category: string;
  count: number;
  label: string;
}

interface CrimeMapProps {
  crimes: CrimeRecord[];
  categories: CrimeCategoryCount[];
  center: { lat: number; lng: number };
  dateRange: { from: string; to: string };
  total: number;
  /** Compact mode for inline chat rendering */
  compact?: boolean;
  /** Available months to select */
  onMonthsChange?: (months: number) => void;
  currentMonths?: number;
  className?: string;
}

// ---------- Crime category config ----------

const CATEGORY_COLORS: Record<string, string> = {
  "anti-social-behaviour": "#f59e0b",
  burglary: "#ef4444",
  robbery: "#dc2626",
  "vehicle-crime": "#f97316",
  "violent-crime": "#b91c1c",
  "criminal-damage-arson": "#ea580c",
  shoplifting: "#fb923c",
  "other-theft": "#f59e0b",
  drugs: "#8b5cf6",
  "public-order": "#6366f1",
  "possession-of-weapons": "#e11d48",
  "bicycle-theft": "#eab308",
  "theft-from-the-person": "#d97706",
  "other-crime": "#94a3b8",
};

const DENSITY_SCALE = [
  { color: "#10b981", label: "Low" },
  { color: "#84cc16", label: "" },
  { color: "#eab308", label: "Moderate" },
  { color: "#f97316", label: "" },
  { color: "#ef4444", label: "High" },
];

const TIME_RANGES = [
  { value: 1, label: "1 month" },
  { value: 3, label: "3 months" },
  { value: 6, label: "6 months" },
  { value: 12, label: "12 months" },
];

// ---------- Component ----------

export function CrimeMap({
  crimes,
  categories,
  center,
  dateRange,
  total,
  compact = false,
  onMonthsChange,
  currentMonths = 3,
  className = "",
}: CrimeMapProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [hoveredCrime, setHoveredCrime] = useState<string | null>(null);

  // Filter crimes by category
  const filteredCrimes = useMemo(() => {
    if (!selectedCategory) return crimes;
    return crimes.filter((c) => c.category === selectedCategory);
  }, [crimes, selectedCategory]);

  // Cluster crimes by street for density visualization
  const clusters = useMemo(() => {
    const streetMap = new Map<
      string,
      { lat: number; lng: number; count: number; street: string; categories: Record<string, number> }
    >();

    for (const crime of filteredCrimes) {
      const key = `${crime.location.street.id}`;
      const existing = streetMap.get(key);
      if (existing) {
        existing.count += 1;
        existing.categories[crime.category] =
          (existing.categories[crime.category] || 0) + 1;
      } else {
        streetMap.set(key, {
          lat: parseFloat(crime.location.latitude),
          lng: parseFloat(crime.location.longitude),
          count: 1,
          street: crime.location.street.name,
          categories: { [crime.category]: 1 },
        });
      }
    }

    return Array.from(streetMap.values());
  }, [filteredCrimes]);

  // Calculate bounds for positioning
  const locations = clusters.map((c) => ({ lat: c.lat, lng: c.lng }));
  if (locations.length === 0) {
    locations.push(center);
  }
  const bounds = calculateBounds(locations);

  // Max cluster size for color scaling
  const maxCount = Math.max(1, ...clusters.map((c) => c.count));

  function getDensityColor(count: number): string {
    const ratio = count / maxCount;
    if (ratio < 0.2) return DENSITY_SCALE[0].color;
    if (ratio < 0.4) return DENSITY_SCALE[1].color;
    if (ratio < 0.6) return DENSITY_SCALE[2].color;
    if (ratio < 0.8) return DENSITY_SCALE[3].color;
    return DENSITY_SCALE[4].color;
  }

  const filteredCategories = useMemo(() => {
    if (!selectedCategory) return categories;
    return categories.filter((c) => c.category === selectedCategory);
  }, [categories, selectedCategory]);

  return (
    <div className={`crime-map ${className}`}>
      {/* Header */}
      {!compact && (
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100">
              <Shield className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--foreground)]">
                Crime Map
              </h3>
              <p className="text-xs text-[var(--muted-foreground)]">
                {total} incidents · {dateRange.from} to {dateRange.to}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Time range selector */}
            <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
              {TIME_RANGES.map((range) => (
                <button
                  key={range.value}
                  onClick={() => onMonthsChange?.(range.value)}
                  className={`px-2 py-1 text-[10px] font-medium transition-colors ${
                    currentMonths === range.value
                      ? "bg-[var(--color-primary)] text-white"
                      : "bg-white hover:bg-gray-50 text-[var(--muted-foreground)]"
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-3 w-3" />
              Filter
              <ChevronDown
                className={`h-3 w-3 transition-transform ${showFilters ? "rotate-180" : ""}`}
              />
            </Button>
          </div>
        </div>
      )}

      {/* Category filters */}
      <AnimatePresence>
        {(showFilters || compact) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mb-3 flex flex-wrap gap-1.5">
              <Badge
                variant={selectedCategory === null ? "default" : "outline"}
                className="cursor-pointer text-[10px]"
                onClick={() => setSelectedCategory(null)}
              >
                All ({total})
              </Badge>
              {categories.slice(0, compact ? 6 : 14).map((cat) => (
                <Badge
                  key={cat.category}
                  variant={
                    selectedCategory === cat.category ? "default" : "outline"
                  }
                  className="cursor-pointer text-[10px]"
                  onClick={() =>
                    setSelectedCategory(
                      selectedCategory === cat.category ? null : cat.category
                    )
                  }
                  style={
                    selectedCategory === cat.category
                      ? { backgroundColor: CATEGORY_COLORS[cat.category] }
                      : {}
                  }
                >
                  {cat.label} ({cat.count})
                </Badge>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map */}
      <MapContainer
        center={center}
        height={compact ? "280px" : "400px"}
        attribution="© Police UK Open Data"
        legend={
          <MapLegend
            title="Crime Density"
            items={DENSITY_SCALE}
            gradient
          />
        }
      >
        {clusters.map((cluster, i) => {
          const pos = geoToRelative(cluster.lat, cluster.lng, bounds);
          const color = getDensityColor(cluster.count);
          const isHovered = hoveredCrime === `cluster-${i}`;

          return (
            <MapPin
              key={i}
              x={pos.x}
              y={pos.y}
              color={color}
              size={cluster.count > maxCount * 0.5 ? "lg" : cluster.count > maxCount * 0.2 ? "md" : "sm"}
              active={isHovered}
              pulsing={cluster.count > maxCount * 0.7}
              onHover={(h) => setHoveredCrime(h ? `cluster-${i}` : null)}
              ariaLabel={`${cluster.street}: ${cluster.count} incidents`}
            >
              <div className="relative">
                {/* Density circle */}
                <div
                  className={`rounded-full border-2 border-white/80 shadow-lg transition-all duration-200 ${
                    isHovered ? "scale-150" : ""
                  }`}
                  style={{
                    backgroundColor: color,
                    width: `${Math.max(12, Math.min(32, 8 + cluster.count * 2))}px`,
                    height: `${Math.max(12, Math.min(32, 8 + cluster.count * 2))}px`,
                    opacity: 0.8,
                  }}
                />
                {/* Count label on hover */}
                {isHovered && (
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-[10px] text-white shadow-lg">
                    <p className="font-medium">{cluster.street}</p>
                    <p className="text-white/70">{cluster.count} incidents</p>
                  </div>
                )}
              </div>
            </MapPin>
          );
        })}
      </MapContainer>

      {/* Category breakdown (non-compact) */}
      {!compact && (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {filteredCategories.slice(0, 8).map((cat) => (
            <Card
              key={cat.category}
              className="flex items-center gap-2 p-2 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() =>
                setSelectedCategory(
                  selectedCategory === cat.category ? null : cat.category
                )
              }
            >
              <div
                className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: CATEGORY_COLORS[cat.category] || "#94a3b8",
                }}
              />
              <div className="min-w-0">
                <p className="text-[10px] text-[var(--muted-foreground)] truncate">
                  {cat.label}
                </p>
                <p className="font-[var(--font-data)] text-sm font-bold">
                  {cat.count}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
