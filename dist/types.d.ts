/**
 * Shared TypeScript interfaces for the France Property MCP server.
 */
/** A geocoded location resolved via the Base Adresse Nationale (BAN). */
export interface GeoLocation {
    label: string;
    lat: number;
    lon: number;
    citycode: string | null;
    postcode: string | null;
    city: string | null;
    score: number;
    type: string | null;
}
/** A normalized real-estate sale record derived from DVF. */
export interface PropertySale {
    date: string;
    price: number;
    propertyType: string;
    surfaceM2: number | null;
    rooms: number | null;
    pricePerM2: number | null;
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
    yoyPricePerM2Pct: number | null;
}
//# sourceMappingURL=types.d.ts.map