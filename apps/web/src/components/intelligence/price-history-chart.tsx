"use client";

/**
 * PriceHistoryChart — Land Registry price trends (S7-07)
 *
 * - Sold prices over time with gradient area fill
 * - Toggle: street / area / national comparison
 * - YoY percentage change indicator
 * - Hover tooltip with exact price + date
 *
 * Uses pure SVG for chart rendering (Recharts not installed yet).
 * Architecture supports easy swap to Recharts when dependency is added.
 */

import { useState, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ---------- Types ----------

interface PriceHistoryPoint {
  date: string;
  price: number;
  address?: string;
  propertyType?: string;
}

interface YearlyAverage {
  year: number;
  average: number;
  count: number;
}

interface PriceHistoryChartProps {
  history: PriceHistoryPoint[];
  averagePrices: YearlyAverage[];
  postcode: string;
  yoyChange: number | null;
  compact?: boolean;
  className?: string;
}

type ViewMode = "street" | "area" | "national";

// ---------- Helpers ----------

function formatPrice(price: number): string {
  if (price >= 1_000_000) return `£${(price / 1_000_000).toFixed(2)}m`;
  if (price >= 1_000) return `£${(price / 1_000).toFixed(0)}k`;
  return `£${price}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

// ---------- SVG Area Chart ----------

function AreaChart({
  data,
  width = 600,
  height = 250,
  color = "#2E86AB",
  onHover,
}: {
  data: { x: number; y: number; label: string; value: number }[];
  width?: number;
  height?: number;
  color?: string;
  onHover?: (point: { label: string; value: number; x: number; y: number; svgWidth: number; svgHeight: number } | null) => void;
}) {
  if (data.length === 0) return null;

  const padding = { top: 20, right: 20, bottom: 30, left: 60 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const xMin = Math.min(...data.map((d) => d.x));
  const xMax = Math.max(...data.map((d) => d.x));
  const yMin = Math.min(...data.map((d) => d.y)) * 0.9;
  const yMax = Math.max(...data.map((d) => d.y)) * 1.05;

  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;

  function toSvgX(x: number): number {
    return padding.left + ((x - xMin) / xRange) * chartW;
  }
  function toSvgY(y: number): number {
    return padding.top + chartH - ((y - yMin) / yRange) * chartH;
  }

  // Line path
  const linePath = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${toSvgX(d.x)},${toSvgY(d.y)}`)
    .join(" ");

  // Area path (closed to bottom)
  const areaPath = `${linePath} L ${toSvgX(data[data.length - 1].x)},${toSvgY(yMin)} L ${toSvgX(data[0].x)},${toSvgY(yMin)} Z`;

  // Y-axis ticks
  const yTicks = Array.from({ length: 5 }, (_, i) => yMin + (yRange * i) / 4);

  // X-axis ticks (use data labels)
  const xTickCount = Math.min(data.length, 6);
  const xTickStep = Math.max(1, Math.floor(data.length / xTickCount));
  const xTicks = data.filter((_, i) => i % xTickStep === 0);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {yTicks.map((tick, i) => (
        <line
          key={i}
          x1={padding.left}
          y1={toSvgY(tick)}
          x2={width - padding.right}
          y2={toSvgY(tick)}
          stroke="var(--border)"
          strokeWidth="0.5"
          strokeDasharray="4,4"
        />
      ))}

      {/* Y-axis labels */}
      {yTicks.map((tick, i) => (
        <text
          key={i}
          x={padding.left - 8}
          y={toSvgY(tick)}
          textAnchor="end"
          dominantBaseline="middle"
          className="text-[8px] fill-[var(--muted-foreground)]"
          fontFamily="var(--font-data)"
        >
          {formatPrice(tick)}
        </text>
      ))}

      {/* X-axis labels */}
      {xTicks.map((tick, i) => (
        <text
          key={i}
          x={toSvgX(tick.x)}
          y={height - 5}
          textAnchor="middle"
          className="text-[8px] fill-[var(--muted-foreground)]"
        >
          {tick.label}
        </text>
      ))}

      {/* Area fill */}
      <motion.path
        d={areaPath}
        fill="url(#areaGradient)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      />

      {/* Line */}
      <motion.path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
      />

      {/* Data points */}
      {data.map((d, i) => (
        <circle
          key={i}
          cx={toSvgX(d.x)}
          cy={toSvgY(d.y)}
          r={3}
          fill="white"
          stroke={color}
          strokeWidth="1.5"
          className="cursor-pointer"
          onMouseEnter={() =>
            onHover?.({
              label: d.label,
              value: d.value,
              x: toSvgX(d.x),
              y: toSvgY(d.y),
              svgWidth: width,
              svgHeight: height,
            })
          }
          onMouseLeave={() => onHover?.(null)}
        />
      ))}
    </svg>
  );
}

// ---------- Component ----------

export function PriceHistoryChart({
  history,
  averagePrices,
  postcode,
  yoyChange,
  compact = false,
  className = "",
}: PriceHistoryChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("area");
  const [hoveredPoint, setHoveredPoint] = useState<{
    label: string;
    value: number;
    x: number;
    y: number;
    svgWidth: number;
    svgHeight: number;
  } | null>(null);

  // Chart data from yearly averages
  const chartData = useMemo(() => {
    return averagePrices.map((avg) => ({
      x: avg.year,
      y: avg.average,
      label: avg.year.toString(),
      value: avg.average,
    }));
  }, [averagePrices]);

  const latestPrice =
    averagePrices.length > 0
      ? averagePrices[averagePrices.length - 1].average
      : 0;

  return (
    <div className={`price-history-chart ${className}`}>
      {/* Header */}
      {!compact && (
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Price History</h3>
              <p className="text-xs text-[var(--muted-foreground)]">
                {postcode} · {history.length} sales
              </p>
            </div>
          </div>

          {/* View mode toggle */}
          <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
            {(["street", "area", "national"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-2.5 py-1 text-[10px] font-medium capitalize transition-colors ${
                  viewMode === mode
                    ? "bg-[var(--color-primary)] text-white"
                    : "bg-white hover:bg-gray-50 text-[var(--muted-foreground)]"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* YoY change badge */}
      {yoyChange !== null && (
        <div className="mb-3 flex items-center gap-2">
          <span className="font-[var(--font-data)] text-2xl font-bold text-[var(--color-primary)]">
            {formatPrice(latestPrice)}
          </span>
          <Badge
            variant="outline"
            className={`gap-0.5 font-[var(--font-data)] text-xs ${
              yoyChange >= 0
                ? "border-green-300 text-green-600"
                : "border-red-300 text-red-600"
            }`}
          >
            {yoyChange >= 0 ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {Math.abs(yoyChange)}% YoY
          </Badge>
        </div>
      )}

      {/* Chart */}
      <Card className="p-3 relative">
        <AreaChart
          data={chartData}
          height={compact ? 180 : 250}
          color="var(--color-accent)"
          onHover={setHoveredPoint}
        />

        {/* Hover tooltip */}
        {hoveredPoint && (
          <div
            className="absolute z-20 pointer-events-none"
            style={{
              left: `${(hoveredPoint.x / hoveredPoint.svgWidth) * 100}%`,
              top: `${(hoveredPoint.y / hoveredPoint.svgHeight) * 100 - 15}%`,
              transform: "translate(-50%, -100%)",
            }}
          >
            <div className="rounded-lg bg-gray-900 px-2.5 py-1.5 text-white shadow-lg">
              <p className="font-[var(--font-data)] text-sm font-bold">
                {formatPrice(hoveredPoint.value)}
              </p>
              <p className="text-[10px] text-white/60">{hoveredPoint.label}</p>
            </div>
          </div>
        )}
      </Card>

      {/* Recent sales list */}
      {!compact && history.length > 0 && (
        <div className="mt-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
            Recent Sales
          </h4>
          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {history.slice(-6).reverse().map((sale, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border border-[var(--border)] p-2"
              >
                <div>
                  <p className="text-xs font-medium">
                    {sale.address || "Property"}
                  </p>
                  <p className="text-[10px] text-[var(--muted-foreground)]">
                    {formatDate(sale.date)}
                    {sale.propertyType && ` · ${sale.propertyType}`}
                  </p>
                </div>
                <span className="font-[var(--font-data)] text-sm font-bold text-[var(--color-primary)]">
                  {formatPrice(sale.price)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
