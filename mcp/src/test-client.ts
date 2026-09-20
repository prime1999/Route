/**
 * ROUTE MCP TEST CLIENT
 * ---------------------
 *
 * This file is a temporary development client.
 *
 * Its purpose is to prove that another application can actually
 * communicate with Route through the MCP protocol over Streamable HTTP.
 *
 * This is important because simply starting our server does NOT prove
 * that MCP communication works.
 *
 * This test will:
 *
 *   1. Connect to Route's /mcp endpoint.
 *   2. Perform the MCP initialization handshake.
 *   3. Ask Route what tools it provides.
 *   4. Call the temporary `health_check` tool.
 *   5. Print the response.
 *   6. Close the MCP connection cleanly.
 *
 * Later, this temporary client can be removed or replaced with proper
 * automated integration tests.
 */

/**
 * `Client` is exported from the MCP client's main entry point.
 *
 * It provides the high-level MCP client functionality:
 *
 *   - initialize the MCP connection
 *   - discover server capabilities
 *   - list tools
 *   - call tools
 *   - close the connection
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

/**
 * `StreamableHTTPClientTransport` has its own export path in the
 * version 1.x MCP TypeScript SDK.
 *
 * This transport is responsible for communicating with an MCP server
 * using the Streamable HTTP transport.
 *
 * In our case, it will communicate with:
 *
 *     http://localhost:3005/mcp
 */
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

/**
 * Create an MCP client.
 *
 * The name identifies the application connecting to Route.
 *
 * This is deliberately called `route-test-client` because this is
 * only our local development/test client.
 */
const client = new Client({
  name: "route-test-client",
  version: "0.1.0",
});

/**
 * Create the Streamable HTTP client transport.
 *
 * This points to the exact endpoint exposed by our Route server.
 *
 * The important part here is that this is an MCP transport—not a
 * generic HTTP request.
 *
 * The MCP SDK handles the MCP protocol messages for us.
 */
const transport = new StreamableHTTPClientTransport(
  new URL("http://localhost:3005/mcp"),
);

try {
  /**
   * Connect the client to Route.
   *
   * `connect()` performs the MCP initialization handshake.
   *
   * If this succeeds, we know that:
   *
   *     client
   *        ↓
   *     Streamable HTTP
   *        ↓
   *     Route
   *
   * is functioning at the protocol level.
   */
  await client.connect(transport);

  console.log("\nConnected to Route successfully.\n");

  /**
   * Ask Route for the information it advertised about itself.
   *
   * This lets us verify that the MCP server identity made it through
   * the handshake.
   */
  const serverVersion = client.getServerVersion();

  console.log("Server information:");
  console.log(serverVersion);

  /**
   * Ask Route for its available capabilities.
   *
   * The capabilities tell the client what kinds of MCP functionality
   * the server supports.
   */
  const serverCapabilities = client.getServerCapabilities();

  console.log("\nServer capabilities:");
  console.log(serverCapabilities);

  /**
   * Ask Route to list its available tools.
   *
   * We should see our temporary:
   *
   *     health_check
   *
   * tool here.
   */
  const toolsResult = await client.listTools();

  console.log("\nAvailable tools:");

  for (const tool of toolsResult.tools) {
    console.log(`- ${tool.name}: ${tool.description ?? "No description"}`);
  }

  /**
   * Call the temporary health_check tool.
   *
   * This is the final proof that the complete MCP request/response
   * cycle works.
   */
  const healthResult = await client.callTool({
    name: "health_check",
    arguments: {},
  });

  console.log("\nhealth_check response:");
  console.dir(healthResult, { depth: null });

  console.log("\nRoute MCP test completed successfully.");
} catch (error) {
  /**
   * If anything fails, print the actual error so we can diagnose the
   * MCP handshake, transport, or tool-call problem.
   */
  console.error("\nRoute MCP test failed:");
  console.error(error);

  /**
   * Exit with a non-zero status code so this test can eventually be
   * incorporated into automated testing/CI.
   */
  process.exitCode = 1;
} finally {
  /**
   * Cleanly close the Streamable HTTP session.
   *
   * This tells the transport that we are finished with the session
   * rather than simply killing the process.
   */
  try {
    await transport.terminateSession();
  } catch {
    /**
     * If the session was never successfully established, there may be
     * nothing to terminate. That's okay for this temporary test.
     */
  }

  /**
   * Close the MCP client itself.
   */
  await client.close();
}
