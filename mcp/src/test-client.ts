/**
 * ROUTE MCP TEST CLIENT
 * ---------------------
 *
 * This file is a temporary development client used to verify that
 * another application can communicate with Route through MCP over
 * Streamable HTTP.
 *
 * This is NOT part of the Route MCP server itself.
 *
 * Think of this file as pretending to be an external AI application.
 *
 * The flow being tested is:
 *
 *   Test Client
 *       ↓
 *   Streamable HTTP
 *       ↓
 *   Route MCP Server
 *       ↓
 *   search_opportunities
 *       ↓
 *   OpportunitySearchService
 *       ↓
 *   Provider Manager
 *       ↓
 *   Remote OK / Devpost
 *
 * This is important because successfully starting the HTTP server
 * does not prove that the complete MCP request/response flow works.
 *
 * This test verifies:
 *
 *   1. MCP initialization succeeds.
 *   2. Route advertises its server information.
 *   3. Route exposes the expected tools.
 *   4. The health check can be called.
 *   5. search_opportunities can be called through MCP.
 *   6. Structured opportunity data reaches the MCP client.
 *   7. Pagination information can be returned.
 *   8. The MCP connection can be closed cleanly.
 *
 * This is still a manual development test.
 *
 * Later, once the MCP contract is stable, this kind of behavior can
 * be moved into automated integration tests.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";

import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

/**
 * Create an MCP client.
 *
 * The name identifies the application connecting to Route.
 *
 * We deliberately call this `route-test-client` because this is only
 * our local development client.
 *
 * In the real world, this could eventually be:
 *
 *   - Alexa+
 *   - Claude
 *   - ChatGPT
 *   - a custom agent
 *   - an IDE integration
 *   - our Route demo application
 */
const client = new Client({
  name: "route-test-client",
  version: "0.1.0",
});

/**
 * Create the Streamable HTTP transport.
 *
 * This must point to the same MCP endpoint exposed by `src/index.ts`.
 *
 * IMPORTANT:
 *
 * If the port in `src/index.ts` changes, this URL must change with it.
 *
 * The current development endpoint is:
 *
 *   http://localhost:3005/mcp
 */
const transport = new StreamableHTTPClientTransport(
  new URL("http://localhost:3005/mcp"),
);

try {
  /**
   * ---------------------------------------------------------------
   * STEP 1: CONNECT
   * ---------------------------------------------------------------
   *
   * `connect()` performs the MCP initialization handshake.
   *
   * If this succeeds, we have proven that the client can establish
   * an MCP session with Route over Streamable HTTP.
   */
  await client.connect(transport);

  console.log("\nConnected to Route successfully.\n");

  /**
   * ---------------------------------------------------------------
   * STEP 2: SERVER INFORMATION
   * ---------------------------------------------------------------
   *
   * Ask Route what server identity it advertised during the
   * initialization handshake.
   */
  const serverVersion = client.getServerVersion();

  console.log("Server information:");

  console.log(serverVersion);

  /**
   * ---------------------------------------------------------------
   * STEP 3: SERVER CAPABILITIES
   * ---------------------------------------------------------------
   *
   * MCP servers advertise which capabilities they support.
   *
   * We expect Route to expose tools.
   */
  const serverCapabilities = client.getServerCapabilities();

  console.log("\nServer capabilities:");

  console.log(serverCapabilities);

  /**
   * ---------------------------------------------------------------
   * STEP 4: LIST TOOLS
   * ---------------------------------------------------------------
   *
   * Ask Route which tools are currently available.
   *
   * At this point we should see:
   *
   *   - search_opportunities
   *
   * The temporary `health_check` should also still appear because
   * we have not removed it yet.
   */
  const toolsResult = await client.listTools();

  console.log("\nAvailable tools:");

  for (const tool of toolsResult.tools) {
    console.log(`- ${tool.name}: ${tool.description ?? "No description"}`);
  }

  /**
   * ---------------------------------------------------------------
   * STEP 5: HEALTH CHECK
   * ---------------------------------------------------------------
   *
   * Keep the health check for now.
   *
   * It gives us a very small baseline test that confirms the MCP
   * server can receive and respond to a tool call independently
   * of the opportunity system.
   *
   * We can remove this temporary tool later.
   */
  const healthResult = await client.callTool({
    name: "health_check",
    arguments: {},
  });

  console.log("\nhealth_check response:");

  console.dir(healthResult, {
    depth: null,
  });

  /**
   * ---------------------------------------------------------------
   * STEP 6: SEARCH OPPORTUNITIES
   * ---------------------------------------------------------------
   *
   * This is now the important test.
   *
   * We are pretending that an external AI agent asked Route:
   *
   *   "Find me AI opportunities."
   *
   * We are asking for all supported opportunity types.
   *
   * With:
   *
   *   limit: 5
   *
   * the Search Service semantics are:
   *
   *   up to 5 jobs
   *   up to 5 hackathons
   *
   * Therefore the response can contain up to 10 opportunities.
   */
  const searchResult = await client.callTool({
    name: "search_opportunities",

    arguments: {
      type: "all",
      keyword: "AI",
      limit: 5,
    },
  });

  console.log("\nsearch_opportunities response:");

  /**
   * MCP returns the tool result using MCP content blocks.
   *
   * `console.dir` lets us inspect the complete structure rather than
   * assuming what the SDK returned.
   */
  console.dir(searchResult, {
    depth: null,
  });

  /**
   * ---------------------------------------------------------------
   * STEP 7: BASIC RESULT VALIDATION
   * ---------------------------------------------------------------
   *
   * The MCP SDK intentionally exposes tool results using a broad
   * type because MCP supports different kinds of content blocks.
   *
   * We only need to handle text content for this temporary test
   * client because our `search_opportunities` tool currently
   * serializes its structured result as JSON inside a text block.
   *
   * We therefore narrow the result before accessing `content`.
   */

  /**
   * `isError` is available on MCP tool results and tells us whether
   * the server reported a tool-level error.
   */
  if (searchResult.isError) {
    throw new Error("search_opportunities returned an MCP error.");
  }

  /**
   * The SDK types `content` broadly because MCP can return different
   * content representations.
   *
   * For this test we only care about text blocks.
   *
   * Rather than forcing TypeScript to trust an unsafe cast everywhere,
   * we first verify that the returned value is an array.
   */
  if (!Array.isArray(searchResult.content)) {
    throw new Error(
      "search_opportunities returned an invalid content structure.",
    );
  }

  /**
   * Now TypeScript knows that `content` is an array.
   *
   * We still need to find the text block because MCP responses can
   * contain multiple content blocks.
   */
  const textContent = searchResult.content.find(
    (content) =>
      typeof content === "object" &&
      content !== null &&
      "type" in content &&
      content.type === "text",
  );

  /**
   * Make sure we actually received a text block.
   */
  if (
    !textContent ||
    typeof textContent !== "object" ||
    !("text" in textContent) ||
    typeof textContent.text !== "string"
  ) {
    throw new Error(
      "search_opportunities did not return a valid text content block.",
    );
  }

  /**
   * Parse the JSON returned by the MCP tool.
   *
   * This proves that the client can actually consume the structured
   * result rather than merely receiving a successful MCP response.
   */
  const parsedSearchResult = JSON.parse(textContent.text) as {
    opportunities: Array<{
      id: string;
      title: string;
      type: string;
      organization: string;
      url: string;
      source: string;
    }>;

    nextCursor?: string;
  };

  /**
   * Make sure the response contains the expected top-level
   * opportunities array.
   */
  if (!Array.isArray(parsedSearchResult.opportunities)) {
    throw new Error(
      "search_opportunities response does not contain an opportunities array.",
    );
  }

  console.log("\nParsed opportunities:");

  for (const opportunity of parsedSearchResult.opportunities) {
    console.log(
      `- ${opportunity.title} | ${opportunity.type} | ${opportunity.source}`,
    );
  }

  /**
   * Display pagination state.
   *
   * The cursor is intentionally treated as opaque.
   *
   * The client does not need to know whether it contains:
   *
   *   remoteok:5
   *   devpost:2
   *   or some future internal representation.
   */
  console.log("\nNext cursor:", parsedSearchResult.nextCursor ?? "none");

  /**
   * ---------------------------------------------------------------
   * FINAL RESULT
   * ---------------------------------------------------------------
   */
  console.log("\nRoute MCP integration test completed successfully.");
} catch (error) {
  /**
   * Any connection, transport, MCP, or tool error reaches this block.
   */
  console.error("\nRoute MCP test failed:");

  console.error(error);

  /**
   * Exit with a non-zero status.
   *
   * This is useful later when this test is moved into CI.
   */
  process.exitCode = 1;
} finally {
  /**
   * ---------------------------------------------------------------
   * CLEANUP
   * ---------------------------------------------------------------
   *
   * Close the MCP session cleanly.
   *
   * If initialization failed, there may not be an active session.
   * That is why termination errors are ignored here.
   */
  try {
    await transport.terminateSession();
  } catch {
    // Nothing to terminate if the MCP session was never established.
  }

  /**
   * Close the MCP client itself.
   */
  await client.close();
}
