"use client";

/**
 * MarketTrendDashboard — House price market trends (S7-08)
 *
 * - Multi-series line chart (Nationwide/Halifax indices)
 * - YoY change indicators (green up / red down arrows)
 * - Forecast band (shaded confidence interval)
 * - Standalone at /intelligence/market
 *
 * Uses mock data with realistic structure matching
 * Nationwide/Halifax house price index patterns.
 */

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  BarChart3,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ---------- Types ----------

interface IndexDataPoint {
  date: string; // YYYY-MM
  value: number;
}

interface MarketIndex {
  name: string;
  color: string;
  data: IndexDataPoint[];
  yoyChange: number;
  latestValue: number;
}

interface ForecastBand {
  date: string;
  low: number;
  mid: number;
  high: number;
}

interface MarketTrendDashboardProps {
  indices: MarketIndex[];
  forecast?: ForecastBand[];
  compact?: boolean;
  className?: string;
}

// ---------- Helpers ----------

function formatDate(dateStr: string): string {
  const [year, month] = dateStr.split("-");
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${months[parseInt(month) - 1]} ${year}`;
}

// ---------- Generate mock market data ----------

export function generateMockMarketData(): {
  indices: MarketIndex[];
  forecast: ForecastBand[];
} {
  const now = new Date();
  const baseNationwide = 260000;
  const baseHalifax = 265000;

  function generateIndex(
    name: string,
    base: number,
    volatility: number,
    color: string,
    months: number = 36
  ): MarketIndex {
    const data: IndexDataPoint[] = [];
    let value = base;

    for (let i = months; i >= 0; i--) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - i);

      // Simulate market trends: growth, then correction
      const progress = (months - i) / months;
      const trend = progress < 0.6
        ? 0.3 // growth phase
        : progress < 0.8
        ? -0.1 // correction
        : 0.15; // recovery

      const noise = (Math.sin(i * 0.8) * 0.5 + Math.cos(i * 1.3) * 0.3) * volatility;
      value = value * (1 + (trend + noise) / 100);

      data.push({
        date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        value: Math.round(value),
      });
    }

    const latest = data[data.length - 1].value;
    const yearAgo = data[Math.max(0, data.length - 13)]?.value || latest;
    const yoyChange = Math.round(((latest - yearAgo) / yearAgo) * 10000) / 100;

    return { name, color, data, yoyChange, latestValue: latest };
  }

  const indices = [
    generateIndex("Nationwide", baseNationwide, 1.2, "#1B3A6B"),
    generateIndex("Halifax", baseHalifax, 1.0, "#2E86AB"),
  ];

  // Forecast
  const lastNationwide = indices[0].data[indices[0].data.length - 1].value;
  const forecast: ForecastBand[] = [];
  let forecastValue = lastNationwide;

  for (let i = 1; i <= 12; i++) {
    const d = new Date(now);
    d.setMonth(d.getMonth() + i);
    forecastValue *= 1 + (0.2 + Math.sin(i * 0.5) * 0.1) / 100;
    const uncertainty = forecastValue * 0.02 * (i / 6);

    forecast.push({
      date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      low: Math.round(forecastValue - uncertainty),
      mid: Math.round(forecastValue),
      high: Math.round(forecastValue + uncertainty),
    });
  }

  return { indices, forecast };
}

// ---------- Multi-Series Line Chart (SVG) ----------

function MultiLineChart({
  indices,
  forecast,
  width = 700,
  height = 280,
  onHover,
}: {
  indices: MarketIndex[];
  forecast?: ForecastBand[];
  width?: number;
  height?: number;
  onHover?: (info: { date: string; values: { name: string; value: number; color: string }[] } | null) => void;
}) {
  const padding = { top: 20, right: 30, bottom: 30, left: 65 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Collect all data points
  const allValues: number[] = [];
  const allDates: string[] = [];

  for (const idx of indices) {
    for (const pt of idx.data) {
      allValues.push(pt.value);
      if (!allDates.includes(pt.date)) allDates.push(pt.date);
    }
  }

  if (forecast) {
    for (const f of forecast) {
      allValues.push(f.low, f.high);
      if (!allDates.includes(f.date)) allDates.push(f.date);
    }
  }

  allDates.sort();

  const yMin = Math.min(...allValues) * 0.98;
  const yMax = Math.max(...allValues) * 1.02;
  const yRange = yMax - yMin || 1;

  function dateToX(date: string): number {
    const idx = allDates.indexOf(date);
    return padding.left + (idx / (allDates.length - 1)) * chartW;
  }

  function valToY(val: number): number {
    return padding.top + chartH - ((val - yMin) / yRange) * chartH;
  }

  // Y-axis ticks
  const yTicks = Array.from({ length: 5 }, (_, i) => yMin + (yRange * i) / 4);

  // X-axis ticks (every 6 months)
  const xTicks = allDates.filter((_, i) => i % 6 === 0);

  function formatPrice(p: number): string {
    return `£${(p / 1000).toFixed(0)}k`;
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
      {/* Grid */}
      {yTicks.map((tick, i) => (
        <g key={i}>
          <line
            x1={padding.left}
            y1={valToY(tick)}
            x2={width - padding.right}
            y2={valToY(tick)}
            stroke="var(--border)"
            strokeWidth="0.5"
            strokeDasharray="4,4"
          />
          <text
            x={padding.left - 8}
            y={valToY(tick)}
            textAnchor="end"
            dominantBaseline="middle"
            className="text-[7px] fill-[var(--muted-foreground)]"
            fontFamily="var(--font-data)"
          >
            {formatPrice(tick)}
          </text>
        </g>
      ))}

      {/* X labels */}
      {xTicks.map((date) => (
        <text
          key={date}
          x={dateToX(date)}
          y={height - 5}
          textAnchor="middle"
          className="text-[7px] fill-[var(--muted-foreground)]"
        >
          {formatDate(date)}
        </text>
      ))}

      {/* Forecast band */}
      {forecast && forecast.length > 0 && (
        <motion.path
          d={`
            M ${dateToX(forecast[0].date)},${valToY(forecast[0].high)}
            ${forecast.map((f) => `L ${dateToX(f.date)},${valToY(f.high)}`).join(" ")}
            ${[...forecast].reverse().map((f) => `L ${dateToX(f.date)},${valToY(f.low)}`).join(" ")}
            Z
          `}
          fill="var(--color-gold)"
          opacity={0.12}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.12 }}
          transition={{ delay: 0.5 }}
        />
      )}

      {/* Forecast mid line */}
      {forecast && forecast.length > 0 && (
        <motion.path
          d={`M ${forecast.map((f) => `${dateToX(f.date)},${valToY(f.mid)}`).join(" L ")}`}
          fill="none"
          stroke="var(--color-gold)"
          strokeWidth="1.5"
          strokeDasharray="4,3"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        />
      )}

      {/* Index lines */}
      {indices.map((idx, seriesIdx) => {
        const path = idx.data
          .map((pt, i) => `${i === 0 ? "M" : "L"} ${dateToX(pt.date)},${valToY(pt.value)}`)
          .join(" ");

        return (
          <g key={idx.name}>
            <motion.path
              d={path}
              fill="none"
              stroke={idx.color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, delay: seriesIdx * 0.2 }}
            />
            {/* End dot */}
            {idx.data.length > 0 && (
              <circle
                cx={dateToX(idx.data[idx.data.length - 1].date)}
                cy={valToY(idx.data[idx.data.length - 1].value)}
                r={4}
                fill={idx.color}
                stroke="white"
                strokeWidth="2"
              />
            )}
          </g>
        );
      })}

      {/* Hover detection overlay */}
      {allDates.map((date, i) => {
        const x = dateToX(date);
        const sliceWidth = chartW / allDates.length;
        const values = indices
          .map((idx) => {
            const pt = idx.data.find((d) => d.date === date);
            return pt
              ? { name: idx.name, value: pt.value, color: idx.color }
              : null;
          })
          .filter(Boolean) as { name: string; value: number; color: string }[];

        return (
          <rect
            key={date}
            x={x - sliceWidth / 2}
            y={padding.top}
            width={sliceWidth}
            height={chartH}
            fill="transparent"
            className="cursor-crosshair"
            onMouseEnter={() => onHover?.({ date, values })}
            onMouseLeave={() => onHover?.(null)}
          />
        );
      })}
    </svg>
  );
}

// ---------- Component ----------

export function MarketTrendDashboard({
  indices,
  forecast,
  compact = false,
  className = "",
}: MarketTrendDashboardProps) {
  const [hoveredData, setHoveredData] = useState<{
    date: string;
    values: { name: string; value: number; color: string }[];
  } | null>(null);

  return (
    <div className={`market-trend-dashboard ${className}`}>
      {/* Header */}
      {!compact && (
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary)]/10">
              <BarChart3 className="h-4 w-4 text-[var(--color-primary)]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">UK Housing Market Trends</h3>
              <p className="text-xs text-[var(--muted-foreground)]">
                House price indices · 36 month history + 12 month forecast
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Index summary cards */}
      <div className={`grid gap-3 mb-4 ${compact ? "grid-cols-2" : "grid-cols-2 md:grid-cols-4"}`}>
        {indices.map((idx) => (
          <Card key={idx.name} className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-[var(--muted-foreground)]">
                {idx.name}
              </span>
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: idx.color }}
              />
            </div>
            <p className="font-[var(--font-data)] text-lg font-bold">
              £{(idx.latestValue / 1000).toFixed(0)}k
            </p>
            <Badge
              variant="outline"
              className={`mt-1 gap-0.5 font-[var(--font-data)] text-[10px] ${
                idx.yoyChange >= 0
                  ? "border-green-300 text-green-600"
                  : "border-red-300 text-red-600"
              }`}
            >
              {idx.yoyChange >= 0 ? (
                <ArrowUpRight className="h-2.5 w-2.5" />
              ) : (
                <ArrowDownRight className="h-2.5 w-2.5" />
              )}
              {Math.abs(idx.yoyChange)}%
            </Badge>
          </Card>
        ))}

        {forecast && forecast.length > 0 && (
          <Card className="p-3">
            <span className="text-[10px] font-medium text-[var(--muted-foreground)]">
              12m Forecast
            </span>
            <p className="font-[var(--font-data)] text-lg font-bold text-[var(--color-gold)]">
              £{(forecast[forecast.length - 1].mid / 1000).toFixed(0)}k
            </p>
            <p className="text-[9px] text-[var(--muted-foreground)] mt-1">
              Range: £{(forecast[forecast.length - 1].low / 1000).toFixed(0)}k –
              £{(forecast[forecast.length - 1].high / 1000).toFixed(0)}k
            </p>
          </Card>
        )}
      </div>

      {/* Chart */}
      <Card className="p-3 relative">
        <MultiLineChart
          indices={indices}
          forecast={forecast}
          height={compact ? 200 : 280}
          onHover={setHoveredData}
        />

        {/* Hover tooltip */}
        {hoveredData && (
          <div className="absolute top-4 right-4 z-20 rounded-lg bg-gray-900 px-3 py-2 text-white shadow-lg">
            <p className="text-[10px] text-white/60 mb-1">
              {formatDate(hoveredData.date)}
            </p>
            {hoveredData.values.map((v) => (
              <div key={v.name} className="flex items-center gap-2 text-xs">
                <div
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: v.color }}
                />
                <span className="text-white/80">{v.name}:</span>
                <span className="font-[var(--font-data)] font-bold">
                  £{(v.value / 1000).toFixed(0)}k
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 mt-2 justify-center">
          {indices.map((idx) => (
            <div key={idx.name} className="flex items-center gap-1.5">
              <div
                className="h-2 w-4 rounded-full"
                style={{ backgroundColor: idx.color }}
              />
              <span className="text-[10px] text-[var(--muted-foreground)]">
                {idx.name}
              </span>
            </div>
          ))}
          {forecast && (
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-4 rounded-full bg-[var(--color-gold)] opacity-50" />
              <span className="text-[10px] text-[var(--muted-foreground)]">
                Forecast
              </span>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
