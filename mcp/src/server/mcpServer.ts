import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerHealthCheckTool } from "./tools/healthCheck.js";

import { registerSearchOpportunitiesTool } from "./tools/searchOpportunities.js";

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "route",
    version: "0.1.0",
  });

  registerHealthCheckTool(server);

  registerSearchOpportunitiesTool(server);

  return server;
}
