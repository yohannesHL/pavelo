"use client";

import Link from "next/link";
import { Bed, Bath, Maximize2, MapPin, Heart } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SearchPropertyCardProps {
  property: {
    id: string;
    title: string;
    price: number;
    propertyType: string;
    status: string;
    bedrooms: number;
    bathrooms: number;
    squareFeet?: number | null;
    addressLine1: string;
    city: string;
    postcode: string;
    images: string[];
    features: string[];
    latitude?: number | null;
    longitude?: number | null;
    searchScore?: number | null;
  };
  isActive?: boolean;
  onHover?: (id: string | null) => void;
  onClick?: (id: string) => void;
  layout?: "grid" | "list";
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

const formatPrice = (price: number) => `£${price.toLocaleString("en-GB")}`;

export function SearchPropertyCard({
  property,
  isActive = false,
  onHover,
  onClick,
  layout = "grid",
}: SearchPropertyCardProps) {
  if (layout === "list") {
    return (
      <Link href={`/property/${property.id}`} onClick={() => onClick?.(property.id)}>
        <Card
          className={`group flex cursor-pointer overflow-hidden transition-all duration-[200ms] ease-out hover:shadow-lg ${
            isActive ? "ring-2 ring-[var(--color-accent)] shadow-lg" : ""
          }`}
          onMouseEnter={() => onHover?.(property.id)}
          onMouseLeave={() => onHover?.(null)}
        >
          {/* Image */}
          <div className="relative h-32 w-48 shrink-0 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center text-white/30 text-4xl">
              🏠
            </div>
            <div className="absolute left-2 top-2">
              <Badge variant={STATUS_VARIANT[property.status] ?? "outline"} className="text-[10px]">
                {STATUS_LABELS[property.status] ?? property.status}
              </Badge>
            </div>
          </div>

          {/* Content */}
          <div className="flex flex-1 flex-col justify-between p-3">
            <div>
              <div className="flex items-start justify-between">
                <p className="font-[var(--font-data)] text-lg font-bold text-[var(--color-primary)]">
                  {formatPrice(property.price)}
                </p>
                {property.searchScore != null && (
                  <span className="text-[10px] text-[var(--muted-foreground)] font-[var(--font-data)]">
                    {(property.searchScore * 100).toFixed(0)}% match
                  </span>
                )}
              </div>
              <h3 className="mt-0.5 text-sm font-semibold leading-tight line-clamp-1 group-hover:text-[var(--color-accent)] transition-colors">
                {property.title}
              </h3>
              <div className="mt-1 flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="line-clamp-1">{property.city}, {property.postcode}</span>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-4 text-xs text-[var(--muted-foreground)]">
              <span className="flex items-center gap-1">
                <Bed className="h-3.5 w-3.5" /> {property.bedrooms}
              </span>
              <span className="flex items-center gap-1">
                <Bath className="h-3.5 w-3.5" /> {property.bathrooms}
              </span>
              {property.squareFeet && (
                <span className="flex items-center gap-1">
                  <Maximize2 className="h-3.5 w-3.5" /> {property.squareFeet.toLocaleString()} ft²
                </span>
              )}
              <Badge variant="outline" className="ml-auto text-[10px]">
                {TYPE_LABELS[property.propertyType] ?? property.propertyType}
              </Badge>
            </div>
          </div>
        </Card>
      </Link>
    );
  }

  return (
    <Link href={`/property/${property.id}`} onClick={() => onClick?.(property.id)}>
      <Card
        className={`group cursor-pointer overflow-hidden transition-all duration-[200ms] ease-out hover:shadow-lg hover:-translate-y-1 ${
          isActive ? "ring-2 ring-[var(--color-accent)] shadow-lg -translate-y-1" : ""
        }`}
        onMouseEnter={() => onHover?.(property.id)}
        onMouseLeave={() => onHover?.(null)}
      >
        {/* Image */}
        <div className="relative aspect-video bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center text-white/30 text-6xl">
            🏠
          </div>
          <div className="absolute left-3 top-3">
            <Badge variant={STATUS_VARIANT[property.status] ?? "outline"}>
              {STATUS_LABELS[property.status] ?? property.status}
            </Badge>
          </div>
          <div className="absolute right-3 top-3">
            <Badge variant="outline" className="bg-white/90 backdrop-blur-sm text-[var(--foreground)]">
              {TYPE_LABELS[property.propertyType] ?? property.propertyType}
            </Badge>
          </div>
          {/* Search score indicator */}
          {property.searchScore != null && (
            <div className="absolute bottom-3 right-3">
              <span className="rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-[var(--font-data)] text-white backdrop-blur-sm">
                {(property.searchScore * 100).toFixed(0)}% match
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="font-[var(--font-data)] text-xl font-bold text-[var(--color-primary)]">
            {formatPrice(property.price)}
          </p>
          <h3 className="mt-1 text-sm font-semibold leading-tight line-clamp-1 group-hover:text-[var(--color-accent)] transition-colors">
            {property.title}
          </h3>
          <div className="mt-1.5 flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="line-clamp-1">{property.city}, {property.postcode}</span>
          </div>

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
                {property.squareFeet.toLocaleString()} ft²
              </span>
            )}
          </div>

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
