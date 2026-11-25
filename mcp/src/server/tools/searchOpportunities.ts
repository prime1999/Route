import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import { OpportunitySearchService } from "../../opportunities/services/searchService.js";

/**
 * Single shared search service instance.
 *
 * Later we may inject this through a proper
 * dependency container.
 */
const searchService = new OpportunitySearchService();

/**
 * Registers the search_opportunities tool.
 */
export function registerSearchOpportunitiesTool(server: McpServer): void {
  server.registerTool(
    "search_opportunities",

    {
      title: "Search Opportunities",

      description:
        "Searches Route's supported opportunity sources for jobs and hackathons. Use keyword, type, remote, limit, and cursor to control the search.",

      inputSchema: {
        keyword: z.string().nullish(),
        type: z.enum(["job", "hackathon", "all"]).nullish(),
        remote: z.boolean().nullish(),
        limit: z.number().int().positive().nullish(),
        cursor: z.string().nullish(),
      },
    },

    async (input) => {
      const result = await searchService.search({
        keyword: input.keyword ?? undefined,
        type: input.type ?? undefined,
        remote: input.remote ?? undefined,
        limit: input.limit ?? undefined,
        cursor: input.cursor ?? undefined,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    },
  );
}
