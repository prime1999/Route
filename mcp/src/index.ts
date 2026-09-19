/**
 * ROUTE MCP SERVER - APPLICATION ENTRY POINT
 * -------------------------------------------
 *
 * This file is responsible for exposing the Route MCP server over
 * Streamable HTTP.
 *
 * There are two important responsibilities in this file:
 *
 * 1. Receive HTTP requests from MCP clients.
 *
 * 2. Route those requests to the correct MCP server/transport session.
 *
 * The actual MCP capabilities still live in:
 *
 *     src/server/mcpServer.ts
 *
 * Keeping these responsibilities separate means the HTTP layer does
 * not need to know anything about:
 *
 *     - jobs
 *     - hackathons
 *     - Remote OK
 *     - Devpost
 *     - DynamoDB
 *     - Bedrock
 *     - Alexa+
 *
 * Its job is simply to move MCP messages between the client and the
 * Route MCP server.
 */

import { randomUUID } from "node:crypto";
import { createServer } from "node:http";

import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import { createMcpServer } from "./server/mcpServer.js";

/**
 * The port used when running Route locally.
 *
 * We allow the environment to override the port because deployment
 * platforms commonly provide their own PORT environment variable.
 *
 * During local development:
 *
 *     http://localhost:3000/mcp
 */
const PORT = Number(process.env.PORT ?? 3001);

/**
 * A connected MCP session consists of:
 *
 *     MCP server
 *          +
 *     Streamable HTTP transport
 *
 * We store these together because every subsequent request belonging
 * to a session must be handled by the same transport/server pair.
 *
 * The key is the MCP session ID returned during initialization.
 *
 * This is an in-memory session store for now.
 *
 * IMPORTANT:
 *
 * This is appropriate for our local development stage.
 *
 * When we deploy Route to multiple server instances, we will need to
 * think carefully about session affinity / shared state. We will
 * address that during the production deployment phase rather than
 * prematurely adding infrastructure now.
 */
const sessions = new Map<
  string,
  {
    server: ReturnType<typeof createMcpServer>;
    transport: StreamableHTTPServerTransport;
  }
>();

/**
 * Create the Node.js HTTP server.
 *
 * We intentionally use Node's native HTTP server here.
 *
 * The MCP SDK already gives us the MCP transport implementation, so
 * Express/Fastify/etc. are unnecessary at this stage.
 */
const httpServer = createServer(async (req, res) => {
  /**
   * Convert the incoming request URL into a standard URL object.
   *
   * For example:
   *
   *     /mcp
   *
   * becomes:
   *
   *     http://localhost:3000/mcp
   */
  const url = new URL(
    req.url ?? "/",
    `http://${req.headers.host ?? `localhost:${PORT}`}`,
  );

  /**
   * Route only the MCP endpoint through the MCP transport.
   *
   * Route's MCP endpoint is deliberately kept simple:
   *
   *     /mcp
   *
   * Later, once deployed, it will be available through HTTPS.
   */
  if (url.pathname !== "/mcp") {
    res.writeHead(404, {
      "Content-Type": "application/json",
    });

    res.end(
      JSON.stringify({
        error: "Not Found",
        message: "Route MCP endpoint is available at /mcp.",
      }),
    );

    return;
  }

  /**
   * MCP sessions are identified by the `mcp-session-id` HTTP header.
   *
   * A client that has already initialized a session will send this
   * header with subsequent requests.
   *
   * We read it here so we can locate the correct transport.
   */
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  /**
   * If the request already belongs to an existing MCP session, reuse
   * the server and transport associated with that session.
   *
   * This is critical.
   *
   * We must NOT create a new MCP server for every request because the
   * MCP client expects the session established during initialization
   * to remain available for subsequent requests.
   */
  if (sessionId) {
    const session = sessions.get(sessionId);

    /**
     * If the client supplied a session ID that Route doesn't know
     * about, the session may have expired or the request may have been
     * sent to the wrong server instance.
     */
    if (!session) {
      res.writeHead(404, {
        "Content-Type": "application/json",
      });

      res.end(
        JSON.stringify({
          error: "Unknown MCP session",
          message: "The supplied MCP session does not exist.",
        }),
      );

      return;
    }

    try {
      /**
       * Forward the request to the existing transport.
       *
       * The transport understands the MCP protocol and handles the
       * appropriate HTTP response.
       */
      await session.transport.handleRequest(req, res);
    } catch (error) {
      console.error("Error handling existing MCP session:", error);

      if (!res.headersSent) {
        res.writeHead(500, {
          "Content-Type": "application/json",
        });

        res.end(
          JSON.stringify({
            error: "Internal Server Error",
          }),
        );
      }
    }

    return;
  }

  /**
   * There is no session ID.
   *
   * This should normally mean that the client is attempting to create
   * a NEW MCP session through the initialization request.
   *
   * For now, we let the MCP transport handle the request.
   */
  try {
    /**
     * Create the MCP server for this new session.
     *
     * This server instance will remain associated with the session
     * after initialization.
     */
    const mcpServer = createMcpServer();

    /**
     * Create a Streamable HTTP transport for this session.
     *
     * `randomUUID()` generates a unique identifier for the session.
     *
     * That ID will be returned to the MCP client as part of the
     * initialization process.
     */
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),

      /**
       * DNS rebinding protection is disabled during local development.
       *
       * We will revisit this when Route is deployed publicly.
       *
       * This should NOT be treated as a production security setting.
       */
      enableDnsRebindingProtection: false,
    });

    /**
     * Connect the MCP server to the Streamable HTTP transport.
     *
     * After this connection is established, the transport knows how
     * to forward MCP messages to our Route MCP server.
     */
    await mcpServer.connect(transport);

    /**
     * Handle the initialization request.
     *
     * The transport generates/returns the MCP session ID as part of
     * the protocol exchange.
     */
    await transport.handleRequest(req, res);

    /**
     * The transport should now have a session ID.
     *
     * We retrieve it so we can associate the server and transport with
     * that session for future requests.
     */
    const newSessionId = transport.sessionId;

    /**
     * If a session was successfully created, store it.
     *
     * Future requests carrying this session ID will reuse this exact
     * MCP server and transport.
     */
    if (newSessionId) {
      sessions.set(newSessionId, {
        server: mcpServer,
        transport,
      });

      /**
       * If the client disconnects, clean up the session.
       *
       * This prevents our in-memory session map from growing forever
       * during local development.
       */
      transport.onclose = async () => {
        sessions.delete(newSessionId);

        /**
         * Close the MCP server as well so any resources associated
         * with the session can be released.
         */
        await mcpServer.close();
      };
    }
  } catch (error) {
    /**
     * Log the complete server-side error for debugging.
     *
     * We avoid sending internal implementation details to the client.
     */
    console.error("Error creating MCP session:", error);

    if (!res.headersSent) {
      res.writeHead(500, {
        "Content-Type": "application/json",
      });

      res.end(
        JSON.stringify({
          error: "Internal Server Error",
        }),
      );
    }
  }
});

/**
 * Start the HTTP server.
 *
 * Once this callback executes, Route is listening for MCP connections.
 */
httpServer.listen(PORT, () => {
  console.log(`
========================================
Route MCP Server
========================================

MCP endpoint:
  http://localhost:${PORT}/mcp

Transport:
  Streamable HTTP

Temporary tool:
  health_check

Status:
  Running
========================================
`);
});
