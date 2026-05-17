"use client";

import { use } from "react";
import Link from "next/link";
import {
  Bed,
  Bath,
  Maximize2,
  MapPin,
  Calendar,
  ChevronRight,
  Home,
  Share2,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

// Mock property data — will connect to tRPC
const MOCK_PROPERTY = {
  id: "1",
  title: "Victorian Terrace in Islington",
  description:
    "A beautifully restored Victorian terrace house in the heart of Islington. This stunning property features original period details combined with modern amenities. The open-plan kitchen and dining area leads to a landscaped south-facing garden, perfect for entertaining. The property has been sympathetically renovated throughout, maintaining its character while offering contemporary comfort.",
  price: 895000,
  propertyType: "terraced" as const,
  status: "for_sale" as const,
  bedrooms: 3,
  bathrooms: 2,
  squareFeet: 1200,
  yearBuilt: 1890,
  address: {
    line1: "42 Arlington Road",
    line2: "Upper Street",
    city: "London",
    postcode: "N1 7BA",
    county: "Greater London",
    country: "UK",
  },
  coordinates: { lat: 51.5362, lng: -0.1033 },
  images: [
    "/placeholder-1.jpg",
    "/placeholder-2.jpg",
    "/placeholder-3.jpg",
    "/placeholder-4.jpg",
  ],
  features: [
    "Garden",
    "Period Features",
    "Open Plan Kitchen",
    "South-Facing Garden",
    "Original Fireplaces",
    "Double Glazing",
    "Central Heating",
    "Loft Conversion",
  ],
  epcRating: "C",
  tenure: "freehold",
  councilTaxBand: "E",
  listingDate: "2024-11-15",
  owner: { id: "owner-1", name: "Estate Agent", email: "agent@pavelo.ai" },
};

const TYPE_LABELS: Record<string, string> = {
  detached: "Detached",
  semi_detached: "Semi-Detached",
  terraced: "Terraced",
  flat: "Flat",
  bungalow: "Bungalow",
  cottage: "Cottage",
  mansion: "Mansion",
};

export default function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const property = MOCK_PROPERTY; // Will be fetched via tRPC

  const formatPrice = (price: number) => `£${price.toLocaleString("en-GB")}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-1.5 text-sm text-[var(--muted-foreground)]" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-[var(--foreground)] transition-colors">
          Home
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link href="/property" className="hover:text-[var(--foreground)] transition-colors">
          Properties
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-[var(--foreground)] font-medium line-clamp-1">
          {property.title}
        </span>
      </nav>

      {/* Photo Gallery */}
      <div className="mb-6 grid grid-cols-1 gap-2 sm:grid-cols-4 sm:grid-rows-2">
        {/* Main image */}
        <div className="relative sm:col-span-2 sm:row-span-2 rounded-l-[var(--radius-card)] overflow-hidden bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] min-h-[300px] sm:min-h-[400px]">
          <div className="absolute inset-0 flex items-center justify-center text-white/20 text-8xl">
            🏠
          </div>
          <Badge variant="accent" className="absolute left-3 top-3">
            {property.images.length} photos
          </Badge>
        </div>
        {/* Thumbnail grid */}
        {[1, 2, 3, 4].map((i, idx) => (
          <div
            key={i}
            className={`hidden sm:flex relative bg-gradient-to-br from-[var(--color-primary)]/80 to-[var(--color-accent)]/80 min-h-[196px] items-center justify-center text-white/20 text-4xl overflow-hidden ${
              idx === 1 ? "rounded-tr-[var(--radius-card)]" : ""
            } ${idx === 3 ? "rounded-br-[var(--radius-card)]" : ""}`}
          >
            🏠
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Price + Title */}
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-[var(--font-data)] text-3xl font-bold text-[var(--color-primary)]">
                  {formatPrice(property.price)}
                </p>
                <h1 className="mt-1 font-[var(--font-heading)] text-2xl font-bold">
                  {property.title}
                </h1>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="icon" aria-label="Save property">
                  <Heart className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" aria-label="Share property">
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Address */}
            <div className="mt-2 flex items-center gap-1.5 text-sm text-[var(--muted-foreground)]">
              <MapPin className="h-4 w-4 shrink-0" />
              <span>
                {property.address.line1}
                {property.address.line2 ? `, ${property.address.line2}` : ""}
                , {property.address.city}, {property.address.postcode}
              </span>
            </div>

            {/* Key stats */}
            <div className="mt-4 flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <Bed className="h-5 w-5 text-[var(--color-accent)]" />
                <div>
                  <p className="text-sm font-semibold">{property.bedrooms}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">Bedrooms</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Bath className="h-5 w-5 text-[var(--color-accent)]" />
                <div>
                  <p className="text-sm font-semibold">{property.bathrooms}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">Bathrooms</p>
                </div>
              </div>
              {property.squareFeet && (
                <div className="flex items-center gap-2">
                  <Maximize2 className="h-5 w-5 text-[var(--color-accent)]" />
                  <div>
                    <p className="text-sm font-semibold">
                      {property.squareFeet.toLocaleString()}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">sq ft</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Home className="h-5 w-5 text-[var(--color-accent)]" />
                <div>
                  <p className="text-sm font-semibold">
                    {TYPE_LABELS[property.propertyType]}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">Property type</p>
                </div>
              </div>
              {property.yearBuilt && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-[var(--color-accent)]" />
                  <div>
                    <p className="text-sm font-semibold">{property.yearBuilt}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">Year built</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>About this property</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
                {property.description}
              </p>
            </CardContent>
          </Card>

          {/* Features */}
          <Card>
            <CardHeader>
              <CardTitle>Key Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {property.features.map((feat) => (
                  <div
                    key={feat}
                    className="flex items-center gap-2 rounded-[var(--radius-input)] bg-[var(--muted)] px-3 py-2 text-sm"
                  >
                    <span className="text-[var(--color-gold)]">✓</span>
                    {feat}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Map placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>Location</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex h-64 items-center justify-center rounded-[var(--radius-input)] bg-[var(--muted)] text-[var(--muted-foreground)]">
                <div className="text-center">
                  <MapPin className="mx-auto mb-2 h-8 w-8 text-[var(--color-accent)]" />
                  <p className="text-sm font-medium">
                    {property.address.city}, {property.address.postcode}
                  </p>
                  <p className="mt-1 font-[var(--font-data)] text-xs">
                    {property.coordinates.lat.toFixed(4)},{" "}
                    {property.coordinates.lng.toFixed(4)}
                  </p>
                  <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                    Interactive map coming in Sprint 4 (Mapbox)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Agent Contact Card */}
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="text-base">Interested?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" variant="default">
                Book a Viewing
              </Button>
              <Button className="w-full" variant="accent">
                💬 Ask Xara About This Property
              </Button>
              <Button className="w-full" variant="outline">
                Request Valuation
              </Button>
            </CardContent>
          </Card>

          {/* Property Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Property Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-[var(--muted-foreground)]">Status</dt>
                  <dd>
                    <Badge variant="accent">For Sale</Badge>
                  </dd>
                </div>
                {property.tenure && (
                  <div className="flex justify-between">
                    <dt className="text-[var(--muted-foreground)]">Tenure</dt>
                    <dd className="font-medium capitalize">{property.tenure}</dd>
                  </div>
                )}
                {property.epcRating && (
                  <div className="flex justify-between">
                    <dt className="text-[var(--muted-foreground)]">EPC Rating</dt>
                    <dd className="font-medium">{property.epcRating}</dd>
                  </div>
                )}
                {property.councilTaxBand && (
                  <div className="flex justify-between">
                    <dt className="text-[var(--muted-foreground)]">Council Tax</dt>
                    <dd className="font-medium">Band {property.councilTaxBand}</dd>
                  </div>
                )}
                {property.listingDate && (
                  <div className="flex justify-between">
                    <dt className="text-[var(--muted-foreground)]">Listed</dt>
                    <dd className="font-medium">
                      {new Date(property.listingDate).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
