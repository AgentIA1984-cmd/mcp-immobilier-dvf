/**
 * Response formatting helpers shared across tools.
 */
import { CHARACTER_LIMIT } from "../constants.js";
export var ResponseFormat;
(function (ResponseFormat) {
    ResponseFormat["MARKDOWN"] = "markdown";
    ResponseFormat["JSON"] = "json";
})(ResponseFormat || (ResponseFormat = {}));
/** Ensure a text payload stays under CHARACTER_LIMIT; append a note if trimmed. */
export function capText(text) {
    if (text.length <= CHARACTER_LIMIT)
        return text;
    const note = "\n\n[... response truncated: exceeded character limit. Narrow your filters (radius, property_type, since_year) or lower 'limit'.]";
    return text.slice(0, CHARACTER_LIMIT - note.length) + note;
}
/** Format a number as EUR with thousands separators (no decimals). */
export function eur(value) {
    if (value === null || !Number.isFinite(value))
        return "n/a";
    return `${Math.round(value).toLocaleString("fr-FR")} €`;
}
//# sourceMappingURL=format.js.map