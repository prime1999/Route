import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { OpportunityService } from "../../opportunities/opportunityService.js";

/**
 * Register the get_opportunity MCP tool.
 *
 * This tool is the MCP-facing entry point for retrieving a single
 * opportunity from Route.
 *
 * The architecture intentionally keeps this layer thin:
 *
 *      AI Agent
 *          │
 *          │ MCP
 *          ▼
 *      get_opportunity
 *          │
 *          ▼
 *      OpportunityService
 *          │
 *          ▼
 *      ProviderManager
 *          │
 *          ▼
 *      Provider
 *
 * The tool does NOT contain provider-specific logic.
 *
 * It does not know:
 *
 * - how Remote OK works
 * - how Devpost works
 * - how providers identify URLs
 * - how external data is fetched
 * - how external data is normalized
 *
 * Those responsibilities belong to the provider infrastructure.
 */
export function registerGetOpportunityTool(server: McpServer): void {
  /**
   * Create the application service used by this tool.
   *
   * The service owns the application-level retrieval operation,
   * while this file remains responsible only for the MCP interface.
   */
  const opportunityService = new OpportunityService();

  /**
   * Register the MCP tool.
   *
   * The tool accepts a single URL because Route uses the source URL
   * as the external lookup key for an opportunity.
   */
  server.registerTool(
    "get_opportunity",
    {
      title: "Get Opportunity",
      description:
        "Retrieves a single opportunity from a supported source using its URL.",
      inputSchema: z.object({
        /**
         * The canonical URL of the opportunity.
         *
         * We validate that the value is a valid URL here so invalid
         * input is rejected at the MCP boundary before it reaches
         * the application service.
         */
        url: z.url().describe("The URL of the opportunity to retrieve."),
      }),
    },

    /**
     * Tool handler.
     *
     * The MCP SDK has already validated the input against the Zod
     * schema before this handler runs.
     */
    async ({ url }) => {
      /**
       * Ask the application service to retrieve the opportunity.
       *
       * The service delegates provider resolution and retrieval to
       * the Provider Manager.
       */
      const opportunity = await opportunityService.getByUrl(url);

      /**
       * If no registered provider recognizes the URL, or the provider
       * cannot find the requested opportunity, return a clear
       * human-readable MCP response.
       *
       * We intentionally return a normal tool response rather than
       * introducing a custom error envelope at this stage.
       *
       * The MCP response contract can be refined later after testing
       * the tool through the real MCP client.
       */
      if (opportunity === null) {
        return {
          content: [
            {
              type: "text",
              text: `Route could not retrieve an opportunity from this URL: ${url}`,
            },
          ],
        };
      }

      /**
       * Return the normalized Route Opportunity as JSON.
       *
       * JSON keeps the response structured enough for an AI agent
       * to reason over fields such as:
       *
       * - title
       * - organization
       * - description
       * - deadline
       * - remote
       * - metadata
       *
       * without the MCP tool having to generate a human-oriented
       * presentation.
       */
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(opportunity, null, 2),
          },
        ],
      };
    },
  );
}
