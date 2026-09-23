# Route Architecture

This document describes the architecture of Route as it is currently implemented.

Route is designed as an **agent-agnostic opportunity infrastructure layer** exposed through the Model Context Protocol (MCP).

The core architectural principle is:

> **Route provides opportunity infrastructure. The connected AI agent or application provides reasoning, personalization, generation, interaction, and automation.**

This separation allows Route to be used by different MCP-compatible clients without coupling the core system to a particular AI model, assistant, or user interface.

---

## 1. High-Level Architecture

At a high level, Route follows this structure:

```text
                        USER
                          │
                          ▼
                  AI AGENT / APP
                          │
                          │ MCP
                          ▼
                 ┌─────────────────┐
                 │      ROUTE      │
                 │   MCP SERVER    │
                 └────────┬────────┘
                          │
                          ▼
                    MCP TOOLS
                          │
                          ▼
               APPLICATION SERVICES
                          │
                          ▼
                 PROVIDER MANAGER
                    /          \
                   /            \
                  ▼              ▼
             Remote OK        Devpost
                Jobs          Hackathons
                   \            /
                    \          /
                     ▼        ▼
                    NORMALIZATION
                          │
                          ▼
                 OPPORTUNITY DATA
```

The architecture is intentionally divided into layers so that MCP concerns, application logic, and external provider logic remain separate.

---

# 2. Architectural Layers

Route currently consists of several logical layers.

```text
MCP Client
    │
    ▼
MCP Server
    │
    ▼
MCP Tools
    │
    ▼
Application Services
    │
    ▼
Provider Manager
    │
    ▼
Providers
    │
    ▼
External Sources
```

Each layer has a specific responsibility.

---

## 2.1 MCP Client

The MCP client is the application or AI agent connecting to Route.

Route does not control which MCP client is used.

Possible clients include:

- AI assistants
- Custom AI agents
- Developer applications
- IDE agents
- Alexa+
- Other MCP-compatible clients

The client is responsible for:

- user interaction
- conversation
- reasoning
- deciding when to call Route
- interpreting Route responses
- combining Route data with other context

Route should not require the client to use a particular AI model.

---

# 3. MCP Server

The MCP server is the entry point into Route.

The current implementation uses the official Model Context Protocol SDK and exposes Route through **Streamable HTTP**.

The MCP server is responsible for:

- creating the MCP server instance
- registering tools
- exposing the MCP endpoint
- handling MCP communication
- connecting MCP requests to Route's application services

The MCP server itself should remain relatively thin.

It should not contain provider-specific logic or large pieces of opportunity business logic.

Conceptually:

```text
MCP Request
     │
     ▼
MCP Server
     │
     ▼
Tool
     │
     ▼
Application Service
```

This keeps the MCP layer focused on protocol concerns.

---

# 4. MCP Tools

Route exposes functionality through small, composable MCP tools.

Each tool is implemented separately rather than placing all tool logic inside the MCP server.

Current structure:

```text
src/
└── server/
    ├── mcpServer.ts
    └── tools/
        ├── healthCheck.ts
        └── searchOpportunities.ts
```

The MCP server is responsible for assembling the tools:

```text
mcpServer.ts
     │
     ├── registerHealthCheckTool()
     │
     └── registerSearchOpportunitiesTool()
```

This approach makes tools easier to:

- understand
- test
- modify
- extend
- document independently

As more tools are implemented, they should follow the same pattern.

---

# 5. Input Validation

Route uses **Zod** for MCP tool input validation.

Each tool defines its expected input structure explicitly.

For example, `search_opportunities` accepts parameters such as:

```text
keyword
type
remote
limit
cursor
```

The MCP layer validates the incoming arguments before passing them into the application logic.

This gives Route a clear contract between the MCP client and the server.

It also prevents provider implementations from having to deal directly with unvalidated MCP input.

---

# 6. Application Services

Application services contain the main opportunity-related behavior.

The current search service is:

```text
src/opportunities/searchService.ts
```

The Search Service sits between the MCP tool and the Provider Manager.

```text
MCP Tool
   │
   ▼
Search Service
   │
   ▼
Provider Manager
   │
   ├── Remote OK
   └── Devpost
```

The Search Service is responsible for Route-level search behavior, including:

- applying Route's search semantics
- coordinating provider searches
- handling Route cursors
- deduplicating results
- applying final result limits
- distributing results by opportunity type

This means providers do not need to understand Route's complete user-facing search semantics.

---

# 7. Provider Architecture

Route uses a provider-based architecture to isolate external opportunity sources.

The provider abstraction allows Route to support multiple sources through a common interface.

The current providers are:

```text
OpportunityProvider
       │
       ├── RemoteOkProvider
       │
       └── DevpostProvider
```

Each provider is responsible for understanding its own source.

This includes:

- source-specific APIs
- response formats
- filtering
- normalization
- pagination
- source-specific metadata

The rest of Route works with the normalized `Opportunity` structure rather than provider-specific response formats.

---

# 8. Provider Interface

Providers implement a common interface.

Conceptually:

```text
OpportunityProvider

├── name
├── supportedTypes
└── search()
```

The current search contract allows Route to pass:

```text
keyword
type
remote
limit
cursor
```

to providers.

Providers return normalized opportunities and, where applicable, a provider-specific continuation cursor.

This abstraction allows new providers to be added without rewriting the MCP tools.

---

# 9. Provider Manager

The Provider Manager coordinates the registered providers.

Current implementation:

```text
src/opportunities/providers/manager.ts
```

Its responsibilities include:

- keeping track of registered providers
- selecting providers based on opportunity type
- passing provider-specific cursors
- running provider searches
- combining provider results
- returning provider continuation state

Conceptually:

```text
                    Provider Manager
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
        RemoteOkProvider          DevpostProvider
              │                         │
              ▼                         ▼
          Remote OK                  Devpost
```

The Provider Manager does **not** decide the final user-facing distribution of results.

That responsibility belongs to the Search Service.

This separation is important because provider orchestration and Route search semantics are different concerns.

---

# 10. Opportunity Model

Route normalizes external source data into a common opportunity structure.

The current model contains:

```text
Opportunity
├── id
├── title
├── type
├── organization
├── description
├── url
├── source
├── sourceUrl
├── location?
├── remote?
├── deadline?
├── prize?
└── metadata?
```

The currently supported opportunity types are:

```text
job
hackathon
```

The `metadata` field allows providers to expose useful provider-specific information without forcing every provider-specific field into the core Route model.

For example, provider metadata may contain information such as:

- tags
- application URLs
- registration counts
- themes
- prize details
- submission periods
- source-specific identifiers

This allows the common model to remain relatively small while preserving useful source information.

---

# 11. Opportunity Normalization

External providers do not necessarily expose opportunity data using the same structure.

For example:

```text
Remote OK
    │
    │ provider-specific response
    ▼
RemoteOkProvider
    │
    │ normalization
    ▼
Opportunity
```

and:

```text
Devpost
    │
    │ provider-specific response
    ▼
DevpostProvider
    │
    │ normalization
    ▼
Opportunity
```

After normalization, the rest of Route can work with the same `Opportunity` structure.

This is one of the main responsibilities of the provider abstraction.

---

# 12. Search Flow

A search request follows this general flow:

```text
MCP Client
    │
    │ search_opportunities
    ▼
MCP Tool
    │
    ▼
Opportunity Search Service
    │
    ▼
Provider Manager
    │
    ├───────────────┐
    ▼               ▼
Remote OK        Devpost
    │               │
    ▼               ▼
Normalize        Normalize
    │               │
    └───────┬───────┘
            ▼
      Provider Results
            │
            ▼
      Search Service
            │
            ├── Deduplicate
            ├── Apply limits
            └── Build cursor
            │
            ▼
       MCP Response
```

The MCP client receives normalized Route opportunities rather than raw provider responses.

---

# 13. Search Result Semantics

Route supports three search types:

```text
job
hackathon
all
```

The default result limit is `5`.

For a specific type:

```text
type = job
limit = 5
```

Route returns up to five jobs.

Likewise:

```text
type = hackathon
limit = 5
```

returns up to five hackathons.

For:

```text
type = all
limit = 5
```

the limit applies independently to each currently supported opportunity type.

Therefore the result can contain:

```text
5 jobs
+
5 hackathons
=
up to 10 opportunities
```

If fewer opportunities are available for a particular type, Route returns the available results rather than fabricating additional results.

This distribution behavior is implemented by the Search Service rather than individual providers.

---

# 14. Pagination Architecture

Route uses cursor-based pagination.

The MCP client receives an opaque Route cursor.

The client does not need to understand how individual providers paginate their results.

Conceptually:

```text
MCP Client
    │
    │ cursor
    ▼
Route Search Service
    │
    ▼
Route Cursor
    │
    ├── Remote OK cursor
    │
    └── Devpost cursor
```

A Route cursor contains the continuation state for the relevant providers.

For example:

```text
Route Cursor
├── remoteok:5
└── devpost:2
```

The cursor is encoded before being returned to the MCP client.

On the next request, Route decodes the cursor and passes each provider its own continuation state.

---

# 15. Provider Pagination

Different providers may paginate differently.

Route therefore does not require every provider to implement pagination in exactly the same way internally.

### Remote OK

The current Remote OK integration uses position-based pagination because the public feed does not provide a reliable native pagination mechanism suitable for Route's search requirements.

The provider:

1. Fetches the available feed.
2. Applies the relevant filters.
3. Normalizes matching opportunities.
4. Uses a position-based cursor.
5. Returns the next position as provider continuation state.

Conceptually:

```text
Remote OK feed
      │
      ▼
Filter
      │
      ▼
Matching opportunities
      │
      ▼
Position pagination
      │
      ▼
remoteok:5
```

### Devpost

Devpost provides native page-based pagination through its API.

Route preserves that provider-specific continuation state internally.

For example:

```text
devpost:2
```

represents continuation from a Devpost provider page.

The MCP client does not need to understand this format.

---

# 16. Cursor Responsibility

Cursor ownership is deliberately separated.

### Provider

The provider owns its provider-specific continuation mechanism.

For example:

```text
Remote OK → position
Devpost   → page
```

### Provider Manager

The Provider Manager carries the individual provider cursors between requests.

### Search Service

The Search Service combines the provider continuation state into a Route cursor.

### MCP Client

The MCP client treats the Route cursor as opaque.

This gives Route the ability to change provider pagination strategies without requiring clients to change their requests.

---

# 17. Deduplication

The Search Service performs Route-level deduplication before applying the final result limits.

Each opportunity has an internal Route identifier.

The current implementation uses the opportunity ID to identify duplicates within a search result set.

This prevents duplicate opportunities from being returned when multiple provider results overlap or when provider data contains duplicates.

---

# 18. Internal Identity vs External Resources

Route maintains an internal opportunity identity while also preserving the canonical URL of the original opportunity.

The important fields are:

```text
id
source
url
```

They serve different purposes.

### `id`

The Route-level identifier.

Examples include provider-qualified identifiers such as:

```text
remoteok:1137411
devpost:12345
```

The internal ID is useful for:

- deduplication
- future persistence
- saved opportunities
- internal references

### `source`

Identifies where the opportunity originated.

Examples:

```text
remoteok
devpost
```

### `url`

The canonical external resource associated with the opportunity.

The URL is preserved so that clients and future Route capabilities can reference the actual opportunity.

This distinction allows Route's internal identity to remain separate from the external source resource.

---

# 19. Route and External Agents

Route intentionally does not contain the reasoning layer of an AI assistant.

For example, if a user says:

```text
"Find me five remote AI jobs."
```

the connected agent determines that it needs to call:

```text
search_opportunities
```

Route performs the deterministic infrastructure work:

```text
Search providers
       ↓
Filter results
       ↓
Normalize data
       ↓
Apply Route search semantics
       ↓
Return structured opportunities
```

The agent then decides how to present or reason about those results.

This separation is fundamental to Route's architecture.

---

# 20. Deterministic Work vs Agent Reasoning

A core design principle is:

> **Deterministic work belongs in Route. Reasoning and generation belong in the agent.**

Route should handle predictable infrastructure operations such as:

- fetching provider data
- filtering
- normalization
- pagination
- deduplication
- structured retrieval
- state management as it is introduced

The connected agent should handle tasks such as:

- understanding user intent
- personalization
- comparing opportunities
- generating application materials
- deciding what preparation is useful
- conversational interaction
- higher-level automation

This keeps Route reusable across different AI systems.

---

# 21. Current Source Structure

The current MCP project follows this general structure:

```text
mcp/
├── package.json
├── tsconfig.json
│
└── src/
    ├── index.ts
    ├── test-client.ts
    │
    ├── server/
    │   ├── mcpServer.ts
    │   └── tools/
    │       ├── healthCheck.ts
    │       └── searchOpportunities.ts
    │
    └── opportunities/
        ├── types.ts
        ├── schema.ts
        ├── searchService.ts
        │
        └── providers/
            ├── types.ts
            ├── manager.ts
            ├── remoteOk.ts
            ├── devpost.ts
            ├── test-remoteOk.ts
            ├── test-devpost.ts
            └── test-manager.ts
```

The provider-specific test files are currently useful during development and verification.

As the project evolves, the testing structure may be reorganized if a more centralized testing strategy becomes appropriate.

---

# 22. Current Architecture Status

The following components are currently implemented and tested:

- TypeScript MCP server
- Official MCP SDK integration
- Streamable HTTP transport
- MCP client/server communication
- MCP session handling
- Tool registration
- Zod input validation
- Opportunity domain model
- Opportunity schemas
- Provider abstraction
- Remote OK provider
- Devpost provider
- Provider Manager
- Opportunity Search Service
- Provider-level pagination
- Route-level cursor handling
- Search filtering
- Result distribution by opportunity type
- Result deduplication
- `health_check`
- `search_opportunities`
- MCP end-to-end testing

The architecture will continue to evolve as additional capabilities are implemented.

---

# 23. Future Architecture

The long-term architecture is expected to expand beyond discovery.

Potential future components include:

```text
                    AI AGENT / APP
                          │
                          │ MCP
                          ▼
                   ┌─────────────┐
                   │    ROUTE    │
                   └──────┬──────┘
                          │
              ┌───────────┼───────────┐
              ▼           ▼           ▼
          Discovery     State      Actions
              │           │           │
              ▼           ▼           ▼
          Providers    DynamoDB    Workflows
```

Potential future capabilities include:

- `get_opportunity`
- `save_opportunity`
- saved opportunity retrieval
- user/session state
- `prepare_opportunity`
- opportunity preparation workflows
- opportunity action workflows
- additional opportunity categories
- additional providers
- production authentication
- Alexa+ integration

These are future capabilities and are not considered part of the current implemented architecture until they are built and tested.

---

# 24. Architectural Goals

Route's architecture is guided by the following goals.

### Agent Agnostic

Route should work with different MCP clients and AI systems.

### Provider Independent

External sources should remain behind provider implementations.

### Composable

Tools should perform focused operations that agents can combine into larger workflows.

### Deterministic

Infrastructure behavior should be predictable and testable.

### Extensible

New opportunity types, providers, tools, and integrations should be addable without unnecessary changes to existing components.

### Small Core

Route should avoid becoming a monolithic AI platform.

### Open Source

The architecture should remain understandable and extensible by external contributors.

---

# 25. Architectural Boundary

The most important boundary in Route is:

```text
┌─────────────────────────────────────────┐
│                 ROUTE                   │
│                                         │
│ Opportunity infrastructure              │
│ Provider integrations                   │
│ Normalization                           │
│ Search                                  │
│ Retrieval                               │
│ Pagination                              │
│ Persistent opportunity state (future)   │
│ Opportunity capabilities (future)       │
└───────────────────┬─────────────────────┘
                    │
                    │ MCP
                    ▼
┌─────────────────────────────────────────┐
│            CONNECTED AGENT              │
│                                         │
│ Reasoning                               │
│ Personalization                         │
│ Generation                              │
│ Conversation                            │
│ User interaction                        │
│ Automation                              │
└─────────────────────────────────────────┘
```

Keeping this boundary clear is important as Route grows.

Route should provide the infrastructure that agents need without becoming tightly coupled to the behavior of any particular agent.

---

## Summary

The current Route architecture is centered around a simple flow:

```text
MCP Client
    ↓
MCP Server
    ↓
MCP Tool
    ↓
Application Service
    ↓
Provider Manager
    ↓
Provider
    ↓
External Opportunity Source
```

The provider-specific data is normalized into a common opportunity model before being returned through MCP.

This architecture allows Route to provide a consistent opportunity interface while keeping external source implementations isolated and keeping AI reasoning outside the core system.

As Route grows, new capabilities should preserve this separation wherever practical.
