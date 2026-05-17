import { z } from "zod";

// --- Property Type ---
export const PropertyType = z.enum([
  "detached",
  "semi-detached",
  "terraced",
  "flat",
  "bungalow",
  "cottage",
  "mansion",
  "other",
]);
export type PropertyType = z.infer<typeof PropertyType>;

// --- Property Status ---
export const PropertyStatus = z.enum([
  "for_sale",
  "under_offer",
  "sold_stc",
  "sold",
  "withdrawn",
]);
export type PropertyStatus = z.infer<typeof PropertyStatus>;

// --- Tenure ---
export const Tenure = z.enum(["freehold", "leasehold", "share-of-freehold"]);
export type Tenure = z.infer<typeof Tenure>;

// --- Address ---
export const AddressSchema = z.object({
  line1: z.string(),
  line2: z.string().optional(),
  city: z.string(),
  postcode: z.string(),
  county: z.string().optional(),
  country: z.string().default("UK"),
});
export type Address = z.infer<typeof AddressSchema>;

// --- Coordinates ---
export const CoordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type Coordinates = z.infer<typeof CoordinatesSchema>;

// --- Property Schema ---
export const PropertySchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  price: z.number().min(0),
  propertyType: PropertyType,
  status: PropertyStatus,
  bedrooms: z.number().min(0).max(20),
  bathrooms: z.number().min(0).max(10),
  squareFeet: z.number().min(0).optional(),
  yearBuilt: z.number().min(1600).max(2030).optional(),
  address: AddressSchema,
  coordinates: CoordinatesSchema.optional(),
  images: z.array(z.string().url()).default([]),
  features: z.array(z.string()).default([]),
  epcRating: z.string().optional(),
  tenure: Tenure.optional(),
  councilTaxBand: z.string().optional(),
  listingDate: z.string().datetime().optional(),
  ownerId: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Property = z.infer<typeof PropertySchema>;

// --- Property Card (lightweight for lists) ---
export const PropertyCardSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  price: z.number(),
  propertyType: PropertyType,
  status: PropertyStatus,
  bedrooms: z.number(),
  bathrooms: z.number(),
  squareFeet: z.number().optional(),
  address: AddressSchema,
  images: z.array(z.string()).default([]),
  features: z.array(z.string()).default([]),
  coordinates: CoordinatesSchema.optional(),
});
export type PropertyCard = z.infer<typeof PropertyCardSchema>;

// --- Search Filters ---
export const PropertyFilterSchema = z.object({
  query: z.string().optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  propertyType: PropertyType.optional(),
  minBedrooms: z.number().min(0).optional(),
  maxBedrooms: z.number().min(0).optional(),
  minBathrooms: z.number().min(0).optional(),
  location: z.string().optional(),
  radius: z.number().min(0).optional(),
  status: PropertyStatus.optional(),
  sortBy: z.enum(["price", "createdAt", "bedrooms", "squareFeet"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

export type PropertyFilter = z.infer<typeof PropertyFilterSchema>;

// --- Paginated Response ---
export const PaginatedPropertySchema = z.object({
  items: z.array(PropertySchema),
  nextCursor: z.string().uuid().nullable(),
  total: z.number(),
});
export type PaginatedProperty = z.infer<typeof PaginatedPropertySchema>;
