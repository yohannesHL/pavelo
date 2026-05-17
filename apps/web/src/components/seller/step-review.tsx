"use client";

/**
 * Step 5: Review & Submit (S8-03)
 * Summary of all entered data before submission
 */

import type { SellerFormData } from "@/app/sell/page";

interface Props {
  formData: SellerFormData;
}

export function SellerStepReview({ formData }: Props) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-white p-6 shadow-sm">
      <h2 className="font-[var(--font-heading)] text-xl font-bold text-[var(--foreground)]">
        Review Your Listing
      </h2>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">
        Please review all details before submitting. You can go back to edit any section.
      </p>

      {/* Address */}
      <Section title="📍 Address">
        <Detail label="Address" value={`${formData.addressLine1}${formData.addressLine2 ? ", " + formData.addressLine2 : ""}`} />
        <Detail label="City" value={formData.city} />
        <Detail label="Postcode" value={formData.postcode} />
        {formData.county && <Detail label="County" value={formData.county} />}
      </Section>

      {/* Property Details */}
      <Section title="🏠 Property Details">
        <Detail label="Type" value={formData.propertyType.replace("_", " ")} />
        <Detail label="Bedrooms" value={String(formData.bedrooms)} isNumber />
        <Detail label="Bathrooms" value={String(formData.bathrooms)} isNumber />
        {formData.squareFeet && (
          <Detail label="Floor Area" value={`${formData.squareFeet.toLocaleString()} sq ft`} isNumber />
        )}
        {formData.yearBuilt && (
          <Detail label="Year Built" value={String(formData.yearBuilt)} isNumber />
        )}
        {formData.tenure && (
          <Detail label="Tenure" value={formData.tenure.replace("_", " ")} />
        )}
        {formData.epcRating && (
          <Detail label="EPC Rating" value={formData.epcRating} />
        )}
      </Section>

      {/* Features */}
      {formData.features.length > 0 && (
        <Section title="✨ Features">
          <div className="flex flex-wrap gap-1.5">
            {formData.features.map((f) => (
              <span
                key={f}
                className="rounded-full border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 px-2.5 py-0.5 text-xs font-medium text-[var(--color-primary)]"
              >
                {f}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Photos */}
      <Section title="📸 Photos">
        {formData.photoPreviewUrls.length > 0 ? (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {formData.photoPreviewUrls.map((url, idx) => (
              <div
                key={idx}
                className="relative aspect-square overflow-hidden rounded-[var(--radius-input)]"
              >
                <img
                  src={url}
                  alt={`Photo ${idx + 1}`}
                  className="h-full w-full object-cover"
                />
                {idx === 0 && (
                  <span className="absolute left-0.5 top-0.5 rounded-[var(--radius-badge)] bg-[var(--color-gold)] px-1 py-0.5 text-[8px] font-bold text-[var(--color-primary)]">
                    COVER
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--color-warning)]">
            ⚠️ No photos added — listings with photos get 5x more interest
          </p>
        )}
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
          {formData.photos.length} photo{formData.photos.length !== 1 ? "s" : ""}
        </p>
      </Section>

      {/* Description */}
      <Section title="✍️ Description">
        {formData.description ? (
          <p className="whitespace-pre-wrap text-sm text-[var(--foreground)] leading-relaxed">
            {formData.description}
          </p>
        ) : (
          <p className="text-sm text-[var(--color-warning)]">
            ⚠️ No description added — consider adding one for better visibility
          </p>
        )}
      </Section>

      {/* Valuation Notice */}
      <div className="mt-6 rounded-[var(--radius-card)] bg-gradient-to-r from-[var(--color-primary)]/5 to-[var(--color-gold)]/10 p-4 border border-[var(--color-gold)]/30">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏷️</span>
          <div>
            <p className="text-sm font-medium text-[var(--color-primary)]">
              AI Valuation Included
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">
              Once submitted, Xara will generate a comprehensive valuation report
              using comparable sales and market data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Sub-components ---

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-5 border-t border-[var(--border)] pt-4">
      <h3 className="mb-2 text-sm font-semibold text-[var(--foreground)]">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Detail({
  label,
  value,
  isNumber = false,
}: {
  label: string;
  value: string;
  isNumber?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex items-baseline justify-between py-1">
      <span className="text-xs text-[var(--muted-foreground)]">{label}</span>
      <span
        className={`text-sm font-medium text-[var(--foreground)] ${
          isNumber ? "font-[var(--font-data)]" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}
