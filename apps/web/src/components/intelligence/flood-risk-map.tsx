/**
 * Flood Risk Map (S9-10)
 *
 * Environment Agency API integration (mock data).
 * Flood risk map overlay with polygon zones.
 * Risk category badge: green (low) → amber (medium) → red (high).
 * Inline in chat + standalone at /intelligence/flood.
 */

"use client";

import { useState } from "react";

interface FloodZone {
  id: string;
  name: string;
  riskLevel: "low" | "medium" | "high" | "very_low";
  source: "river" | "surface" | "coastal" | "groundwater";
  description: string;
  // SVG polygon points (simplified for mock)
  points: string;
  color: string;
  opacity: number;
}

interface PropertyFloodRisk {
  propertyId?: string;
  address: string;
  postcode: string;
  lat: number;
  lng: number;
  overallRisk: "low" | "medium" | "high" | "very_low";
  riverRisk: "low" | "medium" | "high" | "very_low";
  surfaceRisk: "low" | "medium" | "high" | "very_low";
  reservoirRisk: boolean;
  historicalFlooding: boolean;
  nearestWatercourse: string;
  distanceToWater: number; // meters
  floodZones: FloodZone[];
}

interface FloodRiskMapProps {
  data?: PropertyFloodRisk;
  compact?: boolean;
  className?: string;
}

// Mock data
const mockFloodData: PropertyFloodRisk = {
  address: "42 Richmond Hill, TW10 6QX",
  postcode: "TW10 6QX",
  lat: 51.4560,
  lng: -0.3025,
  overallRisk: "low",
  riverRisk: "low",
  surfaceRisk: "medium",
  reservoirRisk: false,
  historicalFlooding: false,
  nearestWatercourse: "River Thames",
  distanceToWater: 320,
  floodZones: [
    {
      id: "fz1",
      name: "Flood Zone 1",
      riskLevel: "very_low",
      source: "river",
      description: "Land with less than 0.1% chance of flooding in any given year",
      points: "50,50 350,50 380,200 320,350 50,380",
      color: "#10b981",
      opacity: 0.15,
    },
    {
      id: "fz2",
      name: "Flood Zone 2",
      riskLevel: "medium",
      source: "river",
      description: "Land with between 0.1% and 1% chance of river flooding in any given year",
      points: "320,350 380,200 400,300 390,380 350,400",
      color: "#f59e0b",
      opacity: 0.25,
    },
    {
      id: "fz3",
      name: "Surface Water Risk",
      riskLevel: "medium",
      source: "surface",
      description: "Areas at risk from surface water flooding during heavy rainfall",
      points: "100,280 180,260 200,320 150,340",
      color: "#f59e0b",
      opacity: 0.3,
    },
    {
      id: "fz_thames",
      name: "Flood Zone 3 (Thames)",
      riskLevel: "high",
      source: "river",
      description: "Land with 1% or greater chance of river flooding in any given year",
      points: "380,320 400,300 400,400 350,400",
      color: "#ef4444",
      opacity: 0.3,
    },
  ],
};

const riskConfig = {
  very_low: { label: "Very Low", color: "#10b981", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  low: { label: "Low", color: "#10b981", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  medium: { label: "Medium", color: "#f59e0b", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  high: { label: "High", color: "#ef4444", bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
};

const sourceIcons = {
  river: "🌊",
  surface: "🌧️",
  coastal: "🏖️",
  groundwater: "💧",
};

/**
 * Compact risk badge for property cards
 */
export function FloodRiskBadge({ risk }: { risk: "low" | "medium" | "high" | "very_low" }) {
  const config = riskConfig[risk];
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold ${config.bg} ${config.text} ${config.border}`}>
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: config.color }}
      />
      Flood: {config.label}
    </span>
  );
}

/**
 * Full flood risk map with zone overlays
 */
export function FloodRiskMap({
  data = mockFloodData,
  compact = false,
  className = "",
}: FloodRiskMapProps) {
  const [selectedZone, setSelectedZone] = useState<FloodZone | null>(null);
  const overallConfig = riskConfig[data.overallRisk];

  if (compact) {
    return (
      <div className={`flood-risk-compact rounded-xl border border-[var(--border)] bg-white p-4 shadow-sm ${className}`}>
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-[#0D1B2A]">Flood Risk</h4>
            <p className="text-xs text-[var(--muted-foreground)]">{data.address}</p>
          </div>
          <FloodRiskBadge risk={data.overallRisk} />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <RiskMini label="River" risk={data.riverRisk} />
          <RiskMini label="Surface Water" risk={data.surfaceRisk} />
        </div>

        <div className="mt-2 text-[10px] text-[var(--muted-foreground)]">
          {data.distanceToWater}m from {data.nearestWatercourse}
          {data.historicalFlooding && " • Historical flooding recorded"}
        </div>
      </div>
    );
  }

  return (
    <div className={`flood-risk-map ${className}`}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-[#0D1B2A]">Flood & Environmental Risk</h3>
          <p className="text-xs text-[var(--muted-foreground)]">{data.address}</p>
        </div>
        <FloodRiskBadge risk={data.overallRisk} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* SVG Map */}
        <div className="rounded-xl border border-[var(--border)] bg-[#E8F0F8] p-4 shadow-sm">
          <svg viewBox="0 0 400 400" className="w-full h-auto" style={{ maxHeight: "360px" }}>
            {/* Background grid */}
            {Array.from({ length: 9 }, (_, i) => (
              <line key={`h${i}`} x1="0" y1={(i + 1) * 40} x2="400" y2={(i + 1) * 40} stroke="#CBD5E1" strokeWidth="0.3" />
            ))}
            {Array.from({ length: 9 }, (_, i) => (
              <line key={`v${i}`} x1={(i + 1) * 40} y1="0" x2={(i + 1) * 40} y2="400" stroke="#CBD5E1" strokeWidth="0.3" />
            ))}

            {/* Flood zones */}
            {data.floodZones.map((zone) => (
              <polygon
                key={zone.id}
                points={zone.points}
                fill={zone.color}
                opacity={selectedZone?.id === zone.id ? zone.opacity + 0.2 : zone.opacity}
                stroke={zone.color}
                strokeWidth={selectedZone?.id === zone.id ? 2 : 0.5}
                onClick={() => setSelectedZone(selectedZone?.id === zone.id ? null : zone)}
                style={{ cursor: "pointer" }}
              />
            ))}

            {/* Property marker */}
            <circle cx="200" cy="200" r="6" fill="#1B3A6B" stroke="white" strokeWidth="2" />
            <circle cx="200" cy="200" r="12" fill="none" stroke="#1B3A6B" strokeWidth="1" opacity="0.3" />

            {/* River Thames (simplified) */}
            <path
              d="M 370,250 Q 390,300 400,340"
              fill="none"
              stroke="#2E86AB"
              strokeWidth="8"
              opacity="0.3"
            />
            <text x="375" y="290" fontSize="7" fill="#2E86AB" transform="rotate(60, 375, 290)">
              Thames
            </text>
          </svg>

          {/* Legend */}
          <div className="mt-2 flex flex-wrap gap-3 text-[10px]">
            {Object.entries(riskConfig).map(([key, cfg]) => (
              <span key={key} className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: cfg.color, opacity: 0.6 }} />
                {cfg.label}
              </span>
            ))}
          </div>
        </div>

        {/* Risk Details */}
        <div className="space-y-3">
          {/* Overall Risk Card */}
          <div className={`rounded-xl border ${overallConfig.border} ${overallConfig.bg} p-4`}>
            <p className="text-xs font-medium text-[var(--muted-foreground)]">Overall Flood Risk</p>
            <p className={`text-2xl font-bold ${overallConfig.text}`} style={{ fontFamily: "var(--font-data)" }}>
              {overallConfig.label}
            </p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              Based on Environment Agency data for {data.postcode}
            </p>
          </div>

          {/* Risk Breakdown */}
          <div className="rounded-xl border border-[var(--border)] bg-white p-4 shadow-sm">
            <h4 className="mb-3 text-xs font-semibold text-[#0D1B2A]">Risk Breakdown</h4>
            <div className="space-y-2.5">
              <RiskRow icon="🌊" label="River Flooding" risk={data.riverRisk} />
              <RiskRow icon="🌧️" label="Surface Water" risk={data.surfaceRisk} />
              <RiskRow icon="🏗️" label="Reservoir" risk={data.reservoirRisk ? "medium" : "very_low"} />
            </div>
          </div>

          {/* Additional Info */}
          <div className="rounded-xl border border-[var(--border)] bg-white p-4 shadow-sm">
            <h4 className="mb-3 text-xs font-semibold text-[#0D1B2A]">Environmental Info</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">Nearest Watercourse</span>
                <span className="font-medium text-[#0D1B2A]">{data.nearestWatercourse}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">Distance</span>
                <span className="font-medium text-[#0D1B2A]" style={{ fontFamily: "var(--font-data)" }}>
                  {data.distanceToWater}m
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">Historical Flooding</span>
                <span className={`font-medium ${data.historicalFlooding ? "text-red-600" : "text-emerald-600"}`}>
                  {data.historicalFlooding ? "Yes" : "None recorded"}
                </span>
              </div>
            </div>
          </div>

          {/* Selected Zone Detail */}
          {selectedZone && (
            <div className="rounded-xl border-2 border-[var(--color-accent)] bg-[var(--color-accent)]/5 p-4">
              <div className="flex items-center gap-2">
                <span>{sourceIcons[selectedZone.source]}</span>
                <h4 className="text-xs font-semibold text-[#0D1B2A]">{selectedZone.name}</h4>
              </div>
              <p className="mt-1 text-xs text-[var(--muted-foreground)] leading-relaxed">
                {selectedZone.description}
              </p>
              <FloodRiskBadge risk={selectedZone.riskLevel} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RiskRow({ icon, label, risk }: { icon: string; label: string; risk: string }) {
  const cfg = riskConfig[risk as keyof typeof riskConfig] || riskConfig.low;
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-xs text-[#0D1B2A]">
        <span>{icon}</span>
        {label}
      </span>
      <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${cfg.bg} ${cfg.text} ${cfg.border}`}>
        {cfg.label}
      </span>
    </div>
  );
}

function RiskMini({ label, risk }: { label: string; risk: string }) {
  const cfg = riskConfig[risk as keyof typeof riskConfig] || riskConfig.low;
  return (
    <div className="flex items-center justify-between rounded-md bg-[var(--muted)] px-2 py-1.5">
      <span className="text-[10px] text-[var(--muted-foreground)]">{label}</span>
      <span className={`text-[10px] font-semibold ${cfg.text}`}>{cfg.label}</span>
    </div>
  );
}
