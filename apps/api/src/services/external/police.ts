/**
 * Police UK API Wrapper (S7-09)
 *
 * Crime data by lat/lng and radius from data.police.uk
 * - Street-level crimes
 * - Category breakdown
 * - Monthly trends
 *
 * API docs: https://data.police.uk/docs/
 * No API key required. Rate limit: 15 req/s
 * Cache TTL: 72 hours (data updated monthly)
 */

import {
  fetchWithRetry,
  cachedFetch,
  buildCacheKey,
  type GeoLocation,
  type CachedResult,
} from "./base.js";

// ---------- Types ----------

export interface CrimeRecord {
  id: string;
  category: string;
  location: {
    latitude: string;
    longitude: string;
    street: { id: number; name: string };
  };
  context: string;
  outcomeStatus: { category: string; date: string } | null;
  month: string;
}

export interface CrimeCategoryCount {
  category: string;
  count: number;
  label: string;
}

export interface CrimeDataResponse {
  crimes: CrimeRecord[];
  total: number;
  categories: CrimeCategoryCount[];
  center: GeoLocation;
  radius: number;
  dateRange: { from: string; to: string };
}

export interface CrimeMonthlyTrend {
  month: string;
  total: number;
  categories: Record<string, number>;
}

export interface CrimeTrendResponse {
  trends: CrimeMonthlyTrend[];
  center: GeoLocation;
}

// ---------- Category labels ----------

const CRIME_CATEGORY_LABELS: Record<string, string> = {
  "anti-social-behaviour": "Anti-Social Behaviour",
  "bicycle-theft": "Bicycle Theft",
  burglary: "Burglary",
  "criminal-damage-arson": "Criminal Damage & Arson",
  drugs: "Drugs",
  "other-theft": "Other Theft",
  "possession-of-weapons": "Possession of Weapons",
  "public-order": "Public Order",
  robbery: "Robbery",
  shoplifting: "Shoplifting",
  "theft-from-the-person": "Theft from Person",
  "vehicle-crime": "Vehicle Crime",
  "violent-crime": "Violent Crime",
  "other-crime": "Other Crime",
};

const POLICE_API_BASE = "https://data.police.uk/api";
const CACHE_TTL = 72 * 60 * 60; // 72 hours

// ---------- Functions ----------

/**
 * Fetch street-level crimes near a location for a given month.
 */
async function fetchCrimes(
  lat: number,
  lng: number,
  date?: string
): Promise<CrimeRecord[]> {
  const params = new URLSearchParams({
    lat: lat.toFixed(6),
    lng: lng.toFixed(6),
  });
  if (date) params.set("date", date);

  const url = `${POLICE_API_BASE}/crimes-street/all-crime?${params}`;
  const response = await fetchWithRetry(url);

  if (!response.ok) {
    if (response.status === 503) {
      // Police UK sometimes returns 503 for no data
      return [];
    }
    throw new Error(`Police UK API error: ${response.status}`);
  }

  const data = (await response.json()) as Record<string, unknown>[];
  return data.map((crime: any) => ({
    id: crime.id?.toString() || `${crime.category}-${crime.month}`,
    category: crime.category,
    location: {
      latitude: crime.location?.latitude || lat.toString(),
      longitude: crime.location?.longitude || lng.toString(),
      street: crime.location?.street || { id: 0, name: "Unknown" },
    },
    context: crime.context || "",
    outcomeStatus: crime.outcome_status
      ? {
          category: crime.outcome_status.category,
          date: crime.outcome_status.date,
        }
      : null,
    month: crime.month,
  }));
}

/**
 * Build a category breakdown from crime records.
 */
function buildCategoryBreakdown(crimes: CrimeRecord[]): CrimeCategoryCount[] {
  const counts: Record<string, number> = {};
  for (const crime of crimes) {
    counts[crime.category] = (counts[crime.category] || 0) + 1;
  }

  return Object.entries(counts)
    .map(([category, count]) => ({
      category,
      count,
      label: CRIME_CATEGORY_LABELS[category] || category,
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Get crime data by location — the main public API.
 *
 * @param lat Latitude
 * @param lng Longitude
 * @param months Number of months to look back (1-12)
 */
export async function getCrimeData(
  lat: number,
  lng: number,
  months: number = 1
): Promise<CachedResult<CrimeDataResponse>> {
  const cacheKey = buildCacheKey("police", { lat: lat.toFixed(3), lng: lng.toFixed(3), months });

  return cachedFetch(cacheKey, CACHE_TTL, async () => {
    // Build date list (YYYY-MM format)
    const dates: string[] = [];
    const now = new Date();
    // Police UK data has ~2 month lag
    now.setMonth(now.getMonth() - 2);

    for (let i = 0; i < months; i++) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - i);
      dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }

    // Fetch crimes for each month (serial to respect rate limit)
    let allCrimes: CrimeRecord[] = [];
    for (const date of dates) {
      const crimes = await fetchCrimes(lat, lng, date);
      allCrimes = allCrimes.concat(crimes);
    }

    const categories = buildCategoryBreakdown(allCrimes);

    return {
      crimes: allCrimes,
      total: allCrimes.length,
      categories,
      center: { lat, lng },
      radius: 1, // Police UK default ~1 mile radius
      dateRange: {
        from: dates[dates.length - 1],
        to: dates[0],
      },
    };
  });
}

/**
 * Get monthly crime trends for a location (last 12 months).
 */
export async function getCrimeTrends(
  lat: number,
  lng: number
): Promise<CachedResult<CrimeTrendResponse>> {
  const cacheKey = buildCacheKey("police_trends", { lat: lat.toFixed(3), lng: lng.toFixed(3) });

  return cachedFetch(cacheKey, CACHE_TTL, async () => {
    const now = new Date();
    now.setMonth(now.getMonth() - 2);

    const trends: CrimeMonthlyTrend[] = [];

    for (let i = 0; i < 12; i++) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - i);
      const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

      const crimes = await fetchCrimes(lat, lng, date);
      const catCounts: Record<string, number> = {};
      for (const c of crimes) {
        catCounts[c.category] = (catCounts[c.category] || 0) + 1;
      }

      trends.push({
        month: date,
        total: crimes.length,
        categories: catCounts,
      });
    }

    return {
      trends: trends.reverse(), // chronological order
      center: { lat, lng },
    };
  });
}
