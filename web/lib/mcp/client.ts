/**
 * Route MCP Client
 *
 * This module is the server-side connection between the Route web
 * application and the Route MCP server.
 *
 * IMPORTANT:
 * The web application does NOT import Route's internal services,
 * providers, or business logic.
 *
 * Instead, it communicates with Route through the MCP protocol.
 *
 * This keeps Route properly separated:
 *
 *   Web App
 *      ↓
 *   MCP Client
 *      ↓
 *   Route MCP Server
 *      ↓
 *   Route opportunity infrastructure
 *
 * This is important because Route is intended to be an
 * agent-agnostic infrastructure layer that can be consumed by
 * different clients and AI agents.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

/**
 * URL of the running Route MCP server.
 *
 * This must stay server-side, so we intentionally do NOT use
 * NEXT_PUBLIC_ROUTE_MCP_URL.
 *
 * During local development this can point to the Cloudflare
 * tunnel exposing the local Route MCP server.
 */
const ROUTE_MCP_URL = process.env.ROUTE_MCP_URL;

/**
 * Creates and connects an MCP client to Route.
 *
 * Each caller receives a connected MCP client that can:
 *
 * - list tools
 * - call tools
 * - interact with Route through the MCP protocol
 *
 * We keep the connection logic in one place so the rest of the
 * web application doesn't need to know how Route's MCP transport
 * works.
 */
export async function createRouteMcpClient(): Promise<Client> {
  /**
   * Fail early if the MCP server URL hasn't been configured.
   *
   * This gives us a clear error instead of a confusing URL or
   * transport error later.
   */
  if (!ROUTE_MCP_URL) {
    throw new Error(
      "ROUTE_MCP_URL is not configured. Add it to web/.env.local.",
    );
  }

  /**
   * Create the MCP client identity.
   *
   * This identifies the web application as an MCP client when
   * establishing the connection with Route.
   */
  const client = new Client({
    name: "route-web",
    version: "0.1.0",
  });

  /**
   * Route currently exposes its MCP server through Streamable HTTP.
   *
   * The URL comes from the environment rather than being hardcoded,
   * which lets us switch between:
   *
   * - local/tunnel development
   * - staging
   * - production
   *
   * without changing application code.
   */
  const transport = new StreamableHTTPClientTransport(new URL(ROUTE_MCP_URL));

  /**
   * Establish the MCP connection.
   *
   * Once this succeeds, the returned client can communicate with
   * Route's MCP server.
   */
  await client.connect(transport);

  return client;
}
