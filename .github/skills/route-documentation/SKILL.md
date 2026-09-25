---
name: route-documentation
description: Maintain Route's technical documentation after implementation changes. Use when a Route feature, architecture decision, provider, MCP tool, test, or behavior has been changed and the documentation needs to be updated.
---

---

# Route Documentation Skill

You maintain the documentation for **Route**, an open-source, agent-agnostic MCP server that provides structured opportunity infrastructure for AI agents and developers.

Your job is to keep documentation synchronized with the **actual implemented and tested code**.

Do not invent behavior, future capabilities, or implementation details.

---

## Core Rule

Documentation must describe what the repository actually does.

Use this workflow:

1. **Build** — implementation is changed.
2. **Test** — implementation is verified.
3. **Decide** — architectural behavior or boundaries are confirmed.
4. **Document** — update only the documentation affected by the completed change.
5. **Commit** — documentation is ready to be committed with the implementation change.

Do not document an implementation as complete before it has been tested.

---

## How to Inspect a Change

Do not reread the entire Route repository by default.

Start with:

1. The files changed by the implementation.
2. The tests covering those changes.
3. The relevant files in `references/`.
4. Only the documentation files affected by the change.

Expand the inspection only when the changed behavior crosses architectural boundaries.

For example:

- A provider change → inspect provider documentation.
- An MCP tool change → inspect tool documentation and MCP documentation.
- A domain-model change → inspect opportunity documentation and architecture.
- A major architectural change → inspect the architecture decision records.

---

## Route Source of Truth

Use the reference files in this skill directory as contextual guidance:

- `references/architecture.md`
- `references/documentation-map.md`
- `references/terminology.md`

The implementation and tests remain the ultimate source of truth.

If the reference files disagree with the implementation, do not silently preserve the old documentation. Verify the implementation and update the relevant documentation.

---

## Documentation Principles

### 1. Document behavior, not intentions

Bad:

> Route will support direct opportunity retrieval.

If it is implemented and tested:

> Route supports direct opportunity retrieval through provider-owned URL resolution.

If it is not implemented:

> Direct opportunity retrieval is planned.

---

### 2. Do not mark unfinished work as complete

Use status markers carefully.

Only use:

```md
- [x]
```

when the implementation exists and has been tested.

Use:

```md
- [ ]
```

for planned or incomplete work.

---

### 3. Keep responsibilities explicit

Route separates responsibilities between:

- MCP interface
- application/service layer
- opportunity infrastructure
- provider manager
- individual providers
- external sources
- connected AI agents

Do not describe Route as doing work that belongs to the connected agent.

---

### 4. Preserve the agent-agnostic boundary

Route is infrastructure.

The connected AI agent/application is responsible for:

- reasoning
- personalization
- conversation
- generation
- automation
- user experience

Route is responsible for deterministic opportunity infrastructure such as:

- discovering opportunities
- retrieving opportunity data
- normalizing provider data
- saving opportunity state
- preparing structured opportunity context
- exposing these capabilities through MCP

Do not describe Route as an AI career coach or autonomous agent.

---

## Current Opportunity Scope

The currently implemented opportunity types are:

- jobs
- hackathons

Future opportunity types include:

- scholarships
- fellowships
- grants
- internships
- accelerators
- events
- freelance opportunities

Do not describe future opportunity types as currently supported unless the implementation has changed.

---

## Current Opportunity Lifecycle

Route's broader lifecycle is:

```text
DISCOVER → UNDERSTAND → SAVE → PREPARE → ACT → TRACK
```

This is a product-level model.

Not every lifecycle stage needs to correspond to a single MCP tool.

Route should expose small composable capabilities rather than one giant action tool.

---

## Current MCP Tool Scope

Current or planned core tools include:

- `health_check`
- `search_opportunities`
- `get_opportunity`
- `save_opportunity`
- `list_saved_opportunities`
- `prepare_opportunity`

Only mark a tool as implemented when the corresponding implementation and tests exist.

Do not claim that:

- automatic applications
- browser automation
- CV generation
- notifications
- recommendations
- personalization

are implemented unless the code actually supports them.

---

## Provider Architecture

Providers own source-specific behavior.

A provider is responsible for:

- communicating with its source
- interpreting source-specific data
- normalizing source data
- determining source-specific semantics
- deciding whether it owns a URL
- retrieving an opportunity directly from its source when supported

The Provider Manager is responsible for:

- selecting providers for search
- coordinating provider searches
- combining provider results
- carrying provider pagination state
- resolving which provider owns a URL
- delegating URL retrieval to that provider

The Manager must not become a source-specific parser.

---

## Direct URL Retrieval

Route uses provider ownership resolution for direct opportunity retrieval.

The flow is:

```text
MCP get_opportunity
        ↓
Opportunity service
        ↓
Provider Manager
        ↓
canHandleUrl()
        ↓
matching provider
        ↓
provider.getByUrl()
        ↓
normalized Opportunity
```

`canHandleUrl()` should be:

- deterministic
- cheap
- local
- based on URL structure
- free from network requests

`getByUrl()` is responsible for retrieving and normalizing the actual source resource.

Unsupported URLs should not be claimed to be supported.

---

## Provider-Specific Behavior

Do not assume all providers interpret fields identically.

For example:

- Remote OK is remote-only, so normalized opportunities have `remote: true`.
- Devpost currently treats a location of `"Online"` as `remote: true`.
- Other providers may have their own workplace/location semantics.

The normalized Route model should provide consistent fields while providers remain responsible for interpreting their source data.

---

## Search and Pagination

Route's public search contract currently supports:

```ts
{
  type?: "job" | "hackathon" | "all",
  keyword?: string,
  remote?: boolean,
  limit?: number,
  cursor?: string
}
```

Important behavior:

- `limit` defaults to 5.
- A specific type returns up to `limit` results.
- `all` returns up to `limit` results per supported opportunity type.
- The current supported types are jobs and hackathons.
- Cursors are opaque to the MCP client/AI agent.
- Providers own provider-specific pagination.
- Route combines provider cursor state.
- Route does not maintain conversation-level search memory.
- Search does not accumulate returned opportunity IDs to implement pagination.

Do not document different pagination behavior unless implementation changes.

---

## Tests Are Evidence

When documenting a completed change, inspect the relevant tests.

Tests can establish that behavior is implemented, but do not assume that passing tests prove capabilities that the tests do not cover.

For example:

A provider-manager test that successfully retrieves a Devpost URL establishes that:

- the Manager can resolve the Devpost provider for that URL
- the provider can retrieve the opportunity
- the result is returned through the Manager

It does not establish that the MCP `get_opportunity` tool is implemented.

---

## Documentation Updates

Use `references/documentation-map.md` to determine which documents should change.

Prefer updating the smallest set of documents necessary.

Do not rewrite unrelated documentation.

When an implementation changes an architectural boundary, update the appropriate ADR.

When an implementation changes terminology, update `references/terminology.md` if necessary.

---

## Architecture Decision Records

Use ADRs when a change establishes or modifies an architectural decision.

An ADR should explain:

1. Context
2. Decision
3. Responsibilities
4. Consequences
5. Current implementation status

Do not create an ADR for every small code change.

Use existing ADRs when the change extends an existing architectural decision.

---

## Status Accuracy

Before finishing documentation, verify:

- Every `[x]` item is actually implemented.
- Every `[x]` item has appropriate test evidence.
- No planned feature is described as current.
- No future opportunity type is described as supported.
- No future MCP tool is described as available.
- No provider-specific behavior is generalized incorrectly.
- No architectural boundary has been blurred.

---

## Final Documentation Review

Before considering documentation complete, answer:

### Implementation

- Does the documentation describe the actual code?
- Are implementation statuses accurate?

### Architecture

- Are responsibilities correctly assigned?
- Is Route still described as agent-agnostic infrastructure?

### Providers

- Are source-specific rules documented correctly?
- Is URL ownership documented where relevant?

### MCP

- Are only implemented tools described as implemented?
- Are response/error contracts based on observed behavior rather than assumptions?

### Tests

- Does the documentation reflect what has actually been tested?

### Scope

- Did this change accidentally get documented as more complete than it is?

---

## Final Report

After updating documentation, briefly report:

1. Documentation files changed.
2. What each change reflects.
3. Any documentation that was intentionally left unchanged.
4. Any implementation behavior that still needs clarification before it can be documented.
