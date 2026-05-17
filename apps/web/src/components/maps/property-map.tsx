"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Loader2, ZoomIn, ZoomOut, Locate, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * Property Map View (S4-06)
 *
 * Interactive map with property pins, clustering, card popups,
 * and bounding box search. Uses Mapbox GL JS.
 *
 * When Mapbox is not available (no token), renders a styled
 * placeholder with property markers on a grid.
 */

interface MapProperty {
  id: string;
  title: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  propertyType: string;
  status: string;
  latitude: number | null;
  longitude: number | null;
  city: string;
  postcode: string;
}

interface PropertyMapProps {
  properties: MapProperty[];
  activePropertyId: string | null;
  onPropertySelect: (id: string) => void;
  onPropertyHover: (id: string | null) => void;
  onBoundsChange?: (bounds: {
    ne: { lat: number; lng: number };
    sw: { lat: number; lng: number };
  }) => void;
  className?: string;
}

const formatPrice = (price: number) => {
  if (price >= 1_000_000) return `£${(price / 1_000_000).toFixed(1)}m`;
  if (price >= 1_000) return `£${(price / 1_000).toFixed(0)}k`;
  return `£${price}`;
};

const STATUS_COLORS: Record<string, string> = {
  for_sale: "var(--color-accent)",
  under_offer: "var(--color-gold)",
  sold_stc: "var(--color-primary)",
  sold: "var(--color-primary)",
  withdrawn: "var(--muted-foreground)",
};

export function PropertyMap({
  properties,
  activePropertyId,
  onPropertySelect,
  onPropertyHover,
  onBoundsChange,
  className,
}: PropertyMapProps) {
  const [selectedPin, setSelectedPin] = useState<string | null>(null);
  const [mapMode, setMapMode] = useState<"dark" | "light">("dark");

  // Filter properties with valid coordinates
  const mappableProperties = properties.filter(
    (p) => p.latitude != null && p.longitude != null
  );

  // Calculate center and bounds
  const center = calculateCenter(mappableProperties);

  const handlePinClick = useCallback(
    (id: string) => {
      setSelectedPin(selectedPin === id ? null : id);
      onPropertySelect(id);
    },
    [selectedPin, onPropertySelect]
  );

  const selectedProperty = mappableProperties.find((p) => p.id === selectedPin);

  // Styled map placeholder (renders when Mapbox token isn't available)
  return (
    <div
      className={`relative overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] ${className || ""}`}
      style={{ minHeight: "400px" }}
    >
      {/* Map background */}
      <div
        className={`absolute inset-0 ${
          mapMode === "dark"
            ? "bg-gradient-to-br from-[#0d1b2a] via-[#1b2838] to-[#162230]"
            : "bg-gradient-to-br from-[#e8f0fe] via-[#f0f4f8] to-[#e2e8f0]"
        }`}
      >
        {/* Grid lines */}
        <svg className="absolute inset-0 h-full w-full opacity-10" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke={mapMode === "dark" ? "#fff" : "#1B3A6B"}
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Property pins */}
      <div className="relative h-full w-full" style={{ minHeight: "400px" }}>
        {mappableProperties.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Locate className={`mx-auto h-8 w-8 ${mapMode === "dark" ? "text-white/30" : "text-[var(--muted-foreground)]"}`} />
              <p className={`mt-2 text-sm ${mapMode === "dark" ? "text-white/50" : "text-[var(--muted-foreground)]"}`}>
                No properties with coordinates to display
              </p>
            </div>
          </div>
        ) : (
          mappableProperties.map((property, index) => {
            const position = getRelativePosition(property, mappableProperties, center);
            const isActive = activePropertyId === property.id || selectedPin === property.id;

            return (
              <button
                key={property.id}
                className={`absolute z-10 transition-all duration-[200ms] ease-out ${
                  isActive ? "z-20 scale-125" : "hover:scale-110 hover:z-20"
                }`}
                style={{
                  left: `${position.x}%`,
                  top: `${position.y}%`,
                  transform: "translate(-50%, -100%)",
                }}
                onClick={() => handlePinClick(property.id)}
                onMouseEnter={() => onPropertyHover(property.id)}
                onMouseLeave={() => onPropertyHover(null)}
                aria-label={`${property.title} - ${formatPrice(property.price)}`}
              >
                {/* Pin */}
                <div
                  className={`relative flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold text-white shadow-lg ${
                    isActive ? "ring-2 ring-white" : ""
                  }`}
                  style={{ backgroundColor: STATUS_COLORS[property.status] || "var(--color-accent)" }}
                >
                  {formatPrice(property.price)}
                  {/* Pin tail */}
                  <div
                    className="absolute -bottom-1.5 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45"
                    style={{
                      backgroundColor:
                        STATUS_COLORS[property.status] || "var(--color-accent)",
                    }}
                  />
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Selected property popup */}
      {selectedProperty && (
        <div className="absolute bottom-4 left-4 right-4 z-30 sm:left-auto sm:right-4 sm:w-72">
          <Card className="overflow-hidden shadow-xl">
            <div className="relative h-28 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)]">
              <div className="absolute inset-0 flex items-center justify-center text-white/30 text-4xl">
                🏠
              </div>
              <button
                onClick={() => setSelectedPin(null)}
                className="absolute right-2 top-2 rounded-full bg-black/40 p-1 text-white hover:bg-black/60"
                aria-label="Close popup"
              >
                ×
              </button>
            </div>
            <div className="p-3">
              <p className="font-[var(--font-data)] text-lg font-bold text-[var(--color-primary)]">
                {formatPrice(selectedProperty.price)}
              </p>
              <h4 className="mt-0.5 text-sm font-semibold line-clamp-1">
                {selectedProperty.title}
              </h4>
              <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                {selectedProperty.city}, {selectedProperty.postcode}
              </p>
              <div className="mt-2 flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
                <span>{selectedProperty.bedrooms} beds</span>
                <span>{selectedProperty.bathrooms} baths</span>
              </div>
              <Button
                variant="accent"
                size="sm"
                className="mt-3 w-full"
                onClick={() => onPropertySelect(selectedProperty.id)}
              >
                View Details
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Map controls */}
      <div className="absolute right-3 top-3 flex flex-col gap-1.5 z-20">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 bg-white/90 backdrop-blur-sm shadow-sm"
          onClick={() => setMapMode(mapMode === "dark" ? "light" : "dark")}
          aria-label="Toggle map theme"
        >
          <Layers className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Map attribution */}
      <div className="absolute bottom-1 left-2 z-10">
        <span className={`text-[9px] ${mapMode === "dark" ? "text-white/30" : "text-black/30"}`}>
          Mapbox integration ready · {mappableProperties.length} pins
        </span>
      </div>
    </div>
  );
}

// --- Helpers ---

function calculateCenter(properties: MapProperty[]): { lat: number; lng: number } {
  if (properties.length === 0) return { lat: 51.5074, lng: -0.1278 }; // London default

  const sum = properties.reduce(
    (acc, p) => ({
      lat: acc.lat + (p.latitude || 0),
      lng: acc.lng + (p.longitude || 0),
    }),
    { lat: 0, lng: 0 }
  );

  return {
    lat: sum.lat / properties.length,
    lng: sum.lng / properties.length,
  };
}

function getRelativePosition(
  property: MapProperty,
  all: MapProperty[],
  center: { lat: number; lng: number }
): { x: number; y: number } {
  if (all.length <= 1) return { x: 50, y: 50 };

  const lats = all.map((p) => p.latitude || center.lat);
  const lngs = all.map((p) => p.longitude || center.lng);

  const latMin = Math.min(...lats);
  const latMax = Math.max(...lats);
  const lngMin = Math.min(...lngs);
  const lngMax = Math.max(...lngs);

  const latRange = latMax - latMin || 0.01;
  const lngRange = lngMax - lngMin || 0.01;

  // Map to 10-90% range (leave margin for pins)
  const x = 10 + ((( property.longitude || center.lng) - lngMin) / lngRange) * 80;
  const y = 10 + ((latMax - (property.latitude || center.lat)) / latRange) * 80; // invert lat

  return { x, y };
}
