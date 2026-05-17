"use client";

/**
 * Step 2: Property Details (S8-03)
 * Type, beds, baths, sqft, year built, features
 */

import { useCallback } from "react";
import type { SellerFormData } from "@/app/sell/page";

interface Props {
  formData: SellerFormData;
  onUpdate: (updates: Partial<SellerFormData>) => void;
}

const PROPERTY_TYPES = [
  { value: "detached", label: "Detached", icon: "🏡" },
  { value: "semi_detached", label: "Semi-Detached", icon: "🏘️" },
  { value: "terraced", label: "Terraced", icon: "🏠" },
  { value: "flat", label: "Flat / Apartment", icon: "🏢" },
  { value: "bungalow", label: "Bungalow", icon: "🏚️" },
  { value: "cottage", label: "Cottage", icon: "🛖" },
];

const TENURE_OPTIONS = [
  { value: "freehold", label: "Freehold" },
  { value: "leasehold", label: "Leasehold" },
  { value: "share_of_freehold", label: "Share of Freehold" },
];

const EPC_RATINGS = ["A", "B", "C", "D", "E", "F", "G"];

const FEATURE_OPTIONS = [
  "Garden", "Garage", "Parking", "Balcony", "Ensuite",
  "Conservatory", "Loft Conversion", "Extension", "Open Plan Kitchen",
  "South Facing", "Period Features", "New Kitchen", "New Bathroom",
  "Double Glazing", "Central Heating",
];

export function SellerStepDetails({ formData, onUpdate }: Props) {
  const toggleFeature = useCallback(
    (feature: string) => {
      const features = formData.features.includes(feature)
        ? formData.features.filter((f) => f !== feature)
        : [...formData.features, feature];
      onUpdate({ features });
    },
    [formData.features, onUpdate]
  );

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-white p-6 shadow-sm">
      <h2 className="font-[var(--font-heading)] text-xl font-bold text-[var(--foreground)]">
        Property Details
      </h2>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">
        Tell us about your property so we can provide an accurate valuation.
      </p>

      {/* Property Type Grid */}
      <div className="mt-6">
        <label className="block text-sm font-medium text-[var(--foreground)]">
          Property Type
        </label>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {PROPERTY_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => onUpdate({ propertyType: t.value })}
              className={`flex flex-col items-center rounded-[var(--radius-input)] border-2 px-3 py-3 text-center transition-all ${
                formData.propertyType === t.value
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)]"
                  : "border-[var(--border)] hover:border-[var(--color-accent)]/50"
              }`}
            >
              <span className="text-2xl">{t.icon}</span>
              <span className="mt-1 text-xs font-medium">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Beds & Baths */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="bedrooms" className="block text-sm font-medium text-[var(--foreground)]">
            Bedrooms
          </label>
          <div className="mt-1 flex items-center gap-2">
            <button
              onClick={() => onUpdate({ bedrooms: Math.max(0, formData.bedrooms - 1) })}
              className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-input)] border border-[var(--border)] text-lg hover:bg-[var(--muted)]"
              aria-label="Decrease bedrooms"
            >
              −
            </button>
            <span className="w-8 text-center font-[var(--font-data)] text-lg font-bold">
              {formData.bedrooms}
            </span>
            <button
              onClick={() => onUpdate({ bedrooms: Math.min(10, formData.bedrooms + 1) })}
              className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-input)] border border-[var(--border)] text-lg hover:bg-[var(--muted)]"
              aria-label="Increase bedrooms"
            >
              +
            </button>
          </div>
        </div>
        <div>
          <label htmlFor="bathrooms" className="block text-sm font-medium text-[var(--foreground)]">
            Bathrooms
          </label>
          <div className="mt-1 flex items-center gap-2">
            <button
              onClick={() => onUpdate({ bathrooms: Math.max(1, formData.bathrooms - 1) })}
              className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-input)] border border-[var(--border)] text-lg hover:bg-[var(--muted)]"
              aria-label="Decrease bathrooms"
            >
              −
            </button>
            <span className="w-8 text-center font-[var(--font-data)] text-lg font-bold">
              {formData.bathrooms}
            </span>
            <button
              onClick={() => onUpdate({ bathrooms: Math.min(10, formData.bathrooms + 1) })}
              className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-input)] border border-[var(--border)] text-lg hover:bg-[var(--muted)]"
              aria-label="Increase bathrooms"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Square Feet & Year Built */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="sqft" className="block text-sm font-medium text-[var(--foreground)]">
            Floor Area (sq ft) <span className="text-[var(--muted-foreground)]">(optional)</span>
          </label>
          <input
            id="sqft"
            type="number"
            value={formData.squareFeet || ""}
            onChange={(e) =>
              onUpdate({
                squareFeet: e.target.value ? parseInt(e.target.value) : null,
              })
            }
            placeholder="e.g. 1200"
            className="mt-1 w-full rounded-[var(--radius-input)] border border-[var(--border)] px-3 py-2.5 text-sm font-[var(--font-data)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
          />
        </div>
        <div>
          <label htmlFor="yearBuilt" className="block text-sm font-medium text-[var(--foreground)]">
            Year Built <span className="text-[var(--muted-foreground)]">(optional)</span>
          </label>
          <input
            id="yearBuilt"
            type="number"
            value={formData.yearBuilt || ""}
            onChange={(e) =>
              onUpdate({
                yearBuilt: e.target.value ? parseInt(e.target.value) : null,
              })
            }
            placeholder="e.g. 1920"
            className="mt-1 w-full rounded-[var(--radius-input)] border border-[var(--border)] px-3 py-2.5 text-sm font-[var(--font-data)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
          />
        </div>
      </div>

      {/* Tenure & EPC */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)]">
            Tenure
          </label>
          <select
            value={formData.tenure}
            onChange={(e) => onUpdate({ tenure: e.target.value })}
            className="mt-1 w-full rounded-[var(--radius-input)] border border-[var(--border)] px-3 py-2.5 text-sm focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 bg-white"
          >
            <option value="">Select...</option>
            {TENURE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)]">
            EPC Rating
          </label>
          <div className="mt-1 flex gap-1">
            {EPC_RATINGS.map((r) => (
              <button
                key={r}
                onClick={() => onUpdate({ epcRating: r })}
                className={`flex h-9 w-9 items-center justify-center rounded-[var(--radius-badge)] border text-xs font-bold transition-all ${
                  formData.epcRating === r
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                    : "border-[var(--border)] hover:border-[var(--color-accent)]"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="mt-6">
        <label className="block text-sm font-medium text-[var(--foreground)]">
          Features <span className="text-[var(--muted-foreground)]">(select all that apply)</span>
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          {FEATURE_OPTIONS.map((f) => (
            <button
              key={f}
              onClick={() => toggleFeature(f)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                formData.features.includes(f)
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                  : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--color-accent)]/50"
              }`}
            >
              {formData.features.includes(f) ? "✓ " : ""}{f}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
