/**
 * Route MCP integration test endpoint.
 *
 * This endpoint is a temporary development checkpoint.
 *
 * Its purpose is to verify that the Route web application can:
 *
 * 1. Connect to the Route MCP server.
 * 2. Establish an MCP session.
 * 3. Discover the tools exposed by Route.
 *
 * We are deliberately testing the MCP boundary before building the
 * actual Route demo UI.
 */

import { NextResponse } from "next/server";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

import { createRouteMcpClient } from "@/lib/mcp/client";

/**
 * GET /api/route-test
 *
 * Creates an MCP client, connects to Route, lists the available
 * MCP tools, and returns their basic information as JSON.
 */
export async function GET() {
  /**
   * Keep the client outside the try block so that we can properly
   * close the MCP connection in finally.
   */
  let client: Client | undefined;

  try {
    /**
     * Connect to the Route MCP server.
     */
    client = await createRouteMcpClient();

    /**
     * Ask Route for the tools it exposes.
     *
     * At this stage we are only testing tool discovery.
     * We are not executing any opportunity logic yet.
     */
    const result = await client.listTools();

    /**
     * Return only the information the web application needs
     * for this connection test.
     */
    return NextResponse.json({
      success: true,
      tools: result.tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
      })),
    });
  } catch (error) {
    /**
     * Log the complete error on the server so we can debug
     * connection or MCP protocol problems if they occur.
     */
    console.error("Route MCP connection failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown Route MCP connection error.",
      },
      {
        status: 500,
      },
    );
  } finally {
    /**
     * Always close the MCP client when this request finishes.
     *
     * This is important during testing because we don't want
     * every browser refresh to leave an open MCP connection.
     */
    if (client) {
      await client.close().catch(() => {});
    }
  }
}
