"use client";

/**
 * PropertyComparisonTable — Side-by-side property comparison (S8-08)
 *
 * Compare 2-4 properties across key metrics.
 * Highlights best/worst values, "Winner" badge.
 * Responsive: horizontal scroll on mobile.
 * Renders inline in chat via visual payload.
 */

import { useMemo } from "react";
import { motion } from "framer-motion";

// --- Types ---

interface CompProperty {
  id: string;
  title: string;
  images?: string[];
  price: number;
  bedrooms: number;
  bathrooms: number;
  squareFeet?: number | null;
  propertyType: string;
  city?: string;
  postcode?: string;
  pricePerSqFt?: number | null;
  // Optional scores
  schoolRating?: number | null;
  crimeScore?: number | null;
  transportScore?: number | null;
}

interface PropertyComparisonTableProps {
  properties: CompProperty[];
  title?: string;
  compact?: boolean;
}

// Comparison row definitions
const ROWS: {
  key: string;
  label: string;
  format: (p: CompProperty) => string;
  getValue: (p: CompProperty) => number | null;
  lowerIsBetter?: boolean;
  isNumber?: boolean;
}[] = [
  {
    key: "price",
    label: "Price",
    format: (p) => `£${p.price.toLocaleString("en-GB")}`,
    getValue: (p) => p.price,
    lowerIsBetter: true,
    isNumber: true,
  },
  {
    key: "bedrooms",
    label: "Bedrooms",
    format: (p) => String(p.bedrooms),
    getValue: (p) => p.bedrooms,
    isNumber: true,
  },
  {
    key: "bathrooms",
    label: "Bathrooms",
    format: (p) => String(p.bathrooms),
    getValue: (p) => p.bathrooms,
    isNumber: true,
  },
  {
    key: "sqft",
    label: "Floor Area",
    format: (p) => (p.squareFeet ? `${p.squareFeet.toLocaleString()} sqft` : "—"),
    getValue: (p) => p.squareFeet ?? null,
    isNumber: true,
  },
  {
    key: "pricePerSqFt",
    label: "Price / sqft",
    format: (p) => (p.pricePerSqFt ? `£${p.pricePerSqFt.toLocaleString()}` : "—"),
    getValue: (p) => p.pricePerSqFt ?? null,
    lowerIsBetter: true,
    isNumber: true,
  },
  {
    key: "type",
    label: "Type",
    format: (p) => p.propertyType.replace("_", " "),
    getValue: () => null,
  },
  {
    key: "location",
    label: "Area",
    format: (p) => p.postcode || p.city || "—",
    getValue: () => null,
  },
  {
    key: "schoolRating",
    label: "School Rating",
    format: (p) =>
      p.schoolRating != null ? `${p.schoolRating}/5` : "—",
    getValue: (p) => p.schoolRating ?? null,
    isNumber: true,
  },
  {
    key: "crimeScore",
    label: "Crime Score",
    format: (p) =>
      p.crimeScore != null ? `${p.crimeScore}/10` : "—",
    getValue: (p) => p.crimeScore ?? null,
    lowerIsBetter: true,
    isNumber: true,
  },
  {
    key: "transportScore",
    label: "Transport Score",
    format: (p) =>
      p.transportScore != null ? `${p.transportScore}/10` : "—",
    getValue: (p) => p.transportScore ?? null,
    isNumber: true,
  },
];

export function PropertyComparisonTable({
  properties,
  title = "Property Comparison",
  compact = false,
}: PropertyComparisonTableProps) {
  // Determine winner (best price per sqft, fallback to lowest price)
  const winnerId = useMemo(() => {
    const withPpsf = properties.filter((p) => p.pricePerSqFt);
    if (withPpsf.length > 0) {
      return withPpsf.reduce((a, b) =>
        (a.pricePerSqFt || Infinity) < (b.pricePerSqFt || Infinity) ? a : b
      ).id;
    }
    return properties.reduce((a, b) => (a.price < b.price ? a : b)).id;
  }, [properties]);

  if (properties.length < 2) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-[var(--radius-card)] border border-[var(--border)] bg-white shadow-sm overflow-hidden ${
        compact ? "" : "max-w-4xl mx-auto"
      }`}
    >
      {/* Header */}
      <div className="bg-[var(--color-primary)] px-4 py-3">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          {/* Property Headers */}
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="sticky left-0 z-10 bg-white px-3 py-3 text-left text-xs font-medium text-[var(--muted-foreground)] w-28">
                &nbsp;
              </th>
              {properties.map((p) => (
                <th key={p.id} className="px-3 py-3 text-center min-w-[140px]">
                  {/* Image */}
                  {p.images?.[0] && (
                    <div className="mx-auto mb-2 h-16 w-24 overflow-hidden rounded-[var(--radius-input)]">
                      <img
                        src={p.images[0]}
                        alt={p.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  {/* Title */}
                  <p className="text-xs font-semibold text-[var(--foreground)] line-clamp-2">
                    {p.title}
                  </p>
                  {/* Winner Badge */}
                  {p.id === winnerId && (
                    <span className="mt-1 inline-block rounded-full bg-[var(--color-gold)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-primary)]">
                      🏆 Best Value
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {ROWS.map((row) => {
              // Get values for comparison
              const values = properties.map((p) => row.getValue(p));
              const validValues = values.filter((v): v is number => v !== null);
              const bestValue =
                validValues.length > 0
                  ? row.lowerIsBetter
                    ? Math.min(...validValues)
                    : Math.max(...validValues)
                  : null;
              const worstValue =
                validValues.length > 0
                  ? row.lowerIsBetter
                    ? Math.max(...validValues)
                    : Math.min(...validValues)
                  : null;

              return (
                <tr
                  key={row.key}
                  className="border-b border-[var(--border)] last:border-0"
                >
                  <td className="sticky left-0 z-10 bg-white px-3 py-2.5 text-xs font-medium text-[var(--muted-foreground)]">
                    {row.label}
                  </td>
                  {properties.map((p, idx) => {
                    const value = values[idx];
                    const isBest = value !== null && value === bestValue && validValues.length > 1;
                    const isWorst = value !== null && value === worstValue && validValues.length > 1;

                    return (
                      <td
                        key={p.id}
                        className={`px-3 py-2.5 text-center ${
                          row.isNumber ? "font-[var(--font-data)]" : ""
                        } ${
                          isBest
                            ? "bg-green-50 text-green-700 font-semibold"
                            : isWorst
                            ? "bg-red-50 text-red-600"
                            : "text-[var(--foreground)]"
                        }`}
                      >
                        {row.format(p)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
