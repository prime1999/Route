# Route Terminology

Use these terms consistently across Route documentation.

## Route

**Route** is the product/project name.

Do not refer to it as:

- Route AI
- Route Agent
- Route chatbot
- Route career coach

unless discussing a separate future product explicitly using that name.

---

## Opportunity

An **Opportunity** is Route's normalized representation of an external opportunity.

Current types:

- `job`
- `hackathon`

---

## Provider

A **Provider** is a source-specific integration responsible for retrieving and normalizing opportunities from an external source.

Examples:

- `RemoteOkProvider`
- `DevpostProvider`

---

## Provider Manager

The **Provider Manager** coordinates multiple providers.

It handles:

- provider selection
- provider search coordination
- result combination
- provider cursor coordination
- URL ownership resolution

It does not own source-specific parsing logic.

---

## Opportunity Search Service

The **Opportunity Search Service** provides Route's application-level search behavior.

It handles user-facing search semantics such as:

- limits
- supported opportunity types
- result distribution
- deduplication
- Route cursor encoding

---

## `canHandleUrl`

`canHandleUrl()` determines whether a provider recognizes a URL as belonging to its source.

It should be:

- deterministic
- cheap
- local
- network-free

It does not retrieve the opportunity.

---

## `getByUrl`

`getByUrl()` retrieves an opportunity from a provider using its source URL.

The provider is responsible for:

- source retrieval
- source-specific parsing
- normalization

---

## MCP

**MCP** means Model Context Protocol.

Route exposes its capabilities through MCP tools.

---

## MCP Server

The **Route MCP server** is the actual product interface for connected AI agents and applications.

---

## AI Agent / Application

The connected AI agent/application is the consumer of Route.

It is responsible for reasoning, personalization, generation, conversation, and automation.

Do not describe the agent as part of Route's deterministic provider infrastructure.

---

## Normalization

**Normalization** means converting provider-specific source data into Route's common `Opportunity` model.

---

## Source

`source` identifies the provider/source associated with an opportunity.

Examples:

- `remoteok`
- `devpost`

It is an internal normalized field and should not automatically be treated as the public retrieval key.

---

## URL

The opportunity's `url` is the canonical source URL used for direct retrieval.

The MCP-facing `get_opportunity` contract uses the URL rather than exposing provider-specific retrieval internals.

---

## Cursor

A **cursor** is opaque continuation state used for pagination.

Clients should not need to interpret its internal structure.

Provider cursors may contain source-specific state.

---

## Agent-Agnostic

Route is **agent-agnostic** because it does not depend on one specific AI agent or interface.

Alexa+, Claude, ChatGPT, custom agents, and other MCP clients can consume the same Route infrastructure.

---

## Deterministic vs Reasoning

### Route / deterministic infrastructure

Responsible for:

- retrieval
- normalization
- filtering
- pagination
- persistence
- structured context

### Connected agent

Responsible for:

- reasoning
- interpretation
- personalization
- generation
- automation
- conversation

Keep this boundary explicit in technical documentation.
