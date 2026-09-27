# `search_opportunities`

`search_opportunities` is the primary Route MCP tool for discovering opportunities.

It allows an MCP client or AI agent to search Route's supported opportunity sources without needing to understand the underlying providers.

The tool currently searches:

- Jobs through Remote OK
- Hackathons through Devpost

---

## 1. Purpose

The purpose of `search_opportunities` is to provide a single interface for opportunity discovery.

Instead of an agent needing separate tools such as:

```text
search_remoteok_jobs
search_devpost_hackathons
```

it can use:

```text
search_opportunities
```

Route handles provider selection, filtering, normalization, pagination, and result distribution internally.

---

# 2. Tool Input

The current input schema is:

```ts
{
  keyword?: string;
  type?: "job" | "hackathon" | "all";
  remote?: boolean;
  limit?: number;
  cursor?: string;
}
```

All fields are optional.

If no `limit` is provided, Route currently defaults to:

```text
5
```

---

# 3. `keyword`

`keyword` is a free-form search term.

Examples:

```text
AI
backend
Rust
machine learning
software engineer
```

It is not restricted to a predefined list.

The keyword is passed through the Route search system and providers determine which source fields are relevant for matching.

Depending on the provider, matching may include fields such as:

- title
- organization
- description
- tags
- themes

For example:

```json
{
  "keyword": "AI"
}
```

may return both AI-related jobs and AI-related hackathons.

---

# 4. `type`

`type` controls which opportunity categories are searched.

Supported values are:

```text
job
hackathon
all
```

### `job`

Search only job opportunities.

```json
{
  "type": "job"
}
```

### `hackathon`

Search only hackathons.

```json
{
  "type": "hackathon"
}
```

### `all`

Search all currently supported opportunity types.

```json
{
  "type": "all"
}
```

With the current implementation, `all` searches both:

```text
jobs
hackathons
```

Future opportunity types can be added without changing the fundamental purpose of the tool.

---

# 5. `remote`

`remote` filters opportunities based on their remote status.

Example:

```json
{
  "type": "job",
  "remote": true
}
```

This asks Route to return remote jobs where the provider can determine that the opportunity is remote.

The exact implementation is provider-specific because different external sources represent remote availability differently.

---

# 6. `limit`

`limit` controls the maximum number of results requested.

The default is:

```text
5
```

Route normalizes the supplied value to a positive integer.

For a specific type:

```json
{
  "type": "job",
  "limit": 5
}
```

means:

```text
up to 5 jobs
```

For:

```json
{
  "type": "hackathon",
  "limit": 5
}
```

the result is:

```text
up to 5 hackathons
```

---

# 7. `all` Limit Behavior

The `limit` behavior is different when:

```text
type = all
```

The limit applies **per supported opportunity type**.

For example:

```json
{
  "type": "all",
  "limit": 5
}
```

currently means:

```text
up to 5 jobs
+
up to 5 hackathons
```

Therefore the response may contain up to:

```text
10 opportunities
```

This prevents one opportunity category from consuming the entire result set.

The distribution behavior is controlled by the Opportunity Search Service, not individual providers.

---

# 8. Fewer Results

`limit` is a maximum, not a guarantee.

For example:

```json
{
  "type": "hackathon",
  "limit": 5
}
```

may return fewer than five opportunities if fewer matching results are available.

Route does not fabricate or duplicate opportunities to satisfy the requested limit.

---

# 9. `cursor`

`cursor` is used to continue a previous search.

The first request does not normally contain a cursor:

```json
{
  "type": "job",
  "limit": 5
}
```

The response may contain a `nextCursor`.

The client can then pass that value into the next request:

```json
{
  "type": "job",
  "limit": 5,
  "cursor": "<previous-next-cursor>"
}
```

The cursor should be treated as opaque.

Clients should:

- store it
- pass it back unchanged
- not decode it
- not modify it
- not construct provider-specific cursors

---

# 10. Pagination Across Providers

Route may search multiple providers during a single request.

For example:

```text
type = all
```

currently involves:

```text
Remote OK
Devpost
```

Each provider can have its own continuation state.

Conceptually:

```text
Route Cursor
│
├── Remote OK cursor
│
└── Devpost cursor
```

Route combines this state into one opaque cursor for the MCP client.

This means the client does not need to understand how Remote OK or Devpost paginate their data.

---

# 11. Example: Basic Search

A client can request:

```json
{
  "type": "job",
  "keyword": "backend",
  "limit": 5
}
```

The request flows through:

```text
search_opportunities
        │
        ▼
Opportunity Search Service
        │
        ▼
Provider Manager
        │
        ▼
Remote OK
        │
        ▼
Normalized Opportunities
```

The resulting opportunities are returned through the MCP tool.

---

# 12. Example: Remote AI Jobs

A client can search:

```json
{
  "type": "job",
  "keyword": "AI",
  "remote": true,
  "limit": 5
}
```

The provider applies the relevant filtering and returns normalized Route opportunities.

The client does not need to know how Remote OK represents:

- job tags
- remote status
- company information
- salary information
- publication timestamps

Those details are handled by the provider.

---

# 13. Example: Hackathons

A client can request:

```json
{
  "type": "hackathon",
  "keyword": "AI",
  "limit": 5
}
```

The Provider Manager selects the Devpost provider because it supports:

```text
hackathon
```

The Devpost provider retrieves and normalizes matching hackathons.

---

# 14. Example: All Opportunities

A client can request:

```json
{
  "type": "all",
  "keyword": "AI",
  "limit": 5
}
```

The current search flow is approximately:

```text
                    Search
                      │
                      ▼
                Provider Manager
                 /            \
                ▼              ▼
           Remote OK         Devpost
             jobs           hackathons
                │              │
                └──────┬───────┘
                       ▼
                 Search Service
                       │
                 ┌─────┴─────┐
                 ▼           ▼
               Jobs      Hackathons
                 │           │
                 └─────┬─────┘
                       ▼
                 Final results
```

The Search Service applies the `limit` per supported type.

---

# 15. Response

The tool currently returns the search result through an MCP text content block.

The underlying application result has the shape:

```ts
interface OpportunitySearchResult {
  opportunities: Opportunity[];
  nextCursor?: string;
}
```

The `opportunities` array contains normalized Route opportunities.

The `nextCursor` is present when Route determines that more results can be requested.

The exact externally documented response/error contract will continue to be refined through live MCP testing.

---

# 16. Opportunity Result

Each opportunity follows the normalized Route model.

A result contains fields such as:

```text
id
title
type
organization
description
url
source
sourceUrl
location?
remote?
deadline?
prize?
metadata?
```

Example conceptually:

```json
{
  "id": "remoteok:1137411",
  "title": "Example Job",
  "type": "job",
  "organization": "Example Company",
  "description": "Example description",
  "url": "https://remoteok.com/...",
  "source": "remoteok",
  "sourceUrl": "https://remoteok.com/api",
  "remote": true
}
```

The exact values depend on the external provider.

---

# 17. Provider Independence

The MCP client does not need to know which provider supplies an opportunity before searching.

For example:

```text
search_opportunities
        │
        ▼
       Route
        │
   ┌────┴─────┐
   ▼          ▼
Remote OK   Devpost
```

Route handles provider selection internally.

This allows new opportunity providers to be added without creating a new MCP search tool for each provider.

---

# 18. Tool Responsibilities

`search_opportunities` is intentionally focused on **discovery**.

The tool is responsible for:

- accepting search criteria
- validating input
- selecting the appropriate providers
- retrieving opportunities
- normalizing provider data
- applying search semantics
- handling pagination
- returning normalized opportunities

It is not responsible for:

- AI reasoning
- personalized recommendations
- generating application material
- saving opportunities
- applying to opportunities
- browser automation

Those capabilities belong to other Route services or the connected agent/application.

---

# 19. Search Flow

The complete current flow is:

```text
MCP Client
    │
    │ search_opportunities
    ▼
MCP Tool
    │
    │ validated input
    ▼
Opportunity Search Service
    │
    ▼
Provider Manager
    │
    ├──────────────┐
    ▼              ▼
Remote OK       Devpost
    │              │
    ▼              ▼
Provider filtering
    │              │
    ▼              ▼
Normalization
    │              │
    └──────┬───────┘
           ▼
      Search Service
           │
           ├── Deduplication
           ├── Result distribution
           └── Cursor creation
           │
           ▼
       MCP Response
```

---

# 20. Current Provider Support

| Opportunity Type | Provider  | Supported |
| ---------------- | --------- | --------- |
| Job              | Remote OK | Yes       |
| Hackathon        | Devpost   | Yes       |
| Scholarship      | —         | Not yet   |
| Fellowship       | —         | Not yet   |
| Grant            | —         | Not yet   |
| Internship       | —         | Not yet   |

The table reflects the current implementation and should be updated when new providers are actually added.

---

# 21. Testing

`search_opportunities` has been tested through multiple layers.

### Search Service

Tests currently cover:

- job searches
- hackathon searches
- `all` searches
- result limits
- pagination
- cursor continuation
- duplicate prevention
- fewer-than-requested results

### Provider Manager

Tests cover:

- provider selection
- job searches
- hackathon searches
- searches across all providers
- provider cursors
- registered providers

### MCP

The development MCP client verifies that:

- the server can be reached
- the tool is registered
- the tool can be called
- search results can be returned
- the returned data can be parsed
- the pagination cursor can be received

---

# 22. Important Design Decisions

### One search tool

Route exposes one opportunity search capability rather than one MCP tool per provider.

### Provider abstraction

Provider-specific logic remains inside provider implementations.

### Free-form keywords

Keywords are not restricted to a predefined enum.

### Per-type limits for `all`

`limit: 5` with `type: "all"` currently means up to five results for each supported type.

### Opaque cursors

Clients do not need to understand provider pagination.

### Normalized results

All providers return the same Route opportunity model.

### No artificial results

Route returns fewer results when fewer matching opportunities exist.

---

# 23. Future Changes

The tool will evolve as Route's opportunity infrastructure expands.

Potential future additions include:

- more opportunity types
- more providers
- richer filters
- additional search parameters
- improved ranking/relevance
- personalized search
- geographic filtering
- additional pagination improvements

These should be introduced only when the underlying behavior has been implemented and tested.

---

# 24. Related Documentation

For the domain model:

- [Opportunities](../opportunities.md)

For provider architecture:

- [Providers](../providers.md)

For the overall MCP implementation:

- [MCP](../mcp.md)

For the overall system architecture:

- [Architecture](../architecture.md)

---

## Summary

`search_opportunities` provides Route's current MCP discovery interface.

It intentionally hides provider-specific implementation details behind a single normalized search contract:

```text
MCP Client
    │
    ▼
search_opportunities
    │
    ▼
Search Service
    │
    ▼
Provider Manager
    │
    ├── Remote OK
    └── Devpost
    │
    ▼
Normalized Opportunities
```

The result is an agent-agnostic search capability that can grow as Route adds more opportunity sources and opportunity types.
