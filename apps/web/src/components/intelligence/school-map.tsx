"use client";

/**
 * SchoolMap — School catchment visualization (S7-04)
 *
 * - Ofsted API integration
 * - Color-coded pins by rating (Outstanding=green, Good=blue, etc.)
 * - School detail popup on click
 * - Catchment radius circle overlay
 * - Filter by school type (primary/secondary/all)
 */

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, Star, Users, MapPin as MapPinIcon, X } from "lucide-react";
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

type OfstedRating =
  | "Outstanding"
  | "Good"
  | "Requires Improvement"
  | "Inadequate"
  | "Not yet inspected";

interface School {
  urn: string;
  name: string;
  type: "primary" | "secondary" | "all-through" | "special" | "nursery" | "post-16";
  phase: string;
  ofstedRating: OfstedRating;
  lastInspectionDate: string | null;
  address: string;
  postcode: string;
  location: { lat: number; lng: number };
  distance: number;
  pupilCount: number | null;
  ageRange: string;
  gender: string;
  religiousCharacter: string | null;
  website: string | null;
}

interface SchoolMapProps {
  schools: School[];
  center: { lat: number; lng: number };
  radius: number;
  compact?: boolean;
  onTypeFilter?: (type: "primary" | "secondary" | "all") => void;
  currentType?: "primary" | "secondary" | "all";
  className?: string;
}

// ---------- Rating config ----------

const RATING_COLORS: Record<OfstedRating, string> = {
  Outstanding: "#10b981",
  Good: "#2E86AB",
  "Requires Improvement": "#f59e0b",
  Inadequate: "#ef4444",
  "Not yet inspected": "#94a3b8",
};

const RATING_LABELS: Record<OfstedRating, string> = {
  Outstanding: "Outstanding",
  Good: "Good",
  "Requires Improvement": "Requires Improvement",
  Inadequate: "Inadequate",
  "Not yet inspected": "Not Inspected",
};

const TYPE_ICONS: Record<string, string> = {
  primary: "🏫",
  secondary: "🎓",
  "all-through": "📚",
  special: "⭐",
  nursery: "🌱",
  "post-16": "🎓",
};

// ---------- Component ----------

export function SchoolMap({
  schools,
  center,
  radius,
  compact = false,
  onTypeFilter,
  currentType = "all",
  className = "",
}: SchoolMapProps) {
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [hoveredSchool, setHoveredSchool] = useState<string | null>(null);

  const locations = schools.map((s) => s.location);
  if (locations.length === 0) locations.push(center);
  const bounds = calculateBounds(locations);

  const ratingCounts = useMemo(() => {
    const counts: Record<OfstedRating, number> = {
      Outstanding: 0,
      Good: 0,
      "Requires Improvement": 0,
      Inadequate: 0,
      "Not yet inspected": 0,
    };
    for (const s of schools) {
      counts[s.ofstedRating]++;
    }
    return counts;
  }, [schools]);

  const legendItems = Object.entries(RATING_COLORS)
    .filter(([rating]) => ratingCounts[rating as OfstedRating] > 0)
    .map(([rating, color]) => ({
      color,
      label: RATING_LABELS[rating as OfstedRating],
      value: ratingCounts[rating as OfstedRating],
    }));

  return (
    <div className={`school-map ${className}`}>
      {/* Header */}
      {!compact && (
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
              <GraduationCap className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">School Catchment</h3>
              <p className="text-xs text-[var(--muted-foreground)]">
                {schools.length} schools within {radius}km
              </p>
            </div>
          </div>

          {/* Type filter */}
          <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
            {(["all", "primary", "secondary"] as const).map((type) => (
              <button
                key={type}
                onClick={() => onTypeFilter?.(type)}
                className={`px-2.5 py-1 text-[10px] font-medium capitalize transition-colors ${
                  currentType === type
                    ? "bg-[var(--color-primary)] text-white"
                    : "bg-white hover:bg-gray-50 text-[var(--muted-foreground)]"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Map */}
      <MapContainer
        center={center}
        height={compact ? "280px" : "400px"}
        attribution="© Ofsted / GIAS Open Data"
        legend={<MapLegend title="Ofsted Rating" items={legendItems} />}
      >
        {/* Catchment radius circles (visual approximation) */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-white/20"
          style={{ width: "70%", height: "70%" }}
        />
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-white/10"
          style={{ width: "90%", height: "90%" }}
        />

        {/* School pins */}
        {schools.map((school) => {
          const pos = geoToRelative(school.location.lat, school.location.lng, bounds);
          const color = RATING_COLORS[school.ofstedRating];
          const isSelected = selectedSchool?.urn === school.urn;
          const isHovered = hoveredSchool === school.urn;

          return (
            <MapPin
              key={school.urn}
              x={pos.x}
              y={pos.y}
              color={color}
              size="md"
              active={isSelected || isHovered}
              onClick={() => setSelectedSchool(isSelected ? null : school)}
              onHover={(h) => setHoveredSchool(h ? school.urn : null)}
              ariaLabel={`${school.name} — ${school.ofstedRating}`}
            >
              <div className="relative">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full border-2 border-white shadow-lg text-[10px] transition-transform duration-200 ${
                    isSelected || isHovered ? "scale-125" : ""
                  }`}
                  style={{ backgroundColor: color }}
                >
                  {TYPE_ICONS[school.type] || "🏫"}
                </div>
                {isHovered && !isSelected && (
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-0.5 text-[10px] text-white shadow-lg">
                    {school.name}
                  </div>
                )}
              </div>
            </MapPin>
          );
        })}

        {/* Selected school popup */}
        <AnimatePresence>
          {selectedSchool && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute bottom-3 left-3 right-3 z-30 sm:left-auto sm:right-3 sm:w-72"
            >
              <Card className="overflow-hidden shadow-xl">
                <div
                  className="relative h-12 flex items-center px-3"
                  style={{
                    background: `linear-gradient(135deg, ${RATING_COLORS[selectedSchool.ofstedRating]}dd, ${RATING_COLORS[selectedSchool.ofstedRating]}88)`,
                  }}
                >
                  <Badge className="bg-white/20 text-white text-[10px]">
                    {selectedSchool.ofstedRating}
                  </Badge>
                  <button
                    onClick={() => setSelectedSchool(null)}
                    className="absolute right-2 top-2 rounded-full bg-black/20 p-0.5 text-white hover:bg-black/40"
                    aria-label="Close"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <div className="p-3">
                  <h4 className="text-sm font-semibold line-clamp-1">
                    {selectedSchool.name}
                  </h4>
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                    {selectedSchool.address}, {selectedSchool.postcode}
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1 text-[var(--muted-foreground)]">
                      <span className="text-sm">{TYPE_ICONS[selectedSchool.type]}</span>
                      <span className="capitalize">{selectedSchool.type}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[var(--muted-foreground)]">
                      <MapPinIcon className="h-3 w-3" />
                      {selectedSchool.distance}km
                    </div>
                    {selectedSchool.pupilCount && (
                      <div className="flex items-center gap-1 text-[var(--muted-foreground)]">
                        <Users className="h-3 w-3" />
                        {selectedSchool.pupilCount.toLocaleString()} pupils
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-[var(--muted-foreground)]">
                      <span className="text-[10px]">📅</span>
                      Ages {selectedSchool.ageRange}
                    </div>
                  </div>
                  {selectedSchool.website && (
                    <a
                      href={selectedSchool.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 block text-[10px] text-[var(--color-accent)] hover:underline truncate"
                    >
                      {selectedSchool.website}
                    </a>
                  )}
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </MapContainer>

      {/* School list (non-compact) */}
      {!compact && schools.length > 0 && (
        <div className="mt-3 space-y-1.5 max-h-48 overflow-y-auto">
          {schools.slice(0, 6).map((school) => (
            <button
              key={school.urn}
              onClick={() => setSelectedSchool(school)}
              className={`w-full flex items-center gap-2 rounded-lg border p-2 text-left transition-all hover:shadow-sm ${
                selectedSchool?.urn === school.urn
                  ? "border-[var(--color-accent)] bg-[var(--color-accent)]/5"
                  : "border-[var(--border)] hover:border-[var(--color-accent)]/30"
              }`}
            >
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-xs flex-shrink-0"
                style={{ backgroundColor: RATING_COLORS[school.ofstedRating] + "20" }}
              >
                {TYPE_ICONS[school.type]}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate">{school.name}</p>
                <p className="text-[10px] text-[var(--muted-foreground)]">
                  {school.type} · {school.distance}km ·{" "}
                  <span style={{ color: RATING_COLORS[school.ofstedRating] }}>
                    {school.ofstedRating}
                  </span>
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
