/**
 * Shared constants and environment configuration.
 */
export declare const BAN_API_BASE: string;
export declare const DVF_API_BASE: string;
export declare const SERVER_API_KEY: string;
/** Maximum response size in characters before truncation kicks in. */
export declare const CHARACTER_LIMIT = 25000;
/** Network timeout for outbound HTTP calls (ms). */
export declare const HTTP_TIMEOUT_MS = 30000;
/** Default search radius (metres) for comparable / nearby lookups. */
export declare const DEFAULT_RADIUS_M = 500;
export declare const MAX_RADIUS_M = 5000;
/** Surface tolerance band for comparable selection (±fraction). */
export declare const COMP_SURFACE_TOLERANCE = 0.35;
/** Minimum number of comparables required for a confident estimate. */
export declare const MIN_COMPS_CONFIDENT = 8;
export declare const MIN_COMPS_LOW = 3;
export declare const SERVER_NAME = "france-property-mcp-server";
export declare const SERVER_VERSION = "1.0.0";
//# sourceMappingURL=constants.d.ts.map