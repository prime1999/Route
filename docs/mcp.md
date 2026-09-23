# Route MCP

Route is exposed through the **Model Context Protocol (MCP)**.

The MCP layer is the interface between Route and external AI agents, applications, and MCP-compatible clients.

The current implementation uses the official MCP TypeScript SDK and **Streamable HTTP** transport.

---

## 1. Why MCP?

Route is designed to be infrastructure that different AI systems can consume.

Instead of building Route around one specific AI assistant, Route exposes its opportunity capabilities through MCP.

This allows compatible clients to connect to the same Route server.

Conceptually:

```text id="5upk5h"
                    MCP CLIENTS
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
     AI Agent        Developer App     Alexa+
        │                │                │
        └────────────────┼────────────────┘
                         │
                         │ MCP
                         ▼
                  ┌──────────────┐
                  │    ROUTE     │
                  │ MCP SERVER   │
                  └──────────────┘
```

The MCP layer therefore acts as the standardized interface into Route.

---

# 2. MCP Server

The Route MCP server is responsible for creating the MCP server and registering Route's tools.

The implementation is located under:

```text id="3b5r5v"
src/server/
├── mcpServer.ts
└── tools/
```

The main server module should remain focused on MCP setup and tool registration rather than containing the implementation of individual tools.

Conceptually:

```text id="0e2y2q"
mcpServer.ts
     │
     ├── registerHealthCheckTool()
     │
     └── registerSearchOpportunitiesTool()
```

Each tool owns its own implementation.

---

# 3. MCP SDK

Route uses the official Model Context Protocol TypeScript SDK.

The SDK provides the protocol implementation used by Route to:

- create the MCP server
- register tools
- communicate with MCP clients
- handle MCP requests
- expose the server through the selected transport

Route does not implement the MCP protocol itself.

---

# 4. Streamable HTTP

Route currently uses **Streamable HTTP** as its MCP transport.

This allows an MCP client to communicate with the Route server over HTTP.

The current development server exposes the MCP endpoint at:

```text
/mcp
```

The exact local address depends on the development port configured when the server is started.

For example:

```text
http://localhost:<port>/mcp
```

The port is a development configuration detail and should not be treated as part of Route's permanent public API.

---

# 5. MCP Request Flow

A typical request follows this path:

```text id="7w0y6m"
MCP Client
     │
     │ MCP request
     ▼
Streamable HTTP
     │
     ▼
Route MCP Server
     │
     ▼
Registered Tool
     │
     ▼
Application Service
     │
     ▼
Provider Manager
     │
     ▼
External Provider
```

For example, a search request follows:

```text id="9s5y4c"
AI Agent
   │
   │ search_opportunities
   ▼
Route MCP Server
   │
   ▼
search_opportunities tool
   │
   ▼
Opportunity Search Service
   │
   ▼
Provider Manager
   │
   ├── Remote OK
   │
   └── Devpost
```

The resulting normalized opportunities are then returned through MCP to the client.

---

# 6. Tool Registration

Route keeps individual tools separate from the MCP server assembly.

Current structure:

```text id="3m5k8h"
src/
└── server/
    ├── mcpServer.ts
    │
    └── tools/
        ├── healthCheck.ts
        └── searchOpportunities.ts
```

Each tool exposes a registration function.

Conceptually:

```text id="ndv5q6"
registerHealthCheckTool(server)

registerSearchOpportunitiesTool(server)
```

The MCP server calls these functions during initialization.

This provides a consistent pattern for adding future tools.

For example:

```text id="j5gq7h"
tools/
├── healthCheck.ts
├── searchOpportunities.ts
├── getOpportunity.ts
├── saveOpportunity.ts
└── prepareOpportunity.ts
```

The future files should only be added when those tools are actually implemented.

---

# 7. Tool Input Validation

Route uses **Zod** to define and validate tool inputs.

This creates an explicit contract between an MCP client and a Route tool.

For example, the `search_opportunities` tool defines a schema containing:

```text id="0i2kqg"
keyword?
type?
remote?
limit?
cursor?
```

The tool validates the incoming arguments before passing them into the opportunity search system.

This means invalid tool input can be rejected at the MCP tool boundary rather than propagating into provider implementations.

---

# 8. Current MCP Tools

The current MCP server exposes two tools.

## `health_check`

The health check verifies that the Route MCP server is running and able to respond to tool calls.

It currently accepts an empty Zod object:

```text id="hmn1ve"
{}
```

Its purpose is primarily diagnostic during development.

It allows us to distinguish between:

```text id="j8k0g4"
MCP connection problem
```

and:

```text id="6gq6q2"
Route/provider/application problem
```

The health check is intentionally simple.

---

## `search_opportunities`

The search tool provides access to Route's opportunity search infrastructure.

Current input:

```text id="5n9j1r"
{
  keyword?: string;
  type?: "job" | "hackathon" | "all";
  remote?: boolean;
  limit?: number;
  cursor?: string;
}
```

The tool passes the validated search request into the Opportunity Search Service.

The service then coordinates the provider layer.

More detailed search behavior is documented separately in:

[Search Opportunities](./tools/search-opportunities.md)

---

# 9. MCP Client

Route includes a development MCP client used to verify the server independently.

The current test client is:

```text id="2z8z5p"
src/test-client.ts
```

The client connects to the Route MCP server using the Streamable HTTP transport.

It verifies that the server can:

1. Connect successfully.
2. Report server information.
3. Report available capabilities.
4. List registered tools.
5. Call `health_check`.
6. Call `search_opportunities`.
7. Parse the returned search data.
8. Read the returned pagination cursor.

This gives us an end-to-end test of the MCP layer rather than only testing individual internal services.

---

# 10. MCP Integration Testing

Route is tested at multiple levels.

The opportunity system has provider-level and service-level tests, while the MCP layer has an end-to-end client.

The current flow is:

```text id="xv1l3m"
Provider Tests
      ↓
Provider Manager Tests
      ↓
Search Service Tests
      ↓
MCP Server
      ↓
MCP Test Client
```

This allows problems to be isolated between layers.

For example, if the provider test succeeds but the MCP test fails, the problem can be investigated above the provider layer rather than assuming the external source is broken.

---

# 11. MCP and Provider Independence

The MCP tools do not directly contain Remote OK or Devpost implementation logic.

For example:

```text id="uh4k3j"
search_opportunities
        │
        ▼
Search Service
        │
        ▼
Provider Manager
        │
   ┌────┴────┐
   ▼         ▼
Remote OK  Devpost
```

This means the MCP interface does not need to change simply because a provider's API changes.

Provider-specific changes should normally remain inside the provider implementation.

Likewise, adding another opportunity source should not require creating a completely different MCP search tool.

---

# 12. MCP Contract vs Internal Implementation

The MCP interface is the external contract.

Internal implementation details should not be unnecessarily exposed to MCP clients.

For example, Route internally understands provider-specific pagination:

```text id="9w6yfp"
remoteok:5
devpost:2
```

The MCP client receives an opaque Route cursor instead.

This allows the internal implementation to evolve without requiring MCP clients to understand provider internals.

The same principle applies to:

- provider response formats
- provider APIs
- internal service classes
- internal data-fetching logic

---

# 13. Server Lifecycle

At startup, Route performs the following general sequence:

```text id="x5qv4e"
Start Node.js process
        │
        ▼
Initialize Route MCP server
        │
        ▼
Create/register tools
        │
        ▼
Configure Streamable HTTP
        │
        ▼
Start HTTP server
        │
        ▼
Wait for MCP clients
```

When an MCP client connects:

```text id="r6qj8c"
MCP Client
    │
    ▼
Streamable HTTP endpoint
    │
    ▼
MCP Server
    │
    ▼
Tool requests
```

The server remains available to handle requests until the process is stopped.

---

# 14. Development Server

The MCP project uses TypeScript with Node.js and native ESM.

The current package configuration provides:

```text id="5b7y0j"
npm run dev
npm run build
npm start
```

### Development

```bash
npm run dev
```

This runs the TypeScript server using `tsx`.

### Build

```bash
npm run build
```

This compiles the TypeScript source into the configured `dist` directory.

### Production-style start

```bash
npm start
```

This runs the compiled JavaScript output.

The exact production deployment process has not yet been finalized.

---

# 15. Development MCP Testing

The development workflow currently uses two processes:

```text id="6mlgqh"
Terminal 1
──────────
Route MCP Server
        │
        │ Streamable HTTP
        ▼
Terminal 2
──────────
Route MCP Test Client
```

The test client connects to the running MCP server and exercises the exposed tools.

This allows the MCP server to be tested as an actual MCP server rather than only through direct function calls.

---

# 16. Current MCP Implementation

The current implementation includes:

- Official MCP TypeScript SDK
- TypeScript
- Node.js
- Native ESM
- Streamable HTTP
- MCP server
- MCP tool registration
- Zod input validation
- MCP session handling
- Development MCP client
- `health_check`
- `search_opportunities`
- End-to-end MCP testing

The MCP layer currently exposes the opportunity search system without coupling the MCP interface to a specific AI provider.

---

# 17. Future MCP Capabilities

Additional tools will be added as their underlying functionality is implemented and tested.

Planned capabilities include:

```text id="w9b6pj"
get_opportunity
save_opportunity
list_saved_opportunities
prepare_opportunity
```

Future integrations may also include:

- Alexa+
- other MCP-compatible AI clients
- custom applications
- agent integrations

These are not currently part of the implemented MCP contract.

They should be added only after their underlying behavior has been designed, implemented, tested, and documented.

---

# 18. MCP Architectural Principle

The most important principle of Route's MCP layer is:

> **The MCP interface should expose Route's capabilities without exposing unnecessary internal implementation details.**

The client should be able to think in terms of:

```text id="q1t5cu"
Search opportunities
Get an opportunity
Save an opportunity
Prepare for an opportunity
```

rather than:

```text id="7y8v3n"
Call Remote OK
Parse Devpost
Manage provider cursors
Normalize provider JSON
```

Those implementation details belong inside Route.

This keeps the MCP interface stable while allowing the internal infrastructure to evolve.

---

## Summary

The current Route MCP architecture can be summarized as:

```text id="9j5g5z"
                  MCP CLIENT
                      │
                      │ Streamable HTTP
                      ▼
               ┌──────────────┐
               │ ROUTE MCP    │
               │    SERVER    │
               └──────┬───────┘
                      │
                      ▼
                 MCP TOOLS
                      │
                      ▼
             APPLICATION SERVICES
                      │
                      ▼
              PROVIDER MANAGER
                 /         \
                ▼           ▼
           Remote OK      Devpost
```

The MCP layer provides the external interface.

The application layer provides Route's opportunity behavior.

The provider layer handles external sources.

This separation is what allows Route to remain an agent-agnostic opportunity infrastructure layer.
