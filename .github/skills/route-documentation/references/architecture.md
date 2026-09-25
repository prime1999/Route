# Route Architecture Reference

## Product Definition

Route is an open-source, agent-agnostic MCP server that provides structured opportunity infrastructure for AI agents and developers.

North-star statement:

> Route is an open-source MCP server that gives AI agents and developers a structured opportunity layer for discovering, understanding, and acting on opportunities.

Boundary:

> Route provides the opportunity infrastructure. The connected AI agent or application provides the reasoning, experience, and automation.

---

## High-Level Architecture

```text
                         USER
                           │
                           ▼
                     AI AGENT / APP
                           │
                           │ MCP
                           ▼
                  ┌──────────────────┐
                  │      ROUTE       │
                  │                  │
                  │ Opportunity      │
                  │ Infrastructure   │
                  │                  │
                  │ search           │
                  │ get              │
                  │ save             │
                  │ prepare          │
                  └────────┬─────────┘
                           │
                    Provider Manager
                       /          \
                      /            \
                     ▼              ▼
                Remote OK        Devpost
                   Jobs          Hackathons
                      \            /
                       \          /
                        ▼        ▼
                       NORMALIZATION
                             │
                             ▼
                     Opportunity Data
```

---

## Application Boundary

The connected AI agent/application handles:

- reasoning
- personalization
- conversation
- generation
- automation
- user experience

Route handles deterministic opportunity infrastructure.

Route does not require a specific AI agent.

Potential MCP clients include:

- Alexa+
- Claude
- ChatGPT
- custom agents
- developer applications
- IDE agents

---

## Opportunity Infrastructure

The infrastructure layer currently consists of:

```text
Opportunity Domain
        │
        ▼
Provider Manager
        │
        ├── Remote OK Provider
        │
        └── Devpost Provider
        │
        ▼
External Opportunity Sources
```

Providers normalize external data into Route's common `Opportunity` model.

---

## Direct Retrieval

Direct retrieval uses provider-owned URL resolution.

```text
get_opportunity
      │
      ▼
Opportunity Service
      │
      ▼
Provider Manager
      │
      ├── canHandleUrl()
      │
      ▼
Provider
      │
      └── getByUrl()
```

The Manager determines ownership.

The provider owns source-specific retrieval.

The Manager does not parse external source formats.

---

## Current Providers

### Remote OK

Supports:

- jobs
- remote job retrieval

URL ownership is limited to HTTPS Remote OK job URLs.

### Devpost

Supports:

- hackathons
- direct retrieval of Devpost hackathon URLs
- Devpost-owned subdomain URLs

Devpost search and retrieval use the Devpost API because direct HTML access may be protected by the source's web infrastructure.

---

## Search

Search is coordinated by the Search Service and Provider Manager.

Providers own source-specific pagination.

Route maintains an opaque cursor containing provider continuation state.

The client should not need to understand provider-specific cursor formats.

---

## Future Architecture

The following are planned rather than currently required:

- DynamoDB persistence
- `save_opportunity`
- `list_saved_opportunities`
- `prepare_opportunity`
- Strands integration
- Bedrock integration
- Alexa+ integration
- additional opportunity providers
- additional opportunity types

Do not treat these as implemented unless repository code and tests establish that status.
