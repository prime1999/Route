# Architecture Decisions

This document records important architectural decisions made during the development of Route.

The purpose is to preserve the reasoning behind the architecture so that future contributors can understand not only **how Route works**, but **why it was designed this way**.

Decisions may be updated or superseded as Route evolves, but changes should be intentional and documented.

---

## Decision Status

- **Accepted** — the decision is currently part of Route's architecture.
- **Superseded** — the decision was replaced by a newer decision.
- **Under Review** — the decision may change and is currently being reconsidered.

---

# ADR-001 — Route Is Opportunity Infrastructure, Not the AI Agent

**Status:** Accepted

## Decision

Route is an open-source opportunity infrastructure layer exposed through MCP.

Route is **not** the AI agent.

The connected agent or application is responsible for:

- reasoning
- personalization
- conversation
- generation
- automation
- deciding how to use Route's capabilities

Route is responsible for providing structured opportunity infrastructure.

## Boundary

```text
                AI AGENT / APPLICATION

                ──────────────────────

                Reasoning
                Personalization
                Generation
                Automation
                User interaction

                        │

                        │ MCP

                        ▼

                       ROUTE

                ──────────────────────

                Opportunity discovery
                Retrieval
                Normalization
                Persistence
                Opportunity context
                Action-enabling infrastructure
```

## Why

Keeping this boundary allows Route to work with different AI clients instead of becoming tightly coupled to one agent, model, or interface.

Potential clients include:

- Alexa+
- Claude
- ChatGPT
- custom AI agents
- developer applications
- IDE agents
- other MCP-compatible clients

---

# ADR-002 — The MCP Server Is the Primary Product

**Status:** Accepted

## Decision

The Route MCP server is the actual product.

Any UI, demo application, or Alexa+ integration is built **on top of Route**, rather than defining Route itself.

## Why

The infrastructure should remain reusable independently of any particular interface.

This means a developer should be able to use Route without needing to use a Route-specific application.

## Consequence

The development order prioritizes:

1. MCP foundation
2. opportunity infrastructure
3. provider integrations
4. MCP tools
5. persistence
6. agent integration
7. demo/application experiences

The demo application must not distort the underlying MCP architecture.

---

# ADR-003 — Use MCP as Route's Primary Agent Interface

**Status:** Accepted

## Decision

Route exposes its capabilities through the Model Context Protocol.

The initial transport is **Streamable HTTP**.

The MCP implementation uses the official `@modelcontextprotocol/sdk`.

## Why

MCP provides a standardized interface through which different AI clients can discover and invoke Route's capabilities.

This supports Route's agent-agnostic architecture.

## Consequence

Route tools should be designed as reusable capabilities rather than as UI-specific operations.

## MCP Foundation Verification

The current Route MCP foundation has been verified through the local MCP client over Streamable HTTP. The installed `@modelcontextprotocol/sdk` version is `1.30.0`, and its public type definitions expose:

```ts
LATEST_PROTOCOL_VERSION = "2025-11-25";
```

The Route server uses `StreamableHTTPServerTransport` and currently exposes the local development endpoint at:

```text
http://localhost:3005/mcp
```

The integration test successfully completed the initialization handshake, verified server information and capabilities, discovered `health_check`, `search_opportunities`, and `get_opportunity`, and executed all three tools. It also verified normalized search results, Remote OK and Devpost retrieval through `get_opportunity`, and safe handling of unsupported URLs.

This verifies MCP protocol compliance for the current foundation against protocol version `2025-11-25` or later over Streamable HTTP. It does not verify Alexa+ remote integration. Alexa+ has not yet been tested against Route.

The next step is to expose the local MCP server through a publicly reachable HTTPS endpoint and test that endpoint with Alexa+.

---

# ADR-004 — Use a Provider Abstraction

**Status:** Accepted

## Decision

External opportunity sources are integrated through a common provider interface.

Conceptually:

```text
                 Route

                   │

             Provider Manager

              /          \

             ▼            ▼

        Remote OK      Devpost

             │            │

             ▼            ▼

          Provider-specific

          retrieval logic
```

Each provider is responsible for:

- communicating with its external source
- filtering provider data
- normalizing provider data into Route's model
- handling provider-specific pagination
- implementing provider-specific retrieval

The rest of Route should not depend directly on provider-specific response formats.

## Why

External sources have different:

- APIs
- data structures
- pagination mechanisms
- URL formats
- availability characteristics

The provider boundary isolates those differences.

## Consequence

Adding another opportunity source should generally involve implementing a new provider rather than rewriting the core search system.

---

# ADR-005 — Normalize External Data Into a Common Opportunity Model

**Status:** Accepted

## Decision

Route converts provider-specific data into a common `Opportunity` representation.

The current model supports:

```text
job

hackathon
```

and contains common fields such as:

- `id`
- `title`
- `type`
- `organization`
- `description`
- `url`
- `source`
- `sourceUrl`
- `location`
- `remote`
- `deadline`
- `prize`
- `metadata`

## Why

Consumers should not need to understand the response format of every opportunity provider.

Normalization allows MCP tools and future agents to operate against one consistent model.

---

# ADR-006 — Search `all` Uses a Per-Type Limit

**Status:** Accepted

## Decision

When:

```json
{
  "type": "all",
  "limit": 5
}
```

is requested, `limit` applies independently to each currently supported opportunity type.

With the current two types, this can return:

```text
5 jobs

+

5 hackathons

=

up to 10 opportunities
```

If a category contains fewer matching opportunities, Route returns the available results instead of fabricating additional results.

## Why

Without this rule, one opportunity type could consume the entire result limit.

The current behavior ensures that `all` actually represents the supported opportunity categories rather than effectively becoming a search over whichever provider happens to return the most results.

## Future

As Route adds more opportunity types, the same conceptual model can extend:

```text
all

├── jobs → limit

├── hackathons → limit

├── scholarships → limit

├── grants → limit

└── ...
```

---

# ADR-007 — Route Uses Opaque Cursors

**Status:** Accepted

## Decision

Pagination cursors exposed through the MCP interface are opaque to clients.

Clients should return the cursor exactly as Route provides it.

Route internally stores provider continuation state inside the cursor.

Conceptually:

```text
MCP client

    │

    │ opaque cursor

    ▼

Route

    │

    ├── Remote OK cursor

    └── Devpost cursor
```

## Why

Different providers use different pagination strategies.

For example:

- Devpost uses page-based pagination.
- Remote OK currently uses Route-controlled position pagination.

The MCP client should not need to understand these implementation details.

## Consequence

The internal cursor representation may change without changing the public search interface.

---

# ADR-008 — Do Not Use Returned-ID Accumulation for Pagination

**Status:** Accepted

## Decision

Route does not build pagination by storing every previously returned opportunity ID and filtering those IDs out on subsequent requests.

Instead, providers expose coherent continuation state.

## Why

ID accumulation creates several problems:

- growing cursor size
- unnecessary state
- more complicated provider behavior
- potential performance problems
- coupling pagination to returned records

A continuation cursor is a cleaner abstraction.

## Current Examples

Remote OK uses a position-based cursor:

```text
remoteok:5

remoteok:10

remoteok:15
```

Devpost uses a page-based cursor:

```text
devpost:2

devpost:3

devpost:4
```

Route combines provider cursors into its opaque Route cursor.

---

# ADR-009 — `get_opportunity` Uses the Canonical Opportunity URL

**Status:** Accepted

## Decision

The MCP-facing `get_opportunity` operation accepts the opportunity's canonical URL:

```json
{
  "url": "https://example.com/opportunity"
}
```

It will not require the agent to provide:

```json
{
  "id": "...",
  "source": "..."
}
```

The canonical URL is already exposed as part of the normalized `Opportunity` model.

At the provider layer, direct retrieval is implemented through:

```ts
getByUrl(url: string): Promise<Opportunity | null>;
```

Each provider is responsible for resolving and normalizing an opportunity from its own supported URL structure.

The Provider Manager determines which registered provider owns a URL through `canHandleUrl()` and delegates retrieval to that provider through `getByUrl()`.

## Why

Every normalized opportunity returned by `search_opportunities` already contains a canonical `url`.

Using that URL allows Route to retrieve the exact opportunity resource directly.

The alternative of receiving an ID and then scanning a large provider dataset to locate that opportunity is less direct and unnecessarily couples retrieval to provider search behavior.

## Current Implementation State

The provider-level portion of this decision has been implemented and tested.

Currently:

```text
Opportunity URL

      │

      ▼

Provider

      │

      ▼

getByUrl()

      │

      ▼

Normalized Opportunity
```

Remote OK and Devpost both implement provider-level URL retrieval.

The Provider Manager also implements URL ownership resolution and delegation. Manager-level tests cover Remote OK retrieval, Devpost retrieval, and an unsupported URL returning `null`.

The `OpportunityService` provides the application-level retrieval boundary. It accepts the canonical URL and delegates to the Provider Manager without containing provider-specific URL or parsing logic. Integration tests cover the same Remote OK, Devpost, and unsupported URL flow through the service.

The MCP-facing tool is now implemented and tested through the Route MCP client. It:

- accepts an opportunity URL
- delegates through `OpportunityService` and the Provider Manager
- returns normalized opportunities for supported Remote OK and Devpost URLs
- returns a controlled response for unsupported URLs

Therefore, the architectural decision and the complete MCP-facing retrieval capability are implemented and tested.

---

# ADR-010 — Internal ID and External URL Have Different Responsibilities

**Status:** Accepted

## Decision

Route keeps both an internal opportunity ID and an external canonical URL.

They serve different purposes.

### `id`

The Route ID is used for internal identity.

Examples:

```text
remoteok:1137411

devpost:12345
```

It can be used for:

- deduplication
- internal references
- future persistence
- saved opportunity records
- internal provider logic

### `url`

The canonical URL identifies the external opportunity resource.

It is used for:

- retrieving the exact opportunity
- linking users to the original opportunity
- provider URL resolution
- future action workflows

## Why

Internal identity and external retrieval are separate concerns.

Keeping them separate gives Route flexibility to change internal identity mechanisms without changing the external resource reference.

---

# ADR-011 — Deterministic Work Belongs in Route

**Status:** Accepted

## Decision

Route should perform deterministic infrastructure work whenever practical.

Examples include:

- provider selection
- provider communication
- filtering
- normalization
- pagination
- deduplication
- opportunity retrieval
- persistence

Reasoning-heavy tasks remain with the connected agent.

## Why

Route should provide reliable infrastructure rather than attempting to become another general-purpose reasoning layer.

This keeps the MCP server predictable and reusable.

---

# ADR-012 — Do Not Add Agent Orchestration to the MCP Core

**Status:** Accepted

## Decision

AWS Strands Agents and Amazon Bedrock may be used by Route's agent/application layer, but they are not dependencies of the core MCP server.

Conceptually:

```text
                AI AGENT

                   │

             Strands / Bedrock

                   │

                   │ MCP

                   ▼

             Route MCP Server

                   │

            Opportunity Providers
```

## Why

Route must remain usable by any MCP-compatible client.

Making Strands or Bedrock a core dependency would unnecessarily couple the infrastructure to one agent implementation.

## Consequence

Agent orchestration should be added around Route rather than inside the core opportunity infrastructure.

---

# ADR-013 — MVP Starts With Jobs and Hackathons

**Status:** Accepted

## Decision

The initial Route MVP supports:

- jobs
- hackathons

Other opportunity categories are part of the long-term vision but are not part of the initial implementation.

Planned future categories include:

- scholarships
- fellowships
- grants
- internships
- accelerators
- events
- freelance opportunities

## Why

The provider and MCP architecture should be designed to support additional types, but implementing every category before validating the core architecture would increase complexity prematurely.

## Consequence

The current domain model, Provider Manager, and Search Service should support extension without requiring unnecessary abstractions for unsupported categories.

---

# ADR-014 — Persist Lightweight Opportunity References and Agent Relationships

**Status:** Accepted

## Decision

Route uses DynamoDB for the implemented `save_opportunity` persistence flow.

`ROUTE_Opportunities` stores one lightweight canonical opportunity reference per `opportunityId`. `ROUTE_AgentOpportunities` stores agent-opportunity relationships using `agentId` as the partition key and `opportunityId` as the sort key.

The full normalized opportunity is not duplicated in these tables. Providers remain responsible for retrieving and normalizing opportunity details. The same canonical opportunity can be associated with multiple agent IDs while retaining one canonical opportunity reference.

Saving the same opportunity under the same agent ID is idempotent. The store conditionally creates the relationship; a duplicate returns the existing relationship with `alreadySaved: true` and its original `savedAt` value.

Route accepts an existing `agentId`, or generates one when the current caller supplies an `agentName` without an ID. The returned ID is the stable identity the consuming application must retain and reuse. Route does not require an agent registry, manage the caller's agent lifecycle, infer identity when the ID is omitted, authenticate the caller, or establish caller ownership.

The implemented service flow is:

```text
MCP save_opportunity

 ↓

OpportunityService

 ↓

Provider Manager

 ↓

OpportunityStore

 ↓

DynamoDB
```

## Why

Keeping canonical opportunity data separate from agent relationships avoids duplicating provider-owned opportunity details and permits one opportunity to be saved by multiple agent identities.

## Consequence

Route provides saved relationships and lightweight references. The consuming application decides how to retain the returned agent ID, organize saved opportunities, and present them to users.

The current implementation depends on DynamoDB for the default store. Persistence failures propagate through the service and MCP tool rather than being represented as successful saves.

Service-level and store-level tests verify saving, duplicate detection, and relationship retrieval. The existing MCP client integration test does not yet execute `save_opportunity`.

---

# ADR-015 — Response and Error Contracts Should Be Derived From Live Testing

**Status:** Accepted

## Decision

Route will not prematurely define a detailed public response/error contract based solely on assumptions.

Instead:

```text
Build

  ↓

Test

  ↓

Observe real responses/errors

  ↓

Decide contract

  ↓

Document
```

## Why

MCP SDK behavior, provider failures, validation errors, network failures, and tool execution errors should be observed in actual operation before being formalized as public behavior.

This avoids documenting an idealized contract that does not match the real implementation.

## Consequence

Detailed response and error documentation will be added after live MCP testing provides enough evidence to establish a stable contract.

---

# ADR-016 — Build, Test, Decide, Document, Commit

**Status:** Accepted

## Decision

Route development follows:

```text
Build

  ↓

Test

  ↓

Decide

  ↓

Document

  ↓

Commit

  ↓

Next feature
```

## Why

Route is intended to be an open-source project that other developers can understand and contribute to.

Documentation should therefore reflect verified behavior and intentional decisions rather than being written independently from implementation.

## Consequence

Significant architectural decisions should be recorded after they are validated.

Documentation is considered part of implementation, not a final cleanup step.

---

# ADR-017 — The Demo Application Must Not Define Route's Architecture

**Status:** Accepted

## Decision

The future Route demo/application exists to demonstrate how Route can be used.

It must not become the architectural source of truth for the MCP server.

The application may provide:

- user interaction
- voice interaction
- visualization
- personalization
- agent reasoning
- automation

Route remains the underlying opportunity infrastructure.

## Why

A demo application is only one possible consumer of Route.

The same MCP server should remain usable by other clients and applications.

---

# Decision Review

Architecture decisions are not immutable.

When implementation, testing, or new requirements reveal that a decision should change:

1. Identify the existing decision.
2. Explain the reason for reconsidering it.
3. Test the alternative.
4. Update or supersede the decision.
5. Update affected documentation.
6. Record the new decision.

This keeps the architecture intentional while allowing Route to evolve.

---

## Current Architectural Principle

The central architectural boundary remains:

> **Route provides the opportunity infrastructure. The connected AI agent or application provides the reasoning, experience, and automation.**

Route should remain:

- open source
- agent-agnostic
- provider-independent
- MCP-first
- composable
- extensible
- focused on opportunity infrastructure
