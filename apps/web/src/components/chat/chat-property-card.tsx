"use client";

/**
 * ChatPropertyCard — compact property card for inline chat display (S5-08)
 *
 * Design system compliant:
 * - 12px border radius
 * - Playfair Display for price
 * - Brand colors
 * - Subtle shadow
 * - View Details CTA
 */

import Link from "next/link";
import { Bed, Bath, Maximize2, MapPin, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ChatPropertyCardProps {
  property: {
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
    images?: string[];
    features?: string[];
    status?: string;
  };
  title?: string;
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

function formatPrice(price: number) {
  return `£${price.toLocaleString("en-GB")}`;
}

export function ChatPropertyCard({ property, title }: ChatPropertyCardProps) {
  const address = property.address || [property.city, property.postcode].filter(Boolean).join(", ");

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Hero image area */}
      <div className="relative h-32 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)]">
        {property.images && property.images[0] ? (
          <img
            src={property.images[0]}
            alt={property.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl text-white/30">
            🏠
          </div>
        )}

        {/* Type badge */}
        <div className="absolute right-2 top-2">
          <Badge variant="outline" className="bg-white/90 backdrop-blur-sm text-[var(--foreground)] text-[10px]">
            {TYPE_LABELS[property.propertyType] || property.propertyType}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        {/* Price */}
        <p className="font-[var(--font-heading)] text-lg font-bold text-[var(--color-primary)]">
          {formatPrice(property.price)}
        </p>

        {/* Title */}
        <h4 className="mt-0.5 text-sm font-medium leading-tight line-clamp-1 text-[var(--foreground)]">
          {property.title}
        </h4>

        {/* Address */}
        {address && (
          <div className="mt-1 flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="line-clamp-1">{address}</span>
          </div>
        )}

        {/* Stats */}
        <div className="mt-2 flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
          <span className="flex items-center gap-1">
            <Bed className="h-3 w-3" />
            {property.bedrooms}
          </span>
          <span className="flex items-center gap-1">
            <Bath className="h-3 w-3" />
            {property.bathrooms}
          </span>
          {property.squareFeet && (
            <span className="flex items-center gap-1">
              <Maximize2 className="h-3 w-3" />
              {property.squareFeet.toLocaleString()} ft²
            </span>
          )}
        </div>

        {/* Features */}
        {property.features && property.features.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {property.features.slice(0, 3).map((feat) => (
              <Badge key={feat} variant="outline" className="text-[9px] px-1.5 py-0">
                {feat}
              </Badge>
            ))}
          </div>
        )}

        {/* CTA */}
        <Link
          href={`/property/${property.id}`}
          className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-[var(--color-accent-light)]"
        >
          View Details
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
