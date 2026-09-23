# Route Documentation

Welcome to the technical documentation for **Route**.

Route is an open-source MCP server that provides a structured opportunity layer for AI agents and applications.

This documentation explains how Route is built, how its components interact, how its MCP tools behave, and how developers can extend the system.

---

## Documentation

### Architecture

Understand the internal architecture of Route and how its components interact.

- [Architecture](./architecture.md)

This covers:

- System architecture
- Application layers
- Opportunity flow
- Provider Manager
- Search Service
- Data flow between components
- Separation between Route and connected AI agents

---

### MCP

Learn how Route exposes its capabilities through the Model Context Protocol.

- [MCP](./mcp.md)

This covers:

- MCP server
- Streamable HTTP
- MCP sessions
- Tool registration
- MCP clients
- Local development and testing

---

### Opportunities

Learn how Route represents and searches opportunities.

- [Opportunities](./opportunities.md)

This covers:

- Opportunity data model
- Opportunity types
- Normalization
- Search semantics
- Filtering
- Pagination
- Cursors

---

### Providers

Learn how external opportunity sources are integrated into Route.

- [Providers](./providers.md)

This covers:

- Provider architecture
- Provider interface
- Provider Manager
- Provider responsibilities
- Adding new providers
- Provider-specific pagination and normalization

Current providers:

- Remote OK
- Devpost

---

## MCP Tools

Documentation for individual Route MCP tools.

### `health_check`

Checks whether the Route MCP server is running and able to respond to tool calls.

- [Health Check](./tools/health-check.md)

### `search_opportunities`

Searches Route's supported opportunity sources for jobs and hackathons.

- [Search Opportunities](./tools/search-opportunities.md)

Additional tools will be documented here as they are implemented.

Planned tools include:

- `get_opportunity`
- `save_opportunity`
- `prepare_opportunity`
- `list_saved_opportunities`

---

## Architecture Decisions

Important architectural decisions are recorded separately from the implementation documentation.

- [Architecture Decisions](./decisions/architecture-decisions.md)

These records explain why Route was designed in a particular way and help contributors understand decisions that should not be changed accidentally.

---

## Current Implementation

The documentation reflects the implementation that has been built and tested.

Currently implemented:

- TypeScript MCP server
- Streamable HTTP transport
- MCP client/server communication
- MCP session handling
- Tool registration
- `health_check`
- `search_opportunities`
- Opportunity domain model
- Zod schemas
- Provider abstraction
- Remote OK provider
- Devpost provider
- Provider Manager
- Opportunity Search Service
- Provider-level pagination
- Route-level cursor handling
- MCP integration testing

Additional capabilities will be documented as they are implemented and verified.

---

## Documentation Philosophy

Route's documentation follows the same incremental approach as the project itself:

```text
Build
  ↓
Test
  ↓
Lock the decision
  ↓
Document
  ↓
Commit
  ↓
Continue
```

Documentation should describe **actual system behavior**, not assumptions about how the system might eventually work.

Long-term product ideas may be documented as future architecture or roadmap items, but implemented behavior should only be documented after it has been built and tested.

---

## Contributing

If you are contributing to Route, start with:

1. [Architecture](./architecture.md)
2. [MCP](./mcp.md)
3. [Providers](./providers.md)
4. [Opportunities](./opportunities.md)
5. [Architecture Decisions](./decisions/architecture-decisions.md)

Tool-specific documentation should be consulted when working on individual MCP tools.

As Route grows, this documentation will become the foundation for the project's public documentation site.
