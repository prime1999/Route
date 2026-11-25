import { NextRequest, NextResponse } from "next/server";
import { createRouteMcpClient } from "@/lib/mcp/client";

export const runtime = "nodejs";
export const maxDuration = 60;

const AGENT_COOKIE = "route_agent_id";

interface SaveRequest {
  url?: string;
  title?: string;
}

interface SaveResult {
  agentId: string;
  opportunityId: string;
  url: string;
  savedAt: string;
  alreadySaved: boolean;
}

function parseSaveResult(result: {
  content?: Array<{ type: string; text?: string }>;
}): SaveResult | null {
  const textContent = result.content?.find(
    (item) => item.type === "text" && item.text,
  );

  if (!textContent?.text) {
    return null;
  }

  try {
    return JSON.parse(textContent.text) as SaveResult;
  } catch {
    // ROUTE may return a plain-text message when
    // the opportunity cannot be resolved by a provider.
    return null;
  }
}

export async function POST(request: NextRequest) {
  let client: Awaited<ReturnType<typeof createRouteMcpClient>> | null = null;

  try {
    const body = (await request.json()) as SaveRequest;

    const url = body.url?.trim();
    const title = body.title?.trim() || "Opportunity";

    if (!url) {
      return NextResponse.json(
        {
          success: false,
          error: "An opportunity URL is required.",
        },
        { status: 400 },
      );
    }

    // Validate the URL before sending it to ROUTE.
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Please provide a valid opportunity URL.",
        },
        { status: 400 },
      );
    }

    // Reuse the existing ROUTE agent identity if available.
    const existingAgentId = request.cookies.get(AGENT_COOKIE)?.value;

    client = await createRouteMcpClient();

    // Confirm that the save tool is available.
    const { tools } = await client.listTools();

    const saveTool = tools.find((tool) => tool.name === "save_opportunity");

    if (!saveTool) {
      throw new Error("The save_opportunity tool is not available on ROUTE.");
    }

    // ROUTE requires exactly one of agentId or agentName.
    const args = existingAgentId
      ? {
          url,
          agentId: existingAgentId,
        }
      : {
          url,
          agentName: "ROUTE Web Demo",
        };

    // Execute the actual ROUTE MCP save operation.
    const result: any = await client.callTool({
      name: "save_opportunity",
      arguments: args,
    });

    if (result.isError) {
      throw new Error("ROUTE could not save this opportunity.");
    }

    const saved = parseSaveResult(result);

    if (!saved) {
      return NextResponse.json(
        {
          success: false,
          error:
            `ROUTE could not save "${title}". ` +
            "The URL may not belong to a supported opportunity provider.",
        },
        { status: 422 },
      );
    }

    if (!saved.agentId) {
      throw new Error("ROUTE did not return an agent ID.");
    }

    const response = NextResponse.json({
      success: true,
      message: saved.alreadySaved
        ? "This opportunity has already been saved."
        : "Opportunity saved successfully.",
      data: {
        ...saved,
        title,
      },
    });

    // Persist the agent identity in an HTTP-only cookie.
    // Future saves from this browser reuse the same agentId.
    if (!existingAgentId) {
      response.cookies.set(AGENT_COOKIE, saved.agentId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }

    return response;
  } catch (error) {
    console.error("ROUTE save operation failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "ROUTE could not save this opportunity.",
      },
      { status: 500 },
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
