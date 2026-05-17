/**
 * Google Places API Wrapper (S7-09)
 *
 * Nearby amenities by category (restaurants, gyms, supermarkets, parks)
 * with ratings, opening hours.
 *
 * Uses Google Places API (Nearby Search).
 * Requires GOOGLE_PLACES_API_KEY env var.
 *
 * When no API key is available, generates realistic amenity data
 * deterministically from location.
 *
 * Cache TTL: 24 hours (ratings/hours can change)
 */

import {
  fetchWithRetry,
  cachedFetch,
  buildCacheKey,
  type GeoLocation,
  type CachedResult,
} from "./base.js";

// ---------- Types ----------

export type AmenityCategory =
  | "restaurant"
  | "cafe"
  | "gym"
  | "supermarket"
  | "park"
  | "pharmacy"
  | "school"
  | "hospital"
  | "bank"
  | "post_office";

export interface Amenity {
  id: string;
  name: string;
  category: AmenityCategory;
  location: GeoLocation;
  distance: number; // km
  rating: number | null; // 1-5
  ratingCount: number;
  priceLevel: number | null; // 1-4
  openNow: boolean | null;
  address: string;
  photoUrl: string | null;
}

export interface AmenityCategoryGroup {
  category: AmenityCategory;
  label: string;
  icon: string;
  count: number;
  amenities: Amenity[];
}

export interface AmenityResponse {
  categories: AmenityCategoryGroup[];
  totalCount: number;
  center: GeoLocation;
  radius: number;
}

// ---------- Config ----------

const GOOGLE_PLACES_BASE = "https://maps.googleapis.com/maps/api/place";
const CACHE_TTL = 24 * 60 * 60; // 24 hours

const CATEGORY_CONFIG: Record<
  AmenityCategory,
  { label: string; icon: string; googleType: string }
> = {
  restaurant: { label: "Restaurants", icon: "🍽️", googleType: "restaurant" },
  cafe: { label: "Cafés", icon: "☕", googleType: "cafe" },
  gym: { label: "Gyms", icon: "💪", googleType: "gym" },
  supermarket: { label: "Supermarkets", icon: "🛒", googleType: "supermarket" },
  park: { label: "Parks", icon: "🌳", googleType: "park" },
  pharmacy: { label: "Pharmacies", icon: "💊", googleType: "pharmacy" },
  school: { label: "Schools", icon: "🏫", googleType: "school" },
  hospital: { label: "Hospitals", icon: "🏥", googleType: "hospital" },
  bank: { label: "Banks", icon: "🏦", googleType: "bank" },
  post_office: { label: "Post Offices", icon: "📮", googleType: "post_office" },
};

// ---------- Mock data ----------

function hashLoc(lat: number, lng: number, salt: number = 0): number {
  const str = `${lat.toFixed(4)},${lng.toFixed(4)},${salt}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

const RESTAURANT_NAMES = [
  "The Golden Fork", "Pasta Bella", "Dragon Palace", "The Spice Room",
  "Harbour Kitchen", "La Petite Maison", "Burger & Lobster", "Nando's",
  "Pizza Express", "Wagamama",
];

const CAFE_NAMES = [
  "The Daily Grind", "Bean There", "Pret A Manger", "Costa Coffee",
  "Notes Coffee", "Monmouth Coffee", "Workshop Coffee", "Flat White Cafe",
];

const GYM_NAMES = [
  "PureGym", "The Gym Group", "David Lloyd", "Virgin Active",
  "Fitness First", "Anytime Fitness", "F45 Training",
];

const SUPERMARKET_NAMES = [
  "Tesco Express", "Sainsbury's Local", "Waitrose", "M&S Food",
  "Co-op", "Aldi", "Lidl", "Whole Foods Market",
];

const PARK_NAMES = [
  "Victoria Park", "Regent's Gardens", "The Common", "Memorial Park",
  "King's Green", "Riverside Walk", "Millennium Gardens",
];

const PHARMACY_NAMES = [
  "Boots Pharmacy", "Superdrug", "LloydsPharmacy", "Day Lewis Pharmacy",
  "Well Pharmacy",
];

const NAME_MAP: Record<AmenityCategory, string[]> = {
  restaurant: RESTAURANT_NAMES,
  cafe: CAFE_NAMES,
  gym: GYM_NAMES,
  supermarket: SUPERMARKET_NAMES,
  park: PARK_NAMES,
  pharmacy: PHARMACY_NAMES,
  school: ["Local Primary School", "Community Academy"],
  hospital: ["Royal Hospital", "General Clinic"],
  bank: ["HSBC", "Barclays", "Lloyds", "NatWest"],
  post_office: ["Post Office", "Crown Post Office"],
};

function generateAmenities(
  lat: number,
  lng: number,
  radiusKm: number,
  categories: AmenityCategory[]
): AmenityCategoryGroup[] {
  const groups: AmenityCategoryGroup[] = [];

  for (const category of categories) {
    const config = CATEGORY_CONFIG[category];
    const names = NAME_MAP[category] || [];
    const h = hashLoc(lat, lng, category.charCodeAt(0));
    const count = Math.min(names.length, 3 + (h % (names.length - 2)));
    const amenities: Amenity[] = [];

    for (let i = 0; i < count; i++) {
      const angle = ((h + i * 137) % 360) * (Math.PI / 180);
      const dist = (((h + i * 53) % 100) / 100) * radiusKm;
      const dLat = (dist * Math.cos(angle)) / 111.32;
      const dLng = (dist * Math.sin(angle)) / (111.32 * Math.cos((lat * Math.PI) / 180));

      amenities.push({
        id: `place-${category}-${h}-${i}`,
        name: names[i % names.length],
        category,
        location: { lat: lat + dLat, lng: lng + dLng },
        distance: Math.round(dist * 100) / 100,
        rating: category === "park" ? null : Math.round((3 + ((h + i * 19) % 20) / 10) * 10) / 10,
        ratingCount: 10 + ((h + i * 41) % 500),
        priceLevel: ["restaurant", "cafe"].includes(category)
          ? 1 + ((h + i) % 3)
          : null,
        openNow: (h + i) % 4 !== 0,
        address: `${10 + (h + i) % 90} ${["High Street", "Station Road", "Church Lane", "Market Square"][(h + i) % 4]}`,
        photoUrl: null,
      });
    }

    amenities.sort((a, b) => a.distance - b.distance);

    groups.push({
      category,
      label: config.label,
      icon: config.icon,
      count: amenities.length,
      amenities,
    });
  }

  return groups;
}

// ---------- Public API ----------

/**
 * Get nearby amenities by category.
 */
export async function getNearbyAmenities(
  lat: number,
  lng: number,
  radiusKm: number = 1,
  categories: AmenityCategory[] = [
    "restaurant",
    "cafe",
    "gym",
    "supermarket",
    "park",
    "pharmacy",
  ]
): Promise<CachedResult<AmenityResponse>> {
  const cacheKey = buildCacheKey("places", {
    lat: lat.toFixed(4),
    lng: lng.toFixed(4),
    radius: radiusKm,
    cats: categories.sort().join(","),
  });

  return cachedFetch(cacheKey, CACHE_TTL, async () => {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;

    // Try real Google Places API if key available
    if (apiKey) {
      try {
        return await fetchRealAmenities(lat, lng, radiusKm, categories, apiKey);
      } catch (err: any) {
        console.warn(
          `[Places] Real API failed, using mock data: ${err.message}`
        );
      }
    }

    // Fallback: generate mock amenities
    const groups = generateAmenities(lat, lng, radiusKm, categories);
    const totalCount = groups.reduce((sum, g) => sum + g.count, 0);

    return {
      categories: groups,
      totalCount,
      center: { lat, lng },
      radius: radiusKm,
    };
  });
}

/**
 * Fetch real amenities from Google Places API.
 */
async function fetchRealAmenities(
  lat: number,
  lng: number,
  radiusKm: number,
  categories: AmenityCategory[],
  apiKey: string
): Promise<AmenityResponse> {
  const groups: AmenityCategoryGroup[] = [];
  const radiusMeters = Math.round(radiusKm * 1000);

  for (const category of categories) {
    const config = CATEGORY_CONFIG[category];
    const url = new URL(`${GOOGLE_PLACES_BASE}/nearbysearch/json`);
    url.searchParams.set("location", `${lat},${lng}`);
    url.searchParams.set("radius", radiusMeters.toString());
    url.searchParams.set("type", config.googleType);
    url.searchParams.set("key", apiKey);

    const response = await fetchWithRetry(url.toString());
    if (!response.ok) continue;

    const data = await response.json();
    const amenities: Amenity[] = (data.results || []).map(
      (place: any, i: number) => {
        const placeLat = place.geometry?.location?.lat || lat;
        const placeLng = place.geometry?.location?.lng || lng;
        const dLat = placeLat - lat;
        const dLng = placeLng - lng;
        const dist = Math.sqrt(
          (dLat * 111.32) ** 2 +
            (dLng * 111.32 * Math.cos((lat * Math.PI) / 180)) ** 2
        );

        return {
          id: place.place_id || `place-${i}`,
          name: place.name,
          category,
          location: { lat: placeLat, lng: placeLng },
          distance: Math.round(dist * 100) / 100,
          rating: place.rating || null,
          ratingCount: place.user_ratings_total || 0,
          priceLevel: place.price_level || null,
          openNow: place.opening_hours?.open_now ?? null,
          address: place.vicinity || "",
          photoUrl: place.photos?.[0]
            ? `${GOOGLE_PLACES_BASE}/photo?maxwidth=400&photo_reference=${place.photos[0].photo_reference}&key=${apiKey}`
            : null,
        };
      }
    );

    amenities.sort((a, b) => a.distance - b.distance);

    groups.push({
      category,
      label: config.label,
      icon: config.icon,
      count: amenities.length,
      amenities,
    });
  }

  const totalCount = groups.reduce((sum, g) => sum + g.count, 0);

  return {
    categories: groups,
    totalCount,
    center: { lat, lng },
    radius: radiusKm,
  };
}
