import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { OpportunityService } from "../../opportunities/services/opportunityService.js";

/**
 * Register the tool for retrieving opportunities saved by an agent.
 */
export function registerGetSavedOpportunitiesTool(server: McpServer): void {
  const opportunityService = new OpportunityService();

  server.tool(
    "get_saved_opportunities",
    "Retrieve all opportunities saved by a ROUTE agent using its stable agentId.",
    {
      agentId: z
        .string()
        .trim()
        .min(1)
        .describe(
          "The stable ROUTE agent ID returned when an opportunity is saved.",
        ),
    },
    async ({ agentId }) => {
      const savedOpportunities =
        await opportunityService.getSavedOpportunities(agentId);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                agentId,
                savedOpportunities,
                count: savedOpportunities.length,
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
