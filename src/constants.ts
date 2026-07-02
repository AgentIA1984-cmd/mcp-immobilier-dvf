/**
 * Shared constants and environment configuration.
 */

export const BAN_API_BASE: string =
  process.env.BAN_API_BASE || "https://api-adresse.data.gouv.fr";

export const DVF_API_BASE: string =
  process.env.DVF_API_BASE || "https://api.cquest.org/dvf";

export const SERVER_API_KEY: string = process.env.SERVER_API_KEY || "";

/** Maximum response size in characters before truncation kicks in. */
export const CHARACTER_LIMIT = 25000;

/** Network timeout for outbound HTTP calls (ms). */
export const HTTP_TIMEOUT_MS = 30000;

/** Default search radius (metres) for comparable / nearby lookups. */
export const DEFAULT_RADIUS_M = 500;
export const MAX_RADIUS_M = 5000;

/** Surface tolerance band for comparable selection (±fraction). */
export const COMP_SURFACE_TOLERANCE = 0.35;

/** Minimum number of comparables required for a confident estimate. */
export const MIN_COMPS_CONFIDENT = 8;
export const MIN_COMPS_LOW = 3;

export const SERVER_NAME = "france-property-mcp-server";
export const SERVER_VERSION = "1.0.0";
