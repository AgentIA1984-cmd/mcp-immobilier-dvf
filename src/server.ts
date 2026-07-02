/**
 * Server factory: builds an McpServer with all France Property tools registered.
 * A fresh instance is created per HTTP request (stateless) and once for stdio.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SERVER_NAME, SERVER_VERSION } from "./constants.js";
import { registerGeocodeTool } from "./tools/geocode.js";
import { registerTransactionsTool } from "./tools/transactions.js";
import { registerEstimateTool } from "./tools/estimate.js";
import { registerMarketStatsTool } from "./tools/marketStats.js";

export function createServer(): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });
  registerGeocodeTool(server);
  registerTransactionsTool(server);
  registerEstimateTool(server);
  registerMarketStatsTool(server);
  return server;
}
