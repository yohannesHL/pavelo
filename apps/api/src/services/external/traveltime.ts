/**
 * TravelTime API Wrapper (S7-09)
 *
 * Isochrone polygons for commute times at 15/30/45 minutes.
 * Multi-mode: tube, bus, car, walk, cycle.
 *
 * TravelTime API: https://docs.traveltime.com/api/overview/introduction
 * Requires API key (TRAVELTIME_APP_ID + TRAVELTIME_API_KEY).
 *
 * When no API key is available, generates approximate isochrone polygons
 * using radial estimation.
 *
 * Cache TTL: 24 hours (transit schedules can change)
 */

import {
  fetchWithRetry,
  cachedFetch,
  buildCacheKey,
  type GeoLocation,
  type CachedResult,
} from "./base.js";

// ---------- Types ----------

export type TransportMode = "driving" | "public_transport" | "walking" | "cycling";

export interface IsochronePolygon {
  timeMinutes: number;
  mode: TransportMode;
  coordinates: [number, number][][]; // GeoJSON polygon coordinates [lng, lat]
  area: number; // sq km (approximate)
  color: string;
}

export interface IsochroneResponse {
  isochrones: IsochronePolygon[];
  origin: GeoLocation;
  destination: GeoLocation | null;
  modes: TransportMode[];
  departureTime: string;
}

// ---------- Config ----------

const TRAVELTIME_BASE = "https://api.traveltimeapp.com/v4";
const CACHE_TTL = 24 * 60 * 60; // 24 hours

// Speed estimates (km/h) for approximate isochrone generation
const MODE_SPEEDS: Record<TransportMode, number> = {
  driving: 30,
  public_transport: 25,
  walking: 5,
  cycling: 15,
};

// Isochrone colors by time band
const TIME_BAND_COLORS: Record<number, string> = {
  15: "#10b981", // green
  30: "#f59e0b", // amber
  45: "#ef4444", // red
  60: "#8b5cf6", // purple
};

// ---------- Polygon generation ----------

/**
 * Generate an approximate isochrone polygon as a multi-pointed circle
 * with realistic distortion (roads aren't straight lines).
 */
function generateIsochronePolygon(
  lat: number,
  lng: number,
  minutes: number,
  mode: TransportMode
): [number, number][][] {
  const speedKmH = MODE_SPEEDS[mode];
  const radiusKm = (speedKmH * minutes) / 60;

  // Convert km to degrees (approximate)
  const latDegPerKm = 1 / 111.32;
  const lngDegPerKm = 1 / (111.32 * Math.cos((lat * Math.PI) / 180));

  // Generate polygon with 24 points and some noise for realism
  const points: [number, number][] = [];
  const numPoints = 24;
  const seed = Math.abs(Math.floor(lat * 1000 + lng * 1000 + minutes));

  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * 2 * Math.PI;
    // Add 10-30% variation for realism
    const variation = 0.7 + ((seed + i * 37) % 30) / 100 + 0.1;
    const r = radiusKm * variation;

    const dLat = r * Math.cos(angle) * latDegPerKm;
    const dLng = r * Math.sin(angle) * lngDegPerKm;

    points.push([lng + dLng, lat + dLat]); // GeoJSON is [lng, lat]
  }

  // Close the polygon
  points.push(points[0]);

  return [points];
}

function estimateArea(radiusKm: number): number {
  return Math.round(Math.PI * radiusKm * radiusKm * 100) / 100;
}

// ---------- Public API ----------

/**
 * Get isochrone polygons from a location.
 */
export async function getIsochrones(
  lat: number,
  lng: number,
  modes: TransportMode[] = ["public_transport"],
  timeBands: number[] = [15, 30, 45],
  destinationLat?: number,
  destinationLng?: number
): Promise<CachedResult<IsochroneResponse>> {
  const cacheKey = buildCacheKey("traveltime", {
    lat: lat.toFixed(4),
    lng: lng.toFixed(4),
    modes: modes.join(","),
    times: timeBands.join(","),
    destLat: destinationLat?.toFixed(4),
    destLng: destinationLng?.toFixed(4),
  });

  return cachedFetch(cacheKey, CACHE_TTL, async () => {
    const appId = process.env.TRAVELTIME_APP_ID;
    const apiKey = process.env.TRAVELTIME_API_KEY;

    // Try real API if credentials available
    if (appId && apiKey) {
      try {
        return await fetchRealIsochrones(
          lat, lng, modes, timeBands, appId, apiKey
        );
      } catch (err: any) {
        console.warn(
          `[TravelTime] Real API failed, using approximation: ${err.message}`
        );
      }
    }

    // Fallback: generate approximate polygons
    const isochrones: IsochronePolygon[] = [];

    for (const mode of modes) {
      for (const minutes of timeBands) {
        const speedKmH = MODE_SPEEDS[mode];
        const radiusKm = (speedKmH * minutes) / 60;

        isochrones.push({
          timeMinutes: minutes,
          mode,
          coordinates: generateIsochronePolygon(lat, lng, minutes, mode),
          area: estimateArea(radiusKm),
          color: TIME_BAND_COLORS[minutes] || "#6366f1",
        });
      }
    }

    // Sort largest first so they render underneath
    isochrones.sort((a, b) => b.timeMinutes - a.timeMinutes);

    return {
      isochrones,
      origin: { lat, lng },
      destination:
        destinationLat && destinationLng
          ? { lat: destinationLat, lng: destinationLng }
          : null,
      modes,
      departureTime: new Date().toISOString(),
    };
  });
}

/**
 * Call real TravelTime API (when credentials are available).
 */
async function fetchRealIsochrones(
  lat: number,
  lng: number,
  modes: TransportMode[],
  timeBands: number[],
  appId: string,
  apiKey: string
): Promise<IsochroneResponse> {
  const searches = [];

  for (const mode of modes) {
    for (const minutes of timeBands) {
      searches.push({
        id: `${mode}_${minutes}`,
        departure_location: { lat, lng },
        departure_time: new Date().toISOString(),
        travel_time: minutes * 60, // seconds
        transportation: {
          type: mode === "public_transport" ? "public_transport" : mode,
        },
      });
    }
  }

  const response = await fetchWithRetry(
    `${TRAVELTIME_BASE}/time-map`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Application-Id": appId,
        "X-Api-Key": apiKey,
      },
      body: JSON.stringify({
        departure_searches: searches,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`TravelTime API error: ${response.status}`);
  }

  const data = await response.json();
  const isochrones: IsochronePolygon[] = [];

  for (const result of data.results || []) {
    const [mode, minutes] = result.search_id.split("_");
    const shapes = result.shapes || [];

    for (const shape of shapes) {
      const coords = shape.shell?.map((p: any) => [p.lng, p.lat]) || [];
      if (coords.length > 0) {
        coords.push(coords[0]); // close polygon
      }

      isochrones.push({
        timeMinutes: parseInt(minutes),
        mode: mode as TransportMode,
        coordinates: [coords],
        area: 0, // would need to calculate
        color: TIME_BAND_COLORS[parseInt(minutes)] || "#6366f1",
      });
    }
  }

  isochrones.sort((a, b) => b.timeMinutes - a.timeMinutes);

  return {
    isochrones,
    origin: { lat, lng },
    destination: null,
    modes,
    departureTime: new Date().toISOString(),
  };
}
