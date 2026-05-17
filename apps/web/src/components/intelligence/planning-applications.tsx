/**
 * Planning Applications Map (S9-09)
 *
 * Visual component for planning applications near a property.
 * Map pins with status (pending/approved/refused).
 * Click pin → application details.
 * Impact indicator (distance from property).
 */

"use client";

import { useState } from "react";

interface PlanningApplication {
  id: string;
  reference: string;
  description: string;
  address: string;
  status: "pending" | "approved" | "refused";
  dateSubmitted: string;
  dateDecided?: string;
  distance: number; // meters from property
  lat: number;
  lng: number;
  applicant?: string;
  lpa: string; // Local Planning Authority
}

interface PlanningApplicationsMapProps {
  propertyLat?: number;
  propertyLng?: number;
  propertyAddress?: string;
  applications?: PlanningApplication[];
  className?: string;
}

// Mock planning applications
const mockApplications: PlanningApplication[] = [
  {
    id: "1", reference: "P/2024/0123", description: "Erection of single storey rear extension and loft conversion with rear dormer",
    address: "44 Richmond Hill, TW10 6QX", status: "pending", dateSubmitted: "2024-02-15", distance: 45,
    lat: 51.4562, lng: -0.3021, lpa: "Richmond upon Thames",
  },
  {
    id: "2", reference: "P/2024/0089", description: "Change of use from retail (Class E) to residential (Class C3) — 2 x 1-bed flats",
    address: "18-20 Hill Rise, TW10 6UA", status: "approved", dateSubmitted: "2024-01-20", dateDecided: "2024-03-01", distance: 120,
    lat: 51.4558, lng: -0.3035, lpa: "Richmond upon Thames",
  },
  {
    id: "3", reference: "P/2023/2456", description: "Demolition of existing garage and construction of 3-storey dwelling",
    address: "7 Friars Stile Road, TW10 6NQ", status: "refused", dateSubmitted: "2023-11-10", dateDecided: "2024-01-15", distance: 200,
    lat: 51.4570, lng: -0.3010, lpa: "Richmond upon Thames",
  },
  {
    id: "4", reference: "P/2024/0234", description: "Installation of solar panels to rear roof slope (4 panels)",
    address: "38 Richmond Hill, TW10 6QX", status: "approved", dateSubmitted: "2024-03-01", dateDecided: "2024-03-10", distance: 30,
    lat: 51.4561, lng: -0.3018, lpa: "Richmond upon Thames",
  },
  {
    id: "5", reference: "P/2024/0345", description: "Construction of basement with lightwell and associated landscaping works",
    address: "52 The Vineyard, TW10 6AN", status: "pending", dateSubmitted: "2024-03-08", distance: 280,
    lat: 51.4555, lng: -0.3045, lpa: "Richmond upon Thames",
  },
];

const statusConfig = {
  pending: { label: "Pending", color: "#f59e0b", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", pin: "🟡" },
  approved: { label: "Approved", color: "#10b981", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", pin: "🟢" },
  refused: { label: "Refused", color: "#ef4444", bg: "bg-red-50", text: "text-red-700", border: "border-red-200", pin: "🔴" },
};

function getImpactLevel(distance: number): { label: string; color: string; bg: string } {
  if (distance < 50) return { label: "High Impact", color: "text-red-700", bg: "bg-red-50" };
  if (distance < 150) return { label: "Medium Impact", color: "text-amber-700", bg: "bg-amber-50" };
  return { label: "Low Impact", color: "text-emerald-700", bg: "bg-emerald-50" };
}

export function PlanningApplicationsMap({
  propertyLat = 51.4560,
  propertyLng = -0.3025,
  propertyAddress = "42 Richmond Hill, TW10 6QX",
  applications = mockApplications,
  className = "",
}: PlanningApplicationsMapProps) {
  const [selectedApp, setSelectedApp] = useState<PlanningApplication | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "refused">("all");

  const filtered = statusFilter === "all"
    ? applications
    : applications.filter((a) => a.status === statusFilter);

  const sorted = [...filtered].sort((a, b) => a.distance - b.distance);

  // SVG Map — relative positions from property center
  const mapSize = 400;
  const scale = mapSize / 600; // ~600m radius

  function toMapCoords(lat: number, lng: number) {
    const dx = (lng - propertyLng) * 111320 * Math.cos((propertyLat * Math.PI) / 180);
    const dy = (lat - propertyLat) * 110540;
    return {
      x: mapSize / 2 + dx * scale,
      y: mapSize / 2 - dy * scale,
    };
  }

  return (
    <div className={`planning-applications ${className}`}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-[#0D1B2A]">Planning Applications Nearby</h3>
          <p className="text-xs text-[var(--muted-foreground)]">
            {applications.length} applications within 300m of {propertyAddress}
          </p>
        </div>

        {/* Status filter */}
        <div className="flex gap-1">
          {(["all", "pending", "approved", "refused"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`rounded-md px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                statusFilter === status
                  ? "bg-[#0D1B2A] text-white"
                  : "bg-white border border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
              }`}
            >
              {status === "all" ? "All" : statusConfig[status].label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* SVG Map */}
        <div className="rounded-xl border border-[var(--border)] bg-[#F0F4F8] p-4 shadow-sm">
          <svg
            viewBox={`0 0 ${mapSize} ${mapSize}`}
            className="w-full h-auto"
            style={{ maxHeight: "360px" }}
          >
            {/* Distance rings */}
            {[50, 150, 300].map((radius) => (
              <circle
                key={radius}
                cx={mapSize / 2}
                cy={mapSize / 2}
                r={radius * scale}
                fill="none"
                stroke="#CBD5E1"
                strokeWidth="0.5"
                strokeDasharray="4 2"
              />
            ))}

            {/* Distance labels */}
            {[50, 150, 300].map((radius) => (
              <text
                key={`label-${radius}`}
                x={mapSize / 2 + radius * scale + 4}
                y={mapSize / 2 - 4}
                fontSize="7"
                fill="#94A3B8"
              >
                {radius}m
              </text>
            ))}

            {/* Property center */}
            <circle cx={mapSize / 2} cy={mapSize / 2} r="6" fill="#1B3A6B" stroke="white" strokeWidth="2" />
            <text
              x={mapSize / 2}
              y={mapSize / 2 + 16}
              textAnchor="middle"
              fontSize="7"
              fontWeight="bold"
              fill="#1B3A6B"
            >
              Your Property
            </text>

            {/* Application pins */}
            {filtered.map((app) => {
              const pos = toMapCoords(app.lat, app.lng);
              const config = statusConfig[app.status];
              const isSelected = selectedApp?.id === app.id;

              return (
                <g
                  key={app.id}
                  onClick={() => setSelectedApp(selectedApp?.id === app.id ? null : app)}
                  style={{ cursor: "pointer" }}
                >
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={isSelected ? 8 : 5}
                    fill={config.color}
                    stroke="white"
                    strokeWidth="1.5"
                    opacity={isSelected ? 1 : 0.8}
                  />
                  {isSelected && (
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r="12"
                      fill="none"
                      stroke={config.color}
                      strokeWidth="1"
                      opacity="0.4"
                    />
                  )}
                </g>
              );
            })}
          </svg>

          {/* Legend */}
          <div className="mt-2 flex justify-center gap-4 text-[10px]">
            {Object.entries(statusConfig).map(([key, cfg]) => (
              <span key={key} className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: cfg.color }} />
                {cfg.label}
              </span>
            ))}
          </div>
        </div>

        {/* Application List */}
        <div className="space-y-2 max-h-[420px] overflow-y-auto">
          {sorted.map((app) => {
            const config = statusConfig[app.status];
            const impact = getImpactLevel(app.distance);
            const isSelected = selectedApp?.id === app.id;

            return (
              <div
                key={app.id}
                onClick={() => setSelectedApp(isSelected ? null : app)}
                className={`rounded-lg border bg-white p-3 cursor-pointer transition-all ${
                  isSelected
                    ? "border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]/20 shadow-md"
                    : "border-[var(--border)] hover:border-[var(--color-accent)]/30 shadow-sm"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="font-mono text-[10px] font-semibold"
                        style={{ fontFamily: "var(--font-data)" }}
                      >
                        {app.reference}
                      </span>
                      <span className={`rounded-md border px-1.5 py-0.5 text-[9px] font-semibold ${config.bg} ${config.text} ${config.border}`}>
                        {config.label}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#0D1B2A] leading-relaxed line-clamp-2">
                      {app.description}
                    </p>
                    <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">{app.address}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span
                      className="text-xs font-bold"
                      style={{ fontFamily: "var(--font-data)" }}
                    >
                      {app.distance}m
                    </span>
                    <span className={`block rounded-md px-1.5 py-0.5 text-[9px] font-semibold ${impact.color} ${impact.bg} mt-1`}>
                      {impact.label}
                    </span>
                  </div>
                </div>

                {/* Expanded Details */}
                {isSelected && (
                  <div className="mt-2 border-t border-[var(--border)] pt-2 text-xs space-y-1">
                    <p><span className="text-[var(--muted-foreground)]">LPA:</span> {app.lpa}</p>
                    <p><span className="text-[var(--muted-foreground)]">Submitted:</span> {new Date(app.dateSubmitted).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
                    {app.dateDecided && (
                      <p><span className="text-[var(--muted-foreground)]">Decided:</span> {new Date(app.dateDecided).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
