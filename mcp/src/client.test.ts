/**
 * Route MCP integration test client.
 *
 * This file tests Route from the perspective of an external MCP client.
 *
 * IMPORTANT:
 *
 * We intentionally test through the MCP protocol instead of importing
 * Route's internal services directly.
 *
 * This verifies the actual interface that external AI agents,
 * applications, and other MCP clients will consume.
 *
 * Test flow:
 *
 *   MCP Test Client
 *        ↓
 *   Streamable HTTP
 *        ↓
 *   Route MCP Server
 *        ↓
 *   MCP Tool
 *        ↓
 *   Route Application Service
 *        ↓
 *   Provider
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

/**
 * The local Route MCP endpoint.
 *
 * The MCP server must already be running before this test is executed.
 */
const MCP_URL = "http://localhost:3005/mcp";

/**
 * Extract a text content block from an MCP tool result.
 *
 * The MCP SDK's `callTool()` return type is a union. Because of that,
 * TypeScript cannot always assume that `.content` is directly available
 * on every possible result branch.
 *
 * Instead of using `any` or forcing a type assertion, this helper
 * performs runtime checks and narrows the result safely.
 *
 * This also gives us one place to handle MCP text extraction for
 * multiple tests.
 */
function getTextContent(
  result: Awaited<ReturnType<Client["callTool"]>>,
): string {
  /**
   * Make sure the result itself is an object and contains a `content`
   * property before attempting to access it.
   */
  if (typeof result !== "object" || result === null || !("content" in result)) {
    throw new Error("MCP tool result does not contain a content field.");
  }

  /**
   * The normal CallToolResult contains an array of content blocks.
   *
   * Check this explicitly because the SDK's result type is a union.
   */
  if (!Array.isArray(result.content)) {
    throw new Error("MCP tool result content is not an array.");
  }

  /**
   * Find the first text content block.
   *
   * `content` is treated as unknown here because we are deliberately
   * narrowing the SDK's union type ourselves.
   */
  const textContent = result.content.find(
    (
      content: unknown,
    ): content is {
      type: "text";
      text: string;
    } => {
      /**
       * A content block must first be an object.
       */
      if (typeof content !== "object" || content === null) {
        return false;
      }

      /**
       * Make sure both fields exist before reading them.
       */
      if (!("type" in content) || !("text" in content)) {
        return false;
      }

      /**
       * Finally verify the exact shape we need.
       */
      return content.type === "text" && typeof content.text === "string";
    },
  );

  /**
   * A successful Route tool call should contain a text response.
   *
   * Fail explicitly if the MCP server returned something else.
   */
  if (textContent === undefined) {
    throw new Error("MCP tool result did not contain a text content block.");
  }

  return textContent.text;
}

/**
 * Run the complete MCP integration test suite.
 */
async function main(): Promise<void> {
  console.log("Connecting to Route MCP server...");

  /**
   * Create an MCP client.
   *
   * This represents an external application connecting to Route.
   */
  const client = new Client({
    name: "route-test-client",
    version: "0.1.0",
  });

  /**
   * Route currently exposes its MCP server through Streamable HTTP.
   */
  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL));

  /**
   * Establish the MCP connection.
   */
  await client.connect(transport);

  console.log("✓ Connected to Route MCP server.\n");

  /**
   * ---------------------------------------------------------------
   * Test 1: List MCP tools
   * ---------------------------------------------------------------
   *
   * This confirms that the server is exposing the tools we expect.
   */
  console.log("Test 1: Listing MCP tools...");

  const toolsResult = await client.listTools();

  /**
   * Print the tool names returned by the MCP server.
   */
  console.log(
    "✓ Available tools:",
    toolsResult.tools.map((tool) => tool.name).join(", "),
  );

  /**
   * Verify that prepare_opportunity was actually registered.
   *
   * This is important because creating the tool implementation alone
   * does not expose it to an MCP client. The server registration must
   * also be correct.
   */
  const toolNames = toolsResult.tools.map((tool) => tool.name);

  if (!toolNames.includes("prepare_opportunity")) {
    throw new Error(
      "prepare_opportunity was not registered with the MCP server.",
    );
  }

  console.log("✓ prepare_opportunity is registered.\n");

  /**
   * ---------------------------------------------------------------
   * Test 2: get_opportunity through MCP
   * ---------------------------------------------------------------
   *
   * This verifies that the existing opportunity retrieval path still
   * works after adding the new preparation capability.
   *
   * We are intentionally NOT importing OpportunityService or
   * DevpostProvider here.
   *
   * The request must travel through the actual MCP interface:
   *
   *   MCP client
   *        ↓
   *   Streamable HTTP
   *        ↓
   *   MCP server
   *        ↓
   *   get_opportunity
   *        ↓
   *   OpportunityService
   *        ↓
   *   Devpost provider
   */
  console.log("Test 2: MCP get_opportunity...");

  /**
   * Call the actual MCP tool using an OpenCV Devpost opportunity.
   */
  const result = await client.callTool({
    name: "get_opportunity",
    arguments: {
      url: "https://opencv26.devpost.com/",
    },
  });

  /**
   * Extract the text returned by the MCP tool.
   *
   * The Route MCP tool currently returns the normalized opportunity
   * as JSON inside a text content block.
   */
  const opportunityText = getTextContent(result);

  /**
   * Parse the JSON returned by Route.
   *
   * We use `Record<string, unknown>` instead of `any` so that
   * TypeScript forces us to verify values before using them.
   */
  const opportunity: Record<string, unknown> = JSON.parse(opportunityText);

  /**
   * Print the complete normalized opportunity.
   */
  console.log(
    "✓ MCP get_opportunity returned:",
    JSON.stringify(opportunity, null, 2),
  );

  /**
   * ---------------------------------------------------------------
   * Verify the MCP response contract
   * ---------------------------------------------------------------
   *
   * We don't test every provider-specific field here.
   *
   * The provider tests already verify provider behavior.
   *
   * This test is specifically checking that the important normalized
   * opportunity data survives the complete MCP request/response path.
   */

  /**
   * The OpenCV opportunity should be a hackathon.
   */
  if (opportunity.type !== "hackathon") {
    throw new Error(
      `Expected type "hackathon", received "${String(opportunity.type)}".`,
    );
  }

  /**
   * The opportunity should have come from Devpost.
   */
  if (opportunity.source !== "devpost") {
    throw new Error(
      `Expected source "devpost", received "${String(opportunity.source)}".`,
    );
  }

  /**
   * Verify that the URL returned by Route is the same URL we requested.
   */
  if (opportunity.url !== "https://opencv26.devpost.com/") {
    throw new Error(`Unexpected opportunity URL: ${String(opportunity.url)}`);
  }

  /**
   * A normalized opportunity must have a non-empty title.
   */
  if (typeof opportunity.title !== "string" || opportunity.title.length === 0) {
    throw new Error("get_opportunity returned an opportunity without a title.");
  }

  console.log(`✓ MCP returned ${opportunity.title} successfully.\n`);

  /**
   * ---------------------------------------------------------------
   * Test 3: prepare_opportunity through MCP
   * ---------------------------------------------------------------
   *
   * This is the new feature we are currently building.
   *
   * We intentionally test the complete MCP path instead of importing
   * PreparationService directly.
   *
   * The request must travel through:
   *
   *   MCP client
   *        ↓
   *   Streamable HTTP
   *        ↓
   *   MCP server
   *        ↓
   *   prepare_opportunity
   *        ↓
   *   PreparationService
   *        ↓
   *   ProviderManager
   *        ↓
   *   DevpostProvider
   *        ↓
   *   Devpost source page
   */
  console.log("Test 3: MCP prepare_opportunity...");

  /**
   * Call the actual MCP preparation tool using the same OpenCV
   * Devpost opportunity.
   *
   * Reusing the same opportunity makes the test easier to reason about:
   * we already know Route can retrieve this URL, and now we are testing
   * whether Route can prepare it through the MCP interface.
   */
  const preparationResult = await client.callTool({
    name: "prepare_opportunity",
    arguments: {
      url: "https://opencv26.devpost.com/",
    },
  });

  /**
   * Extract the preparation context returned by Route.
   */
  const preparationText = getTextContent(preparationResult);

  /**
   * Parse the preparation context.
   *
   * We intentionally keep the parsed value as an untrusted record
   * rather than assuming every field exists.
   */
  const preparation: Record<string, unknown> = JSON.parse(preparationText);

  /**
   * Print the complete preparation context.
   *
   * This is useful during the initial integration phase because we
   * want to inspect what Route is actually exposing to the MCP client.
   */
  console.log(
    "✓ MCP prepare_opportunity returned:",
    JSON.stringify(preparation, null, 2),
  );

  /**
   * ---------------------------------------------------------------
   * Verify the preparation response contract
   * ---------------------------------------------------------------
   *
   * The preparation tool should return:
   *
   * - the normalized opportunity
   * - preparation-specific structured information
   * - source/provenance information
   *
   * We are deliberately checking only the contract that belongs to
   * this MCP integration test. Provider-specific extraction details
   * remain the responsibility of provider tests.
   */

  /**
   * The top-level response must contain an opportunity object.
   */
  if (
    typeof preparation.opportunity !== "object" ||
    preparation.opportunity === null
  ) {
    throw new Error(
      "prepare_opportunity did not return an opportunity object.",
    );
  }

  /**
   * Narrow the nested opportunity object so we can verify its
   * normalized Route fields.
   */
  const preparedOpportunity = preparation.opportunity as Record<
    string,
    unknown
  >;

  /**
   * The prepared opportunity should still be the same hackathon.
   */
  if (preparedOpportunity.type !== "hackathon") {
    throw new Error(
      `Expected prepared opportunity type "hackathon", received "${String(
        preparedOpportunity.type,
      )}".`,
    );
  }

  /**
   * The prepared opportunity should come from Devpost.
   */
  if (preparedOpportunity.source !== "devpost") {
    throw new Error(
      `Expected prepared opportunity source "devpost", received "${String(
        preparedOpportunity.source,
      )}".`,
    );
  }

  /**
   * Verify that preparation preserved the requested opportunity URL.
   */
  if (preparedOpportunity.url !== "https://opencv26.devpost.com/") {
    throw new Error(
      `Unexpected prepared opportunity URL: ${String(preparedOpportunity.url)}`,
    );
  }

  /**
   * The preparation response must contain the structured preparation
   * section.
   */
  if (
    typeof preparation.preparation !== "object" ||
    preparation.preparation === null
  ) {
    throw new Error("prepare_opportunity did not return a preparation object.");
  }

  /**
   * The preparation response must contain source provenance.
   *
   * Route needs to make it possible for downstream agents to understand
   * where the preparation context came from.
   */
  if (typeof preparation.source !== "object" || preparation.source === null) {
    throw new Error("prepare_opportunity did not return source provenance.");
  }

  /**
   * Source content should be present for the Devpost provider.
   *
   * Route's preparation contract is specifically intended to preserve
   * useful source information rather than reducing everything to a
   * generated summary.
   */
  if (!Array.isArray(preparation.sourceContent)) {
    throw new Error("prepare_opportunity did not return sourceContent.");
  }

  if (preparation.sourceContent.length === 0) {
    throw new Error(
      "prepare_opportunity returned an empty sourceContent array.",
    );
  }

  console.log(
    `✓ MCP prepared ${String(
      preparedOpportunity.title ?? "opportunity",
    )} successfully.`,
  );

  /**
   * ---------------------------------------------------------------
   * Test 4: Unsupported URL
   * ---------------------------------------------------------------
   *
   * Route currently supports specific opportunity providers.
   *
   * This test verifies that an unsupported source is handled
   * gracefully through the MCP layer.
   */
  console.log("\nTest 4: MCP get_opportunity with unsupported URL...");

  /**
   * Call get_opportunity using a URL that no Route provider supports.
   */
  const unsupportedResult = await client.callTool({
    name: "get_opportunity",
    arguments: {
      url: "https://example.com/opportunity",
    },
  });

  /**
   * Extract the text returned by the MCP tool.
   */
  const unsupportedText = getTextContent(unsupportedResult);

  /**
   * The current Route implementation returns a human-readable
   * message when the opportunity cannot be retrieved.
   */
  console.log("✓ Unsupported URL response:", unsupportedText);

  /**
   * Make sure the response actually communicates that Route could
   * not retrieve the opportunity.
   */
  if (!unsupportedText.includes("Route could not retrieve an opportunity")) {
    throw new Error(
      "Unsupported URL response did not contain the expected error message.",
    );
  }

  console.log("✓ Unsupported URL correctly handled.");

  /**
   * ---------------------------------------------------------------
   * Final result
   * ---------------------------------------------------------------
   */
  console.log("\n✓ MCP prepare_opportunity integration test passed.");

  /**
   * Close the MCP transport so the test process can exit cleanly.
   */
  await transport.close();
}

/**
 * Run the test suite.
 *
 * Errors are caught here so the test exits with status code 1,
 * which also makes the failure visible to CI systems later.
 */
main().catch((error: unknown) => {
  console.error("\n✗ MCP integration test failed.");
  console.error(error);
  process.exit(1);
});
