# ROUTE Capabilities

This document describes the capabilities currently implemented in ROUTE.

Update it when a track, provider, MCP tool, input schema, or output contract
changes. Verify changes against the running implementation before documenting
them as available.

## Current opportunity coverage

Current categories exposed by the search tool:

- Jobs
- Hackathons

Current providers identified in the codebase:

- RemoteOK
- Devpost

Do not assume every provider supports every filter or opportunity type.
Actual search results and provider behavior determine what can be retrieved.

## MCP tools

### `health_check`

Checks whether the ROUTE MCP server responds to a tool call.

A successful response verifies basic responsiveness, not the health of every
external provider or dependency.

### `search_opportunities`

Searches supported opportunities.

Inputs currently declared by the tool:

| Input     | Type                                   | Purpose              |
| --------- | -------------------------------------- | -------------------- |
| `keyword` | string, optional                       | Search keyword       |
| `type`    | `job`, `hackathon`, or `all`, optional | Opportunity category |
| `remote`  | boolean, optional                      | Remote-work filter   |
| `limit`   | positive integer, optional             | Result limit         |
| `cursor`  | string, optional                       | Pagination cursor    |

Inspect the returned data rather than assuming defaults or provider behavior
that has not been verified.

### `get_opportunity`

Retrieves a normalized opportunity using its URL.

Input:

- `url`: URL of the opportunity.

Use the returned record as the basis for subsequent evaluation. If retrieval
fails, report that failure instead of filling gaps with guesses.

### `prepare_opportunity`

Retrieves and organizes available context for an opportunity.

Input:

- `url`: URL of the opportunity.

Preparation may provide requirements, eligibility, dates, and submission
context, depending on the source and current implementation.

See [Preparation workflow](preparation.md).

### `save_opportunity`

Saves an opportunity for a ROUTE agent.

Inputs:

- `url`: Opportunity URL.
- `agentId`: Existing ROUTE agent identifier.
- `agentName`: Agent name used when an existing identifier is unavailable.

The input contract requires exactly one of `agentId` or `agentName`.

Inspect the actual result to determine whether the save succeeded and whether
the opportunity was already saved. Do not assume sharing, privacy, or retention
semantics that have not been established by the implementation.

## Adding tracks

When adding an opportunity track:

1. Identify its provider or providers.
2. Confirm the normalized opportunity contract can represent its data.
3. Verify search, retrieval, and preparation behavior for that track.
4. Document supported filters and source-specific limitations.
5. Add the track here only after its implementation is working.
6. Update examples and tests.

Do not treat a planned track as an implemented capability.

## Adding MCP tools

When adding a tool:

1. Inspect its registered name, description, input schema, and output contract.
2. Document its purpose and appropriate usage.
3. Explain how it fits into existing workflows.
4. Document error behavior and relevant limitations.
5. Add or update tests for the documented behavior.

The implementation is authoritative; this file is the agent-facing capability guide.
