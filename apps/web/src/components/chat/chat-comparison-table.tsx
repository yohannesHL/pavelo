"use client";

/**
 * ChatComparisonTable — side-by-side property comparison (S5-08)
 */

import { Bed, Bath, Maximize2 } from "lucide-react";

interface ComparisonProperty {
  id: string;
  title: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  squareFeet?: number;
  propertyType: string;
  address?: string;
  city?: string;
  postcode?: string;
  features?: string[];
}

interface ChatComparisonTableProps {
  properties: ComparisonProperty[];
  title?: string;
}

function formatPrice(price: number) {
  return `£${price.toLocaleString("en-GB")}`;
}

const TYPE_LABELS: Record<string, string> = {
  detached: "Detached",
  semi_detached: "Semi-Detached",
  terraced: "Terraced",
  flat: "Flat",
  bungalow: "Bungalow",
  cottage: "Cottage",
  mansion: "Mansion",
  other: "Other",
};

export function ChatComparisonTable({
  properties,
  title,
}: ChatComparisonTableProps) {
  if (properties.length < 2) return null;

  const rows = [
    {
      label: "Price",
      values: properties.map((p) => formatPrice(p.price)),
      highlight: true,
    },
    {
      label: "Type",
      values: properties.map((p) => TYPE_LABELS[p.propertyType] || p.propertyType),
    },
    {
      label: "Bedrooms",
      values: properties.map((p) => String(p.bedrooms)),
    },
    {
      label: "Bathrooms",
      values: properties.map((p) => String(p.bathrooms)),
    },
    {
      label: "Size",
      values: properties.map((p) =>
        p.squareFeet ? `${p.squareFeet.toLocaleString()} ft²` : "—"
      ),
    },
    {
      label: "Location",
      values: properties.map((p) =>
        p.address || [p.city, p.postcode].filter(Boolean).join(", ") || "—"
      ),
    },
    {
      label: "Price/ft²",
      values: properties.map((p) =>
        p.squareFeet && p.squareFeet > 0
          ? `£${Math.round(p.price / p.squareFeet).toLocaleString()}`
          : "—"
      ),
    },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white shadow-sm">
      {/* Header */}
      {title && (
        <div className="border-b border-[var(--border)] bg-[var(--muted)] px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            {title}
          </p>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          {/* Property names header */}
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="w-24 px-3 py-2 text-left font-medium text-[var(--muted-foreground)]"></th>
              {properties.map((p) => (
                <th
                  key={p.id}
                  className="min-w-28 px-3 py-2 text-left font-medium text-[var(--foreground)]"
                >
                  <span className="line-clamp-2">{p.title}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-[var(--border)] last:border-0">
                <td className="px-3 py-2 font-medium text-[var(--muted-foreground)] whitespace-nowrap">
                  {row.label}
                </td>
                {row.values.map((value, i) => (
                  <td
                    key={i}
                    className={`px-3 py-2 ${
                      row.highlight
                        ? "font-[var(--font-heading)] font-bold text-[var(--color-primary)]"
                        : "text-[var(--foreground)]"
                    }`}
                  >
                    {value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
