# Route Opportunities

Opportunities are the core domain concept in Route.

An opportunity represents something a user may want to discover, understand, save, prepare for, or eventually act on.

Route currently supports two opportunity types:

- Jobs
- Hackathons

Additional opportunity types are planned for the future.

---

# 1. What Is an Opportunity?

Route treats opportunities as normalized domain objects rather than provider-specific records.

An external provider may represent an opportunity using its own API structure, field names, identifiers, and data formats.

Route converts that provider-specific data into a common `Opportunity` model.

```text
External Provider

       │

       │ provider-specific data

       ▼

Provider Implementation

       │

       │ normalization

       ▼

Route Opportunity

       │

       ├── MCP

       ├── Search Service

       ├── Persistence

       └── Future agent capabilities
```

This means the rest of Route does not need to understand the internal response format of Remote OK, Devpost, or future providers.

---

# 2. Current Opportunity Types

Route currently supports:

```text
job

hackathon
```

The domain type is intentionally small at the current stage.

Future types may include:

```text
scholarship

fellowship

grant

internship

accelerator

event

freelance
```

These are **not currently part of the MVP**.

They should be added only when their provider and domain behavior have been properly implemented.

---

# 3. Opportunity Data Model

The current normalized opportunity model is:

```ts
interface Opportunity {
  id: string;
  title: string;
  type: OpportunityType;
  organization: string;
  description: string;
  url: string;
  source: string;
  sourceUrl: string;
  location?: string;
  remote?: boolean;
  deadline?: string;
  prize?: string;
  metadata?: Record<string, unknown>;
}
```

The corresponding opportunity type is:

```ts
type OpportunityType = "job" | "hackathon";
```

The model is intentionally provider-agnostic.

---

# 4. Opportunity Fields

## `id`

The internal Route identifier for the opportunity.

Examples:

```text
remoteok:1137411

devpost:123456
```

The ID provides a stable Route-level identity that can be used for:

- deduplication
- internal references
- persistence
- saved opportunities
- future tracking
- provider-specific identity

The MCP client should generally not need to construct or understand these IDs.

---

## `title`

The human-readable title of the opportunity.

Examples:

```text
Senior Software Engineer

OpenCV AI Competition 2026
```

---

## `type`

The Route opportunity category.

Current values:

```text
job

hackathon
```

The type allows Route to distinguish different opportunity categories while keeping a shared domain model.

---

## `organization`

The organization associated with the opportunity.

For example:

```text
A company

A hackathon organizer

An institution
```

The exact meaning depends on the opportunity type and source.

---

## `description`

A normalized description of the opportunity.

The content may come directly from the provider or be constructed from relevant provider fields when the provider does not expose a suitable standalone description.

Route does not require every provider to expose identical source fields.

The provider is responsible for producing a useful normalized description.

---

## `url`

The canonical external URL for the specific opportunity.

Examples:

```text
https://remoteok.com/remote-jobs/remote-frontend-engineer-bjak-1137410
```

or:

```text
https://opencv26.devpost.com/
```

The URL points to the actual opportunity resource.

It is also the external identifier Route uses for direct opportunity retrieval.

The current provider abstraction exposes:

```ts
getByUrl(url: string): Promise<Opportunity | null>;
```

This allows a provider to retrieve and normalize a specific opportunity using its canonical external URL.

The URL is different from the internal Route `id`.

---

## `source`

Identifies the provider that supplied the opportunity.

Current examples:

```text
remoteok

devpost
```

This allows Route to retain information about where the normalized record originated.

---

## `sourceUrl`

Identifies the provider-level source used to obtain the data.

For example, a provider may retrieve data from an API endpoint rather than the individual opportunity URL.

This field therefore represents the source of the normalized data, while `url` represents the actual opportunity.

---

## `location`

An optional location associated with the opportunity.

Examples may include:

```text
London, UK

New York, USA

Online
```

The field is optional because not every provider or opportunity exposes a meaningful location.

---

## `remote`

An optional boolean indicating whether the opportunity is remote.

This allows search requests to filter opportunities based on remote availability.

For example:

```text
remote: true
```

A provider is responsible for determining this value according to the semantics of its source.

For example:

- Remote OK is a remote-only job source, so normalized Remote OK jobs are represented as `remote: true`.
- Devpost currently interprets a location of `Online` as `remote: true`.

This logic remains provider-specific because different sources may represent remote availability differently.

---

## `deadline`

An optional deadline associated with the opportunity.

This may represent:

- application deadline
- submission deadline
- closing date

The exact semantics can depend on the opportunity type.

The value is currently represented as a string because providers may expose dates in different formats.

A more strict date representation can be introduced later if Route establishes a consistent normalized date contract.

---

## `prize`

An optional prize or reward associated with the opportunity.

This is currently most relevant to hackathons.

For example:

```text
$10,000
```

The field remains optional because jobs and many other opportunity types do not have a prize.

---

## `metadata`

Provider- or opportunity-specific information that does not belong in the common top-level model.

Examples include:

```text
themes

registrations

cash prizes

salary information

application URLs

published timestamps

submission periods
```

Metadata allows Route to preserve useful source information without constantly expanding the core `Opportunity` interface.

It is intentionally flexible:

```ts
metadata?: Record<string, unknown>;
```

The normalized top-level fields should contain information that Route itself needs to understand consistently.

Provider-specific details can remain inside `metadata`.

---

# 5. Normalization

Different providers expose different data structures.

For example:

```text
Remote OK

─────────

title

company

description

tags

salary_min

salary_max

epoch

...

Devpost

───────

title

organization_name

displayed_location

prize_amount

themes

submission_period_dates

...
```

Route normalizes these into:

```text
                Route Opportunity

                       │

        ┌──────────────┼──────────────┐

        ▼              ▼              ▼

    Remote OK       Devpost      Future Provider
```

The provider implementation owns this transformation.

This prevents provider-specific formats from leaking into the application and MCP layers.

---

# 6. Search

Searching is currently the primary way opportunities enter the Route system.

The main search abstraction is the:

```text
Opportunity Search Service
```

Its responsibility is to coordinate opportunity discovery across providers and apply Route's search semantics.

The general flow is:

```text
Search Request

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

      │

      ▼

Normalized Opportunities

      │

      ▼

Search Service

      │

      ├── Deduplicate

      ├── Apply result semantics

      └── Create Route cursor

      │

      ▼

Search Result
```

---

# 7. Search Parameters

The current search contract is:

```ts
{
  type?: "job" | "hackathon" | "all";
  keyword?: string;
  remote?: boolean;
  limit?: number;
  cursor?: string;
}
```

### `type`

Controls which opportunity categories should be searched.

Possible values:

```text
job

hackathon

all
```

If omitted, the search can use the currently supported providers according to the Provider Manager's selection behavior.

---

### `keyword`

A free-form search term.

It is intentionally **not an enum**.

Examples:

```text
AI

backend

Rust

machine learning

developer
```

Providers determine how the keyword is matched against their available fields.

For example, a provider may match against:

- title
- organization
- description
- tags
- themes

This keeps keyword semantics flexible as new providers are added.

---

### `remote`

Controls remote filtering where supported.

Example:

```text
remote: true
```

This asks Route to return opportunities identified as remote.

The exact filtering implementation belongs to the provider because different sources represent remote availability differently.

---

### `limit`

Controls how many results Route should return.

The default is:

```text
5
```

The value is normalized to a positive integer before being used by the Search Service.

---

### `cursor`

An opaque continuation token.

Clients should treat the cursor as an opaque value.

They should not attempt to interpret or construct provider-specific cursor values.

Internally, Route uses the cursor to preserve provider continuation state.

---

# 8. Search Limit Semantics

Route's `limit` behavior depends on the requested type.

For a specific type:

```text
type = job

limit = 5
```

Route returns up to:

```text
5 jobs
```

Likewise:

```text
type = hackathon

limit = 5
```

returns up to:

```text
5 hackathons
```

For:

```text
type = all

limit = 5
```

the limit applies **per supported opportunity type**.

With the current two types, this means:

```text
jobs       → up to 5

hackathons → up to 5
```

Therefore the response may contain up to:

```text
10 opportunities
```

This behavior allows `all` searches to maintain representation across supported opportunity categories instead of allowing one category to consume the entire result set.

---

# 9. Fewer Results

Route does not fabricate opportunities to satisfy a requested limit.

For example:

```text
type = hackathon

limit = 5
```

may return only:

```text
3 hackathons
```

if only three matching opportunities are available from the current search.

The requested limit is therefore a maximum, not a guarantee.

---

# 10. Pagination

Route supports cursor-based pagination.

The general model is:

```text
First request

     │

     ▼

Results + nextCursor

     │

     ▼

Second request

     │

     │ cursor

     ▼

Next results + nextCursor
```

The client does not need to know how each provider implements pagination.

---

# 11. Provider Cursors

Different providers use different pagination strategies.

### Devpost

Devpost provides native page-based pagination.

Route preserves that provider continuation internally.

Conceptually:

```text
devpost:2

devpost:3

devpost:4

...
```

### Remote OK

The current Remote OK feed does not provide reliable native pagination for the filtered search behavior Route needs.

Route therefore uses a position-based continuation strategy.

Conceptually:

```text
remoteok:5

remoteok:10

remoteok:15

...
```

The position is applied after the provider's relevant filtering and normalization.

This allows Route to continue through matching results without maintaining a list of previously returned opportunity IDs.

---

# 12. Route Cursor

The MCP client receives a **Route cursor**, not a raw provider cursor.

Internally, the Route cursor contains provider continuation state.

Conceptually:

```text
Route Cursor

│

├── Remote OK cursor

│

└── Devpost cursor
```

This becomes important when searching across multiple opportunity types.

For example:

```text
all
```

may require Route to continue both:

```text
Remote OK

Devpost
```

independently.

The Route cursor preserves that state.

---

# 13. Cursor Opacity

The cursor is an implementation detail.

Clients should:

- store it
- return it unchanged on the next request
- not decode it
- not modify it
- not construct provider cursors themselves

This allows Route to change its internal pagination implementation without breaking MCP clients.

---

# 14. Deduplication

Route performs deduplication before applying the final result limit.

The current deduplication mechanism uses the normalized opportunity ID.

Conceptually:

```text
Provider results

      │

      ▼

Normalize

      │

      ▼

Deduplicate by Route ID

      │

      ▼

Apply result semantics

      │

      ▼

Return results
```

This is important when multiple provider operations could surface the same opportunity.

The Route ID provides the internal identity used for this operation.

---

# 15. Internal Identity vs External URL

Route deliberately maintains both an internal ID and an external URL.

They serve different purposes.

### Internal ID

```text
remoteok:1137411

devpost:123456
```

Used for:

- internal identity
- deduplication
- persistence
- saved opportunities
- future tracking

### External URL

```text
https://...
```

Used for:

- identifying the actual external opportunity
- linking users to the source
- direct opportunity retrieval
- future action workflows

The distinction is important.

```text
id ≠ url
```

The ID belongs to Route's internal domain model.

The URL points to the external opportunity.

---

# 16. Opportunity Retrieval

Route's opportunity model uses the canonical external URL as the input to direct opportunity retrieval.

The intended MCP-facing contract is:

```ts
{
  url: string;
}
```

rather than requiring the client to provide:

```ts
{
  id: string;
  source: string;
}
```

This keeps the client contract simple and uses information Route already provides in search results.

At the provider layer, direct retrieval is already supported through:

```ts
getByUrl(
  url: string,
): Promise<Opportunity | null>;
```

The provider is responsible for:

```text
External Opportunity URL

          │

          ▼

Provider-specific retrieval

          │

          ▼

Provider parsing

          │

          ▼

Normalization

          │

          ▼

Route Opportunity
```

The current providers implement this capability independently.

### Remote OK

The Remote OK provider validates that the URL belongs to Remote OK and represents a supported remote job resource.

It retrieves the source page, extracts the structured `JobPosting` data, and normalizes it into a Route `Opportunity`.

### Devpost

The Devpost provider supports both Devpost's main domain and Devpost-owned hackathon subdomains.

For example:

```text
https://revenuecat-shipaton-2026.devpost.com/
```

The provider uses the Devpost API to locate the matching hackathon, compares canonical URLs, and normalizes the matching record into a Route `Opportunity`.

Provider-level retrieval returns `null` when the requested opportunity cannot be resolved.

The Provider Manager now resolves URL ownership by calling each registered provider's `canHandleUrl()` method and delegates retrieval to the matching provider's `getByUrl()` method. If no provider claims the URL, the Manager returns `null`.

This Manager-level routing has been tested for Remote OK, Devpost, and an unsupported URL. The application/service layer and MCP-facing `get_opportunity` tool are not yet implemented or tested.

---

# 17. Provider Independence

The Opportunity model allows Route to add providers without changing the rest of the system.

A provider is responsible for:

```text
External data

      ↓

Provider parsing

      ↓

Filtering

      ↓

Normalization

      ↓

Opportunity
```

For direct retrieval, the provider additionally owns:

```text
Opportunity URL

      ↓

Provider-specific retrieval

      ↓

Provider parsing

      ↓

Normalization

      ↓

Opportunity
```

The rest of Route works with the normalized object.

For example:

```text
Remote OK ──────┐

                │

Devpost ────────┼──► Opportunity

                │

Future Provider ┘
```

This is one of the main reasons the provider abstraction exists.

---

# 18. Current Opportunity Sources

### Remote OK

Current capability:

- Jobs
- Keyword filtering
- Remote filtering
- Normalization
- Position-based pagination
- Direct retrieval by URL

### Devpost

Current capability:

- Hackathons
- Keyword filtering
- Remote filtering based on source semantics
- Normalization
- Native pagination
- Hackathon-specific metadata
- Direct retrieval by URL
- Devpost-owned subdomain URL handling

Provider-specific implementation details are documented separately in:

```text
docs/providers.md
```

---

# 19. Current Implementation Status

Currently implemented:

- [x] Opportunity domain model
- [x] Opportunity Zod schema
- [x] Job type
- [x] Hackathon type
- [x] Provider abstraction
- [x] Remote OK provider
- [x] Devpost provider
- [x] Provider Manager
- [x] Opportunity Search Service
- [x] Keyword filtering
- [x] Remote filtering
- [x] Result limits
- [x] `all` result distribution
- [x] Deduplication
- [x] Provider pagination
- [x] Route cursor handling
- [x] Provider-level direct retrieval
- [x] Remote OK URL retrieval
- [x] Devpost URL retrieval
- [x] MCP search integration

Not yet implemented:

- [x] Provider Manager URL ownership resolution
- [ ] `get_opportunity` application/service layer
- [ ] `get_opportunity` MCP tool
- [ ] Saved opportunities
- [ ] Persistent opportunity state
- [ ] Opportunity preparation
- [ ] Opportunity tracking
- [ ] Additional opportunity types

---

# 20. Future Opportunity Lifecycle

The long-term Route lifecycle is:

```text
DISCOVER

   ↓

UNDERSTAND

   ↓

SAVE

   ↓

PREPARE

   ↓

ACT

   ↓

TRACK
```

The current opportunity system primarily supports:

```text
DISCOVER
```

Provider-level direct retrieval now provides an early foundation for:

```text
UNDERSTAND
```

The rest of the lifecycle will be implemented incrementally.

Importantly, Route does not need one giant tool to represent this lifecycle.

Instead, the capabilities can remain composable:

```text
search_opportunities

        ↓

get_opportunity

        ↓

save_opportunity

        ↓

prepare_opportunity

        ↓

future action capabilities

        ↓

tracking
```

This keeps the infrastructure modular.

---

# 21. Route vs Agent Responsibilities

Route provides the opportunity infrastructure.

The connected AI agent or application provides reasoning and user experience.

For example:

```text
Route

─────

Search opportunities

Retrieve opportunity data

Normalize provider information

Save opportunity state

Provide structured context


Agent

─────

Understand user intent

Reason about opportunities

Personalize results

Generate explanations

Generate application material

Interact with the user

Automate workflows where appropriate
```

The boundary is intentional.

Route should perform deterministic opportunity infrastructure work.

The agent should handle reasoning and generation.

---

# 22. Future Opportunity Types

Additional opportunity types are part of the long-term Route vision.

Potential categories include:

```text
Scholarships

Fellowships

Grants

Internships

Accelerators

Events

Freelance opportunities
```

These should not be added merely by expanding the enum.

Each new type may require:

- provider support
- normalization rules
- search semantics
- metadata decisions
- validation
- tests
- documentation
- potentially new retrieval or lifecycle behavior

Therefore new opportunity types should be introduced deliberately.

---

# 23. Design Principles

The opportunity system follows several principles.

### Normalize provider data

The rest of Route should work with one common opportunity model.

### Keep provider logic isolated

Provider-specific parsing and filtering belongs inside providers.

### Keep cursors opaque

MCP clients should not depend on provider pagination internals.

### Keep the domain model extensible

The model should support future opportunity categories without becoming provider-specific.

### Preserve useful provider metadata

Provider-specific information can remain available through `metadata`.

### Separate identity from retrieval

Route's internal ID and the external opportunity URL serve different purposes.

### Use URL-based retrieval

The canonical opportunity URL provides a provider-independent input for future direct retrieval at the MCP/application boundary.

### Avoid premature features

The current MVP focuses on jobs and hackathons before expanding into additional opportunity categories.

---

# 24. Summary

The Route opportunity system provides a normalized layer between external opportunity sources and the rest of Route.

```text
                    EXTERNAL SOURCES

                  /                 \

                 ▼                   ▼

             Remote OK           Devpost

                 │                   │

                 └────────┬──────────┘

                          ▼

                    PROVIDER LAYER

                          │

                          ▼

                    NORMALIZATION

                          │

                          ▼

                   OPPORTUNITY MODEL

                          │

              ┌───────────┴───────────┐

              │                       │

              ▼                       ▼

        SEARCH SERVICE         DIRECT RETRIEVAL

              │                       │

              └───────────┬───────────┘

                          ▼

                       MCP

                          │

                          ▼

                       AGENTS
```

The core responsibility is to turn fragmented provider data into structured, consistent opportunity information that Route can expose through MCP and eventually use across the complete opportunity lifecycle.

At the current stage, the opportunity layer supports discovery through search and provider-backed direct retrieval through the Provider Manager. The application and MCP layers still need to expose the complete `get_opportunity` capability.

As new capabilities are implemented, this document should be updated rather than allowing the actual system and documentation to drift apart.
