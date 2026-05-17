"use client";

/**
 * Step 4: AI-Assisted Description (S8-03)
 * Generate description from attributes via agent endpoint
 */

import { useState, useCallback } from "react";
import type { SellerFormData } from "@/app/sell/page";

interface Props {
  formData: SellerFormData;
  onUpdate: (updates: Partial<SellerFormData>) => void;
}

export function SellerStepDescription({ formData, onUpdate }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [charCount, setCharCount] = useState(formData.description.length);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);

    try {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL || "http://localhost:8000";
      const response = await fetch(`${agentUrl}/api/v1/property/generate-description`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_type: formData.propertyType,
          bedrooms: formData.bedrooms,
          bathrooms: formData.bathrooms,
          square_feet: formData.squareFeet,
          year_built: formData.yearBuilt,
          features: formData.features,
          address: formData.addressLine1,
          postcode: formData.postcode,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const desc = data.description || "";
        onUpdate({ description: desc });
        setCharCount(desc.length);
      } else {
        // Fallback template
        const fallback = _generateFallback(formData);
        onUpdate({ description: fallback });
        setCharCount(fallback.length);
      }
    } catch {
      // Offline fallback
      const fallback = _generateFallback(formData);
      onUpdate({ description: fallback });
      setCharCount(fallback.length);
    } finally {
      setIsGenerating(false);
    }
  }, [formData, onUpdate]);

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-white p-6 shadow-sm">
      <h2 className="font-[var(--font-heading)] text-xl font-bold text-[var(--foreground)]">
        Property Description
      </h2>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">
        Write your own description or let Xara generate one based on your property details.
      </p>

      {/* AI Generate Button */}
      <div className="mt-4">
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !formData.propertyType}
          className="inline-flex items-center gap-2 rounded-[var(--radius-input)] bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Generating...
            </>
          ) : (
            <>✨ Generate with Xara</>
          )}
        </button>
        {!formData.propertyType && (
          <p className="mt-1 text-xs text-[var(--color-warning)]">
            Go back and select a property type first
          </p>
        )}
      </div>

      {/* Text Area */}
      <div className="mt-4">
        <textarea
          value={formData.description}
          onChange={(e) => {
            onUpdate({ description: e.target.value });
            setCharCount(e.target.value.length);
          }}
          placeholder="Describe your property... Include key selling points, unique features, and what makes it special."
          rows={8}
          className="w-full rounded-[var(--radius-input)] border border-[var(--border)] px-3 py-2.5 text-sm leading-relaxed focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 resize-y"
        />
        <div className="mt-1 flex items-center justify-between text-xs text-[var(--muted-foreground)]">
          <span>{charCount} characters</span>
          <span>{charCount < 100 ? "⚠️ Too short" : charCount > 2000 ? "⚠️ Consider shortening" : "✓ Good length"}</span>
        </div>
      </div>

      {/* Writing Tips */}
      <div className="mt-4 rounded-[var(--radius-input)] bg-[var(--color-gold)]/10 p-3">
        <p className="text-xs font-medium text-[var(--color-primary)]">✍️ Writing Tips</p>
        <ul className="mt-1 space-y-0.5 text-xs text-[var(--muted-foreground)]">
          <li>• Start with the most attractive feature</li>
          <li>• Mention recent improvements or renovations</li>
          <li>• Describe the neighbourhood and local amenities</li>
          <li>• Keep it factual — avoid subjective claims</li>
        </ul>
      </div>
    </div>
  );
}

function _generateFallback(formData: SellerFormData): string {
  const type = formData.propertyType.replace("_", "-");
  const beds = formData.bedrooms;
  const baths = formData.bathrooms;
  const features = formData.features;

  let desc = `A well-presented ${beds} bedroom ${type}`;
  if (formData.postcode) {
    desc += ` situated in the desirable ${formData.postcode} area`;
  }
  desc += `, offering ${baths} bathroom${baths > 1 ? "s" : ""}`;
  if (formData.squareFeet) {
    desc += ` and approximately ${formData.squareFeet.toLocaleString()} sq ft of living space`;
  }
  desc += ".";

  if (features.length > 0) {
    desc += `\n\nKey features include ${features.join(", ").toLowerCase()}.`;
  }

  desc += `\n\nThis property represents an excellent opportunity for buyers seeking a quality home. Early viewings are highly recommended.`;

  return desc;
}
