/**
 * Pure numeric / geo helper functions (no I/O).
 */
/** Great-circle distance between two lat/lon points, in metres. */
export function haversineMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth radius (m)
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}
/** Percentile (linear interpolation) of a numeric array. Returns null if empty. */
export function percentile(values, p) {
    const clean = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
    if (clean.length === 0)
        return null;
    if (clean.length === 1)
        return clean[0] ?? null;
    const rank = (p / 100) * (clean.length - 1);
    const low = Math.floor(rank);
    const high = Math.ceil(rank);
    const lowVal = clean[low];
    const highVal = clean[high];
    if (lowVal === undefined || highVal === undefined)
        return null;
    if (low === high)
        return lowVal;
    return lowVal + (highVal - lowVal) * (rank - low);
}
export function median(values) {
    return percentile(values, 50);
}
/** Round to a given number of decimals. */
export function roundTo(value, decimals = 0) {
    const f = 10 ** decimals;
    return Math.round(value * f) / f;
}
//# sourceMappingURL=stats.js.map