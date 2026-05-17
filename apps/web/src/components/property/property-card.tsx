"use client";

import Link from "next/link";
import { Bed, Bath, Maximize2, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PropertyCardProps {
  property: {
    id: string;
    title: string;
    price: number;
    propertyType: string;
    status: string;
    bedrooms: number;
    bathrooms: number;
    squareFeet?: number;
    address: {
      line1: string;
      city: string;
      postcode: string;
    };
    images: string[];
    features: string[];
  };
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

const STATUS_LABELS: Record<string, string> = {
  for_sale: "For Sale",
  under_offer: "Under Offer",
  sold_stc: "Sold STC",
  sold: "Sold",
  withdrawn: "Withdrawn",
};

const STATUS_VARIANT: Record<string, "default" | "accent" | "gold" | "outline"> = {
  for_sale: "accent",
  under_offer: "gold",
  sold_stc: "default",
  sold: "default",
  withdrawn: "outline",
};

export function PropertyCard({ property }: PropertyCardProps) {
  const formatPrice = (price: number) =>
    `£${price.toLocaleString("en-GB")}`;

  return (
    <Link href={`/property/${property.id}`}>
      <Card className="group cursor-pointer overflow-hidden transition-all duration-[200ms] ease-out hover:shadow-lg hover:-translate-y-1">
        {/* Image placeholder */}
        <div className="relative h-48 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center text-white/30 text-6xl">
            🏠
          </div>
          {/* Status badge */}
          <div className="absolute left-3 top-3">
            <Badge variant={STATUS_VARIANT[property.status] ?? "outline"}>
              {STATUS_LABELS[property.status] ?? property.status}
            </Badge>
          </div>
          {/* Type badge */}
          <div className="absolute right-3 top-3">
            <Badge variant="outline" className="bg-white/90 backdrop-blur-sm text-[var(--foreground)]">
              {TYPE_LABELS[property.propertyType] ?? property.propertyType}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Price */}
          <p className="font-[var(--font-data)] text-xl font-bold text-[var(--color-primary)]">
            {formatPrice(property.price)}
          </p>

          {/* Title */}
          <h3 className="mt-1 text-sm font-semibold leading-tight line-clamp-1 group-hover:text-[var(--color-accent)] transition-colors">
            {property.title}
          </h3>

          {/* Address */}
          <div className="mt-1.5 flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="line-clamp-1">
              {property.address.city}, {property.address.postcode}
            </span>
          </div>

          {/* Stats */}
          <div className="mt-3 flex items-center gap-4 text-xs text-[var(--muted-foreground)]">
            <span className="flex items-center gap-1">
              <Bed className="h-3.5 w-3.5" />
              {property.bedrooms} bed{property.bedrooms !== 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1">
              <Bath className="h-3.5 w-3.5" />
              {property.bathrooms} bath{property.bathrooms !== 1 ? "s" : ""}
            </span>
            {property.squareFeet && (
              <span className="flex items-center gap-1">
                <Maximize2 className="h-3.5 w-3.5" />
                {property.squareFeet.toLocaleString()} sq ft
              </span>
            )}
          </div>

          {/* Features */}
          {property.features.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {property.features.slice(0, 3).map((feat) => (
                <Badge key={feat} variant="outline" className="text-[10px]">
                  {feat}
                </Badge>
              ))}
              {property.features.length > 3 && (
                <Badge variant="outline" className="text-[10px]">
                  +{property.features.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}
