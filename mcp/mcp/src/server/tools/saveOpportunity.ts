import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import { OpportunityService } from "../../opportunities/services/opportunityService.js";

/**
 * Register the save_opportunity MCP tool.
 *
 * This tool is the MCP-facing entry point for saving an opportunity
 * for an agent in Route.
 *
 * The architecture intentionally keeps this layer thin:
 *
 *      AI Agent
 *          │
 *          │ MCP
 *          ▼
 *      save_opportunity
 *          │
 *          ▼
 *      OpportunityService
 *          │
 *          ├───────────────┐
 *          ▼               ▼
 *   ProviderManager   OpportunityStore
 *          │               │
 *          ▼               ▼
 *       Provider        DynamoDB
 *
 * The tool does NOT contain:
 *
 * - provider-specific logic
 * - DynamoDB logic
 * - opportunity normalization
 * - agent ID generation
 * - duplicate-save handling
 *
 * Those responsibilities belong to the application and
 * infrastructure layers below this MCP boundary.
 */
export function registerSaveOpportunityTool(server: McpServer): void {
  /**
   * Create the application service used by this tool.
   *
   * The service owns the application-level save operation,
   * while this file remains responsible only for the MCP interface.
   */
  const opportunityService = new OpportunityService();

  /**
   * Register the MCP tool.
   */
  server.registerTool(
    "save_opportunity",
    {
      title: "Save Opportunity",

      description:
        "Saves a supported opportunity for an agent and returns the agent ID and saved opportunity state.",

      inputSchema: z
        .object({
          /**
           * The canonical URL of the opportunity.
           *
           * Route validates the URL at the MCP boundary before
           * passing it into the application service.
           */
          url: z.url().describe("The URL of the opportunity to save."),

          /**
           * Existing ROUTE agent identity.
           *
           * An agent that already has a ROUTE agentId should
           * provide it here so Route can associate the saved
           * opportunity with the existing agent state.
           */
          agentId: z
            .string()
            .min(1)
            .optional()
            .describe(
              "An existing ROUTE agent ID. Provide this if the agent already has a ROUTE identity.",
            ),

          /**
           * Human-readable agent name.
           *
           * This is used when the agent does not yet have a
           * ROUTE agentId.
           *
           * Route will generate the actual agentId and return
           * it in the response.
           */
          agentName: z
            .string()
            .min(1)
            .optional()
            .describe(
              "The agent name to use when creating a new ROUTE agent identity.",
            ),
        })
        /**
         * An agent must identify itself in exactly one way:
         *
         *      agentId
         *          OR
         *      agentName
         *
         * Providing neither means Route cannot associate the
         * saved opportunity with an agent.
         *
         * Providing both is unnecessary because agentId already
         * identifies an existing agent.
         */
        .refine(
          (input) => Boolean(input.agentId) !== Boolean(input.agentName),
          {
            message: "Provide exactly one of agentId or agentName.",
          },
        ),
    },

    /**
     * Tool handler.
     *
     * The MCP SDK validates the input against the Zod schema
     * before this handler executes.
     */
    async ({ url, agentId, agentName }) => {
      /**
       * Pass the validated input directly to the application
       * service.
       *
       * The service is responsible for:
       *
       * - generating an agentId when agentName is provided
       * - resolving the opportunity through the Provider Manager
       * - ensuring the lightweight opportunity record exists
       * - creating the Agent → Opportunity relationship
       * - detecting duplicate saves
       */
      const result = await opportunityService.saveOpportunity({
        url,
        agentId,
        agentName,
      });

      /**
       * If no registered provider can retrieve the opportunity,
       * nothing is persisted.
       *
       * Return a clear MCP response explaining what happened.
       */
      if (result === null) {
        return {
          content: [
            {
              type: "text",
              text: `Route could not save an opportunity from this URL: ${url}`,
            },
          ],
        };
      }

      /**
       * Return the saved state as structured JSON.
       *
       * The response contains:
       *
       * - agentId
       * - opportunityId
       * - URL
       * - savedAt
       * - alreadySaved
       *
       * The complete opportunity is intentionally NOT returned here.
       *
       * If the agent needs the opportunity details, it can use
       * get_opportunity with the returned URL.
       */
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                agentId: result.agentId,
                opportunityId: result.savedOpportunity.opportunityId,
                url: result.savedOpportunity.url,
                savedAt: result.savedOpportunity.savedAt,
                alreadySaved: result.alreadySaved,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );
}
