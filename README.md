Route

An open-source MCP server for discovering and acting on opportunities.

Route is an agent-agnostic Model Context Protocol (MCP) server designed to give AI agents a structured way to discover opportunities such as jobs and hackathons across the web.

The long-term goal is to make opportunity discovery an infrastructure layer that can be used by different AI agents, assistants, and applications — rather than building another traditional job board.

Why Route?

Opportunities are scattered across different platforms.

Jobs live on job boards.
Hackathons live on developer platforms.
Scholarships, fellowships, grants, internships, and other opportunities are spread across even more sources.

AI agents can help people discover these opportunities, but they need reliable tools and structured access to external information.

Route aims to provide that interface through MCP.

Instead of an agent needing to understand how every opportunity platform works, it can interact with Route through a small set of standardized tools.

AI Agent
│
│ MCP
▼
┌─────────────────────┐
│ Route │
│ MCP Server │
├─────────────────────┤
│ Search │
│ Get details │
│ Save │
│ Prepare │
└──────────┬──────────┘
│
┌────┴─────┐
▼ ▼
Remote OK Devpost
Project Status

🚧 Early development

The MCP foundation and Streamable HTTP transport are currently implemented and working.

Currently working
TypeScript MCP server
MCP SDK integration
MCP client/server communication
Streamable HTTP transport
MCP session handling
Tool registration
Development test client
health_check tool
Planned
Opportunity domain model
Provider architecture
Remote OK provider
Devpost provider
search_opportunities
get_opportunity
save_opportunity
prepare_opportunity
DynamoDB persistence
Amazon Bedrock integration
AWS Strands agent integration
Production deployment
Alexa+ integration

Features marked as planned are not yet implemented.

Core Idea

Route is being built around four core capabilities:

1. Discover

Search across supported opportunity providers.

"What remote software engineering opportunities are available?"

Route can eventually query multiple providers and return normalized opportunity data.

2. Understand

Retrieve detailed information about an opportunity.

"Tell me more about this hackathon."

The agent can retrieve structured information such as:

Title
Organization
Description
Deadline
Location
Remote/online availability
Prize
Timeline
Application URL
Source 3. Save

Allow an agent to save an opportunity for later.

"Save this hackathon."

Saved opportunities will be associated with the user's state rather than becoming part of the global opportunity source.

4. Prepare

Help the user understand what they need to do to pursue an opportunity.

For example:

"How should I prepare for this hackathon?"

or:

"What do I need to prepare before applying for this job?"

Route will use AI-assisted preparation to turn opportunity requirements into useful preparation steps.

Route will not automatically submit job applications in the initial version.

MCP Tools

The planned core MCP interface is:

Tool Purpose Status
health_check Verify the MCP server is running ✅ Implemented
search_opportunities Search supported opportunity sources 🚧 Planned
get_opportunity Retrieve detailed opportunity information 🚧 Planned
save_opportunity Save an opportunity 🚧 Planned
prepare_opportunity Generate preparation guidance 🚧 Planned
list_saved_opportunities Retrieve saved opportunities 🔮 Optional

The goal is to keep the MCP interface independent from individual providers.

That means the tools should not need to know whether an opportunity came from Remote OK, Devpost, or a future provider.

Provider Architecture

Route uses a provider-based architecture.

Each provider is responsible for:

Fetching information from an external source.
Parsing the source's format.
Normalizing the information.
Returning Route's common opportunity format.

Conceptually:

                   Route MCP
                       │
                Opportunity API
                       │
              ┌────────┴────────┐
              ▼                 ▼
        Remote OK            Devpost
              │                 │
              ▼                 ▼
          Normalize          Normalize
              │                 │
              └────────┬────────┘
                       ▼
                 Opportunity

This makes it possible to add new providers without changing the MCP tools themselves.

Future providers may include sources for:

Scholarships
Fellowships
Grants
Internships
Accelerators
Events
Freelance opportunities

These are future possibilities, not part of the current MVP.

Opportunity Model

Route will normalize external data into a common opportunity structure.

The initial model is centered around:

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

The initial opportunity types are:

job
hackathon

The model is intentionally designed so additional opportunity types can be introduced later without requiring a redesign of the entire MCP.

Architecture

The current project is intentionally separated into several layers.

┌─────────────────────────────────────────────┐
│ AI Clients │
│ │
│ Alexa+ / Strands / Claude / Other Agents │
└──────────────────────┬──────────────────────┘
│
│ MCP
▼
┌─────────────────────────────────────────────┐
│ Route MCP │
│ │
│ MCP 2025-11-25+ │
│ Streamable HTTP │
│ │
│ ┌───────────────────────────────────────┐ │
│ │ MCP Tools │ │
│ │ │ │
│ │ search │ get │ save │ prepare │ │
│ └───────────────────┬───────────────────┘ │
│ │ │
│ Provider Layer │
└──────────────────────┼──────────────────────┘
│
┌─────────┴─────────┐
▼ ▼
Remote OK Devpost

The MCP server is the core product.

User interfaces and AI agents are clients of Route rather than dependencies of Route.

Technology

Route is currently being built with:

TypeScript — application language
Node.js — runtime
Model Context Protocol SDK — MCP implementation
MCP Streamable HTTP — remote transport
Zod — runtime validation
AWS SDK for JavaScript — AWS integration
Amazon DynamoDB — planned persistence
Amazon Bedrock — planned AI reasoning
AWS Strands Agents SDK — planned agent integration
Cheerio — planned HTML parsing for supported providers

The project intentionally avoids unnecessary dependencies where native Node.js functionality is sufficient.

Local Development
Requirements

You will need:

Node.js 22+
npm
Git

Clone the repository:

# Clone the Route repository from GitHub.

# Replace the placeholder URL with the actual repository URL

# after the public repository has been created.

git clone <repository-url>

# Move into the MCP server directory.

cd route/mcp

Install dependencies:

# Install the dependencies declared in package.json.

# npm also uses package-lock.json to reproduce the project's

# known dependency versions.

npm install

Build the project:

# Compile the TypeScript source code into the dist directory.

# This verifies that the project currently passes TypeScript

# compilation before the server is started.

npm run build

Start the development server:

# Start the MCP server through tsx.

# tsx allows the TypeScript source to be executed directly

# during development without manually compiling it first.

npm run dev

The local MCP endpoint is currently:

http://localhost:3005/mcp

The port may be changed through the project's environment configuration.

Testing the MCP

Route includes a small MCP client used to verify that the server is actually functioning as an MCP server.

With the server running, execute:

# Run the local MCP test client.

# The client connects to Route through Streamable HTTP,

# discovers the server's tools, and calls the health_check tool.

npx tsx src/test-client.ts

The test verifies the basic MCP lifecycle:

Test Client
│
│ connect
▼
Route MCP
│
│ listTools
▼
health_check
│
│ callTool
▼
Tool Result

This test exists to ensure that Route is not simply exposing an HTTP endpoint that happens to return JSON.

It is actually communicating through MCP.

Roadmap
Phase 1 — MCP Foundation

Initialize TypeScript project

Add official MCP SDK

Create MCP server

Implement Streamable HTTP

Implement MCP sessions

Create MCP test client

Implement health_check

Phase 2 — Opportunity Infrastructure

Define Opportunity domain model

Add Zod schemas

Define provider interface

Implement Remote OK provider

Implement Devpost provider

Add normalization layer

Implement search_opportunities

Implement get_opportunity

Phase 3 — User State

Configure DynamoDB

Implement save_opportunity

Implement saved opportunity retrieval

Add user/session state

Phase 4 — AI Preparation

Integrate AWS Strands Agents SDK

Integrate Amazon Bedrock

Implement prepare_opportunity

Add job preparation workflows

Add hackathon preparation workflows

Phase 5 — Production MCP

Deploy Route MCP server

Configure HTTPS

Configure production authentication

Benchmark MCP response latency

Test with external MCP clients

Document production connection

Phase 6 — Alexa+

Build Alexa+ integration

Connect Alexa+ to Route MCP

Test conversational opportunity discovery

Demonstrate Route through Alexa+

Future

Route is intended to become a broader opportunity infrastructure layer.

Potential future directions include:

More opportunity providers
More opportunity categories
Community-built providers
Additional MCP clients
Additional AI assistant integrations
Agent Skills
Opportunity notifications
Personalization
Opportunity matching

These are intentionally outside the initial MVP.

Open Source

Route is intended to be an open-source project.

The project uses the MIT License.

Contributions are welcome as the project matures.

Potential contribution areas include:

New opportunity providers
Provider normalization
MCP tools
Tests
Documentation
Client integrations
Agent integrations
Performance improvements
Bug fixes

If you want to add a new provider, the goal is that you should be able to implement the provider without modifying the core MCP tool logic.

Design Principles
MCP First

Route is fundamentally an MCP server.

The web interface, AI agents, and integrations should consume Route rather than define it.

Agent Agnostic

Route should not require a particular AI assistant.

An MCP-compatible client should be able to use it.

Live Opportunities

The initial system is designed around retrieving opportunities from external sources rather than maintaining a massive static database.

Provider Independence

External platforms should be isolated behind provider implementations.

Small Core

Route should expose a small number of useful, composable tools instead of becoming a large monolithic platform.

Open by Default

The long-term goal is for developers to extend Route with new providers, clients, and integrations.

Hackathon

Route is being developed for the Amazon Developer Hackathon 2026.

The primary track is:

Alexa+

The project is also being designed with AWS technologies and agentic workflows in mind.

The Alexa+ integration is intentionally kept separate from the core MCP so that Route remains useful to other MCP-compatible clients.

License

MIT License.

See LICENSE for the full license text.
