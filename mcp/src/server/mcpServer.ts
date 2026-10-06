import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerHealthCheckTool } from "./tools/healthCheck.js";
import { registerSearchOpportunitiesTool } from "./tools/searchOpportunities.js";
import { registerGetOpportunityTool } from "./tools/getOpportunity.js";
import { registerPrepareOpportunityTool } from "./tools/prepareOpportunity.js";

/**
 * Create and configure the Route MCP server.
 *
 * This function is responsible for assembling the MCP-facing
 * interface of Route.
 *
 * Individual tools own their MCP contracts and delegate their
 * actual application logic to the appropriate services.
 *
 * Keeping registration centralized makes it easy to see which
 * capabilities Route currently exposes to connected MCP clients.
 */
export function createMcpServer(): McpServer {
  /**
   * Create the MCP server instance.
   *
   * The server itself is intentionally unaware of provider-specific
   * opportunity logic. It simply exposes Route's capabilities through
   * the MCP protocol.
   */
  const server = new McpServer({
    name: "route",
    version: "0.1.0",
  });

  /**
   * Register the currently supported Route tools.
   */
  registerHealthCheckTool(server);
  registerSearchOpportunitiesTool(server);
  registerGetOpportunityTool(server);
  registerPrepareOpportunityTool(server);

  return server;
}
