"use client";

import { PropertyCard } from "@/components/property/property-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { FilterState } from "@/components/property/property-filters";

// Mock data — will connect to tRPC in production
const MOCK_PROPERTIES = [
  {
    id: "1",
    title: "Victorian Terrace in Islington",
    price: 895000,
    propertyType: "terraced" as const,
    status: "for_sale" as const,
    bedrooms: 3,
    bathrooms: 2,
    squareFeet: 1200,
    address: { line1: "42 Arlington Road", city: "London", postcode: "N1 7BA", country: "UK" },
    images: ["/placeholder-property.jpg"],
    features: ["Garden", "Period Features", "Open Plan Kitchen"],
  },
  {
    id: "2",
    title: "Modern Penthouse with City Views",
    price: 1250000,
    propertyType: "flat" as const,
    status: "for_sale" as const,
    bedrooms: 2,
    bathrooms: 2,
    squareFeet: 950,
    address: { line1: "Tower Bridge House", city: "London", postcode: "SE1 2UP", country: "UK" },
    images: ["/placeholder-property.jpg"],
    features: ["Balcony", "Concierge", "Gym"],
  },
  {
    id: "3",
    title: "Detached Family Home with Garden",
    price: 650000,
    propertyType: "detached" as const,
    status: "for_sale" as const,
    bedrooms: 4,
    bathrooms: 3,
    squareFeet: 2100,
    address: { line1: "15 Oak Lane", city: "Oxford", postcode: "OX2 6HT", country: "UK" },
    images: ["/placeholder-property.jpg"],
    features: ["Double Garage", "South-Facing Garden", "En-suite"],
  },
  {
    id: "4",
    title: "Charming Cottage in the Cotswolds",
    price: 475000,
    propertyType: "cottage" as const,
    status: "for_sale" as const,
    bedrooms: 2,
    bathrooms: 1,
    squareFeet: 800,
    address: { line1: "Rose Cottage", city: "Burford", postcode: "OX18 4SN", country: "UK" },
    images: ["/placeholder-property.jpg"],
    features: ["Period Features", "Garden", "Fireplace"],
  },
  {
    id: "5",
    title: "Edwardian Semi in Leafy Suburb",
    price: 725000,
    propertyType: "semi_detached" as const,
    status: "under_offer" as const,
    bedrooms: 3,
    bathrooms: 2,
    squareFeet: 1400,
    address: { line1: "28 Elm Avenue", city: "Bristol", postcode: "BS6 6AT", country: "UK" },
    images: ["/placeholder-property.jpg"],
    features: ["Bay Windows", "Garden", "Cellar"],
  },
  {
    id: "6",
    title: "Luxury Mansion with Grounds",
    price: 2500000,
    propertyType: "mansion" as const,
    status: "for_sale" as const,
    bedrooms: 6,
    bathrooms: 5,
    squareFeet: 5500,
    address: { line1: "Westwood Manor", city: "Bath", postcode: "BA1 3NR", country: "UK" },
    images: ["/placeholder-property.jpg"],
    features: ["Swimming Pool", "Tennis Court", "Stables"],
  },
];

interface PropertyGridProps {
  filters: FilterState;
}

export function PropertyGrid({ filters }: PropertyGridProps) {
  // Client-side filtering of mock data (will be server-side via tRPC)
  let items = [...MOCK_PROPERTIES];

  if (filters.query) {
    const q = filters.query.toLowerCase();
    items = items.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.address.city.toLowerCase().includes(q) ||
        p.address.postcode.toLowerCase().includes(q)
    );
  }
  if (filters.minPrice !== undefined)
    items = items.filter((p) => p.price >= filters.minPrice!);
  if (filters.maxPrice !== undefined)
    items = items.filter((p) => p.price <= filters.maxPrice!);
  if (filters.propertyType)
    items = items.filter((p) => p.propertyType === filters.propertyType);
  if (filters.minBedrooms !== undefined)
    items = items.filter((p) => p.bedrooms >= filters.minBedrooms!);
  if (filters.location) {
    const loc = filters.location.toLowerCase();
    items = items.filter(
      (p) =>
        p.address.city.toLowerCase().includes(loc) ||
        p.address.postcode.toLowerCase().includes(loc)
    );
  }

  // Sort
  items.sort((a, b) => {
    const key = filters.sortBy as keyof typeof a;
    const aVal = key === "createdAt" ? 0 : (a[key] as number) ?? 0;
    const bVal = key === "createdAt" ? 0 : (b[key] as number) ?? 0;
    return filters.sortOrder === "asc" ? aVal - bVal : bVal - aVal;
  });

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 text-5xl">🏠</div>
        <h3 className="text-lg font-semibold">No properties found</h3>
        <p className="mt-1 max-w-md text-sm text-[var(--muted-foreground)]">
          Try adjusting your search criteria or broadening your filters to see more results.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-4 text-sm text-[var(--muted-foreground)]">
        {items.length} {items.length === 1 ? "property" : "properties"} found
      </p>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((property) => (
          <PropertyCard key={property.id} property={property} />
        ))}
      </div>
    </div>
  );
}

/** Loading skeleton for property grid */
export function PropertyGridSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="rounded-[var(--radius-card)] border border-[var(--border)] overflow-hidden">
          <Skeleton className="h-48 w-full rounded-none" />
          <div className="p-4 space-y-3">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
