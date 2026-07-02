/**
 * Tool: fr_property_transactions — list DVF sale transactions near an address or in a commune.
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { geocodeBest } from "../services/ban.js";
import { getSales, type SaleQuery } from "../services/dvf.js";
import { formatError } from "../services/http.js";
import { ResponseFormat, capText, eur } from "../services/format.js";
import { DEFAULT_RADIUS_M, MAX_RADIUS_M } from "../constants.js";

const inputSchema = {
  address: z
    .string()
    .max(200)
    .optional()
    .describe(
      "Address to search around (recommended). Either 'address' or 'citycode' is required."
    ),
  citycode: z
    .string()
    .regex(/^[0-9AB]{5}$/i, "INSEE code must be 5 characters")
    .optional()
    .describe("INSEE commune code (5 chars). Alternative to 'address'."),
  radius_m: z
    .number()
    .int()
    .min(50)
    .max(MAX_RADIUS_M)
    .default(DEFAULT_RADIUS_M)
    .describe(`Search radius in metres around the address (50-${MAX_RADIUS_M}).`),
  property_type: z
    .string()
    .max(40)
    .optional()
    .describe("Filter by property type substring, e.g. 'Maison' or 'Appartement'."),
  since_year: z
    .number()
    .int()
    .min(2010)
    .max(2100)
    .optional()
    .describe("Keep only sales on/after January 1 of this year (DVF starts 2010)."),
  min_rooms: z.number().int().min(0).max(50).optional().describe("Minimum number of main rooms."),
  max_rooms: z.number().int().min(0).max(50).optional().describe("Maximum number of main rooms."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(200)
    .default(50)
    .describe("Maximum number of transactions to return (1-200)."),
  response_format: z
    .nativeEnum(ResponseFormat)
    .default(ResponseFormat.MARKDOWN)
    .describe("Output format: 'markdown' (human) or 'json' (machine)."),
};

export function registerTransactionsTool(server: McpServer): void {
  server.registerTool(
    "fr_property_transactions",
    {
      title: "List French property sales (DVF)",
      description: `List recorded real-estate sale transactions from the French DVF open dataset, near an address or within a commune.

Provide EITHER 'address' (recommended — enables radius search) OR 'citycode' (INSEE, whole commune).

Args:
  - address (string, optional): address to search around
  - citycode (string, optional): INSEE commune code (5 chars)
  - radius_m (number): radius around the address in metres (default 500)
  - property_type (string, optional): e.g. 'Maison', 'Appartement'
  - since_year (number, optional): earliest sale year (>= 2010)
  - min_rooms / max_rooms (number, optional): room-count filter
  - limit (number): max results, 1-200 (default 50)
  - response_format ('markdown' | 'json'): output format (default markdown)

Returns: sales with date, price (EUR), property type, surface (m2), rooms, price/m2, address, commune. Sorted most-recent first.`,
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
        if (!args.address && !args.citycode) {
          return {
            content: [
              {
                type: "text" as const,
                text: "Error: provide either 'address' or 'citycode'.",
              },
            ],
            isError: true,
          };
        }

        const query: SaleQuery = {
          radiusM: args.radius_m,
          ...(args.property_type ? { propertyType: args.property_type } : {}),
          ...(args.since_year ? { sinceYear: args.since_year } : {}),
          ...(args.min_rooms !== undefined ? { minRooms: args.min_rooms } : {}),
          ...(args.max_rooms !== undefined ? { maxRooms: args.max_rooms } : {}),
        };

        let centerLabel = args.citycode ? `commune ${args.citycode}` : "";
        if (args.address) {
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
          centerLabel = geo.label;
          query.lat = geo.lat;
          query.lon = geo.lon;
          if (geo.citycode) query.citycode = geo.citycode;
        } else if (args.citycode) {
          query.citycode = args.citycode;
          delete query.radiusM; // no centre point → radius not applicable
        }

        const allSales = await getSales(query);
        const sales = allSales.slice(0, args.limit);
        const output = {
          center: centerLabel,
          total: allSales.length,
          count: sales.length,
          radius_m: query.radiusM ?? null,
          sales,
        };

        let text: string;
        if (args.response_format === ResponseFormat.JSON) {
          text = JSON.stringify(output, null, 2);
        } else {
          const lines = [
            `# DVF sales near ${centerLabel}`,
            "",
            `${allSales.length} matching sale(s); showing ${sales.length}.`,
            "",
          ];
          for (const s of sales) {
            lines.push(
              `- **${s.date}** · ${s.propertyType} · ${eur(s.price)} · ${
                s.surfaceM2 ?? "?"
              } m² · ${s.rooms ?? "?"} p. · ${
                s.pricePerM2 ? eur(s.pricePerM2) + "/m²" : "n/a /m²"
              } · ${s.address}${s.commune ? ", " + s.commune : ""}`
            );
          }
          text = lines.join("\n");
        }
        return {
          content: [{ type: "text" as const, text: capText(text) }],
          structuredContent: output,
        };
      } catch (error) {
        return {
          content: [
            { type: "text" as const, text: formatError(error, "transactions") },
          ],
          isError: true,
        };
      }
    }
  );
}
