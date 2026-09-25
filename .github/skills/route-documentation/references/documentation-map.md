# Route Documentation Map

This file tells the documentation skill where different kinds of Route information belong.

## Documentation Structure

```text
docs/
├── architecture.md
├── mcp.md
├── opportunities.md
├── providers.md
├── tools/
│   ├── health-check.md
│   └── search-opportunities.md
└── decisions/
    └── architecture-decisions.md
```

---

## Document Responsibilities

### `docs/architecture.md`

Use for:

- system architecture
- major component boundaries
- data flow
- responsibility boundaries
- major integration architecture

Do not use it for detailed source-specific implementation behavior.

---

### `docs/mcp.md`

Use for:

- MCP server architecture
- transport
- MCP lifecycle
- tool registration
- MCP-facing behavior
- client integration

Do not claim a tool exists here unless the implementation exists.

---

### `docs/opportunities.md`

Use for:

- Opportunity domain model
- opportunity types
- normalized fields
- search semantics
- pagination semantics
- direct opportunity retrieval concepts
- opportunity lifecycle

---

### `docs/providers.md`

Use for:

- provider interface
- Provider Manager
- provider responsibilities
- provider selection
- provider URL ownership
- provider-specific source behavior
- pagination responsibilities
- adding new providers
- provider testing

---

### `docs/tools/*.md`

Use one file per MCP tool.

Each tool document should describe:

- purpose
- input
- behavior
- output
- errors
- examples
- implementation status

Only document observed/implemented behavior.

---

### `docs/decisions/architecture-decisions.md`

Use for:

- architectural decisions
- important boundaries
- deliberate tradeoffs
- decisions that future contributors need to understand

Do not create an ADR for trivial implementation details.

---

## Change-to-Documentation Guide

| Implementation change      | Likely documentation                                |
| -------------------------- | --------------------------------------------------- |
| Domain model               | `opportunities.md`, possibly `architecture.md`      |
| Search behavior            | `opportunities.md`, search tool docs                |
| Provider interface         | `providers.md`                                      |
| New provider               | `providers.md`, provider-specific docs when created |
| Provider URL ownership     | `providers.md`, `opportunities.md`                  |
| Provider retrieval         | `providers.md`, `opportunities.md`                  |
| Provider Manager behavior  | `providers.md`, possibly ADR                        |
| New MCP tool               | `docs/tools/<tool>.md`, `mcp.md`                    |
| MCP transport              | `mcp.md`, `architecture.md`                         |
| Major architecture change  | `architecture.md`, ADR                              |
| New architectural boundary | ADR + relevant architecture docs                    |
| Testing strategy change    | Relevant technical documentation                    |

---

## Documentation Status

Documentation should distinguish between:

- implemented
- tested
- partially implemented
- planned
- deferred

Do not collapse these states into one status.
