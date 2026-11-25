import { Client } from "@modelcontextprotocol/sdk/client/index.js";

import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

/**
 * Route MCP Search Tool Test
 *
 * This test calls the real Route MCP server through MCP and inspects
 * the raw search_opportunities response.
 *
 * The purpose is to determine whether URL formatting changes:
 *
 * Provider
 *   ↓
 * SearchService
 *   ↓
 * MCP tool
 *   ↓
 * MCP client
 *
 * This test does NOT involve Strands or Gemini.
 */

async function main(): Promise<void> {
  console.log("========================================");
  console.log("Route MCP Search Tool Test");
  console.log("========================================");

  const client = new Client({
    name: "route-search-tool-test",
    version: "1.0.0",
  });

  const transport = new StreamableHTTPClientTransport(
    new URL("http://localhost:3005/mcp"),
  );

  try {
    console.log("\nConnecting to Route MCP server...");

    await client.connect(transport);

    console.log("✓ Connected to Route MCP server.");

    console.log("\nCalling search_opportunities...");

    const result = await client.callTool({
      name: "search_opportunities",
      arguments: {
        keyword: "OpenCV AI Competition 2026",
        limit: 5,
      },
    });

    console.log("\n=== RAW MCP TOOL RESULT ===");

    console.dir(result, {
      depth: null,
    });

    /**
     * The MCP SDK's result type in this version does not give us
     * a convenient array type for `content`.
     *
     * For this diagnostic test, we first treat the returned value
     * as an unknown structure and then narrow it ourselves.
     */
    const rawResult = result as unknown;

    if (
      typeof rawResult !== "object" ||
      rawResult === null ||
      !("content" in rawResult)
    ) {
      throw new Error(
        "MCP search_opportunities returned an unexpected result shape.",
      );
    }

    const content = (
      rawResult as {
        content?: unknown;
      }
    ).content;

    if (!Array.isArray(content)) {
      throw new Error(
        "MCP search_opportunities result.content is not an array.",
      );
    }

    /**
     * Find the text content returned by the MCP tool.
     *
     * We explicitly check the shape of each item instead of relying
     * on the SDK's inferred type.
     */
    const textContent = content.find(
      (
        item: unknown,
      ): item is {
        type: "text";
        text: string;
      } => {
        if (typeof item !== "object" || item === null) {
          return false;
        }

        if (!("type" in item) || !("text" in item)) {
          return false;
        }

        return (
          (item as { type?: unknown }).type === "text" &&
          typeof (item as { text?: unknown }).text === "string"
        );
      },
    );

    if (!textContent) {
      throw new Error(
        "search_opportunities did not return a text content item.",
      );
    }

    console.log("\n=== MCP TEXT RESPONSE ===");

    console.log(textContent.text);

    /**
     * Parse the JSON produced by the search_opportunities tool.
     */
    const parsed: unknown = JSON.parse(textContent.text);

    console.log("\n=== PARSED SEARCH RESULTS ===");

    console.dir(parsed, {
      depth: null,
    });

    /**
     * Narrow the parsed response enough for this diagnostic.
     */
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("opportunities" in parsed)
    ) {
      throw new Error("Parsed MCP response does not contain opportunities.");
    }

    const opportunities = (
      parsed as {
        opportunities?: unknown;
      }
    ).opportunities;

    if (!Array.isArray(opportunities)) {
      throw new Error("Parsed MCP response opportunities is not an array.");
    }

    console.log("\n=== URL CHECK ===");

    /**
     * Inspect each returned opportunity.
     */
    for (const opportunity of opportunities) {
      if (typeof opportunity !== "object" || opportunity === null) {
        continue;
      }

      const data = opportunity as {
        title?: unknown;
        type?: unknown;
        source?: unknown;
        url?: unknown;
        sourceUrl?: unknown;
      };

      console.log(`\nTitle: ${String(data.title ?? "")}`);

      console.log(`Type: ${String(data.type ?? "")}`);

      console.log(`Source: ${String(data.source ?? "")}`);

      console.log(`URL: ${String(data.url ?? "")}`);

      console.log(`Source URL: ${String(data.sourceUrl ?? "")}`);

      /**
       * A clean URL should begin directly with http:// or https://.
       *
       * A Markdown-wrapped URL would look like:
       *
       * [https://example.com/](https://example.com/)
       */
      if (
        typeof data.url === "string" &&
        (data.url.startsWith("[") || data.url.includes("]("))
      ) {
        console.log("❌ URL IS MARKDOWN-WRAPPED");
      } else {
        console.log("✓ URL IS CLEAN");
      }

      if (
        typeof data.sourceUrl === "string" &&
        (data.sourceUrl.startsWith("[") || data.sourceUrl.includes("]("))
      ) {
        console.log("❌ SOURCE URL IS MARKDOWN-WRAPPED");
      } else {
        console.log("✓ SOURCE URL IS CLEAN");
      }
    }

    console.log("\n========================================");
    console.log("MCP SEARCH TOOL TEST COMPLETED");
    console.log("========================================");
  } finally {
    /**
     * Close the MCP client so the process exits cleanly.
     */
    await client.close();
  }
}

main().catch((error) => {
  console.error("\n❌ MCP search tool test failed.");
  console.error(error);

  process.exit(1);
});
