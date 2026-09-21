import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Registers the health_check tool.
 *
 * This tool exists primarily for development,
 * diagnostics, and MCP connectivity testing.
 */
export function registerHealthCheckTool(server: McpServer): void {
  server.registerTool(
    "health_check",
    {
      title: "Health Check",

      description:
        "Checks whether the Route MCP server is running and able to respond to tool calls.",

      inputSchema: {},
    },

    async () => {
      return {
        content: [
          {
            type: "text",
            text: "Route MCP server is running.",
          },
        ],
      };
    },
  );
}
