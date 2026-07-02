/**
 * DVF (Demandes de Valeurs Foncières) client.
 *
 * DVF is the open dataset of French real-estate transactions since 2010.
 * This client targets the "micro-API DVF" response shape
 * (https://github.com/cquest/dvf_as_api): { nb_resultats, resultats: [...] }.
 * Field names in DVF vary slightly between providers, so parsing is defensive.
 * For production reliability, self-host the micro-API or point DVF_API_BASE
 * at a DVF+ provider — see README.
 */
import { DVF_API_BASE } from "../constants.js";
import { httpGet } from "./http.js";
import { haversineMeters } from "./stats.js";
/** Read the first present key from a record and coerce to number, else null. */
function num(rec, keys) {
    for (const k of keys) {
        const v = rec[k];
        if (v === null || v === undefined || v === "")
            continue;
        const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
        if (Number.isFinite(n))
            return n;
    }
    return null;
}
/** Read the first present key from a record and coerce to trimmed string, else null. */
function str(rec, keys) {
    for (const k of keys) {
        const v = rec[k];
        if (v === null || v === undefined)
            continue;
        const s = String(v).trim();
        if (s.length > 0)
            return s;
    }
    return null;
}
function normalizeDate(raw) {
    if (!raw)
        return "";
    // Accept "YYYY-MM-DD", ISO datetime, or "DD/MM/YYYY".
    if (/^\d{4}-\d{2}-\d{2}/.test(raw))
        return raw.slice(0, 10);
    const fr = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (fr)
        return `${fr[3]}-${fr[2]}-${fr[1]}`;
    return raw;
}
function normalizeRecord(rec) {
    const price = num(rec, ["valeur_fonciere", "valeurfonc", "valeur"]);
    const surface = num(rec, [
        "surface_reelle_bati",
        "surface_relle_bati",
        "surface_bati",
        "surface",
    ]);
    const rooms = num(rec, ["nombre_pieces_principales", "nb_pieces", "pieces"]);
    const numero = str(rec, ["adresse_numero", "numero_voie", "no_voie"]);
    const voie = str(rec, ["adresse_nom_voie", "nom_voie", "voie"]);
    const typeVoie = str(rec, ["adresse_type_voie", "type_voie"]);
    const commune = str(rec, ["nom_commune", "commune"]);
    const postcode = str(rec, ["code_postal", "cp"]);
    const citycode = str(rec, ["code_commune", "insee", "citycode"]);
    const lat = num(rec, ["lat", "latitude"]);
    const lon = num(rec, ["lon", "lng", "longitude"]);
    const propertyType = str(rec, ["type_local", "type_bien", "nature_mutation"]) ?? "Inconnu";
    const addressParts = [numero, typeVoie, voie].filter((p) => !!p);
    const address = addressParts.join(" ") || (commune ?? "");
    const priceVal = price ?? 0;
    const pricePerM2 = surface && surface > 0 && priceVal > 0
        ? Math.round(priceVal / surface)
        : null;
    return {
        date: normalizeDate(str(rec, ["date_mutation", "date"])),
        price: priceVal,
        propertyType,
        surfaceM2: surface,
        rooms,
        pricePerM2,
        address,
        postcode,
        commune,
        citycode,
        lat,
        lon,
    };
}
async function fetchRaw(query) {
    const params = {};
    if (query.citycode) {
        params.code_commune = query.citycode;
    }
    else if (typeof query.lat === "number" &&
        typeof query.lon === "number") {
        params.lat = query.lat;
        params.lon = query.lon;
        params.dist = query.radiusM ?? 500;
    }
    else {
        throw new Error("A commune code (citycode) or a lat/lon pair is required to query DVF.");
    }
    const data = await httpGet(DVF_API_BASE, params);
    return data.resultats ?? [];
}
/**
 * Fetch and normalize DVF sales for a location, applying the requested filters.
 */
export async function getSales(query) {
    const raw = await fetchRaw(query);
    let sales = raw.map(normalizeRecord);
    const builtOnly = query.builtOnly !== false;
    if (builtOnly) {
        sales = sales.filter((s) => s.surfaceM2 !== null && s.surfaceM2 > 0);
    }
    if (query.propertyType) {
        const needle = query.propertyType.toLowerCase();
        sales = sales.filter((s) => s.propertyType.toLowerCase().includes(needle));
    }
    if (typeof query.sinceYear === "number") {
        const floor = `${query.sinceYear}-01-01`;
        sales = sales.filter((s) => s.date >= floor);
    }
    if (typeof query.minRooms === "number") {
        sales = sales.filter((s) => s.rooms !== null && s.rooms >= query.minRooms);
    }
    if (typeof query.maxRooms === "number") {
        sales = sales.filter((s) => s.rooms !== null && s.rooms <= query.maxRooms);
    }
    // Distance filter when a centre and a radius are supplied.
    if (typeof query.lat === "number" &&
        typeof query.lon === "number" &&
        typeof query.radiusM === "number") {
        sales = sales.filter((s) => {
            if (s.lat === null || s.lon === null)
                return true; // keep if uncoded
            return (haversineMeters(query.lat, query.lon, s.lat, s.lon) <= query.radiusM);
        });
    }
    // Most recent first.
    sales.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    return sales;
}
//# sourceMappingURL=dvf.js.map