/**
 * Tool: fr_property_price_estimate — estimate a property's value from DVF comparables.
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { geocodeBest } from "../services/ban.js";
import { getSales, type SaleQuery } from "../services/dvf.js";
import { formatError } from "../services/http.js";
import { ResponseFormat, capText, eur } from "../services/format.js";
import { percentile, median, roundTo } from "../services/stats.js";
import {
  DEFAULT_RADIUS_M,
  MAX_RADIUS_M,
  COMP_SURFACE_TOLERANCE,
  MIN_COMPS_CONFIDENT,
  MIN_COMPS_LOW,
} from "../constants.js";

const inputSchema = {
  address: z
    .string()
    .min(3)
    .max(200)
    .describe("Address of the property to estimate."),
  surface_m2: z
    .number()
    .min(5)
    .max(10000)
    .describe("Built surface of the property in square metres."),
  property_type: z
    .string()
    .max(40)
    .default("Appartement")
    .describe("Property type to compare against, e.g. 'Appartement' or 'Maison'."),
  radius_m: z
    .number()
    .int()
    .min(50)
    .max(MAX_RADIUS_M)
    .default(DEFAULT_RADIUS_M)
    .describe(`Radius for comparable selection, metres (50-${MAX_RADIUS_M}).`),
  years_back: z
    .number()
    .int()
    .min(1)
    .max(15)
    .default(5)
    .describe("How many years of past sales to consider (default 5)."),
  response_format: z
    .nativeEnum(ResponseFormat)
    .default(ResponseFormat.MARKDOWN)
    .describe("Output format: 'markdown' (human) or 'json' (machine)."),
};

export function registerEstimateTool(server: McpServer): void {
  server.registerTool(
    "fr_property_price_estimate",
    {
      title: "Estimate French property value (DVF comparables)",
      description: `Estimate the market value of a French property using comparable DVF sales (same type, similar surface, nearby, recent).

Method: geocode the address, select comparable sales within 'radius_m' of the same 'property_type' with a built surface within ±35% and sold within 'years_back' years, then apply the median EUR/m² to the property's surface. Returns a point estimate and a p25-p75 range with a confidence level based on the number of comparables.

Args:
  - address (string): property address
  - surface_m2 (number): built surface in m²
  - property_type (string): 'Appartement' (default) or 'Maison', etc.
  - radius_m (number): comparable radius in metres (default 500)
  - years_back (number): lookback window in years (default 5)
  - response_format ('markdown' | 'json'): output format

Returns: estimate (EUR), low/high range (EUR), median/p25/p75 EUR/m², comps count, confidence ('high'|'medium'|'low'|'insufficient'). This is a statistical estimate, not a certified valuation.`,
      inputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        const geo = await geocodeBest(args.address);
        if (!geo || !Number.isFinite(geo.lat)) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Could not geocode address '${args.address}'.`,
              },
            ],
            isError: true,
          };
        }

        const sinceYear = new Date().getFullYear() - args.years_back;
        const query: SaleQuery = {
          lat: geo.lat,
          lon: geo.lon,
          radiusM: args.radius_m,
          propertyType: args.property_type,
          sinceYear,
          builtOnly: true,
        };
        if (geo.citycode) query.citycode = geo.citycode;

        const sales = await getSales(query);
        const loB = args.surface_m2 * (1 - COMP_SURFACE_TOLERANCE);
        const hiB = args.surface_m2 * (1 + COMP_SURFACE_TOLERANCE);
        const comps = sales.filter(
          (s) =>
            s.pricePerM2 !== null &&
            s.surfaceM2 !== null &&
            s.surfaceM2 >= loB &&
            s.surfaceM2 <= hiB
        );
        const ppm2 = comps
          .map((s) => s.pricePerM2)
          .filter((v): v is number => v !== null);

        const med = median(ppm2);
        const p25 = percentile(ppm2, 25);
        const p75 = percentile(ppm2, 75);
        const n = ppm2.length;

        let confidence: "high" | "medium" | "low" | "insufficient";
        if (n >= MIN_COMPS_CONFIDENT) confidence = "high";
        else if (n >= MIN_COMPS_LOW) confidence = "medium";
        else if (n >= 1) confidence = "low";
        else confidence = "insufficient";

        const estimate = med !== null ? roundTo(med * args.surface_m2) : null;
        const low = p25 !== null ? roundTo(p25 * args.surface_m2) : null;
        const high = p75 !== null ? roundTo(p75 * args.surface_m2) : null;

        const output = {
          address: geo.label,
          citycode: geo.citycode,
          property_type: args.property_type,
          surface_m2: args.surface_m2,
          radius_m: args.radius_m,
          since_year: sinceYear,
          comps_count: n,
          confidence,
          median_price_per_m2: med !== null ? roundTo(med) : null,
          p25_price_per_m2: p25 !== null ? roundTo(p25) : null,
          p75_price_per_m2: p75 !== null ? roundTo(p75) : null,
          estimate_eur: estimate,
          range_low_eur: low,
          range_high_eur: high,
          disclaimer:
            "Statistical estimate from DVF comparables — not a certified (expertise) valuation.",
        };

        let text: string;
        if (args.response_format === ResponseFormat.JSON) {
          text = JSON.stringify(output, null, 2);
        } else if (confidence === "insufficient") {
          text = `# Estimate for ${geo.label}\n\nInsufficient comparables (${n}) for '${args.property_type}' within ${args.radius_m} m since ${sinceYear}. Try a larger radius_m or more years_back.`;
        } else {
          text = [
            `# Estimate for ${geo.label}`,
            "",
            `**Estimated value: ${eur(estimate)}** (range ${eur(low)} – ${eur(
              high
            )})`,
            "",
            `- Property: ${args.property_type}, ${args.surface_m2} m²`,
            `- Median: ${eur(med)}/m² (p25 ${eur(p25)} – p75 ${eur(p75)})`,
            `- Comparables: ${n} · Confidence: ${confidence}`,
            `- Scope: within ${args.radius_m} m, sales since ${sinceYear}`,
            "",
            `_Statistical estimate from DVF comparables — not a certified valuation._`,
          ].join("\n");
        }
        return {
          content: [{ type: "text" as const, text: capText(text) }],
          structuredContent: output,
        };
      } catch (error) {
        return {
          content: [
            { type: "text" as const, text: formatError(error, "price_estimate") },
          ],
          isError: true,
        };
      }
    }
  );
}
