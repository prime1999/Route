import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import { PreparationService } from "../../opportunities/services/preparationService.js";

/**
 * Register the prepare_opportunity MCP tool.
 *
 * This tool is the MCP-facing entry point for preparing a single
 * opportunity for downstream AI-agent reasoning.
 *
 * The architecture intentionally keeps this layer thin:
 *
 *      AI Agent
 *          │
 *          │ MCP
 *          ▼
 *   prepare_opportunity
 *          │
 *          ▼
 *   PreparationService
 *          │
 *          ▼
 *   ProviderManager
 *          │
 *          ▼
 *      Provider
 *
 * The tool does NOT contain provider-specific logic.
 *
 * It does not know:
 *
 * - how Remote OK retrieves preparation information
 * - how Devpost retrieves preparation information
 * - how providers parse their source pages
 * - how preparation data is structured internally
 * - how external source content is fetched
 *
 * Those responsibilities belong to the preparation service
 * and provider infrastructure.
 *
 * The purpose of this MCP layer is only to:
 *
 * 1. Define the tool exposed to an MCP client.
 * 2. Validate the incoming URL.
 * 3. Call the application service.
 * 4. Convert the result into an MCP-compatible response.
 */
export function registerPrepareOpportunityTool(server: McpServer): void {
  /**
   * Create the application service used by this tool.
   *
   * PreparationService owns the application-level preparation
   * operation, while this file remains responsible only for
   * exposing that operation through MCP.
   */
  const preparationService = new PreparationService();

  /**
   * Register the MCP tool.
   *
   * The tool accepts a single URL because Route prepares an
   * opportunity identified by its source URL.
   */
  server.registerTool(
    "prepare_opportunity",
    {
      title: "Prepare Opportunity",

      description:
        "Retrieves and organizes the available source information, requirements, eligibility, dates, and submission context for a supported opportunity using its URL.",

      inputSchema: z.object({
        /**
         * The canonical URL of the opportunity.
         *
         * We validate that the value is a valid URL at the MCP
         * boundary so invalid input is rejected before it reaches
         * the application service.
         */
        url: z.url().describe("The URL of the opportunity to prepare."),
      }),
    },

    /**
     * Tool handler.
     *
     * The MCP SDK has already validated the input against the
     * Zod schema before this handler runs.
     */
    async ({ url }) => {
      /**
       * Ask the application service to prepare the opportunity.
       *
       * PreparationService handles:
       *
       * - retrieving the normalized opportunity
       * - resolving the correct provider
       * - retrieving additional source content
       * - organizing preparation-specific context
       * - preserving source/provenance information
       */
      const preparation = await preparationService.prepareOpportunity(url);

      /**
       * If no registered provider recognizes the URL, or the
       * provider cannot retrieve the opportunity, return a clear
       * human-readable MCP response.
       *
       * We intentionally return a normal tool response rather than
       * introducing a custom error envelope at this stage.
       *
       * The MCP response contract can be refined later after testing
       * this tool through a real MCP client.
       */
      if (preparation === null) {
        return {
          content: [
            {
              type: "text",
              text: `Route could not prepare an opportunity from this URL: ${url}`,
            },
          ],
        };
      }

      /**
       * Return the complete preparation context as JSON.
       *
       * JSON preserves the structured Route contract so an AI agent
       * can reason over:
       *
       * - the normalized opportunity
       * - important dates
       * - requirements
       * - eligibility
       * - constraints
       * - categories
       * - submission information
       * - source content
       * - source/provenance information
       *
       * Route does not summarize or generate advice here.
       *
       * The connected AI agent is responsible for reasoning over this
       * context and turning it into user-specific guidance.
       */
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(preparation, null, 2),
          },
        ],
      };
    },
  );
}
