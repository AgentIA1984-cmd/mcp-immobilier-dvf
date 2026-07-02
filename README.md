# france-property-mcp-server

MCP server for **French real-estate intelligence**, built entirely on **open French government data**:

- **Base Adresse Nationale (BAN)** — address geocoding → coordinates + INSEE code.
- **DVF (Demandes de Valeurs Foncières)** — recorded property sale transactions since 2010.

It turns raw open data into agent-usable tools: geocoding, sale history, **comparable-based price estimation**, and **commune market statistics with a year-over-year trend**. This is the sellable v1 of the AgentIA *Off-Market Property Radar* MCP; the pure off-market lead layer (successions, saisies, ventes notariales) is a premium roadmap item — see [Roadmap](#roadmap).

---

## Tools

| Tool | What it does | Key inputs |
|---|---|---|
| `fr_property_geocode` | Resolve a French address to lat/lon + INSEE code | `address`, `limit` |
| `fr_property_transactions` | List DVF sales near an address / in a commune | `address` or `citycode`, `radius_m`, `property_type`, `since_year`, `min_rooms`, `max_rooms`, `limit` |
| `fr_property_price_estimate` | Estimate a property's value from comparables (median €/m² × surface, p25–p75 range, confidence) | `address`, `surface_m2`, `property_type`, `radius_m`, `years_back` |
| `fr_property_market_stats` | Commune median/p25/p75 €/m², volume, YoY trend | `address` or `citycode`, `property_type`, `years_back` |

All tools are read-only, support `response_format: "markdown" | "json"`, and return both text and `structuredContent`.

---

## Quickstart

```bash
npm install
npm run build

# Local (stdio) — for Claude Desktop, Cursor, etc.
npm start

# Remote (HTTP) — for hosted deployment
TRANSPORT=http PORT=3000 npm start
```

### Connect to a local MCP client (stdio)

```json
{
  "mcpServers": {
    "france-property": {
      "command": "node",
      "args": ["/absolute/path/to/france-property-mcp-server/dist/index.js"]
    }
  }
}
```

### Test the HTTP transport

```bash
curl -s -X POST http://localhost:3000/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"c","version":"1.0.0"}}}'
```

> **Note on networking:** the tools call `api-adresse.data.gouv.fr` (BAN) and the DVF API. These are public and work from any normal host. In restricted sandboxes with egress filtering you may see `Error: upstream API returned status 403` — that is the sandbox, not the server.

---

## Configuration (env)

| Variable | Default | Purpose |
|---|---|---|
| `TRANSPORT` | `stdio` | `stdio` or `http` |
| `PORT` | `3000` | HTTP port |
| `BAN_API_BASE` | `https://api-adresse.data.gouv.fr` | Geocoding endpoint |
| `DVF_API_BASE` | `https://api.cquest.org/dvf` | DVF transactions endpoint |
| `SERVER_API_KEY` | *(empty)* | If set, HTTP clients must send header `x-api-key` |

---

## Deploying it *to sell*

An MCP is sold as a **hosted service** whose tool-calls are billed — not as a downloadable file.

1. **MCPize** (recommended) — publish the server; the platform handles hosting, SSL, Stripe checkout, license keys, analytics (≈85/15 revenue share). Set `TRANSPORT=http` and, if you gate access yourself, `SERVER_API_KEY`.
2. **Apify** — first-class MCP hosting with usage events (≈80% net). Wrap `dist/index.js` as the actor entry.
3. **Visibility (no payment):** list on Glama, mcp.so, PulseMCP, Smithery for discovery/SEO.

A `/health` endpoint and an optional `x-api-key` gate are included for hosting platforms.

### Suggested pricing
- **Freemium**: geocode + a few transaction lookups free.
- **Pro subscription**: €19–39/mo for unlimited `price_estimate` + `market_stats` (the value tools).
- **Per-call**: for API/agent buyers who prefer usage-based billing.

---

## ⚠️ Production reliability — data sourcing (the key risk)

The default `DVF_API_BASE` (`api.cquest.org/dvf`) is a community proof-of-concept with **no availability guarantee**. Before selling, do one of:

- **Self-host** the micro-API from <https://github.com/cquest/dvf_as_api> and point `DVF_API_BASE` at it (cheap, removes the dependency), or
- Point `DVF_API_BASE` at a **DVF+ provider** (Cerema/SOGEFI "API données foncières" on data.gouv.fr).

The DVF client normalizes several field-name variants, so most providers work by swapping the base URL. Data is under the **Licence Ouverte / Etalab** (attribution required).

---

## Roadmap (premium "off-market" layer)

- Ventes notariales / successions / saisies feeds (higher willingness-to-pay).
- Cadastre parcel lookup (`apicarto.ign.fr`) and DPE energy label (ADEME) enrichment.
- Rental-yield estimation (combine sale €/m² with rent references).
- Alerting webhook (new matching sale in a saved zone).

---

## Disclaimer

`fr_property_price_estimate` returns a **statistical estimate** from public comparable sales — it is **not** a certified valuation (expertise immobilière). Verify before any transaction decision.
