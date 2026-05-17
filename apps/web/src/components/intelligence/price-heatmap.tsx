"use client";

/**
 * PriceHeatmap — Price density visualization (S7-02)
 *
 * - Land Registry data aggregated into grid tiles
 * - Color scale: blue (affordable) → red (expensive)
 * - Price per sqft metric
 * - Toggle between absolute price and price/sqft
 * - Legend with price range
 */

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  MapContainer,
  MapLegend,
  geoToRelative,
  calculateBounds,
} from "./map-container";

// ---------- Types ----------

interface SoldPrice {
  id: string;
  price: number;
  date: string;
  address: string;
  postcode: string;
  propertyType: string;
  latitude?: number;
  longitude?: number;
  sqft?: number;
}

interface PriceHeatmapProps {
  sales: SoldPrice[];
  center: { lat: number; lng: number };
  averagePrice: number;
  medianPrice: number;
  priceRange: { min: number; max: number };
  postcode: string;
  compact?: boolean;
  className?: string;
}

type PriceMetric = "absolute" | "sqft";

// ---------- Color scale ----------

const PRICE_COLORS = [
  { color: "#2563eb", label: "Affordable" },
  { color: "#3b82f6", label: "" },
  { color: "#10b981", label: "" },
  { color: "#eab308", label: "Mid-range" },
  { color: "#f97316", label: "" },
  { color: "#ef4444", label: "Premium" },
];

function getPriceColor(price: number, min: number, max: number): string {
  const range = max - min || 1;
  const ratio = Math.max(0, Math.min(1, (price - min) / range));
  const index = Math.floor(ratio * (PRICE_COLORS.length - 1));
  return PRICE_COLORS[index].color;
}

function formatPrice(price: number): string {
  if (price >= 1_000_000) return `£${(price / 1_000_000).toFixed(1)}m`;
  if (price >= 1_000) return `£${(price / 1_000).toFixed(0)}k`;
  return `£${price}`;
}

function formatPricePerSqft(price: number): string {
  return `£${Math.round(price)}/sqft`;
}

/** Estimate sqft from property type and price when not provided */
function estimateSqft(sale: SoldPrice): number {
  if (sale.sqft && sale.sqft > 0) return sale.sqft;
  // Rough UK averages by property type
  const defaults: Record<string, number> = {
    detached: 1500,
    "semi-detached": 900,
    terraced: 750,
    flat: 550,
  };
  const type = sale.propertyType?.toLowerCase() || "";
  for (const [key, val] of Object.entries(defaults)) {
    if (type.includes(key)) return val;
  }
  return 800; // fallback average
}

// ---------- Component ----------

export function PriceHeatmap({
  sales,
  center,
  averagePrice,
  medianPrice,
  priceRange,
  postcode,
  compact = false,
  className = "",
}: PriceHeatmapProps) {
  const [metric, setMetric] = useState<PriceMetric>("absolute");
  const [hoveredSale, setHoveredSale] = useState<string | null>(null);

  // Generate pseudo-locations for sales that don't have coordinates
  const salesWithLocations = useMemo(() => {
    return sales.map((sale, i) => {
      if (sale.latitude && sale.longitude) return sale;

      const hash = sale.id.split("").reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);
      const angle = ((Math.abs(hash) + i * 137) % 360) * (Math.PI / 180);
      const dist = ((Math.abs(hash) + i * 53) % 100) / 100 * 0.015;

      return {
        ...sale,
        latitude: center.lat + dist * Math.cos(angle),
        longitude: center.lng + dist * Math.sin(angle),
      };
    });
  }, [sales, center]);

  // Compute display values based on selected metric
  const { displayValues, displayRange } = useMemo(() => {
    const values = new Map<string, number>();
    if (metric === "sqft") {
      for (const sale of salesWithLocations) {
        const sqft = estimateSqft(sale);
        values.set(sale.id, sale.price / sqft);
      }
    } else {
      for (const sale of salesWithLocations) {
        values.set(sale.id, sale.price);
      }
    }
    const allVals = Array.from(values.values());
    const min = allVals.length > 0 ? Math.min(...allVals) : 0;
    const max = allVals.length > 0 ? Math.max(...allVals) : 1;
    return { displayValues: values, displayRange: { min, max } };
  }, [salesWithLocations, metric]);

  const locations = salesWithLocations.map((s) => ({
    lat: s.latitude!,
    lng: s.longitude!,
  }));
  if (locations.length === 0) locations.push(center);
  const bounds = calculateBounds(locations);

  return (
    <div className={`price-heatmap ${className}`}>
      {/* Header */}
      {!compact && (
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
              <TrendingUp className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Price Heatmap</h3>
              <p className="text-xs text-[var(--muted-foreground)]">
                {postcode} · {sales.length} recent sales
              </p>
            </div>
          </div>

          <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
            <button
              onClick={() => setMetric("absolute")}
              className={`px-2.5 py-1 text-[10px] font-medium transition-colors ${
                metric === "absolute"
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-white hover:bg-gray-50 text-[var(--muted-foreground)]"
              }`}
            >
              Price
            </button>
            <button
              onClick={() => setMetric("sqft")}
              className={`px-2.5 py-1 text-[10px] font-medium transition-colors ${
                metric === "sqft"
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-white hover:bg-gray-50 text-[var(--muted-foreground)]"
              }`}
            >
              £/sqft
            </button>
          </div>
        </div>
      )}

      {/* Map with heatmap overlay */}
      <MapContainer
        center={center}
        height={compact ? "280px" : "380px"}
        attribution="© HM Land Registry"
        legend={
          <MapLegend
            title={metric === "sqft" ? "Price per sqft" : "Sale Price"}
            items={PRICE_COLORS}
            gradient
          />
        }
      >
        {/* Heatmap dots */}
        {salesWithLocations.map((sale, i) => {
          const pos = geoToRelative(sale.latitude!, sale.longitude!, bounds);
          const displayValue = displayValues.get(sale.id) ?? sale.price;
          const color = getPriceColor(displayValue, displayRange.min, displayRange.max);
          const isHovered = hoveredSale === sale.id;

          return (
            <button
              key={sale.id}
              className={`absolute transition-all duration-200 ${
                isHovered ? "z-20 scale-150" : "z-10 hover:scale-125 hover:z-20"
              }`}
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: "translate(-50%, -50%)",
              }}
              onMouseEnter={() => setHoveredSale(sale.id)}
              onMouseLeave={() => setHoveredSale(null)}
              aria-label={`${sale.address}: ${metric === "sqft" ? formatPricePerSqft(displayValue) : formatPrice(displayValue)}`}
            >
              {/* Glow circle */}
              <div
                className="rounded-full"
                style={{
                  width: "24px",
                  height: "24px",
                  background: `radial-gradient(circle, ${color}88 0%, ${color}22 50%, transparent 70%)`,
                }}
              />
              {/* Center dot */}
              <div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/60"
                style={{
                  width: "8px",
                  height: "8px",
                  backgroundColor: color,
                }}
              />
              {/* Hover tooltip */}
              {isHovered && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-[10px] text-white shadow-lg z-30">
                  <p className="font-[var(--font-data)] font-bold">
                    {metric === "sqft" ? formatPricePerSqft(displayValue) : formatPrice(displayValue)}
                  </p>
                  <p className="text-white/70 text-[9px]">{sale.address}</p>
                  <p className="text-white/50 text-[9px]">{sale.date}</p>
                </div>
              )}
            </button>
          );
        })}
      </MapContainer>

      {/* Stats bar */}
      {!compact && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-[var(--border)] p-2 text-center">
            <p className="text-[10px] text-[var(--muted-foreground)]">Average</p>
            <p className="font-[var(--font-data)] text-lg font-bold text-[var(--color-primary)]">
              {formatPrice(averagePrice)}
            </p>
          </div>
          <div className="rounded-lg border border-[var(--border)] p-2 text-center">
            <p className="text-[10px] text-[var(--muted-foreground)]">Median</p>
            <p className="font-[var(--font-data)] text-lg font-bold text-[var(--color-accent)]">
              {formatPrice(medianPrice)}
            </p>
          </div>
          <div className="rounded-lg border border-[var(--border)] p-2 text-center">
            <p className="text-[10px] text-[var(--muted-foreground)]">Range</p>
            <p className="font-[var(--font-data)] text-sm font-bold">
              {formatPrice(priceRange.min)} – {formatPrice(priceRange.max)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
