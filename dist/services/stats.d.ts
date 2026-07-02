/**
 * Pure numeric / geo helper functions (no I/O).
 */
/** Great-circle distance between two lat/lon points, in metres. */
export declare function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number;
/** Percentile (linear interpolation) of a numeric array. Returns null if empty. */
export declare function percentile(values: number[], p: number): number | null;
export declare function median(values: number[]): number | null;
/** Round to a given number of decimals. */
export declare function roundTo(value: number, decimals?: number): number;
//# sourceMappingURL=stats.d.ts.map