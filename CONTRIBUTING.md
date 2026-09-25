# Contributing to Route

Thanks for contributing to Route.

Route is an open-source, agent-agnostic MCP server that provides structured opportunity infrastructure for AI agents and developers.

Before making changes, take some time to understand the architecture and the responsibilities of the different parts of the system.

## Before You Start

Read:

- `README.md` — project overview
- `docs/architecture.md` — system architecture
- `docs/opportunities.md` — opportunity model and behavior
- `docs/providers.md` — provider architecture
- `TODO.md` — current and planned work

If you are working on a specific MCP tool, also read its documentation under:

```text
docs/tools/
```

## Development Workflow

Route follows this workflow:

```text
Build → Test → Decide → Document → Commit
```

### 1. Build

Implement one feature or change at a time.

Keep responsibilities separated between:

- MCP tools
- application/services
- opportunity infrastructure
- provider manager
- providers
- external sources

Avoid adding functionality that is not required for the current feature.

### 2. Test

Test the implementation before documenting it.

Tests should verify the behavior that the implementation is expected to provide.

Do not treat an untested implementation as complete.

### 3. Decide

Review the result and confirm that the implementation matches Route's architecture.

For architectural changes, consider:

- responsibility boundaries
- provider ownership
- MCP boundaries
- agent-agnostic design
- future extensibility

Important architectural decisions should be recorded in:

```text
docs/decisions/architecture-decisions.md
```

### 4. Document

Route uses a GitHub Copilot Agent Skill to keep documentation synchronized with the implementation.

The skill is located at:

```text
.github/skills/route-documentation/
```

When a feature or architectural change has been implemented and tested, open GitHub Copilot Chat in VS Code and run:

```text
/route-documentation
```

The skill will inspect the relevant implementation, tests, and documentation references before updating the affected documentation.

Documentation should describe the behavior that actually exists in the code.

Do not document planned functionality as implemented.

### 5. Commit

After the implementation, tests, decisions, and documentation are complete, commit the change.

Prefer focused commits that represent one logical change.

Example:

```text
feat: add provider URL resolution
```

or:

```text
docs: document provider URL ownership
```

## Architecture Guidelines

Route is infrastructure, not the AI agent itself.

The connected AI agent or application is responsible for:

- reasoning
- personalization
- conversation
- generation
- automation
- user experience

Route is responsible for deterministic opportunity infrastructure such as:

- discovery
- retrieval
- normalization
- filtering
- pagination
- persistence
- structured opportunity context

Keep this boundary clear when contributing.

## Providers

Providers own source-specific behavior.

A provider is responsible for:

- communicating with its source
- interpreting source-specific data
- normalizing source data
- determining whether it owns a URL
- retrieving opportunities from its source

The Provider Manager coordinates providers but should not contain source-specific parsing logic.

When adding or modifying a provider, update the relevant provider tests and documentation.

## MCP Tools

MCP tools should remain focused and composable.

Avoid creating large tools that combine unrelated responsibilities when smaller capabilities can be composed by an AI agent.

When adding a new MCP tool:

1. Implement the tool.
2. Test it.
3. Document its behavior.
4. Register it with the MCP server.
5. Add or update integration tests where appropriate.

## Pull Requests

Pull requests should clearly describe:

- what changed
- why it changed
- what was tested
- any architectural decisions made
- any known limitations

Keep pull requests focused on a logical change whenever possible.

## Documentation Accuracy

Documentation is part of the implementation.

Before submitting a contribution, make sure:

- implemented behavior is documented accurately
- planned functionality is not presented as implemented
- tests reflect the documented behavior
- architectural boundaries remain clear
- provider-specific behavior is not incorrectly generalized

## Questions

If you are unsure about an architectural decision, check the existing documentation and architecture decision records before introducing a new pattern.

For significant architectural changes, document the decision and its reasoning so future contributors can understand why the system was designed that way.
