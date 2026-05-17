"use client";

/**
 * MapContainer — shared Mapbox GL wrapper for all intelligence maps (S7-01)
 *
 * Provides a consistent dark-navy themed map base with controls.
 * When Mapbox token is unavailable, renders a styled placeholder
 * with data overlaid on a grid visualization.
 *
 * Used by: CrimeMap, SchoolMap, TransportMap, AmenityMap, PriceHeatmap
 */

import { useRef, useState, useCallback, type ReactNode } from "react";
import { Layers, ZoomIn, ZoomOut, Locate } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MapContainerProps {
  center: { lat: number; lng: number };
  zoom?: number;
  className?: string;
  children?: ReactNode;
  /** Overlay legend */
  legend?: ReactNode;
  /** Controls slot (top-right) */
  controls?: ReactNode;
  /** Attribution text */
  attribution?: string;
  /** Map height */
  height?: string;
}

export function MapContainer({
  center,
  zoom = 13,
  className = "",
  children,
  legend,
  controls,
  attribution,
  height = "400px",
}: MapContainerProps) {
  const [mapMode, setMapMode] = useState<"dark" | "light">("dark");

  return (
    <div
      className={`intelligence-map relative overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] shadow-[var(--shadow-card)] ${className}`}
      style={{ minHeight: height }}
    >
      {/* Map background */}
      <div
        className={`absolute inset-0 transition-colors duration-500 ${
          mapMode === "dark"
            ? "bg-gradient-to-br from-[#0a1628] via-[#0f2035] to-[#0d1b2e]"
            : "bg-gradient-to-br from-[#e8f0fe] via-[#f0f4f8] to-[#e2e8f0]"
        }`}
      >
        {/* Subtle grid overlay */}
        <svg
          className="absolute inset-0 h-full w-full opacity-[0.06]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="map-grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path
                d="M 32 0 L 0 0 0 32"
                fill="none"
                stroke={mapMode === "dark" ? "#4a7cc9" : "#1B3A6B"}
                strokeWidth="0.4"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#map-grid)" />
        </svg>

        {/* Subtle radial glow at center */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20"
          style={{
            width: "60%",
            height: "60%",
            background:
              mapMode === "dark"
                ? "radial-gradient(circle, rgba(46,134,171,0.15) 0%, transparent 70%)"
                : "radial-gradient(circle, rgba(27,58,107,0.08) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* Map content layer */}
      <div className="relative h-full w-full" style={{ minHeight: height }}>
        {children}
      </div>

      {/* Legend (bottom-left) */}
      {legend && (
        <div className="absolute bottom-3 left-3 z-20 max-w-[200px]">
          {legend}
        </div>
      )}

      {/* Controls (top-right) */}
      <div className="absolute right-3 top-3 z-20 flex flex-col gap-1.5">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 bg-white/90 backdrop-blur-sm shadow-sm hover:bg-white"
          onClick={() => setMapMode(mapMode === "dark" ? "light" : "dark")}
          aria-label="Toggle map theme"
        >
          <Layers className="h-3.5 w-3.5" />
        </Button>
        {controls}
      </div>

      {/* Attribution */}
      <div className="absolute bottom-1 right-2 z-10">
        <span
          className={`text-[9px] ${
            mapMode === "dark" ? "text-white/25" : "text-black/25"
          }`}
        >
          {attribution || "© Mapbox · Pavelo Intelligence"}
        </span>
      </div>
    </div>
  );
}

// ---------- Map Pin Component ----------

interface MapPinProps {
  x: number; // percentage position (0-100)
  y: number;
  color: string;
  label?: string;
  size?: "sm" | "md" | "lg";
  active?: boolean;
  pulsing?: boolean;
  onClick?: () => void;
  onHover?: (hovering: boolean) => void;
  ariaLabel?: string;
  children?: ReactNode;
}

export function MapPin({
  x,
  y,
  color,
  label,
  size = "md",
  active = false,
  pulsing = false,
  onClick,
  onHover,
  ariaLabel,
  children,
}: MapPinProps) {
  const sizeClasses = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  return (
    <button
      className={`absolute z-10 transition-all duration-200 ease-out ${
        active ? "z-20 scale-125" : "hover:scale-110 hover:z-20"
      }`}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: "translate(-50%, -50%)",
      }}
      onClick={onClick}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
      aria-label={ariaLabel || label || "Map pin"}
    >
      {children || (
        <div className="relative">
          {/* Pulse ring */}
          {pulsing && (
            <div
              className="absolute inset-0 animate-ping rounded-full opacity-30"
              style={{ backgroundColor: color }}
            />
          )}
          {/* Pin dot */}
          <div
            className={`${sizeClasses[size]} rounded-full border-2 border-white shadow-lg ${
              active ? "ring-2 ring-white/50" : ""
            }`}
            style={{ backgroundColor: color }}
          />
          {/* Label */}
          {label && (
            <div
              className="absolute left-1/2 -translate-x-1/2 -top-6 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white shadow-md"
              style={{ backgroundColor: color }}
            >
              {label}
            </div>
          )}
        </div>
      )}
    </button>
  );
}

// ---------- Map Legend ----------

interface LegendItem {
  color: string;
  label: string;
  value?: string | number;
}

interface MapLegendProps {
  title: string;
  items: LegendItem[];
  gradient?: boolean;
}

export function MapLegend({ title, items, gradient }: MapLegendProps) {
  return (
    <div className="rounded-lg bg-white/90 backdrop-blur-sm p-2.5 shadow-md text-xs">
      <p className="font-semibold text-[var(--color-primary)] mb-1.5">{title}</p>
      {gradient ? (
        <div>
          <div
            className="h-2 w-full rounded-full"
            style={{
              background: `linear-gradient(to right, ${items.map((i) => i.color).join(", ")})`,
            }}
          />
          <div className="flex justify-between mt-0.5 text-[9px] text-gray-500">
            <span>{items[0]?.label}</span>
            <span>{items[items.length - 1]?.label}</span>
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div
                className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-gray-600 flex-1">{item.label}</span>
              {item.value !== undefined && (
                <span className="font-[var(--font-data)] font-medium text-gray-800">
                  {item.value}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Helpers ----------

/**
 * Convert lat/lng to relative position within a bounding box.
 */
export function geoToRelative(
  lat: number,
  lng: number,
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number },
  padding: number = 10
): { x: number; y: number } {
  const latRange = bounds.maxLat - bounds.minLat || 0.01;
  const lngRange = bounds.maxLng - bounds.minLng || 0.01;

  const x = padding + ((lng - bounds.minLng) / lngRange) * (100 - padding * 2);
  const y = padding + ((bounds.maxLat - lat) / latRange) * (100 - padding * 2);

  return {
    x: Math.max(padding, Math.min(100 - padding, x)),
    y: Math.max(padding, Math.min(100 - padding, y)),
  };
}

/**
 * Calculate bounding box from an array of locations.
 */
export function calculateBounds(
  locations: { lat: number; lng: number }[]
): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  if (locations.length === 0) {
    return { minLat: 51.48, maxLat: 51.54, minLng: -0.15, maxLng: 0.0 };
  }

  const lats = locations.map((l) => l.lat);
  const lngs = locations.map((l) => l.lng);

  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
  };
}
