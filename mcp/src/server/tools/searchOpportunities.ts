import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";

import { OpportunitySearchService } from "../../opportunities/searchService.js";

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
        keyword: z.string().optional(),

        type: z.enum(["job", "hackathon", "all"]).optional(),

        remote: z.boolean().optional(),

        limit: z.number().int().positive().optional(),

        cursor: z.string().optional(),
      },
    },

    async (input) => {
      const result = await searchService.search({
        keyword: input.keyword,
        type: input.type,
        remote: input.remote,
        limit: input.limit,
        cursor: input.cursor,
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
