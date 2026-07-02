/**
 * Shared TypeScript interfaces for the France Property MCP server.
 */

/** A geocoded location resolved via the Base Adresse Nationale (BAN). */
export interface GeoLocation {
  label: string;
  lat: number;
  lon: number;
  citycode: string | null; // INSEE commune code
  postcode: string | null;
  city: string | null;
  score: number; // BAN match confidence (0..1)
  type: string | null; // housenumber | street | locality | municipality
}

/** A normalized real-estate sale record derived from DVF. */
export interface PropertySale {
  date: string; // ISO YYYY-MM-DD
  price: number; // valeur fonciere (EUR)
  propertyType: string; // Maison | Appartement | Terrain | ...
  surfaceM2: number | null; // built surface (m2)
  rooms: number | null; // nombre de pieces principales
  pricePerM2: number | null; // price / surfaceM2 (EUR/m2), when computable
  address: string;
  postcode: string | null;
  commune: string | null;
  citycode: string | null;
  lat: number | null;
  lon: number | null;
}

/** Aggregated market statistics for a scope (commune or radius). */
export interface MarketStats {
  scope: string;
  propertyType: string;
  salesCount: number;
  medianPricePerM2: number | null;
  p25PricePerM2: number | null;
  p75PricePerM2: number | null;
  medianPrice: number | null;
  yoyPricePerM2Pct: number | null; // year-over-year change of median EUR/m2
}
