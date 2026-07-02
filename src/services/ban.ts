/**
 * Base Adresse Nationale (BAN) geocoding client.
 * Docs: https://adresse.data.gouv.fr/api-doc/adresse
 * Stable French government service. No API key required.
 */
import { BAN_API_BASE } from "../constants.js";
import { httpGet } from "./http.js";
import type { GeoLocation } from "../types.js";

interface BanFeature {
  properties?: {
    label?: string;
    score?: number;
    citycode?: string;
    postcode?: string;
    city?: string;
    type?: string;
  };
  geometry?: { coordinates?: [number, number] }; // [lon, lat]
}

interface BanResponse {
  features?: BanFeature[];
}

/**
 * Geocode a free-text French address. Returns best matches ordered by score.
 * @param query address string (e.g. "8 bd du Port, Amiens")
 * @param limit number of candidates (1..20)
 */
export async function geocodeAddress(
  query: string,
  limit: number
): Promise<GeoLocation[]> {
  const data = await httpGet<BanResponse>(`${BAN_API_BASE}/search/`, {
    q: query,
    limit,
  });
  const features = data.features ?? [];
  return features.map((f): GeoLocation => {
    const coords = f.geometry?.coordinates;
    const props = f.properties ?? {};
    return {
      label: props.label ?? query,
      lat: coords ? coords[1] : NaN,
      lon: coords ? coords[0] : NaN,
      citycode: props.citycode ?? null,
      postcode: props.postcode ?? null,
      city: props.city ?? null,
      score: typeof props.score === "number" ? props.score : 0,
      type: props.type ?? null,
    };
  });
}

/** Convenience: return the single best geocode match, or null. */
export async function geocodeBest(query: string): Promise<GeoLocation | null> {
  const results = await geocodeAddress(query, 1);
  return results.length > 0 ? (results[0] as GeoLocation) : null;
}
