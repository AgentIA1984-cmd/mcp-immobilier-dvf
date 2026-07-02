/**
 * Shared HTTP utilities: a thin axios wrapper and a consistent error formatter.
 */
import axios from "axios";
import { HTTP_TIMEOUT_MS } from "../constants.js";
export async function httpGet(url, params) {
    const response = await axios.get(url, {
        params,
        timeout: HTTP_TIMEOUT_MS,
        headers: { Accept: "application/json" },
    });
    return response.data;
}
/** Turn any thrown error into a clear, actionable message string. */
export function formatError(error, context) {
    if (axios.isAxiosError(error)) {
        const axErr = error;
        if (axErr.response) {
            const status = axErr.response.status;
            if (status === 404) {
                return `Error (${context}): resource not found (404). Check the address or commune code.`;
            }
            if (status === 429) {
                return `Error (${context}): rate limit exceeded (429). Wait before retrying.`;
            }
            return `Error (${context}): upstream API returned status ${status}.`;
        }
        if (axErr.code === "ECONNABORTED") {
            return `Error (${context}): request timed out. The data API may be slow or unavailable — retry, or point DVF_API_BASE at a self-hosted instance.`;
        }
        return `Error (${context}): network error (${axErr.code ?? "unknown"}). The DVF data API may be unreachable.`;
    }
    return `Error (${context}): ${error instanceof Error ? error.message : String(error)}`;
}
//# sourceMappingURL=http.js.map