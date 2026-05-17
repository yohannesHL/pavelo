"use client";

/**
 * AreaDashboard — Area statistics visualization (S7-03)
 *
 * - Demographics radar chart (safety, schools, transport, amenities, green space, nightlife)
 * - Deprivation index bar
 * - Population density indicator
 * - ONS data integration
 * - Standalone at /intelligence/area/[postcode] and inline in chat
 */

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Shield,
  GraduationCap,
  Train,
  Store,
  Trees,
  Music,
  Users,
  Home,
  TrendingUp,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ---------- Types ----------

interface AreaScores {
  safety: number;
  schools: number;
  transport: number;
  amenities: number;
  greenSpace: number;
  nightlife: number;
}

interface AgeDistribution {
  band: string;
  count: number;
  percentage: number;
}

interface Demographics {
  areaName: string;
  population: number;
  populationDensity: number;
  householdCount: number;
  averageAge: number;
  ageDistribution: AgeDistribution[];
  deprivationIndex: number;
  employmentRate: number;
  incomeScore: number;
}

interface AreaDashboardProps {
  demographics: Demographics;
  scores: AreaScores;
  postcode: string;
  compact?: boolean;
  className?: string;
}

// ---------- Score config ----------

const SCORE_CONFIG: {
  key: keyof AreaScores;
  label: string;
  icon: typeof Shield;
  color: string;
}[] = [
  { key: "safety", label: "Safety", icon: Shield, color: "#10b981" },
  { key: "schools", label: "Schools", icon: GraduationCap, color: "#3b82f6" },
  { key: "transport", label: "Transport", icon: Train, color: "#8b5cf6" },
  { key: "amenities", label: "Amenities", icon: Store, color: "#f59e0b" },
  { key: "greenSpace", label: "Green Space", icon: Trees, color: "#22c55e" },
  { key: "nightlife", label: "Nightlife", icon: Music, color: "#ec4899" },
];

function getScoreColor(score: number): string {
  if (score >= 8) return "#10b981";
  if (score >= 6) return "#3b82f6";
  if (score >= 4) return "#f59e0b";
  return "#ef4444";
}

function getDeprivationLabel(index: number): string {
  if (index >= 8) return "Least Deprived";
  if (index >= 6) return "Below Average";
  if (index >= 4) return "Average";
  if (index >= 2) return "Above Average";
  return "Most Deprived";
}

// ---------- Radar Chart (SVG) ----------

function RadarChart({
  scores,
  size = 200,
}: {
  scores: AreaScores;
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 30;
  const keys = SCORE_CONFIG.map((s) => s.key);

  // Polygon points for max (10) rings
  function polarToCartesian(
    value: number,
    index: number,
    max: number = 10
  ): { x: number; y: number } {
    const angle = (Math.PI * 2 * index) / keys.length - Math.PI / 2;
    const r = (value / max) * radius;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  }

  // Background rings
  const rings = [2, 4, 6, 8, 10];
  const ringPaths = rings.map((ringVal) => {
    const points = keys
      .map((_, i) => {
        const p = polarToCartesian(ringVal, i);
        return `${p.x},${p.y}`;
      })
      .join(" ");
    return `M ${points} Z`;
  });

  // Data polygon
  const dataPoints = keys.map((key, i) => {
    const p = polarToCartesian(scores[key], i);
    return `${p.x},${p.y}`;
  });
  const dataPath = `M ${dataPoints.join(" ")} Z`;

  // Axis lines
  const axes = keys.map((_, i) => {
    const p = polarToCartesian(10, i);
    return { x1: cx, y1: cy, x2: p.x, y2: p.y };
  });

  // Labels
  const labels = SCORE_CONFIG.map((config, i) => {
    const p = polarToCartesian(12, i);
    return { ...p, label: config.label, score: scores[config.key] };
  });

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="w-full max-w-[250px] mx-auto"
    >
      {/* Ring backgrounds */}
      {ringPaths.map((path, i) => (
        <path
          key={i}
          d={path}
          fill="none"
          stroke="var(--border)"
          strokeWidth="0.5"
          opacity={0.5}
        />
      ))}

      {/* Axes */}
      {axes.map((axis, i) => (
        <line
          key={i}
          x1={axis.x1}
          y1={axis.y1}
          x2={axis.x2}
          y2={axis.y2}
          stroke="var(--border)"
          strokeWidth="0.5"
          opacity={0.3}
        />
      ))}

      {/* Data polygon */}
      <motion.path
        d={dataPath}
        fill="rgba(46, 134, 171, 0.15)"
        stroke="var(--color-accent)"
        strokeWidth="2"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      />

      {/* Data points */}
      {keys.map((key, i) => {
        const p = polarToCartesian(scores[key], i);
        return (
          <motion.circle
            key={key}
            cx={p.x}
            cy={p.y}
            r={3.5}
            fill="var(--color-accent)"
            stroke="white"
            strokeWidth="1.5"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 * i, duration: 0.3 }}
          />
        );
      })}

      {/* Labels */}
      {labels.map((item, i) => (
        <text
          key={i}
          x={item.x}
          y={item.y}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-[8px] fill-[var(--muted-foreground)]"
          fontWeight="500"
        >
          {item.label}
        </text>
      ))}
    </svg>
  );
}

// ---------- Component ----------

export function AreaDashboard({
  demographics,
  scores,
  postcode,
  compact = false,
  className = "",
}: AreaDashboardProps) {
  const avgScore = useMemo(() => {
    const vals = Object.values(scores);
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
  }, [scores]);

  return (
    <div className={`area-dashboard ${className}`}>
      {/* Header */}
      {!compact && (
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100">
              <TrendingUp className="h-4 w-4 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">
                Area Statistics — {postcode}
              </h3>
              <p className="text-xs text-[var(--muted-foreground)]">
                {demographics.areaName}
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className="font-[var(--font-data)] text-sm font-bold"
            style={{ color: getScoreColor(avgScore) }}
          >
            {avgScore}/10
          </Badge>
        </div>
      )}

      <div
        className={`grid gap-4 ${
          compact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
        }`}
      >
        {/* Radar chart */}
        <Card className="p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
            Area Scores
          </h4>
          <RadarChart scores={scores} />

          {/* Score bars */}
          <div className="mt-3 space-y-2">
            {SCORE_CONFIG.map((config) => {
              const score = scores[config.key];
              const Icon = config.icon;
              return (
                <div key={config.key} className="flex items-center gap-2">
                  <Icon
                    className="h-3.5 w-3.5 flex-shrink-0"
                    style={{ color: config.color }}
                  />
                  <span className="text-[10px] text-[var(--muted-foreground)] w-16">
                    {config.label}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: getScoreColor(score) }}
                      initial={{ width: 0 }}
                      animate={{ width: `${score * 10}%` }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                    />
                  </div>
                  <span className="font-[var(--font-data)] text-[10px] font-bold w-4 text-right">
                    {score}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Demographics */}
        <div className="space-y-3">
          {/* Key stats */}
          <Card className="p-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
              Demographics
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center gap-1 text-[var(--muted-foreground)]">
                  <Users className="h-3 w-3" />
                  <span className="text-[10px]">Population</span>
                </div>
                <p className="font-[var(--font-data)] text-sm font-bold mt-0.5">
                  {demographics.population.toLocaleString()}
                </p>
              </div>
              <div>
                <div className="flex items-center gap-1 text-[var(--muted-foreground)]">
                  <Home className="h-3 w-3" />
                  <span className="text-[10px]">Households</span>
                </div>
                <p className="font-[var(--font-data)] text-sm font-bold mt-0.5">
                  {demographics.householdCount.toLocaleString()}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-[var(--muted-foreground)]">
                  Avg. Age
                </span>
                <p className="font-[var(--font-data)] text-sm font-bold">
                  {demographics.averageAge}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-[var(--muted-foreground)]">
                  Density
                </span>
                <p className="font-[var(--font-data)] text-sm font-bold">
                  {demographics.populationDensity.toLocaleString()}/km²
                </p>
              </div>
            </div>
          </Card>

          {/* Deprivation index */}
          <Card className="p-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
              Deprivation Index
            </h4>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="h-3 rounded-full bg-gradient-to-r from-red-500 via-yellow-400 to-green-500 relative overflow-hidden">
                  <motion.div
                    className="absolute top-0 h-full w-1 bg-white rounded-full shadow-md"
                    initial={{ left: "0%" }}
                    animate={{
                      left: `${(demographics.deprivationIndex / 10) * 100}%`,
                    }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                </div>
                <div className="flex justify-between mt-0.5 text-[9px] text-[var(--muted-foreground)]">
                  <span>Most Deprived</span>
                  <span>Least Deprived</span>
                </div>
              </div>
              <div className="text-right">
                <p className="font-[var(--font-data)] text-lg font-bold">
                  {demographics.deprivationIndex}
                </p>
                <p className="text-[9px] text-[var(--muted-foreground)]">
                  {getDeprivationLabel(demographics.deprivationIndex)}
                </p>
              </div>
            </div>
          </Card>

          {/* Age distribution */}
          {!compact && (
            <Card className="p-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
                Age Distribution
              </h4>
              <div className="space-y-1.5">
                {demographics.ageDistribution.map((band, i) => (
                  <div key={band.band} className="flex items-center gap-2">
                    <span className="text-[10px] text-[var(--muted-foreground)] w-10">
                      {band.band}
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-[var(--color-accent)]"
                        initial={{ width: 0 }}
                        animate={{ width: `${band.percentage}%` }}
                        transition={{ duration: 0.4, delay: i * 0.05 }}
                      />
                    </div>
                    <span className="font-[var(--font-data)] text-[10px] w-7 text-right">
                      {band.percentage}%
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Employment */}
          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[var(--muted-foreground)]">
                  Employment Rate
                </span>
                <p className="font-[var(--font-data)] text-lg font-bold text-[var(--color-primary)]">
                  {demographics.employmentRate}%
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-[var(--muted-foreground)]">
                  Avg Income
                </span>
                <p className="font-[var(--font-data)] text-lg font-bold text-[var(--color-gold)]">
                  £{demographics.incomeScore.toLocaleString()}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
