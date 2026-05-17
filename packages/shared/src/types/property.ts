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
  address: z.object({
    line1: z.string(),
    line2: z.string().optional(),
    city: z.string(),
    postcode: z.string(),
    county: z.string().optional(),
  }),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number(),
  }).optional(),
  images: z.array(z.string().url()).default([]),
  features: z.array(z.string()).default([]),
  ownerId: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Property = z.infer<typeof PropertySchema>;

// --- Search Filters ---
export const PropertyFilterSchema = z.object({
  query: z.string().optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  propertyType: PropertyType.optional(),
  minBedrooms: z.number().min(0).optional(),
  maxBedrooms: z.number().min(0).optional(),
  location: z.string().optional(),
  radius: z.number().min(0).optional(), // miles
  status: PropertyStatus.optional(),
});

export type PropertyFilter = z.infer<typeof PropertyFilterSchema>;
