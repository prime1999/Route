import { NextResponse } from "next/server";
import { createRouteMcpClient } from "@/lib/mcp/client";

export const runtime = "nodejs";

type ToolInputSchema = {
  properties?: Record<string, unknown>;
  required?: string[];
};

type ToolResult = {
  isError?: boolean;
  content?: Array<{
    type?: string;
    text?: string;
  }>;
};

export async function POST(request: Request) {
  let client: Awaited<ReturnType<typeof createRouteMcpClient>> | undefined;

  try {
    // 1. Read and validate the request body.
    const body = (await request.json()) as {
      url?: unknown;
      title?: unknown;
    };

    const url = typeof body.url === "string" ? body.url.trim() : "";

    const title =
      typeof body.title === "string" && body.title.trim()
        ? body.title.trim()
        : "This opportunity";

    let parsedUrl: URL;

    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "This opportunity does not have a valid source URL.",
        },
        { status: 400 },
      );
    }

    if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
      return NextResponse.json(
        {
          success: false,
          error: "Only HTTP or HTTPS opportunity links can be saved.",
        },
        { status: 400 },
      );
    }

    // 2. Connect to the ROUTE MCP server.
    client = await createRouteMcpClient();

    // 3. Discover the save_opportunity tool.
    const { tools } = await client.listTools();

    const saveTool = tools.find((tool) => tool.name === "save_opportunity");

    if (!saveTool) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Your connected ROUTE server does not expose save_opportunity yet.",
        },
        { status: 501 },
      );
    }

    // 4. Read the tool's input schema.
    const schema = (saveTool.inputSchema ?? {}) as ToolInputSchema;

    const properties = schema.properties ?? {};
    const propertyKeys = Object.keys(properties);

    const args: Record<string, unknown> = {};

    // 5. Find the supported URL and title fields.
    const urlAliases = [
      "url",
      "opportunityurl",
      "opportunity_url",
      "sourceurl",
      "source_url",
    ];

    for (const key of propertyKeys) {
      const normalized = key.toLowerCase();

      if (urlAliases.includes(normalized)) {
        args[key] = url;
      } else if (normalized === "title" || normalized === "name") {
        args[key] = title;
      }
    }

    // 6. Resolve the agent identity arguments.
    //
    // The ROUTE MCP tool requires exactly one of:
    // - agentId: an existing ROUTE agent identity
    // - agentName: the name used to create a ROUTE agent identity
    //
    // Never send both, and never send neither.

    const agentIdKey = propertyKeys.find(
      (key) => key.toLowerCase() === "agentid",
    );

    const agentNameKey = propertyKeys.find(
      (key) => key.toLowerCase() === "agentname",
    );

    if (agentNameKey) {
      // Use the web demo's identity when the tool supports agentName.
      // Do not include agentId in this request.
      args[agentNameKey] = "ROUTE Web Demo";
    } else if (agentIdKey) {
      // An existing ID must come from a trusted, persistent source.
      // Do not invent an ID or silently send an empty value.
      return NextResponse.json(
        {
          success: false,
          error:
            "The connected ROUTE server requires an existing agentId. " +
            "This save endpoint must retrieve the persisted ROUTE agent ID before saving.",
        },
        { status: 501 },
      );
    }

    // 7. Ensure the URL is supported by the tool schema.
    const hasUrlArgument = propertyKeys.some((key) =>
      urlAliases.includes(key.toLowerCase()),
    );

    if (!hasUrlArgument) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The connected save_opportunity tool does not expose a recognized URL input field.",
        },
        { status: 501 },
      );
    }

    // 8. Validate all schema-required fields.
    const missingRequired = (schema.required ?? []).filter(
      (key) =>
        !(key in args) ||
        args[key] === undefined ||
        args[key] === null ||
        args[key] === "",
    );

    if (missingRequired.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            `The current save_opportunity tool requires additional fields ` +
            `(${missingRequired.join(", ")}). ` +
            "Review its input contract before enabling this save action.",
        },
        { status: 501 },
      );
    }

    // 9. Call the ROUTE MCP tool.
    const result = (await client.callTool({
      name: "save_opportunity",
      arguments: args,
    })) as ToolResult;

    const resultText = Array.isArray(result.content)
      ? result.content
          .filter(
            (block) => block.type === "text" && typeof block.text === "string",
          )
          .map((block) => block.text ?? "")
          .filter(Boolean)
          .join("\n")
      : "";

    if (result.isError) {
      return NextResponse.json(
        {
          success: false,
          error: resultText || "ROUTE could not save this opportunity.",
        },
        { status: 502 },
      );
    }

    // 10. Return the save result to the web application.
    return NextResponse.json({
      success: true,
      message: resultText || `${title} was saved to ROUTE.`,
    });
  } catch (error) {
    console.error("ROUTE save request failed:", error);

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
    // 11. Always close the MCP client.
    if (client) {
      await client.close().catch((error) => {
        console.error("Failed to close ROUTE MCP client:", error);
      });
    }
  }
}
