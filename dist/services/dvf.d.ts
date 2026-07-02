import type { PropertySale } from "../types.js";
export interface SaleQuery {
    citycode?: string;
    lat?: number;
    lon?: number;
    radiusM?: number;
    propertyType?: string;
    sinceYear?: number;
    minRooms?: number;
    maxRooms?: number;
    builtOnly?: boolean;
}
/**
 * Fetch and normalize DVF sales for a location, applying the requested filters.
 */
export declare function getSales(query: SaleQuery): Promise<PropertySale[]>;
//# sourceMappingURL=dvf.d.ts.map