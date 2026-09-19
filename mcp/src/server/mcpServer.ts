/**
 * MCP SERVER
 * ----------
 *
 * This file is responsible for creating the actual Opportunity Copilot
 * Model Context Protocol (MCP) server.
 *
 * IMPORTANT:
 *
 * The MCP server is the core product we are building.
 *
 * Alexa+, Strands, Claude, our future demo UI, and potentially other
 * AI clients will be clients of this server.
 *
 * The server itself should therefore remain:
 *
 *   - agent-agnostic
 *   - independent of Alexa+
 *   - independent of our future UI
 *   - independent of Strands
 *
 * Those systems will consume this MCP server rather than being embedded
 * inside it.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Creates and returns the MCP server used by Opportunity Copilot.
 *
 * We use a function instead of creating the server as a global constant
 * because this gives us a clean server factory.
 *
 * That becomes useful later when we introduce things such as:
 *
 *   - authentication
 *   - request-specific context
 *   - testing
 *   - different server configurations
 *
 * Keeping server creation isolated also makes the architecture easier
 * to reason about as the project grows.
 */
export function createMcpServer(): McpServer {
  /**
   * Create the MCP server instance.
   *
   * `name` identifies our server to MCP clients.
   *
   * `version` is our application's version.
   *
   * This is NOT the MCP protocol version.
   *
   * In other words:
   *
   *   application version → "0.1.0"
   *   MCP protocol version → handled by the MCP SDK/protocol negotiation
   *
   * We should not confuse the two.
   */
  const server = new McpServer({
    name: "route",
    version: "0.1.0",
  });

  /**
   * TEMPORARY TEST TOOL
   * -------------------
   *
   * We are adding one extremely small tool so we can verify that:
   *
   *   1. Our MCP server starts.
   *   2. The server exposes a tool.
   *   3. An MCP client can discover the tool.
   *   4. An MCP client can call the tool.
   *
   * This is NOT part of the final Route toolset.
   *
   * Later, this will be replaced/removed as we introduce our actual
   * tools such as:
   *
   *   - search_opportunities
   *   - get_opportunity
   *   - save_opportunity
   *   - prepare_opportunity
   */
  server.registerTool(
    "health_check",
    {
      /**
       * Human-readable title shown by MCP clients that support tool
       * metadata.
       */
      title: "Health Check",

      /**
       * Description tells an AI agent what this tool does.
       *
       * MCP clients use tool descriptions as part of their understanding
       * of what capabilities are available on the server.
       */
      description: "Checks whether the Route MCP server is running.",

      /**
       * This tool does not accept any arguments.
       *
       * Zod schemas will become very important later when our tools accept
       * things like:
       *
       *   keyword
       *   opportunity type
       *   remote
       *
       * For this first health check, there is nothing to validate.
       */
      inputSchema: {},
    },

    /**
     * Tool implementation.
     *
     * MCP expects a structured result rather than simply returning a
     * JavaScript string.
     */
    async () => {
      /**
       * `content` contains the content returned to the MCP client.
       *
       * `type: "text"` tells the client that this particular piece of
       * content is textual.
       */
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

  /**
   * Return the fully configured MCP server.
   *
   * The HTTP layer in `src/index.ts` will use this server and connect it
   * to the Streamable HTTP transport.
   */
  return server;
}
