#!/usr/bin/env node
/**
 * France Property MCP server — entry point.
 *
 * Transports:
 *   - stdio (default): for local MCP clients (Claude Desktop, Cursor, ...).
 *   - http:            for remote / hosted deployment (set TRANSPORT=http).
 *
 * Data sources: Base Adresse Nationale (geocoding) + DVF (transactions).
 */
import express, { type Request, type Response } from "express";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "./server.js";
import { SERVER_API_KEY, SERVER_NAME, SERVER_VERSION } from "./constants.js";

async function runStdio(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`${SERVER_NAME} v${SERVER_VERSION} running via stdio`);
}

async function runHttp(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  // Health + startup-probe endpoints. Hosting platforms (e.g. MCPize / Cloud
  // Run) probe "/ping" on startup — it must return 200 or the deploy fails.
  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", server: SERVER_NAME, version: SERVER_VERSION });
  });
  app.get("/ping", (_req: Request, res: Response) => {
    res.status(200).send("ok");
  });

  // MCP request handler (stateless). Mounted on BOTH "/" and "/mcp" so the
  // hosting HTTP bridge reaches it regardless of which path it posts to.
  const mcpHandler = async (req: Request, res: Response): Promise<void> => {
    // Optional API-key gate for the hosted (paid) deployment.
    if (SERVER_API_KEY && req.header("x-api-key") !== SERVER_API_KEY) {
      res.status(401).json({
        jsonrpc: "2.0",
        error: { code: -32001, message: "Unauthorized: missing or invalid x-api-key" },
        id: null,
      });
      return;
    }

    // Stateless: a fresh server + transport per request avoids cross-request state.
    const server = createServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    res.on("close", () => {
      transport.close();
      server.close();
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("Error handling MCP request:", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
      }
    }
  };
  app.post("/mcp", mcpHandler);
  app.post("/", mcpHandler);

  const port = parseInt(process.env.PORT || "3000", 10);
  app.listen(port, () => {
    console.error(
      `${SERVER_NAME} v${SERVER_VERSION} running on http://localhost:${port}/mcp`
    );
  });
}

const transport = (process.env.TRANSPORT || "stdio").toLowerCase();
const runner = transport === "http" ? runHttp : runStdio;
runner().catch((error) => {
  console.error("Fatal server error:", error);
  process.exit(1);
});
