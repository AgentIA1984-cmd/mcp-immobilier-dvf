import type { GeoLocation } from "../types.js";
/**
 * Geocode a free-text French address. Returns best matches ordered by score.
 * @param query address string (e.g. "8 bd du Port, Amiens")
 * @param limit number of candidates (1..20)
 */
export declare function geocodeAddress(query: string, limit: number): Promise<GeoLocation[]>;
/** Convenience: return the single best geocode match, or null. */
export declare function geocodeBest(query: string): Promise<GeoLocation | null>;
//# sourceMappingURL=ban.d.ts.map