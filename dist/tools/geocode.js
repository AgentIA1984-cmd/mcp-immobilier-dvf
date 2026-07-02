/**
 * Tool: fr_property_geocode — resolve a French address to coordinates + INSEE code.
 */
import { z } from "zod";
import { geocodeAddress } from "../services/ban.js";
import { formatError } from "../services/http.js";
import { ResponseFormat, capText } from "../services/format.js";
const inputSchema = {
    address: z
        .string()
        .min(3, "Address must be at least 3 characters")
        .max(200, "Address must not exceed 200 characters")
        .describe("Free-text French address, e.g. '12 rue de Rivoli, Paris'"),
    limit: z
        .number()
        .int()
        .min(1)
        .max(20)
        .default(5)
        .describe("Maximum number of candidate matches to return (1-20)"),
    response_format: z
        .nativeEnum(ResponseFormat)
        .default(ResponseFormat.MARKDOWN)
        .describe("Output format: 'markdown' (human) or 'json' (machine)"),
};
export function registerGeocodeTool(server) {
    server.registerTool("fr_property_geocode", {
        title: "Geocode French address",
        description: `Resolve a free-text French address to geographic coordinates and its INSEE commune code using the Base Adresse Nationale (BAN).

Use this to obtain the latitude/longitude and 'citycode' (INSEE code) needed by the other tools, or to validate/normalize an address.

Args:
  - address (string): free-text French address
  - limit (number): max candidate matches, 1-20 (default 5)
  - response_format ('markdown' | 'json'): output format (default markdown)

Returns: ranked candidates with label, lat, lon, citycode (INSEE), postcode, city, score (0-1), type.`,
        inputSchema,
        annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: true,
        },
    }, async (args) => {
        try {
            const results = await geocodeAddress(args.address, args.limit);
            if (results.length === 0) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `No match found for address '${args.address}'.`,
                        },
                    ],
                };
            }
            const output = { count: results.length, results };
            let text;
            if (args.response_format === ResponseFormat.JSON) {
                text = JSON.stringify(output, null, 2);
            }
            else {
                const lines = [`# Geocoding: '${args.address}'`, ""];
                for (const r of results) {
                    lines.push(`- **${r.label}** — lat ${r.lat}, lon ${r.lon} · INSEE ${r.citycode ?? "n/a"} · ${r.postcode ?? ""} ${r.city ?? ""} · score ${r.score.toFixed(2)}`);
                }
                text = lines.join("\n");
            }
            return {
                content: [{ type: "text", text: capText(text) }],
                structuredContent: output,
            };
        }
        catch (error) {
            return {
                content: [
                    { type: "text", text: formatError(error, "geocode") },
                ],
                isError: true,
            };
        }
    });
}
//# sourceMappingURL=geocode.js.map