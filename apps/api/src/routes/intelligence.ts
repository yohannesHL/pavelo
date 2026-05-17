/**
 * Intelligence tRPC Router (S7-09)
 *
 * Exposes external data services as tRPC endpoints for the frontend
 * and agent tools to consume.
 */

import { z } from "zod";
import { router, publicProcedure } from "../router-helpers.js";
import { getCrimeData, getCrimeTrends } from "../services/external/police.js";
import { getSchoolsByLocation } from "../services/external/ofsted.js";
import {
  getSoldPrices,
  getPriceHistory,
  getComparableSales,
} from "../services/external/land-registry.js";
import { getAreaStats } from "../services/external/ons.js";
import { getIsochrones, type TransportMode } from "../services/external/traveltime.js";
import { getNearbyAmenities, type AmenityCategory } from "../services/external/places.js";

// ---------- Input Schemas ----------

const LocationInput = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const TransportModeEnum = z.enum([
  "driving",
  "public_transport",
  "walking",
  "cycling",
]);

const AmenityCategoryEnum = z.enum([
  "restaurant",
  "cafe",
  "gym",
  "supermarket",
  "park",
  "pharmacy",
  "school",
  "hospital",
  "bank",
  "post_office",
]);

// ---------- Router ----------

export const intelligenceRouter = router({
  /**
   * Crime data — street-level crimes near a location.
   */
  crime: publicProcedure
    .input(
      LocationInput.extend({
        months: z.number().min(1).max(12).default(3),
      })
    )
    .query(async ({ input }) => {
      const result = await getCrimeData(input.lat, input.lng, input.months);
      return {
        ...result.data,
        _meta: {
          cached: result.cached,
          stale: result.stale,
          cachedAt: result.cachedAt,
        },
      };
    }),

  /**
   * Crime trends — monthly crime counts over 12 months.
   */
  crimeTrends: publicProcedure
    .input(LocationInput)
    .query(async ({ input }) => {
      const result = await getCrimeTrends(input.lat, input.lng);
      return {
        ...result.data,
        _meta: {
          cached: result.cached,
          stale: result.stale,
          cachedAt: result.cachedAt,
        },
      };
    }),

  /**
   * Schools near a location with Ofsted ratings.
   */
  schools: publicProcedure
    .input(
      LocationInput.extend({
        radiusKm: z.number().min(0.5).max(10).default(3),
        type: z
          .enum(["primary", "secondary", "all-through", "special", "nursery", "post-16", "all"])
          .default("all"),
        rating: z
          .enum(["Outstanding", "Good", "Requires Improvement", "Inadequate", "Not yet inspected", "all"])
          .default("all"),
      })
    )
    .query(async ({ input }) => {
      const result = await getSchoolsByLocation(
        input.lat,
        input.lng,
        input.radiusKm,
        input.type as any,
        input.rating as any
      );
      return {
        ...result.data,
        _meta: {
          cached: result.cached,
          stale: result.stale,
          cachedAt: result.cachedAt,
        },
      };
    }),

  /**
   * Sold prices for a postcode.
   */
  soldPrices: publicProcedure
    .input(z.object({ postcode: z.string().min(2).max(10) }))
    .query(async ({ input }) => {
      const result = await getSoldPrices(input.postcode);
      return {
        ...result.data,
        _meta: {
          cached: result.cached,
          stale: result.stale,
          cachedAt: result.cachedAt,
        },
      };
    }),

  /**
   * Price history for a postcode.
   */
  priceHistory: publicProcedure
    .input(z.object({ postcode: z.string().min(2).max(10) }))
    .query(async ({ input }) => {
      const result = await getPriceHistory(input.postcode);
      return {
        ...result.data,
        _meta: {
          cached: result.cached,
          stale: result.stale,
          cachedAt: result.cachedAt,
        },
      };
    }),

  /**
   * Comparable sales near a postcode.
   */
  comparableSales: publicProcedure
    .input(
      z.object({
        postcode: z.string().min(2).max(10),
        targetPrice: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const result = await getComparableSales(input.postcode, input.targetPrice);
      return {
        ...result.data,
        _meta: {
          cached: result.cached,
          stale: result.stale,
          cachedAt: result.cachedAt,
        },
      };
    }),

  /**
   * Area demographics + scores.
   */
  areaStats: publicProcedure
    .input(
      LocationInput.extend({
        postcode: z.string().min(2).max(10),
      })
    )
    .query(async ({ input }) => {
      const result = await getAreaStats(input.lat, input.lng, input.postcode);
      return {
        ...result.data,
        _meta: {
          cached: result.cached,
          stale: result.stale,
          cachedAt: result.cachedAt,
        },
      };
    }),

  /**
   * Transport isochrones.
   */
  isochrones: publicProcedure
    .input(
      LocationInput.extend({
        modes: z.array(TransportModeEnum).default(["public_transport"]),
        timeBands: z.array(z.number().min(5).max(120)).default([15, 30, 45]),
        destinationLat: z.number().min(-90).max(90).optional(),
        destinationLng: z.number().min(-180).max(180).optional(),
      })
    )
    .query(async ({ input }) => {
      const result = await getIsochrones(
        input.lat,
        input.lng,
        input.modes as TransportMode[],
        input.timeBands,
        input.destinationLat,
        input.destinationLng
      );
      return {
        ...result.data,
        _meta: {
          cached: result.cached,
          stale: result.stale,
          cachedAt: result.cachedAt,
        },
      };
    }),

  /**
   * Nearby amenities.
   */
  amenities: publicProcedure
    .input(
      LocationInput.extend({
        radiusKm: z.number().min(0.1).max(10).default(1),
        categories: z
          .array(AmenityCategoryEnum)
          .default(["restaurant", "cafe", "gym", "supermarket", "park", "pharmacy"]),
      })
    )
    .query(async ({ input }) => {
      const result = await getNearbyAmenities(
        input.lat,
        input.lng,
        input.radiusKm,
        input.categories as AmenityCategory[]
      );
      return {
        ...result.data,
        _meta: {
          cached: result.cached,
          stale: result.stale,
          cachedAt: result.cachedAt,
        },
      };
    }),
});
