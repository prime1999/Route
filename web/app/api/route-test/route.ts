import { NextResponse } from "next/server";
import { createRouteMcpClient } from "@/lib/mcp/client";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET() {
  let client: Awaited<ReturnType<typeof createRouteMcpClient>> | null = null;

  try {
    client = await createRouteMcpClient();

    // Retrieve the tools exposed by ROUTE.
    const { tools } = await client.listTools();

    // Check that ROUTE can successfully execute a tool.
    const healthTool = tools.find((tool) => tool.name === "health_check");

    if (!healthTool) {
      throw new Error(
        "ROUTE is reachable, but the health_check tool is unavailable.",
      );
    }

    const healthResult = await client.callTool({
      name: "health_check",
      arguments: {},
    });

    if (healthResult.isError) {
      throw new Error("ROUTE health check failed.");
    }

    return NextResponse.json({
      success: true,
      message: "ROUTE MCP server is connected.",
      tools: tools.map((tool) => ({
        name: tool.name,
        description: tool.description ?? "",
      })),
    });
  } catch (error) {
    console.error("ROUTE connection test failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not connect to ROUTE MCP server.",
        tools: [],
      },
      { status: 503 },
    );
  } finally {
    if (client) {
      try {
        await client.close();
      } catch (error) {
        console.error("Failed to close ROUTE MCP client:", error);
      }
    }
  }
}
