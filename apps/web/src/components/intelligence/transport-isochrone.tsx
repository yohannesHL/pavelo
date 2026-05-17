"use client";

/**
 * TransportIsochrone — Travel time isochrone visualization (S7-05)
 *
 * - TravelTime API integration
 * - Isochrone polygons for 15/30/45 minute travel times
 * - Mode selector: tube, bus, car, walk, cycle
 * - Semi-transparent fill with distinct colors per time band
 */

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Train, Bus, Car, Footprints, Bike, Clock, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapContainer,
  MapLegend,
  geoToRelative,
} from "./map-container";

// ---------- Types ----------

type TransportMode = "driving" | "public_transport" | "walking" | "cycling";

interface IsochronePolygon {
  timeMinutes: number;
  mode: TransportMode;
  coordinates: [number, number][][]; // GeoJSON [lng, lat]
  area: number;
  color: string;
}

interface TransportIsochroneProps {
  isochrones: IsochronePolygon[];
  origin: { lat: number; lng: number };
  destination?: { lat: number; lng: number } | null;
  modes: TransportMode[];
  compact?: boolean;
  onModeChange?: (mode: TransportMode) => void;
  currentMode?: TransportMode;
  className?: string;
}

// ---------- Mode config ----------

const MODE_CONFIG: Record<TransportMode, { label: string; icon: typeof Train }> = {
  public_transport: { label: "Public Transport", icon: Train },
  driving: { label: "Driving", icon: Car },
  walking: { label: "Walking", icon: Footprints },
  cycling: { label: "Cycling", icon: Bike },
};

const TIME_COLORS: Record<number, { fill: string; stroke: string; label: string }> = {
  15: { fill: "rgba(16, 185, 129, 0.2)", stroke: "#10b981", label: "15 min" },
  30: { fill: "rgba(245, 158, 11, 0.15)", stroke: "#f59e0b", label: "30 min" },
  45: { fill: "rgba(239, 68, 68, 0.12)", stroke: "#ef4444", label: "45 min" },
  60: { fill: "rgba(139, 92, 246, 0.1)", stroke: "#8b5cf6", label: "60 min" },
};

// ---------- Component ----------

export function TransportIsochrone({
  isochrones,
  origin,
  destination,
  modes,
  compact = false,
  onModeChange,
  currentMode = "public_transport",
  className = "",
}: TransportIsochroneProps) {
  const [activeMode, setActiveMode] = useState<TransportMode>(currentMode);

  const filteredIsochrones = useMemo(
    () => isochrones.filter((iso) => iso.mode === activeMode),
    [isochrones, activeMode]
  );

  // Calculate SVG bounds from polygon data
  const allCoords = useMemo(() => {
    const coords: { lat: number; lng: number }[] = [origin];
    for (const iso of filteredIsochrones) {
      for (const ring of iso.coordinates) {
        for (const [lng, lat] of ring) {
          coords.push({ lat, lng });
        }
      }
    }
    return coords;
  }, [filteredIsochrones, origin]);

  const bounds = useMemo(() => {
    const lats = allCoords.map((c) => c.lat);
    const lngs = allCoords.map((c) => c.lng);
    return {
      minLat: Math.min(...lats) - 0.005,
      maxLat: Math.max(...lats) + 0.005,
      minLng: Math.min(...lngs) - 0.005,
      maxLng: Math.max(...lngs) + 0.005,
    };
  }, [allCoords]);

  const handleModeChange = (mode: TransportMode) => {
    setActiveMode(mode);
    onModeChange?.(mode);
  };

  // Convert isochrone GeoJSON coordinates to SVG path
  function isoToSvgPath(iso: IsochronePolygon): string {
    const points = iso.coordinates[0]?.map(([lng, lat]) => {
      const pos = geoToRelative(lat, lng, bounds, 5);
      return `${pos.x},${pos.y}`;
    });
    if (!points || points.length === 0) return "";
    return `M ${points.join(" L ")} Z`;
  }

  const originPos = geoToRelative(origin.lat, origin.lng, bounds, 5);

  const legendItems = filteredIsochrones.map((iso) => ({
    color: TIME_COLORS[iso.timeMinutes]?.stroke || iso.color,
    label: TIME_COLORS[iso.timeMinutes]?.label || `${iso.timeMinutes} min`,
    value: `${iso.area} km²`,
  }));

  return (
    <div className={`transport-isochrone ${className}`}>
      {/* Header */}
      {!compact && (
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100">
              <Navigation className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Transport Isochrones</h3>
              <p className="text-xs text-[var(--muted-foreground)]">
                Travel time zones from location
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mode selector */}
      <div className="mb-3 flex gap-1.5 overflow-x-auto">
        {(["public_transport", "driving", "walking", "cycling"] as const).map(
          (mode) => {
            const config = MODE_CONFIG[mode];
            const Icon = config.icon;
            return (
              <Button
                key={mode}
                variant={activeMode === mode ? "default" : "outline"}
                size="sm"
                className={`h-7 gap-1 text-[10px] whitespace-nowrap flex-shrink-0 ${
                  activeMode === mode
                    ? "bg-[var(--color-primary)] text-white"
                    : ""
                }`}
                onClick={() => handleModeChange(mode)}
              >
                <Icon className="h-3 w-3" />
                {config.label}
              </Button>
            );
          }
        )}
      </div>

      {/* Map with isochrone overlays */}
      <MapContainer
        center={origin}
        height={compact ? "280px" : "400px"}
        attribution="© TravelTime API"
        legend={
          legendItems.length > 0 ? (
            <MapLegend title="Travel Time" items={legendItems} />
          ) : undefined
        }
      >
        {/* SVG isochrone overlays */}
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {/* Render largest first (painter's algorithm) */}
          {filteredIsochrones
            .sort((a, b) => b.timeMinutes - a.timeMinutes)
            .map((iso, i) => {
              const path = isoToSvgPath(iso);
              const timeConfig = TIME_COLORS[iso.timeMinutes];

              return (
                <motion.path
                  key={`${iso.mode}-${iso.timeMinutes}`}
                  d={path}
                  fill={timeConfig?.fill || `${iso.color}22`}
                  stroke={timeConfig?.stroke || iso.color}
                  strokeWidth="0.3"
                  strokeDasharray={iso.timeMinutes > 30 ? "2,1" : "none"}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                />
              );
            })}
        </svg>

        {/* Origin pin */}
        <div
          className="absolute z-20"
          style={{
            left: `${originPos.x}%`,
            top: `${originPos.y}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-[var(--color-accent)] opacity-20" style={{ width: 24, height: 24 }} />
            <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[var(--color-accent)] shadow-lg">
              <Navigation className="h-3 w-3 text-white" />
            </div>
          </div>
        </div>

        {/* Time band labels */}
        {filteredIsochrones.map((iso) => {
          // Place label at the rightmost point of the polygon
          const ring = iso.coordinates[0];
          if (!ring || ring.length === 0) return null;

          // Find rightmost point
          let rightmost = ring[0];
          for (const pt of ring) {
            if (pt[0] > rightmost[0]) rightmost = pt;
          }

          const pos = geoToRelative(rightmost[1], rightmost[0], bounds, 5);
          const timeConfig = TIME_COLORS[iso.timeMinutes];

          return (
            <div
              key={`label-${iso.mode}-${iso.timeMinutes}`}
              className="absolute z-10 flex items-center gap-0.5"
              style={{
                left: `${Math.min(90, pos.x + 1)}%`,
                top: `${pos.y}%`,
                transform: "translateY(-50%)",
              }}
            >
              <Clock className="h-2.5 w-2.5" style={{ color: timeConfig?.stroke }} />
              <span
                className="text-[9px] font-bold"
                style={{ color: timeConfig?.stroke }}
              >
                {iso.timeMinutes}m
              </span>
            </div>
          );
        })}
      </MapContainer>

      {/* Stats bar */}
      {!compact && filteredIsochrones.length > 0 && (
        <div className="mt-3 flex gap-2">
          {filteredIsochrones.map((iso) => (
            <div
              key={`stat-${iso.timeMinutes}`}
              className="flex-1 rounded-lg border border-[var(--border)] p-2 text-center"
            >
              <p
                className="font-[var(--font-data)] text-lg font-bold"
                style={{ color: TIME_COLORS[iso.timeMinutes]?.stroke }}
              >
                {iso.timeMinutes}
              </p>
              <p className="text-[10px] text-[var(--muted-foreground)]">minutes</p>
              <p className="text-[10px] font-medium text-[var(--muted-foreground)]">
                {iso.area} km²
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
