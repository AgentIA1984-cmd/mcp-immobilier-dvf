/**
 * Tool: fr_property_market_stats — commune-level price stats and year-over-year trend.
 */
import { z } from "zod";
import { geocodeBest } from "../services/ban.js";
import { getSales } from "../services/dvf.js";
import { formatError } from "../services/http.js";
import { ResponseFormat, capText, eur } from "../services/format.js";
import { percentile, median, roundTo } from "../services/stats.js";
const inputSchema = {
    address: z
        .string()
        .max(200)
        .optional()
        .describe("Address inside the commune to analyse (or use 'citycode')."),
    citycode: z
        .string()
        .regex(/^[0-9AB]{5}$/i, "INSEE code must be 5 characters")
        .optional()
        .describe("INSEE commune code (5 chars). Alternative to 'address'."),
    property_type: z
        .string()
        .max(40)
        .default("Appartement")
        .describe("Property type to analyse, e.g. 'Appartement' or 'Maison'."),
    years_back: z
        .number()
        .int()
        .min(2)
        .max(15)
        .default(4)
        .describe("Lookback window in years for stats (default 4)."),
    response_format: z
        .nativeEnum(ResponseFormat)
        .default(ResponseFormat.MARKDOWN)
        .describe("Output format: 'markdown' (human) or 'json' (machine)."),
};
export function registerMarketStatsTool(server) {
    server.registerTool("fr_property_market_stats", {
        title: "French commune market stats (DVF)",
        description: `Compute commune-level real-estate market statistics from DVF: median/p25/p75 EUR/m², sales volume, and year-over-year trend for a property type.

Provide EITHER 'address' (its commune is used) OR 'citycode' (INSEE).

Args:
  - address (string, optional): address inside the commune
  - citycode (string, optional): INSEE commune code
  - property_type (string): 'Appartement' (default) or 'Maison', etc.
  - years_back (number): lookback window (default 4)
  - response_format ('markdown' | 'json')

Returns: salesCount, medianPricePerM2, p25/p75 EUR/m², medianPrice, and yoyPricePerM2Pct (last full year vs prior year, null if insufficient data).`,
        inputSchema,
        annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: true,
        },
    }, async (args) => {
        try {
            if (!args.address && !args.citycode) {
                return {
                    content: [
                        {
                            type: "text",
                            text: "Error: provide either 'address' or 'citycode'.",
                        },
                    ],
                    isError: true,
                };
            }
            let citycode = args.citycode ?? null;
            let scopeLabel = citycode ? `commune ${citycode}` : "";
            if (!citycode && args.address) {
                const geo = await geocodeBest(args.address);
                if (!geo || !geo.citycode) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Could not resolve a commune for '${args.address}'.`,
                            },
                        ],
                        isError: true,
                    };
                }
                citycode = geo.citycode;
                scopeLabel = `${geo.city ?? geo.label} (${citycode})`;
            }
            const sinceYear = new Date().getFullYear() - args.years_back;
            const query = {
                citycode: citycode,
                propertyType: args.property_type,
                sinceYear,
                builtOnly: true,
            };
            const sales = await getSales(query);
            const ppm2All = sales
                .map((s) => s.pricePerM2)
                .filter((v) => v !== null);
            const prices = sales.map((s) => s.price).filter((v) => v > 0);
            // Year-over-year on last two full years.
            const nowYear = new Date().getFullYear();
            const lastFull = nowYear - 1;
            const prevFull = nowYear - 2;
            const ppm2ByYear = (y) => sales
                .filter((s) => s.date.startsWith(String(y)))
                .map((s) => s.pricePerM2)
                .filter((v) => v !== null);
            const medLast = median(ppm2ByYear(lastFull));
            const medPrev = median(ppm2ByYear(prevFull));
            const yoy = medLast !== null && medPrev !== null && medPrev > 0
                ? roundTo(((medLast - medPrev) / medPrev) * 100, 1)
                : null;
            const stats = {
                scope: scopeLabel,
                propertyType: args.property_type,
                salesCount: sales.length,
                medianPricePerM2: ppm2All.length ? roundTo(median(ppm2All) ?? 0) : null,
                p25PricePerM2: ppm2All.length ? roundTo(percentile(ppm2All, 25) ?? 0) : null,
                p75PricePerM2: ppm2All.length ? roundTo(percentile(ppm2All, 75) ?? 0) : null,
                medianPrice: prices.length ? roundTo(median(prices) ?? 0) : null,
                yoyPricePerM2Pct: yoy,
            };
            let text;
            if (args.response_format === ResponseFormat.JSON) {
                text = JSON.stringify(stats, null, 2);
            }
            else {
                const trend = yoy === null ? "n/a" : `${yoy > 0 ? "+" : ""}${yoy}% YoY`;
                text = [
                    `# Market stats — ${scopeLabel} · ${args.property_type}`,
                    "",
                    `- Sales analysed (since ${sinceYear}): ${stats.salesCount}`,
                    `- Median: ${eur(stats.medianPricePerM2)}/m² (p25 ${eur(stats.p25PricePerM2)} – p75 ${eur(stats.p75PricePerM2)})`,
                    `- Median sale price: ${eur(stats.medianPrice)}`,
                    `- Trend (${prevFull}→${lastFull}): ${trend}`,
                ].join("\n");
            }
            return {
                content: [{ type: "text", text: capText(text) }],
                structuredContent: stats,
            };
        }
        catch (error) {
            return {
                content: [
                    { type: "text", text: formatError(error, "market_stats") },
                ],
                isError: true,
            };
        }
    });
}
//# sourceMappingURL=marketStats.js.map