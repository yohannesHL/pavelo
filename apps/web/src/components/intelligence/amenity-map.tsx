"use client";

/**
 * AmenityMap — Nearby amenities visualization (S7-06)
 *
 * - Google Places integration
 * - Category clusters: restaurants, cafés, gyms, supermarkets, parks, pharmacies
 * - POI popups with name, rating, distance, opening hours
 * - Radius selector (0.5/1/2/5 km)
 */

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin as MapPinIcon,
  Star,
  Clock,
  X,
  ChevronDown,
} from "lucide-react";
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

type AmenityCategory =
  | "restaurant"
  | "cafe"
  | "gym"
  | "supermarket"
  | "park"
  | "pharmacy"
  | "school"
  | "hospital"
  | "bank"
  | "post_office";

interface Amenity {
  id: string;
  name: string;
  category: AmenityCategory;
  location: { lat: number; lng: number };
  distance: number;
  rating: number | null;
  ratingCount: number;
  priceLevel: number | null;
  openNow: boolean | null;
  address: string;
}

interface AmenityCategoryGroup {
  category: AmenityCategory;
  label: string;
  icon: string;
  count: number;
  amenities: Amenity[];
}

interface AmenityMapProps {
  categories: AmenityCategoryGroup[];
  center: { lat: number; lng: number };
  radius: number;
  totalCount: number;
  compact?: boolean;
  onRadiusChange?: (radius: number) => void;
  className?: string;
}

// ---------- Category colors ----------

const CATEGORY_COLORS: Record<AmenityCategory, string> = {
  restaurant: "#ef4444",
  cafe: "#8b5cf6",
  gym: "#f97316",
  supermarket: "#10b981",
  park: "#22c55e",
  pharmacy: "#06b6d4",
  school: "#3b82f6",
  hospital: "#ec4899",
  bank: "#6366f1",
  post_office: "#eab308",
};

const RADIUS_OPTIONS = [
  { value: 0.5, label: "0.5km" },
  { value: 1, label: "1km" },
  { value: 2, label: "2km" },
  { value: 5, label: "5km" },
];

// ---------- Component ----------

export function AmenityMap({
  categories: categoryGroups,
  center,
  radius,
  totalCount,
  compact = false,
  onRadiusChange,
  className = "",
}: AmenityMapProps) {
  const [activeCategories, setActiveCategories] = useState<Set<AmenityCategory>>(
    new Set(categoryGroups.map((g) => g.category))
  );
  const [selectedAmenity, setSelectedAmenity] = useState<Amenity | null>(null);
  const [hoveredAmenity, setHoveredAmenity] = useState<string | null>(null);

  // All visible amenities
  const visibleAmenities = useMemo(() => {
    return categoryGroups
      .filter((g) => activeCategories.has(g.category))
      .flatMap((g) => g.amenities);
  }, [categoryGroups, activeCategories]);

  const locations = visibleAmenities.map((a) => a.location);
  if (locations.length === 0) locations.push(center);
  const bounds = calculateBounds(locations);

  const toggleCategory = (cat: AmenityCategory) => {
    const next = new Set(activeCategories);
    if (next.has(cat)) {
      next.delete(cat);
    } else {
      next.add(cat);
    }
    setActiveCategories(next);
  };

  const legendItems = categoryGroups
    .filter((g) => activeCategories.has(g.category))
    .map((g) => ({
      color: CATEGORY_COLORS[g.category],
      label: `${g.icon} ${g.label}`,
      value: g.count,
    }));

  function renderStars(rating: number | null) {
    if (rating === null) return null;
    return (
      <div className="flex items-center gap-0.5">
        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
        <span className="font-[var(--font-data)] text-xs font-medium">
          {rating.toFixed(1)}
        </span>
      </div>
    );
  }

  return (
    <div className={`amenity-map ${className}`}>
      {/* Header */}
      {!compact && (
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
              <MapPinIcon className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Nearby Amenities</h3>
              <p className="text-xs text-[var(--muted-foreground)]">
                {totalCount} places within {radius}km
              </p>
            </div>
          </div>

          {/* Radius selector */}
          <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
            {RADIUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onRadiusChange?.(opt.value)}
                className={`px-2 py-1 text-[10px] font-medium transition-colors ${
                  radius === opt.value
                    ? "bg-[var(--color-primary)] text-white"
                    : "bg-white hover:bg-gray-50 text-[var(--muted-foreground)]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Category toggles */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {categoryGroups.map((group) => (
          <Badge
            key={group.category}
            variant={activeCategories.has(group.category) ? "default" : "outline"}
            className="cursor-pointer text-[10px] gap-1"
            style={
              activeCategories.has(group.category)
                ? { backgroundColor: CATEGORY_COLORS[group.category] }
                : {}
            }
            onClick={() => toggleCategory(group.category)}
          >
            {group.icon} {group.label} ({group.count})
          </Badge>
        ))}
      </div>

      {/* Map */}
      <MapContainer
        center={center}
        height={compact ? "280px" : "400px"}
        attribution="© Google Places"
        legend={
          legendItems.length > 0 ? (
            <MapLegend title="Amenities" items={legendItems.slice(0, 6)} />
          ) : undefined
        }
      >
        {/* Radius circle */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-white/15"
          style={{ width: "80%", height: "80%" }}
        />

        {/* Center marker */}
        <div
          className="absolute z-20"
          style={{
            left: `${geoToRelative(center.lat, center.lng, bounds).x}%`,
            top: `${geoToRelative(center.lat, center.lng, bounds).y}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <div className="h-4 w-4 rounded-full border-2 border-white bg-[var(--color-primary)] shadow-lg" />
        </div>

        {/* Amenity pins */}
        {visibleAmenities.map((amenity) => {
          const pos = geoToRelative(amenity.location.lat, amenity.location.lng, bounds);
          const color = CATEGORY_COLORS[amenity.category];
          const isSelected = selectedAmenity?.id === amenity.id;
          const isHovered = hoveredAmenity === amenity.id;
          const group = categoryGroups.find((g) => g.category === amenity.category);

          return (
            <MapPin
              key={amenity.id}
              x={pos.x}
              y={pos.y}
              color={color}
              size="sm"
              active={isSelected || isHovered}
              onClick={() => setSelectedAmenity(isSelected ? null : amenity)}
              onHover={(h) => setHoveredAmenity(h ? amenity.id : null)}
              ariaLabel={`${amenity.name} — ${amenity.category}`}
            >
              <div className="relative">
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded-full border-[1.5px] border-white shadow-md text-[9px] transition-transform duration-200 ${
                    isSelected || isHovered ? "scale-[1.3]" : ""
                  }`}
                  style={{ backgroundColor: color }}
                >
                  {group?.icon || "📍"}
                </div>
                {isHovered && !isSelected && (
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-0.5 text-[10px] text-white shadow-lg">
                    {amenity.name}
                  </div>
                )}
              </div>
            </MapPin>
          );
        })}

        {/* Selected amenity popup */}
        <AnimatePresence>
          {selectedAmenity && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute bottom-3 left-3 right-3 z-30 sm:left-auto sm:right-3 sm:w-64"
            >
              <Card className="overflow-hidden shadow-xl">
                <div
                  className="h-2"
                  style={{ backgroundColor: CATEGORY_COLORS[selectedAmenity.category] }}
                />
                <div className="p-3 relative">
                  <button
                    onClick={() => setSelectedAmenity(null)}
                    className="absolute right-2 top-2 rounded-full bg-gray-100 p-0.5 hover:bg-gray-200"
                    aria-label="Close"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <h4 className="text-sm font-semibold pr-6 line-clamp-1">
                    {selectedAmenity.name}
                  </h4>
                  <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
                    {selectedAmenity.address}
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-xs">
                    {renderStars(selectedAmenity.rating)}
                    {selectedAmenity.ratingCount > 0 && (
                      <span className="text-[10px] text-[var(--muted-foreground)]">
                        ({selectedAmenity.ratingCount})
                      </span>
                    )}
                    <span className="text-[var(--muted-foreground)]">
                      {selectedAmenity.distance}km
                    </span>
                    {selectedAmenity.openNow !== null && (
                      <Badge
                        variant="outline"
                        className={`text-[9px] ${
                          selectedAmenity.openNow
                            ? "border-green-300 text-green-600"
                            : "border-red-300 text-red-600"
                        }`}
                      >
                        {selectedAmenity.openNow ? "Open" : "Closed"}
                      </Badge>
                    )}
                  </div>
                  {selectedAmenity.priceLevel && (
                    <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">
                      {"£".repeat(selectedAmenity.priceLevel)}
                      <span className="text-gray-300">
                        {"£".repeat(4 - selectedAmenity.priceLevel)}
                      </span>
                    </p>
                  )}
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </MapContainer>

      {/* Category summary (non-compact) */}
      {!compact && (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {categoryGroups.map((group) => (
            <button
              key={group.category}
              onClick={() => toggleCategory(group.category)}
              className={`rounded-lg border p-2 text-center transition-all ${
                activeCategories.has(group.category)
                  ? "border-[var(--border)] bg-white shadow-sm"
                  : "border-transparent bg-gray-50 opacity-50"
              }`}
            >
              <span className="text-lg">{group.icon}</span>
              <p className="text-[10px] font-medium mt-0.5">{group.label}</p>
              <p className="font-[var(--font-data)] text-sm font-bold">
                {group.count}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
