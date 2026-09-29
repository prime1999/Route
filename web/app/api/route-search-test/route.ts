/**
 * Route MCP search integration test.
 *
 * This endpoint is a development checkpoint.
 *
 * Unlike /api/route-test, which only verifies that the web
 * application can connect to Route and discover its tools,
 * this endpoint actually executes Route's search_opportunities
 * MCP tool.
 *
 * The goal is to prove that the complete request path works:
 *
 *   Browser
 *      ↓
 *   Next.js API route
 *      ↓
 *   MCP Client
 *      ↓
 *   Route MCP Server
 *      ↓
 *   Opportunity providers
 *      ↓
 *   Search results
 *
 * We are testing the infrastructure before building the UI.
 */

import { NextResponse } from "next/server";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

import { createRouteMcpClient } from "@/lib/mcp/client";

/**
 * GET /api/route-search-test
 *
 * Executes a simple opportunity search through Route.
 */
export async function GET() {
  /**
   * Keep the client outside the try block so that the connection
   * can always be closed in finally.
   */
  let client: Client | undefined;

  try {
    /**
     * Connect to the Route MCP server.
     */
    client = await createRouteMcpClient();

    /**
     * Execute Route's search_opportunities tool.
     *
     * We start with a deliberately small request.
     *
     * `type: "all"` allows us to verify that the web client can
     * receive results from the currently supported opportunity
     * sources without introducing UI-specific filtering yet.
     */
    const result = await client.callTool({
      name: "search_opportunities",
      arguments: {
        type: "all",
        keyword: "AI",
        limit: 5,
      },
    });

    /**
     * Return the raw MCP tool result.
     *
     * Keeping the result intact during this checkpoint makes
     * debugging easier. We can decide on the web application's
     * response shape after we understand what the MCP result
     * actually looks like.
     */
    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    /**
     * Log the complete error server-side.
     */
    console.error("Route MCP search failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown Route MCP search error.",
      },
      {
        status: 500,
      },
    );
  } finally {
    /**
     * Always close the MCP connection after the request.
     */
    if (client) {
      await client.close().catch(() => {});
    }
  }
}
