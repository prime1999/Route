# Route

**An open-source MCP server for discovering, understanding, and acting on opportunities.**

Route is an agent-agnostic Model Context Protocol (MCP) server that gives AI agents and developers structured access to opportunities from across the web.

Jobs, hackathons, scholarships, grants, fellowships, internships, accelerators, and other opportunities are scattered across different platforms. Route is being built to bring these fragmented opportunities together behind a common interface.

The goal is not to build another job board.

The goal is to build **opportunity infrastructure** that AI agents and applications can use to discover opportunities, understand them, and help users act on them.

Route provides the opportunity infrastructure.

The connected AI agent or application provides the reasoning, personalization, user experience, and automation.

---

## Why Route?

Opportunities are fragmented across the web.

Jobs live on job boards.

Hackathons live on developer platforms.

Scholarships and fellowships live on education and organization websites.

Grants, internships, accelerators, events, and freelance opportunities are spread across even more sources.

This makes it difficult for both people and AI agents to work with opportunities efficiently.

An AI agent may be able to help a user find a job or hackathon, but it still needs reliable access to the underlying opportunity information.

Route provides that access through MCP.

Instead of every AI application having to understand how individual opportunity platforms work, it can connect to Route and interact with a standardized opportunity interface.

---

## The Core Idea

Route is built around an opportunity lifecycle:

**DISCOVER → UNDERSTAND → SAVE → PREPARE → ACT → TRACK**

### 1. Discover

Find opportunities across supported sources.

> "Find me five remote AI jobs and five AI hackathons."

Route searches the relevant providers and returns normalized opportunity data.

Over time, Route will support more categories including:

- Jobs
- Hackathons
- Scholarships
- Fellowships
- Grants
- Internships
- Accelerators
- Events
- Freelance opportunities
- And more

---

### 2. Understand

Retrieve detailed information about an opportunity.

> "Tell me more about the second hackathon."

The agent can use Route to retrieve structured information such as:

- Title
- Organization
- Description
- Deadline
- Location
- Remote/online availability
- Prize
- Timeline
- Application URL
- Source
- Requirements
- Other provider-specific information

This allows the connected agent to explain the opportunity to the user using reliable source data.

---

### 3. Save

Save opportunities that the user wants to revisit.

> "Save this hackathon."

Saved opportunities belong to the user's state rather than becoming part of Route's global opportunity source.

This creates a bridge between discovery and taking action later.

---

### 4. Prepare

Help the user understand what is required to pursue an opportunity.

> "What do I need to prepare for this hackathon?"

or:

> "What should I have ready before applying for this job?"

Route can provide the opportunity context required by the connected AI agent to generate useful preparation guidance.

For example, an agent could use opportunity requirements, deadlines, eligibility information, or application instructions to help the user prepare.

---

### 5. Act

Move from knowing about an opportunity to actually pursuing it.

**This is a major part of Route's long-term vision.**

The goal is for Route to provide the information and tools that allow connected AI agents and applications to help users take meaningful action.

Depending on the opportunity, this could eventually include workflows such as:

- Drafting a job application
- Generating or improving a cover letter
- Preparing answers to application questions
- Suggesting projects for a hackathon
- Preparing a hackathon submission
- Helping complete application steps
- Creating an action plan
- Handing the user off to the original opportunity platform
- Supporting other opportunity-specific workflows

Route does **not** need to become the AI agent responsible for these actions.

Instead, Route exposes the opportunity context and capabilities that an external agent can use to perform them.

For example:

```text
User
 │
 │ "Help me apply for this job."
 ▼
AI Agent
 │
 │ asks Route for opportunity details
 ▼
Route
 │
 │ opportunity data
 ▼
AI Agent
 │
 ├── reasons about the opportunity
 ├── uses the user's context
 ├── drafts application materials
 └── guides or automates the next steps
```

This keeps Route agent-agnostic while allowing different AI systems to build different experiences on top of the same opportunity infrastructure.

---

### 6. Track

After a user decides to pursue an opportunity, Route can eventually provide the information and state needed to track what happens next.

Potential workflows include:

- Saved opportunities
- Application status
- Important deadlines
- Submission status
- Opportunity updates
- Follow-up actions
- Notifications
- Changes to opportunity information

The exact tracking and automation model will evolve as Route grows.

---

## Route Is Infrastructure, Not the Agent

A fundamental design principle of Route is the separation between **opportunity infrastructure** and **AI agent behavior**.

```text
                    USER
                      │
                      ▼
               AI AGENT / APP
                      │
                      │ MCP
                      ▼
              ┌───────────────┐
              │     ROUTE     │
              │               │
              │ Discover      │
              │ Understand    │
              │ Save          │
              │ Prepare       │
              │ Act*          │
              │ Track*        │
              └───────┬───────┘
                      │
             Opportunity Sources
              ┌───────┴───────┐
              ▼               ▼
          Remote OK        Devpost
              │               │
              └───────┬───────┘
                      ▼
              Normalized Data

* Capabilities can evolve to support
  agent-driven workflows.
```

Route does not dictate which AI agent a user must use.

A developer could connect Route to:

- Alexa+
- Claude
- ChatGPT
- A custom AI agent
- An IDE agent
- A productivity application
- Another MCP-compatible client

The agent decides how to use Route's capabilities.

Route's responsibility is to make opportunity information and opportunity-related capabilities accessible in a consistent way.

---

## Opportunity Infrastructure

The long-term vision is for Route to provide a common infrastructure layer across many opportunity categories.

```text
                    ROUTE
                      │
          ┌───────────┴───────────┐
          │                       │
    Opportunity Data        Opportunity Tools
          │                       │
    ┌─────┼─────┐          ┌──────┼──────┐
    ▼     ▼     ▼          ▼      ▼      ▼
   Jobs  Grants  ...      Prepare  Act   Track
```

The initial implementation focuses on jobs and hackathons.

The architecture is intentionally designed so additional opportunity categories and providers can be added without changing the fundamental MCP interface.

---

## MCP Tools

The planned core MCP interface is:

| Tool                       | Purpose                                               | Status            |
| -------------------------- | ----------------------------------------------------- | ----------------- |
| `health_check`             | Verify the MCP server is running                      | ✅ Implemented    |
| `search_opportunities`     | Search supported opportunity sources                  | 🚧 In development |
| `get_opportunity`          | Retrieve detailed opportunity information             | 🚧 Planned        |
| `save_opportunity`         | Save an opportunity                                   | 🚧 Planned        |
| `prepare_opportunity`      | Provide opportunity context for preparation workflows | 🚧 Planned        |
| `list_saved_opportunities` | Retrieve saved opportunities                          | 🔮 Optional       |

As Route evolves, additional tools may support opportunity-specific actions and tracking workflows.

The goal is to keep the MCP interface independent from individual providers.

A tool should not need to know whether an opportunity came from Remote OK, Devpost, or a future provider.

---

## Provider Architecture

Route uses a provider-based architecture.

Each provider is responsible for:

1. Fetching information from an external source.
2. Parsing the source's format.
3. Normalizing the information.
4. Returning Route's common opportunity format.

Conceptually:

```text
                         Route MCP
                             │
                      Opportunity API
                             │
                  ┌──────────┴──────────┐
                  ▼                     ▼
              Remote OK             Devpost
                  │                     │
                  ▼                     ▼
              Normalize             Normalize
                  │                     │
                  └──────────┬──────────┘
                             ▼
                       Opportunity
```

This makes it possible to add new providers without changing the MCP tools themselves.

Future providers may include sources for:

- Scholarships
- Fellowships
- Grants
- Internships
- Accelerators
- Events
- Freelance opportunities

---

## Opportunity Model

Route normalizes external data into a common opportunity structure.

The initial model is centered around:

```text
Opportunity
├── id
├── title
├── type
├── organization
├── description
├── location
├── remote
├── deadline
├── url
├── source
├── sourceUrl
├── prize
├── timeline
└── participants
```

The initial opportunity types are:

- `job`
- `hackathon`

Additional types can be introduced as new providers and opportunity categories are added.

---

## Project Status

🚧 **Early development**

The MCP foundation, Streamable HTTP transport, provider architecture, Remote OK provider, Devpost provider, provider manager, and search infrastructure are currently being implemented and tested.

### Currently implemented

- TypeScript MCP server
- MCP SDK integration
- MCP client/server communication
- Streamable HTTP transport
- MCP session handling
- Tool registration
- Development MCP test client
- `health_check`
- Opportunity domain model
- Zod schemas
- Provider architecture
- Remote OK provider
- Devpost provider
- Provider manager
- Opportunity search service
- Provider-level pagination

### In development / next

- `search_opportunities`
- `get_opportunity`

### Planned

- DynamoDB persistence
- `save_opportunity`
- Saved opportunity retrieval
- User/session state
- AWS Strands Agents SDK integration
- Amazon Bedrock integration
- `prepare_opportunity`
- Opportunity action workflows
- Production deployment
- Production authentication
- Alexa+ integration

Features marked as planned are not yet implemented.

---

## Roadmap

### Phase 1 — MCP Foundation

- Initialize TypeScript project
- Add official MCP SDK
- Create MCP server
- Implement Streamable HTTP
- Implement MCP sessions
- Create MCP test client
- Implement `health_check`

### Phase 2 — Opportunity Infrastructure

- Define Opportunity domain model
- Add Zod schemas
- Define provider interface
- Implement Remote OK provider
- Implement Devpost provider
- Add normalization layer
- Implement provider pagination
- Implement `search_opportunities`
- Implement `get_opportunity`

### Phase 3 — User State

- Configure DynamoDB
- Implement `save_opportunity`
- Implement saved opportunity retrieval
- Add user/session state

### Phase 4 — AI-Assisted Opportunity Workflows

- Integrate AWS Strands Agents SDK
- Integrate Amazon Bedrock
- Implement `prepare_opportunity`
- Build job preparation workflows
- Build hackathon preparation workflows
- Explore opportunity-specific action workflows

### Phase 5 — Production MCP

- Deploy Route MCP server
- Configure HTTPS
- Configure production authentication
- Benchmark MCP response latency
- Test with external MCP clients
- Document production connection

### Phase 6 — Alexa+

- Build Alexa+ integration
- Connect Alexa+ to Route MCP
- Test conversational opportunity discovery
- Demonstrate Route through Alexa+

### Future — Opportunity Action Infrastructure

Expand Route beyond discovery into the broader opportunity lifecycle:

**Discover → Understand → Save → Prepare → Act → Track**

Potential directions include:

- More opportunity categories
- More opportunity providers
- Application assistance
- Opportunity-specific preparation
- Opportunity tracking
- Notifications
- Personalization
- Opportunity matching
- Community-built providers
- Community-built integrations
- Additional MCP clients
- Agent Skills

---

## Design Principles

### MCP First

Route is fundamentally an MCP server.

The web interface, AI agents, and integrations should consume Route rather than define it.

### Agent Agnostic

Route should not require a particular AI assistant.

Any compatible MCP client should be able to use Route.

### Opportunity First

Route exists to make opportunities easier to discover, understand, and act on.

### Live Opportunities

The initial system is designed around retrieving opportunities from external sources rather than maintaining a massive static database.

### Provider Independence

External platforms are isolated behind provider implementations.

### Composable Actions

Route should provide small, useful capabilities that AI agents and applications can combine into larger workflows.

### Small Core

Route should expose a focused set of composable tools rather than becoming a large monolithic platform.

### Open by Default

Developers should be able to extend Route with new providers, tools, clients, and integrations.

---

## Open Source

Route is intended to be an open-source project.

The project uses the MIT License.

Contributions are welcome as the project matures.

Potential contribution areas include:

- New opportunity providers
- Provider normalization
- MCP tools
- Opportunity workflows
- Tests
- Documentation
- Client integrations
- Agent integrations
- Performance improvements
- Bug fixes

If you want to add a new provider, the goal is that you should be able to implement the provider without modifying the core MCP tool logic.

---

## Hackathon

Route is being developed for the **Amazon Developer Hackathon 2026**.

The primary track is:

**Alexa+**

The project is also being designed around open MCP infrastructure and AWS technologies.

The Alexa+ integration is intentionally kept separate from the core MCP so that Route remains useful to other MCP-compatible clients.

---

## License

MIT License.

See `LICENSE` for the full license text.
