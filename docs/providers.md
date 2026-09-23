# Route Providers

Providers are the external data-source layer of Route.

A provider connects Route to an external opportunity source, retrieves its data, filters it according to Route's search request, and normalizes the result into Route's common `Opportunity` model.

Providers allow Route to support multiple opportunity sources without coupling the rest of the application to provider-specific APIs.

---

## 1. Provider Architecture

The provider layer sits below the application services.

```text id="3y5y0f"
                    MCP
                     │
                     ▼
              Application Service
                     │
                     ▼
              Provider Manager
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
    Remote OK Provider    Devpost Provider
          │                     │
          ▼                     ▼
     Remote OK API          Devpost API
```

The rest of Route does not directly communicate with Remote OK or Devpost.

Instead, requests flow through the Provider Manager.

---

# 2. Why Providers Exist

External opportunity sources differ significantly.

They may have different:

- APIs
- response formats
- field names
- pagination mechanisms
- filtering capabilities
- identifiers
- URL structures
- metadata
- availability
- error behavior

Route should not expose those differences to the MCP layer or application services.

Instead:

```text id="9w8h1c"
Provider-specific data
        │
        ▼
Provider implementation
        │
        ▼
Normalized Opportunity
        │
        ▼
Route application
```

This creates a stable internal abstraction around external sources.

---

# 3. Provider Interface

Providers implement the common `OpportunityProvider` interface.

The current interface is:

```ts id="9j1c9q"
export interface OpportunityProvider {
  readonly name: string;
  readonly supportedTypes: readonly OpportunityType[];

  search(params: OpportunitySearchParams): Promise<OpportunityProviderResult>;
}
```

The provider interface currently defines the common information Route needs to search a source.

### `name`

Identifies the provider internally.

Current examples:

```text id="zv5f87"
remoteok
devpost
```

### `supportedTypes`

Defines the opportunity types the provider can return.

For example:

```text id="x6tq4b"
Remote OK
→ job

Devpost
→ hackathon
```

This allows the Provider Manager to avoid sending unsupported opportunity types to a provider.

### `search()`

Performs provider-specific discovery and returns normalized opportunities.

The provider is responsible for translating its external data into Route's opportunity model.

---

# 4. Provider Results

Providers return:

```ts id="m4i7a0"
export interface OpportunityProviderResult {
  opportunities: Opportunity[];
  nextCursor?: string;
}
```

The provider therefore returns two things:

1. Normalized opportunities.
2. An optional provider-specific continuation cursor.

The cursor is later managed by the Provider Manager and Search Service.

---

# 5. Provider Responsibilities

A provider is responsible for:

```text id="5d4p5s"
Fetch external data
       ↓
Validate/interpret source data
       ↓
Apply provider-level filtering
       ↓
Normalize data
       ↓
Apply provider pagination
       ↓
Return opportunities + cursor
```

A provider should **not** be responsible for:

- MCP communication
- MCP tool registration
- user conversation state
- AI reasoning
- final `all` distribution semantics
- saved opportunity persistence
- agent interaction

Those responsibilities belong to other layers.

---

# 6. Provider Manager

The Provider Manager coordinates registered providers.

Current file:

```text id="8i8y6b"
src/opportunities/providers/manager.ts
```

Its responsibilities are:

- maintain registered providers
- select providers for a search
- pass requests to providers
- pass each provider its own cursor
- combine provider results
- return provider cursors to the Search Service

Conceptually:

```text id="b2r8f7"
Search Service
      │
      ▼
Provider Manager
      │
      ├── Remote OK
      │
      └── Devpost
```

---

# 7. Provider Selection

When a search specifies a particular type, the Provider Manager selects providers that support that type.

For example:

```text id="l4tq9b"
type = job
```

results in:

```text id="a7y2cx"
Remote OK
```

while:

```text id="8v7t5e"
type = hackathon
```

results in:

```text id="d9r4p3"
Devpost
```

For:

```text id="q8h2wk"
type = all
```

all currently registered providers are selected.

This keeps provider selection centralized rather than requiring individual tools to understand which sources support which opportunity types.

---

# 8. Provider Independence

Each provider is independently responsible for its external source.

For example:

```text id="g1f8s5"
RemoteOkProvider
      │
      └── Remote OK API

DevpostProvider
      │
      └── Devpost API
```

A change to one provider should not require unrelated provider implementations to change.

This is particularly important because external APIs can change independently.

---

# 9. Remote OK Provider

The Remote OK provider is located at:

```text id="j0q7u2"
src/opportunities/providers/remoteOk.ts
```

It supports:

```text id="6n8x1f"
job
```

The provider uses Remote OK's public API:

```text id="8c2x5p"
https://remoteok.com/api
```

The provider uses native `fetch` rather than requiring a dedicated SDK.

---

# 10. Remote OK Data Flow

The Remote OK provider follows this general flow:

```text id="1h6r4m"
Remote OK API
      │
      ▼
Raw job feed
      │
      ▼
Keyword filtering
      │
      ▼
Remote filtering
      │
      ▼
Normalization
      │
      ▼
Position pagination
      │
      ▼
OpportunityProviderResult
```

The provider only returns jobs.

---

# 11. Remote OK Filtering

Keyword searches are performed against relevant Remote OK fields.

The provider can use fields such as:

- title
- organization/company
- description
- tags

This allows a query such as:

```text id="c2z1q8"
keyword = "AI"
```

to match relevant jobs without requiring Route to define a fixed list of supported keywords.

---

# 12. Remote Filtering

Remote OK opportunities can also be filtered using the `remote` parameter.

For example:

```text id="m3v7w0"
remote = true
```

causes the provider to return matching remote jobs where the source data supports that determination.

Provider-specific filtering remains inside the provider because external sources can represent remote availability differently.

---

# 13. Remote OK Normalization

Remote OK data is transformed into Route's common `Opportunity` structure.

The provider creates Route-specific IDs using the provider namespace.

For example:

```text id="a7z9j2"
remoteok:1137411
```

The canonical opportunity URL is preserved separately.

Additional provider information is placed into `metadata`.

Examples include:

```text id="q8d2m1"
tags
applyUrl
publishedAt
epoch
logo
salaryMin
salaryMax
```

This allows Route to preserve useful information without making every provider-specific field part of the core opportunity model.

---

# 14. Remote OK Pagination

Remote OK's public feed does not provide the type of reliable native pagination Route requires for its filtered search behavior.

Route therefore uses position-based pagination.

The provider effectively performs:

```text id="8b4x0z"
Fetch feed
   ↓
Filter matching jobs
   ↓
Normalize matching jobs
   ↓
Apply starting position
   ↓
Return requested batch
```

A provider cursor can look conceptually like:

```text id="5x6q8h"
remoteok:5
```

meaning the next request should continue from the relevant position.

The implementation does not maintain a list of previously returned opportunity IDs.

This keeps the cursor compact and provider-specific.

---

# 15. Devpost Provider

The Devpost provider is located at:

```text id="4c7r2v"
src/opportunities/providers/devpost.ts
```

It supports:

```text id="1z5h9q"
hackathon
```

The provider uses Devpost's structured hackathon endpoint:

```text id="6v8p2s"
https://devpost.com/api/hackathons
```

This endpoint was identified by inspecting the network requests used by Devpost's own web experience.

---

# 16. Devpost Data Flow

The Devpost provider follows:

```text id="q2v8r5"
Devpost API
      │
      ▼
Hackathon data
      │
      ▼
Keyword filtering
      │
      ▼
Normalization
      │
      ▼
Native pagination
      │
      ▼
OpportunityProviderResult
```

The provider returns hackathons only.

---

# 17. Devpost Pagination

Devpost provides page-based pagination.

The provider currently uses a page size of:

```text id="n6r8y4"
9
```

The provider keeps track of the current page through its cursor.

Conceptually:

```text id="w5d7p2"
devpost:2
devpost:3
devpost:4
...
```

The provider can internally request additional pages when necessary to find enough matching opportunities for the requested result limit.

A provisional maximum page limit is used as a safety mechanism so a single search does not continue indefinitely through the source.

---

# 18. Devpost Normalization

Devpost records are normalized into Route opportunities.

A Devpost opportunity receives a Route ID such as:

```text id="x9c3m7"
devpost:123456
```

The canonical Devpost opportunity URL is preserved in:

```text id="2m5z1n"
url
```

The provider also preserves useful Devpost-specific information in `metadata`.

Examples include:

```text id="6r3k8q"
themes
registrations
cashPrizes
otherPrizes
submissionPeriod
timeLeft
openState
winnersAnnounced
inviteOnly
inviteOnlyDescription
managedByDevpost
submissionGalleryUrl
startSubmissionUrl
```

---

# 19. Devpost Opportunity Description

Devpost does not always expose a single normalized description field in the search response that maps directly to Route's model.

The provider can therefore construct a useful normalized description from relevant information such as:

- title
- organization
- themes

This is a provider-level normalization decision.

The rest of Route receives only the normalized `description`.

---

# 20. Provider Cursors

Provider cursors are intentionally provider-specific.

For example:

```text id="1h9w4s"
Remote OK
remoteok:5

Devpost
devpost:2
```

The Search Service should not need to understand what these values mean.

The Provider Manager simply preserves them.

The final Route cursor contains the provider continuation state required for the next search.

---

# 21. Provider Cursor Ownership

The provider owns the meaning of its cursor.

This means:

```text id="7r3f2q"
Provider
  │
  ├── creates cursor
  ├── interprets cursor
  └── advances cursor
```

The Search Service does not calculate provider pagination.

The Provider Manager does not reinterpret provider cursors.

This separation is important because different external sources may use completely different pagination strategies.

---

# 22. Search Distribution vs Provider Behavior

The Provider Manager combines provider results, but it does not decide the final user-facing distribution semantics.

For example:

```text id="n3j6q4"
type = all
limit = 5
```

Route currently means:

```text id="7q2m9b"
5 jobs
+
5 hackathons
```

The provider does not need to understand this rule.

Instead:

```text id="j5t7c2"
Provider Manager
      │
      ▼
Raw normalized provider results
      │
      ▼
Search Service
      │
      ▼
Final Route search semantics
```

This keeps provider behavior independent from Route's public search contract.

---

# 23. Adding a New Provider

A new provider should implement the existing provider abstraction rather than modifying the MCP tools directly.

The general process is:

```text id="v4q8n6"
1. Identify external source
          ↓
2. Understand source API/data
          ↓
3. Determine supported opportunity types
          ↓
4. Implement provider
          ↓
5. Normalize into Opportunity
          ↓
6. Implement provider pagination
          ↓
7. Add provider tests
          ↓
8. Register provider
          ↓
9. Test Provider Manager
          ↓
10. Test Search Service
          ↓
11. Test MCP integration
          ↓
12. Document provider
```

The MCP search tool should not need provider-specific logic added to it.

---

# 24. Provider Implementation Checklist

A provider should answer the following questions before being considered complete.

### Source

- What external source does it use?
- Is there an official API?
- Is authentication required?
- What are the source's usage restrictions?

### Opportunity types

- What Route opportunity types does it support?
- Can it support multiple types?

### Data

- Which source fields map to Route's top-level fields?
- Which fields belong in `metadata`?
- Are any fields synthesized?

### Filtering

- How does keyword matching work?
- How is remote filtering determined?
- Which filters are native to the source?
- Which filters must Route implement locally?

### Pagination

- Does the source provide native pagination?
- If not, how can Route safely paginate it?
- What does the provider cursor represent?
- How does continuation work?

### Identity

- What is the source identifier?
- How is it converted into a Route ID?
- What is the canonical opportunity URL?

### Testing

- Can the provider be tested independently?
- Does pagination return distinct results?
- Does filtering behave correctly?
- Does normalization produce valid `Opportunity` objects?

---

# 25. Provider Testing

Provider implementations are tested independently before being relied upon by higher layers.

The current project includes provider-specific test scripts.

For example:

```text id="3j8s6n"
src/opportunities/providers/test-remoteOk.ts
src/opportunities/providers/test-devpost.ts
src/opportunities/providers/test-manager.ts
```

The purpose of these tests is to verify real provider behavior.

Testing includes things such as:

- provider connectivity
- normalization
- filtering
- result limits
- pagination
- cursors
- provider selection

Provider tests are especially useful because external APIs can fail independently of Route's own logic.

---

# 26. External Provider Failures

Providers depend on external systems.

Therefore provider failures can occur because of:

- network problems
- source downtime
- API changes
- rate limiting
- timeouts
- malformed source data

Route should distinguish provider failures from failures in the MCP layer or application layer.

The exact public error contract will be finalized after live testing of the MCP tools.

Until then, Route should avoid documenting an invented error-response format.

---

# 27. Current Providers

The current provider registry contains:

```text id="8q4w6p"
remoteok
devpost
```

Their responsibilities are:

| Provider  | Opportunity Type | Source                 |
| --------- | ---------------- | ---------------------- |
| Remote OK | Job              | Remote OK API          |
| Devpost   | Hackathon        | Devpost hackathons API |

Additional providers can be registered without changing the overall provider architecture.

---

# 28. Provider Architecture Summary

The provider system can be summarized as:

```text id="q7h4c9"
                  SEARCH REQUEST
                        │
                        ▼
                OPPORTUNITY SEARCH
                     SERVICE
                        │
                        ▼
                PROVIDER MANAGER
                  /           \
                 /             \
                ▼               ▼
        REMOTE OK PROVIDER  DEVPOST PROVIDER
                │               │
                ▼               ▼
          Remote OK API     Devpost API
                │               │
                └───────┬───────┘
                        ▼
                NORMALIZED DATA
                        │
                        ▼
                  OPPORTUNITIES
```

The key architectural boundary is:

> **Providers understand external sources. Route's application layer understands opportunities.**

This keeps Route extensible as additional opportunity sources are introduced.

---

# 29. Future Provider Work

Future provider work may include:

- additional job sources
- scholarship sources
- fellowship sources
- grant sources
- internship sources
- accelerator sources
- event sources
- freelance sources

However, adding providers is not currently the primary MVP focus.

The current priority is to make the existing provider architecture reliable before expanding the number of sources.

---

# 30. Related Documentation

For the broader opportunity architecture, see:

- [Architecture](./architecture.md)
- [Opportunities](./opportunities.md)
- [MCP](./mcp.md)

Individual provider documentation may be added later when provider-specific setup or contribution instructions become substantial enough to justify separate pages.
